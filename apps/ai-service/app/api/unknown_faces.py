"""SmartCampus AI — Unknown Faces API Router.

Exposes endpoints for the Teacher Review Dashboard:
- List unknown faces with AI Suggested matches.
- Action: Enroll Student, Mark Visitor, Ignore, and Security Alert.
"""

import os
import shutil
import logging
import numpy as np
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field
from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.orm import Session
from ..config.settings import settings
from ..config.database import get_db
from ..models.unknown_face import UnknownFace
from ..models.student import Student
from ..services.enrollment_service import enrollment_service
from ..services.faiss_service import faiss_service
from ..services.image_storage import image_storage
from ..services.security_service import security_service

logger = logging.getLogger("smartcampus.unknown_faces_api")

router = APIRouter(prefix=f"{settings.api_prefix}/unknown-faces", tags=["Teacher Review Dashboard"])


def get_relative_storage_path(absolute_path: str) -> str:
    if not absolute_path:
        return ""
    abs_norm = os.path.normpath(absolute_path)
    idx = abs_norm.find("storage" + os.sep)
    if idx != -1:
        return abs_norm[idx:].replace(os.sep, "/")
    idx_slash = abs_norm.find("storage/")
    if idx_slash != -1:
        return abs_norm[idx_slash:]
    return absolute_path


# Schemas
class EnrollUnknownRequest(BaseModel):
    cluster_id: str = Field(..., description="The cluster ID to enroll.")
    name: str = Field(..., min_length=1, max_length=100)
    usn: str = Field(..., min_length=1, max_length=50)
    department: str = Field(..., min_length=1, max_length=100)
    semester: int = Field(..., ge=1, le=8)
    section: str = Field(..., min_length=1, max_length=10)


class VisitorRequest(BaseModel):
    cluster_id: str = Field(..., description="The cluster ID to mark as visitor.")
    visitor_name: str = Field(..., min_length=1, max_length=100)


class IgnoreRequest(BaseModel):
    cluster_id: str = Field(..., description="The cluster ID to ignore.")


class SecurityAlertRequest(BaseModel):
    cluster_id: str = Field(..., description="The cluster ID flagged for alert.")
    location: str = Field(..., min_length=1, max_length=100, description="Classroom or camera location.")


@router.get("")
@router.get("/")
def get_unknown_faces_paginated(
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1),
    db: Session = Depends(get_db)
):
    """Fetch paginated individual unknown face detections."""
    total = db.query(UnknownFace).count()
    offset = (page - 1) * limit
    faces = (
        db.query(UnknownFace)
        .order_by(UnknownFace.created_at.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )

    data = []
    for face in faces:
        # AI Suggested Matching (using individual face embedding)
        suggested_match = None
        if face.embedding_path and os.path.exists(face.embedding_path):
            try:
                emb = np.load(face.embedding_path)
                match = faiss_service.search_face(emb, threshold=0.65)
                if match:
                    s_usn, similarity = match
                    if similarity < 0.90:
                        student = db.query(Student).filter(Student.usn == s_usn).first()
                        if student:
                            suggested_match = {
                                "usn": student.usn,
                                "name": student.name,
                                "confidence": round(similarity * 100.0, 1)
                            }
            except Exception as e:
                logger.debug(f"Failed to check suggestion: {e}")

        rel_img_path = get_relative_storage_path(face.image_path)
        data.append({
            "id": face.id,
            "cluster_id": face.cluster_id or f"unknown_{face.id}",
            "image_path": rel_img_path,
            "preview_image": rel_img_path,
            "quality_score": round(face.quality_score, 1),
            "camera_id": face.camera_id or "Unknown",
            "is_resolved": face.is_resolved or False,
            "status": "Resolved" if face.is_resolved else "Unresolved",
            "created_at": face.created_at.isoformat(),
            "detected_at": face.created_at.isoformat(),
            "suggested_match": suggested_match
        })

    import math
    return {
        "data": data,
        "total": total,
        "page": page,
        "limit": limit,
        "total_pages": math.ceil(total / limit) if limit > 0 else 0
    }


@router.post("/enroll")
async def enroll_from_unknown(request: EnrollUnknownRequest, db: Session = Depends(get_db)):
    """Teacher Review Action: Enroll the unknown face cluster as a new student."""
    try:
        student_data = await enrollment_service.enroll_student(
            db=db,
            cluster_id=request.cluster_id,
            name=request.name,
            usn=request.usn,
            department=request.department,
            semester=request.semester,
            section=request.section
        )
        
        # Log action
        security_service.log_audit(
            db, 
            action="ENROLL_UNKNOWN_FACE", 
            details=f"Unknown cluster {request.cluster_id} enrolled as student {request.name} ({request.usn})"
        )
        
        return {
            "status": "success",
            "message": f"Student '{request.name}' successfully enrolled from cluster.",
            "student": student_data
        }
    except ValueError as val_err:
        raise HTTPException(status_code=400, detail=str(val_err))
    except Exception as e:
        logger.error(f"Failed to enroll from unknown cluster: {e}")
        raise HTTPException(status_code=500, detail=f"Enrollment failed: {str(e)}")


@router.post("/visitor")
def mark_as_visitor(request: VisitorRequest, db: Session = Depends(get_db)):
    """Teacher Review Action: Label the unknown face cluster as a visitor."""
    cluster_id = request.cluster_id
    visitor_name = request.visitor_name

    # Check if cluster exists
    faces = db.query(UnknownFace).filter(UnknownFace.cluster_id == cluster_id).all()
    if not faces:
        raise HTTPException(status_code=404, detail="Cluster not found.")

    try:
        # Move files to a visitors folder
        visitor_folder = image_storage.storage_dir / "visitors" / visitor_name.replace(" ", "_")
        visitor_folder.mkdir(parents=True, exist_ok=True)

        for face in faces:
            if os.path.exists(face.image_path):
                shutil.move(face.image_path, str(visitor_folder / os.path.basename(face.image_path)))

        # Clean up files in cluster previews
        shutil.rmtree(str(image_storage.clusters_dir / f"cluster_{cluster_id}"), ignore_errors=True)

        # Delete database records
        db.query(UnknownFace).filter(UnknownFace.cluster_id == cluster_id).delete()
        db.commit()

        # Log action
        security_service.log_audit(
            db,
            action="MARK_VISITOR",
            details=f"Cluster {cluster_id} marked as visitor: {visitor_name}"
        )

        return {
            "status": "success",
            "message": f"Cluster '{cluster_id}' successfully marked as visitor '{visitor_name}'."
        }
    except Exception as e:
        logger.error(f"Failed to mark visitor: {e}")
        raise HTTPException(status_code=500, detail=f"Action failed: {str(e)}")


@router.post("/ignore")
def ignore_unknown_face(request: IgnoreRequest, db: Session = Depends(get_db)):
    """Teacher Review Action: Ignore and archive the unknown face cluster."""
    cluster_id = request.cluster_id

    # Check if cluster exists
    faces = db.query(UnknownFace).filter(UnknownFace.cluster_id == cluster_id).all()
    if not faces:
        raise HTTPException(status_code=404, detail="Cluster not found.")

    try:
        # Delete files from disk
        for face in faces:
            if os.path.exists(face.image_path):
                os.remove(face.image_path)
            if os.path.exists(face.embedding_path):
                os.remove(face.embedding_path)

        shutil.rmtree(str(image_storage.clusters_dir / f"cluster_{cluster_id}"), ignore_errors=True)

        # Delete from DB
        db.query(UnknownFace).filter(UnknownFace.cluster_id == cluster_id).delete()
        db.commit()

        # Log action
        security_service.log_audit(
            db,
            action="IGNORE_UNKNOWN_FACE",
            details=f"Cluster {cluster_id} ignored and deleted."
        )

        return {
            "status": "success",
            "message": f"Cluster '{cluster_id}' successfully ignored."
        }
    except Exception as e:
        logger.error(f"Failed to ignore cluster: {e}")
        raise HTTPException(status_code=500, detail=f"Action failed: {str(e)}")


@router.post("/alert")
def trigger_security_alert(request: SecurityAlertRequest, db: Session = Depends(get_db)):
    """Teacher Review Action: Trigger a security alert for an unknown cluster."""
    cluster_id = request.cluster_id
    location = request.location

    # Verify cluster exists
    faces = db.query(UnknownFace).filter(UnknownFace.cluster_id == cluster_id).all()
    if not faces:
        raise HTTPException(status_code=404, detail="Cluster not found.")

    # Record immediate critical audit event
    security_service.log_audit(
        db,
        action="SECURITY_ALERT",
        details=f"Intruder/unrecognized face cluster '{cluster_id}' flagged at location '{location}'"
    )

    return {
        "status": "success",
        "message": f"Security alert successfully triggered for cluster '{cluster_id}' at location '{location}'."
    }


@router.get("/{id}")
def get_unknown_face_by_id(id: int, db: Session = Depends(get_db)):
    """Fetch details of a single unknown face record."""
    face = db.query(UnknownFace).filter(UnknownFace.id == id).first()
    if not face:
        raise HTTPException(status_code=404, detail="Unknown face not found.")

    suggested_match = None
    if face.embedding_path and os.path.exists(face.embedding_path):
        try:
            emb = np.load(face.embedding_path)
            match = faiss_service.search_face(emb, threshold=0.65)
            if match:
                s_usn, similarity = match
                if similarity < 0.90:
                    student = db.query(Student).filter(Student.usn == s_usn).first()
                    if student:
                        suggested_match = {
                            "usn": student.usn,
                            "name": student.name,
                            "confidence": round(similarity * 100.0, 1)
                        }
        except Exception:
            pass

    rel_img_path = get_relative_storage_path(face.image_path)
    return {
        "id": face.id,
        "cluster_id": face.cluster_id or f"unknown_{face.id}",
        "image_path": rel_img_path,
        "preview_image": rel_img_path,
        "quality_score": round(face.quality_score, 1),
        "camera_id": face.camera_id or "Unknown",
        "is_resolved": face.is_resolved or False,
        "status": "Resolved" if face.is_resolved else "Unresolved",
        "created_at": face.created_at.isoformat(),
        "detected_at": face.created_at.isoformat(),
        "suggested_match": suggested_match
    }


@router.delete("/{id}")
def delete_unknown_face(id: int, db: Session = Depends(get_db)):
    """Delete an unknown face record and its associated filesystem assets."""
    face = db.query(UnknownFace).filter(UnknownFace.id == id).first()
    if not face:
        raise HTTPException(status_code=404, detail="Unknown face not found.")

    # 1. Delete associated crop image and embedding vector files
    if face.image_path and os.path.exists(face.image_path):
        try:
            os.remove(face.image_path)
        except Exception as e:
            logger.error(f"Error removing image file {face.image_path}: {e}")

    if face.embedding_path and os.path.exists(face.embedding_path):
        try:
            os.remove(face.embedding_path)
        except Exception as e:
            logger.error(f"Error removing embedding file {face.embedding_path}: {e}")

    # 2. Delete database record
    db.delete(face)
    db.commit()

    # Log action
    security_service.log_audit(
        db,
        action="DELETE_UNKNOWN_FACE",
        details=f"Unknown face ID {id} ignored/deleted."
    )

    return {
        "status": "success",
        "message": f"Unknown face detection {id} ignored and purged successfully."
    }
