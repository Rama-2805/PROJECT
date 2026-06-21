"""SmartCampus AI — Continuous Learning Candidates API Router.

Exposes endpoints to list and review high-quality face recognition candidates:
- GET /learning/candidates
- GET /learning/candidates/stats
- GET /learning/candidates/:id
- POST /learning/candidates/:id/approve
- POST /learning/candidates/:id/reject
"""

import os
import logging
from typing import Optional, List
from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from ..config.settings import settings
from ..config.database import get_db
from ..models.candidate_image import CandidateImage
from ..models.student import Student

logger = logging.getLogger("smartcampus.learning_api")

router = APIRouter(prefix=f"{settings.api_prefix}/learning/candidates", tags=["Continuous Learning Queue"])


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


@router.get("")
@router.get("/")
def get_candidates(
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1),
    status_filter: Optional[str] = Query(None, alias="status"),
    search: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Fetch paginated continuous learning candidate face images."""
    query = db.query(CandidateImage).join(Student, CandidateImage.student_id == Student.id)

    if status_filter:
        query = query.filter(CandidateImage.status == status_filter.upper())

    if search:
        search_pattern = f"%{search}%"
        query = query.filter(
            (Student.name.ilike(search_pattern)) | (Student.usn.ilike(search_pattern))
        )

    total = query.count()
    offset = (page - 1) * limit
    candidates = query.order_by(CandidateImage.created_at.desc()).offset(offset).limit(limit).all()

    data = []
    for cand in candidates:
        data.append({
            "id": cand.id,
            "student_id": cand.student_id,
            "student_name": cand.student.name if cand.student else "Unknown Student",
            "usn": cand.student.usn if cand.student else "UNKNOWN",
            "image_path": get_relative_storage_path(cand.image_path),
            "quality_score": round(cand.quality_score, 1) if cand.quality_score else 0.0,
            "similarity_score": round(cand.similarity_score, 3) if cand.similarity_score else 0.0,
            "status": cand.status,
            "created_at": cand.created_at.isoformat() if cand.created_at else None
        })

    return {
        "success": True,
        "data": data,
        "total": total,
        "page": page,
        "limit": limit,
        "total_pages": (total + limit - 1) // limit
    }


@router.get("/stats")
def get_candidate_stats(db: Session = Depends(get_db)):
    """Fetch candidate review statistics counts."""
    try:
        # Group counts by status
        stats_query = db.query(
            CandidateImage.status, func.count(CandidateImage.id)
        ).group_by(CandidateImage.status).all()

        stats_dict = {status_name: count for status_name, count in stats_query}

        total = db.query(CandidateImage).count()
        approved = stats_dict.get("APPROVED", 0)
        rejected = stats_dict.get("REJECTED", 0)
        pending = stats_dict.get("PENDING", 0)

        return {
            "success": True,
            "data": {
                "total": total,
                "approved": approved,
                "rejected": rejected,
                "pending": pending
            }
        }
    except Exception as e:
        logger.error(f"Error fetching candidate statistics: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve continuous learning queue statistics."
        )


@router.get("/{candidate_id}")
def get_candidate_by_id(candidate_id: int, db: Session = Depends(get_db)):
    """Fetch details of a single learning candidate."""
    cand = db.query(CandidateImage).filter(CandidateImage.id == candidate_id).first()
    if not cand:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Learning candidate with ID {candidate_id} not found."
        )

    return {
        "success": True,
        "data": {
            "id": cand.id,
            "student_id": cand.student_id,
            "student_name": cand.student.name if cand.student else "Unknown Student",
            "usn": cand.student.usn if cand.student else "UNKNOWN",
            "image_path": get_relative_storage_path(cand.image_path),
            "quality_score": round(cand.quality_score, 1) if cand.quality_score else 0.0,
            "similarity_score": round(cand.similarity_score, 3) if cand.similarity_score else 0.0,
            "status": cand.status,
            "created_at": cand.created_at.isoformat() if cand.created_at else None
        }
    }


@router.post("/{candidate_id}/approve")
def approve_candidate(candidate_id: int, db: Session = Depends(get_db)):
    """Approve a learning candidate face to be utilized in optimizer retraining."""
    cand = db.query(CandidateImage).filter(CandidateImage.id == candidate_id).first()
    if not cand:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Learning candidate with ID {candidate_id} not found."
        )

    try:
        cand.status = "APPROVED"
        db.commit()
        logger.info(f"Approved candidate face ID {candidate_id} for student {cand.student.name if cand.student else 'Unknown'}")
        return {
            "success": True,
            "message": "Candidate face approved successfully.",
            "data": {
                "id": cand.id,
                "status": cand.status
            }
        }
    except Exception as e:
        db.rollback()
        logger.error(f"Error approving candidate face {candidate_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to approve candidate face."
        )


@router.post("/{candidate_id}/reject")
def reject_candidate(candidate_id: int, db: Session = Depends(get_db)):
    """Reject a learning candidate face to exclude it from optimizer retraining."""
    cand = db.query(CandidateImage).filter(CandidateImage.id == candidate_id).first()
    if not cand:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Learning candidate with ID {candidate_id} not found."
        )

    try:
        cand.status = "REJECTED"
        db.commit()
        logger.info(f"Rejected candidate face ID {candidate_id} for student {cand.student.name if cand.student else 'Unknown'}")
        return {
            "success": True,
            "message": "Candidate face rejected successfully.",
            "data": {
                "id": cand.id,
                "status": cand.status
            }
        }
    except Exception as e:
        db.rollback()
        logger.error(f"Error rejecting candidate face {candidate_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to reject candidate face."
        )
