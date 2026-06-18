"""SmartCampus AI — Enrollment API Router.

Exposes endpoints for auto-enrollment face captures, completion of enrollment,
and student profile CRUD actions.
"""

import uuid
import time
import logging
import threading
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from ..config.settings import settings
from ..config.database import get_db, SessionLocal
from ..models.student import Student
from ..models.face_profile import FaceProfile
from ..models.embedding import Embedding
from ..models.unknown_face import UnknownFace
from ..services.camera_service import camera_service
from ..services.face_detector import face_detector
from ..services.face_quality_service import face_quality_service
from ..services.embedding_service import embedding_service
from ..services.enrollment_service import enrollment_service
from ..services.image_storage import image_storage
from .websocket import websocket_manager

logger = logging.getLogger("smartcampus.enrollment_api")

router = APIRouter(prefix=f"{settings.api_prefix}/enrollment", tags=["Student Auto-Enrollment"])

# Global session variables for active auto-enrollment captures
_enrollment_running = {}
_enrollment_threads = {}
_enrollment_lock = threading.Lock()


# Schemas
class StartCaptureRequest(BaseModel):
    camera_id: str = Field("webcam", description="Camera identifier.")
    source_path: str = Field("0", description="USB webcam index or RTSP URL.")


class CompleteEnrollmentRequest(BaseModel):
    cluster_id: str = Field(..., description="The temporary session cluster_id from start capture.")
    name: str = Field(..., min_length=1, max_length=100)
    usn: str = Field(..., min_length=1, max_length=50)
    department: str = Field(..., min_length=1, max_length=100)
    semester: int = Field(..., ge=1, le=8)
    section: str = Field(..., min_length=1, max_length=10)


def _auto_capture_loop(camera_id: str, cluster_id: str):
    """Background frame capture loop that grabs 20-30 different pose frames over 5-10 seconds."""
    logger.info(f"Auto-capture thread started for enrollment: {cluster_id}")
    db = SessionLocal()
    
    start_time = time.time()
    captured_count = 0
    pose_coverage = set()

    try:
        # Consume frames from the camera buffer
        for timestamp, frame in camera_service.read_frames(camera_id):
            # Terminate if capture time exceeded 10 seconds or 30 frames captured
            elapsed = time.time() - start_time
            if elapsed > 10.0 or captured_count >= 30:
                break

            with _enrollment_lock:
                if not _enrollment_running.get(camera_id, False):
                    break

            # Run detection
            detections = face_detector.detect_faces(frame)
            if not detections:
                continue

            for det in detections:
                # Analyze quality (overall >= 70)
                analysis = face_quality_service.analyze_quality(det["crop"], det["raw_face"])
                if not analysis["is_acceptable"]:
                    continue

                # Generate embedding
                emb = embedding_service.generate_embedding(det["crop"])
                if emb is None:
                    continue

                # Determine pose angle
                pose = analysis["pose"]
                yaw, pitch = pose["yaw"], pose["pitch"]
                
                pose_name = "front"
                if abs(yaw) < 15.0 and abs(pitch) < 15.0:
                    pose_name = "front"
                elif yaw >= 15.0:
                    pose_name = "left"
                elif yaw <= -15.0:
                    pose_name = "right"
                elif pitch >= 15.0:
                    pose_name = "up"
                elif pitch <= -15.0:
                    pose_name = "down"

                # Obfuscate slightly (allow duplicate poses up to 6 frames each)
                pose_matches = [p for p in pose_coverage if p.startswith(pose_name)]
                if len(pose_matches) >= 6:
                    continue

                # Save file crop
                pose_unique_name = f"{pose_name}_{len(pose_matches) + 1}"
                pose_coverage.add(pose_unique_name)
                captured_count += 1

                filename_prefix = f"face_{cluster_id}_{int(time.time() * 1000)}"
                img_path, emb_path = image_storage.save_unknown_face(det["crop"], emb, filename_prefix)

                # Save cluster candidate previews for dashboard directly
                # If this is the best for this base pose, register it
                if len(pose_matches) == 0:
                    image_storage.save_cluster_preview(det["crop"], cluster_id, pose_name)

                # Add to DB
                face_rec = UnknownFace(
                    cluster_id=cluster_id,
                    image_path=img_path,
                    quality_score=analysis["score"],
                    embedding_path=emb_path
                )
                db.add(face_rec)
                db.commit()

                # Broadcast progress via WebSocket
                progress_payload = {
                    "cluster_id": cluster_id,
                    "captured_count": captured_count,
                    "pose_coverage": list({p.split("_")[0] for p in pose_coverage}),
                    "progress_percentage": round((captured_count / 30.0) * 100.0, 1),
                    "latest_quality": analysis["score"]
                }
                websocket_manager.broadcast("ENROLLMENT_PROGRESS", progress_payload)

            time.sleep(0.1)

    except Exception as e:
        logger.error(f"Error in auto-capture loop: {e}")
    finally:
        db.close()
        
        # Stop capturing
        camera_service.stop_camera(camera_id)
        with _enrollment_lock:
            _enrollment_running[camera_id] = False
            
        logger.info(f"Auto-capture loop completed for {cluster_id}. Collected {captured_count} images.")


@router.post("/start")
def start_auto_enrollment_capture(request: StartCaptureRequest):
    """Start automated face collection session on a camera feed."""
    camera_id = request.camera_id
    source_path = request.source_path

    with _enrollment_lock:
        if _enrollment_running.get(camera_id, False):
            return {"message": "Auto-capture is already running.", "cluster_id": _enrollment_running[camera_id]}

    # Initialize a new capture cluster session ID
    cluster_id = f"enroll_{uuid.uuid4().hex[:8]}"

    # Start camera capture
    success = camera_service.start_camera(camera_id, source_path)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to start camera capture on '{source_path}'."
        )

    with _enrollment_lock:
        _enrollment_running[camera_id] = True
        thread = threading.Thread(
            target=_auto_capture_loop,
            args=(camera_id, cluster_id),
            daemon=True
        )
        _enrollment_threads[camera_id] = thread
        thread.start()

    return {
        "status": "success",
        "message": "Auto-enrollment capture started successfully.",
        "cluster_id": cluster_id,
        "instructions": "Please face the camera, slowly rotate head left, right, tilt up, and down."
    }


@router.post("/complete")
async def complete_enrollment(request: CompleteEnrollmentRequest, db: Session = Depends(get_db)):
    """Complete enrollment, process face average embeddings, FAISS indexing, and save Student Profile."""
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
        return {
            "status": "success",
            "message": f"Student '{request.name}' successfully enrolled and attendance-ready.",
            "student": student_data
        }
    except ValueError as val_err:
        raise HTTPException(status_code=400, detail=str(val_err))
    except Exception as e:
        logger.error(f"Failed to complete student enrollment: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Enrollment completion failed: {str(e)}"
        )


# Add CRUD student methods in this router as well to keep API endpoints grouped nicely
@router.get("/students")
def get_all_students(db: Session = Depends(get_db)):
    """Retrieve all enrolled student records."""
    students = db.query(Student).all()
    response = []
    for s in students:
        profile = db.query(FaceProfile).filter(FaceProfile.student_id == s.id).filter(FaceProfile.is_active == True).first()
        response.append({
            "id": s.id,
            "name": s.name,
            "usn": s.usn,
            "department": s.department,
            "semester": s.semester,
            "section": s.section,
            "created_at": s.created_at.isoformat(),
            "face_profile_version": profile.version if profile else None,
            "quality_score": profile.quality_score if profile else None
        })
    return response


@router.get("/students/{usn}")
def get_student_by_usn(usn: str, db: Session = Depends(get_db)):
    """Retrieve details and version history of an enrolled student."""
    s = db.query(Student).filter(Student.usn == usn).first()
    if not s:
        raise HTTPException(status_code=404, detail=f"Student with USN '{usn}' not found.")
        
    profiles = db.query(FaceProfile).filter(FaceProfile.student_id == s.id).order_by(FaceProfile.version.desc()).all()
    
    profile_history = []
    for p in profiles:
        emb = db.query(Embedding).filter(Embedding.face_profile_id == p.id).first()
        profile_history.append({
            "version": p.version,
            "quality_score": p.quality_score,
            "accuracy_estimate": p.accuracy_estimate,
            "is_active": p.is_active,
            "created_at": p.created_at.isoformat(),
            "vector_path": emb.vector_path if emb else None
        })

    return {
        "id": s.id,
        "name": s.name,
        "usn": s.usn,
        "department": s.department,
        "semester": s.semester,
        "section": s.section,
        "created_at": s.created_at.isoformat(),
        "profile_history": profile_history
    }
