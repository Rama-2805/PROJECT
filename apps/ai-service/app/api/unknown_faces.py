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
def get_unknown_face_dashboard(db: Session = Depends(get_db)):
    """Fetch collected unknown face clusters with AI Suggested Matches for the Review Dashboard."""
    # Find all distinct unassigned clusters
    results = (
        db.query(UnknownFace.cluster_id)
        .filter(UnknownFace.cluster_id.isnot(None))
        .distinct()
        .all()
    )

    dashboard_items = []
    for row in results:
        cluster_id = row.cluster_id
        faces = db.query(UnknownFace).filter(UnknownFace.cluster_id == cluster_id).all()
        if not faces:
            continue

        # Calculate stats
        img_count = len(faces)
        avg_quality = sum(f.quality_score for f in faces) / img_count
        latest_face = max(faces, key=lambda f: f.created_at)

        # AI Suggested Matching:
        # Load the raw embeddings, compute average, and query FAISS
        suggested_match = None
        embeddings = []
        for face in faces:
            if os.path.exists(face.embedding_path):
                try:
                    emb = np.load(face.embedding_path)
                    embeddings.append(emb)
                except Exception:
                    pass

        if embeddings:
            # Re-normalize and average
            avg_emb = np.mean(embeddings, axis=0)
            norm = np.linalg.norm(avg_emb)
            if norm > 0:
                avg_emb = avg_emb / norm
            
            # Query FAISS (threshold of 0.65 as specified for suggested matching)
            match = faiss_service.search_face(avg_emb, threshold=0.65)
            if match:
                s_usn, similarity = match
                # Only suggest if it lies in [0.65, 0.90) confidence window (which requires verification or suggestion)
                if similarity < 0.90:
                    student = db.query(Student).filter(Student.usn == s_usn).first()
                    if student:
                        suggested_match = {
                            "usn": student.usn,
                            "name": student.name,
                            "confidence": round(similarity * 100.0, 1)  # percentage
                        }

        # Select preview path
        # Check cluster previews first (e.g. front.jpg)
        cluster_preview_path = f"storage/clusters/cluster_{cluster_id}/front.jpg"
        if not os.path.exists(cluster_preview_path):
            cluster_preview_path = latest_face.image_path

        dashboard_items.append({
            "cluster_id": cluster_id,
            "images_count": img_count,
            "average_quality": round(avg_quality, 1),
            "preview_image": cluster_preview_path,
            "detected_at": latest_face.created_at.isoformat(),
            "suggested_match": suggested_match
        })

    # Sort by detection time (newest first)
    dashboard_items.sort(key=lambda x: x["detected_at"], reverse=True)
    return dashboard_items


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
