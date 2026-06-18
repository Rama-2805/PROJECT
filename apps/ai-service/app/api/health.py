"""SmartCampus AI — Health Router."""

import logging
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text
from ..config.settings import settings
from ..config.database import get_db
from ..services.faiss_service import faiss_service

logger = logging.getLogger("smartcampus.health")

router = APIRouter(prefix=f"{settings.api_prefix}/health", tags=["Health"])


@router.get("")
@router.get("/")
def health_check(db: Session = Depends(get_db)):
    """Comprehensive health check for API, Database, and FAISS vector index."""
    from ..services.face_detector import face_detector
    from ..services.attendance_engine import attendance_engine
    from ..models.student import Student

    db_status = "healthy"
    try:
        # Check database connectivity
        db.execute(text("SELECT 1"))
    except Exception as e:
        logger.error(f"Database health check failed: {e}")
        db_status = "unhealthy"

    faiss_status = "healthy"
    try:
        faiss_vectors = faiss_service.index.ntotal if faiss_service.index else 0
    except Exception as e:
        logger.error(f"FAISS index health check failed: {e}")
        faiss_status = "unhealthy"
        faiss_vectors = 0

    # Models Status: check if loaded
    models_loaded = face_detector._model is not None
    models_status = "healthy" if models_loaded else "unloaded"

    # Camera Status: list active session count
    active_cameras = []
    try:
        with attendance_engine._lock:
            for cam_id, session in attendance_engine.active_sessions.items():
                if session.get("running"):
                    active_cameras.append(cam_id)
    except Exception as e:
        logger.error(f"Error checking active cameras: {e}")
    camera_status = "active" if active_cameras else "inactive"

    # Students total count
    try:
        students_count = db.query(Student).count()
    except Exception as e:
        logger.error(f"Error checking student count: {e}")
        students_count = 0

    return {
        "status": "healthy" if db_status == "healthy" and faiss_status == "healthy" else "degraded",
        "service": settings.app_name,
        "version": "2.0.0",
        "components": {
            "database": {
                "status": db_status
            },
            "faiss": {
                "status": faiss_status,
                "total_vectors": faiss_vectors
            },
            "models": {
                "status": models_status,
                "loaded": models_loaded
            },
            "camera": {
                "status": camera_status,
                "active_sessions": len(active_cameras)
            },
            "students": {
                "total_count": students_count
            },
            "vectors": {
                "total_count": faiss_vectors
            }
        }
    }
