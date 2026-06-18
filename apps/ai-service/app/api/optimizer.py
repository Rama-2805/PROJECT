"""SmartCampus AI — Weekly Face Optimizer API Router."""

import logging
from pydantic import BaseModel, Field
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from ..config.settings import settings
from ..config.database import get_db
from ..services.weekly_optimizer import weekly_face_optimizer

logger = logging.getLogger("smartcampus.optimizer_api")

router = APIRouter(prefix=f"{settings.api_prefix}/optimizer", tags=["Weekly Face Optimizer"])


class RollbackRequest(BaseModel):
    usn: str = Field(..., description="The USN of the student to roll back.")
    version: int = Field(..., ge=1, description="Target face profile version integer to restore.")


@router.post("/run")
def trigger_optimizer_run(db: Session = Depends(get_db)):
    """Manually trigger the Weekly Face Optimizer to consolidate learning candidates.

    Aggregates high-quality candidate captures, de-duplicates embeddings,
    creates versioned student face profiles, and rebuilds the FAISS index.
    """
    try:
        report = weekly_face_optimizer.run_optimization(db)
        return {
            "status": "success",
            "message": "Weekly face optimization pass completed successfully.",
            "report": report
        }
    except Exception as e:
        logger.error(f"Weekly face optimizer run failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Optimizer failed: {str(e)}"
        )


@router.post("/rollback")
def rollback_student_profile(request: RollbackRequest, db: Session = Depends(get_db)):
    """Roll back a student's active face profile to a previous version.

    Swaps the active profile in FAISS and DB back to the chosen historical state.
    """
    try:
        weekly_face_optimizer.rollback_student_profile(
            db=db,
            usn=request.usn,
            target_version=request.version
        )
        return {
            "status": "success",
            "message": f"Student '{request.usn}' active face profile rolled back to version {request.version} successfully."
        }
    except ValueError as val_err:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(val_err)
        )
    except Exception as e:
        logger.error(f"Student profile rollback failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Rollback failed: {str(e)}"
        )
