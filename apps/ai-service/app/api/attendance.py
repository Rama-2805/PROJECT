"""SmartCampus AI — Attendance Router."""

import logging
from typing import Optional
from pydantic import BaseModel, Field
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from ..config.settings import settings
from ..config.database import get_db
from ..models.attendance import Attendance
from ..models.student import Student
from ..services.attendance_engine import attendance_engine

logger = logging.getLogger("smartcampus.attendance_api")

router = APIRouter(prefix=f"{settings.api_prefix}/attendance", tags=["Real-Time Attendance Engine"])


class StartAttendanceRequest(BaseModel):
    camera_id: str = Field("webcam", description="Camera identifier to start capturing from.")
    class_id: str = Field(..., description="Target class/lecture identifier.")
    source_path: str = Field("0", description="USB Webcam index string or RTSP live stream URL.")


class StopAttendanceRequest(BaseModel):
    camera_id: str = Field("webcam", description="Camera identifier to stop.")


@router.post("/start")
@router.post("/session/start")
def start_attendance_loop(request: StartAttendanceRequest):
    """Start the real-time CCTV attendance marking pipeline on a camera feed."""
    success = attendance_engine.start_attendance_session(
        camera_id=request.camera_id,
        class_id=request.class_id,
        source_path=request.source_path
    )
    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to start attendance capture pipeline on source '{request.source_path}'."
        )

    return {
        "status": "success",
        "message": f"Real-time attendance loop started successfully for camera '{request.camera_id}', class '{request.class_id}'."
    }


@router.post("/stop")
@router.post("/session/stop")
def stop_attendance_loop(request: StopAttendanceRequest):
    """Stop the attendance loop on a camera feed."""
    stopped = attendance_engine.stop_attendance_session(request.camera_id)
    if not stopped:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No active attendance session running on camera '{request.camera_id}'."
        )

    return {
        "status": "success",
        "message": f"Real-time attendance loop stopped for camera '{request.camera_id}'."
    }


class ProcessVideoAttendanceRequest(BaseModel):
    video_path: str = Field(..., description="Path to classroom video file")
    class_id: str = Field("CSE_7A", description="Target class/lecture identifier")
    confidence_threshold: float = Field(0.58, description="Minimum cosine similarity score")
    required_confirmations: int = Field(3, description="Minimum frame confirmations")


@router.post("/process-video")
def process_video_attendance_endpoint(req: ProcessVideoAttendanceRequest):
    """Process a recorded classroom video file against FAISS to mark attendance."""
    try:
        results = attendance_engine.process_video_attendance(
            video_path=req.video_path,
            class_id=req.class_id,
            confidence_threshold=req.confidence_threshold,
            required_confirmations=req.required_confirmations,
        )
        return {"status": "success", "data": results}
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Error processing video attendance: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/report")
def get_attendance_report(
    class_id: str = Query(..., description="Filter records by class/lecture identifier."),
    date: str = Query(..., description="Filter records by date (YYYY-MM-DD)."),
    db: Session = Depends(get_db)
):
    """Retrieve the attendance log report for a specific class and date."""
    records = (
        db.query(Attendance)
        .filter(Attendance.class_id == class_id)
        .filter(Attendance.date == date)
        .all()
    )

    report_list = []
    for r in records:
        student = db.query(Student).filter(Student.id == r.student_id).first()
        if student:
            report_list.append({
                "id": r.id,
                "usn": student.usn,
                "name": student.name,
                "department": student.department,
                "semester": student.semester,
                "section": student.section,
                "time": r.time,
                "confidence": r.confidence,
                "status": r.status
            })

    return {
        "class_id": class_id,
        "date": date,
        "total_present": len(report_list),
        "attendance": report_list
    }


@router.get("/live-session-status")
def get_live_session_status():
    """Retrieve real-time attendance recognition and behavior status for the running session."""
    return {
        "status": "success",
        "recognized_students": attendance_engine.session_recognized_students,
        "total_recognized": len(attendance_engine.session_recognized_students),
        "behavior_states": attendance_engine.student_behavior_states,
    }

