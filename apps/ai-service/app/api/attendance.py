"""SmartCampus AI — Attendance Router."""

import logging
from typing import Optional, List
from pydantic import BaseModel, Field
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from ..config.settings import settings
from ..config.database import get_db
from ..models.attendance import Attendance
from ..models.student import Student
from ..services.attendance_engine import attendance_engine
from ..services.security_service import verify_internal_api_key

logger = logging.getLogger("smartcampus.attendance_api")

router = APIRouter(prefix=f"{settings.api_prefix}/attendance", tags=["Real-Time Attendance Engine"])


class StartAttendanceRequest(BaseModel):
    camera_id: str = Field("webcam", description="Camera identifier to start capturing from.")
    class_id: str = Field(..., description="Target class/lecture identifier.")
    session_id: Optional[str] = Field(None, description="Canonical attendance session identifier from backend (e.g. SESS_xxx or CUID).")
    source_path: str = Field("0", description="USB Webcam index string or RTSP live stream URL.")
    enrolled_usns: Optional[List[str]] = Field(None, description="Roster of enrolled student USNs to restrict candidate recognition.")


class StopAttendanceRequest(BaseModel):
    camera_id: Optional[str] = Field(None, description="Camera identifier to stop (or omit to stop all).")


@router.post("/start")
@router.post("/session/start")
def start_attendance_loop(
    request: StartAttendanceRequest,
    _: str = Depends(verify_internal_api_key),
):
    """Start the real-time CCTV attendance marking pipeline on a camera feed."""
    success = attendance_engine.start_attendance_session(
        camera_id=request.camera_id,
        class_id=request.class_id,
        source_path=request.source_path,
        session_id=request.session_id,
        enrolled_usns=request.enrolled_usns,
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
def stop_attendance_loop(
    request: Optional[StopAttendanceRequest] = None,
    _: str = Depends(verify_internal_api_key),
):
    """Stop the attendance loop on a camera feed or all feeds."""
    cam_id = request.camera_id if request else None
    attendance_engine.stop_attendance_session(cam_id)
    return {
        "status": "success",
        "message": f"Real-time attendance loop stopped."
    }


class ProcessVideoAttendanceRequest(BaseModel):
    video_path: str = Field(..., description="Path to classroom video file")
    class_id: str = Field("CSE_7A", description="Target class/lecture identifier")
    session_id: Optional[str] = Field(None, description="Canonical attendance session identifier from backend")
    confidence_threshold: float = Field(0.58, description="Minimum cosine similarity score")
    required_confirmations: int = Field(3, description="Minimum frame confirmations")
    enrolled_usns: Optional[List[str]] = Field(None, description="Optional roster of enrolled student USNs to restrict video matching")


@router.post("/process-video")
def process_video_attendance_endpoint(
    req: ProcessVideoAttendanceRequest,
    _: str = Depends(verify_internal_api_key),
):
    """Process a recorded classroom video file against FAISS to mark attendance."""
    try:
        results = attendance_engine.process_video_attendance(
            video_path=req.video_path,
            class_id=req.class_id,
            session_id=req.session_id,
            confidence_threshold=req.confidence_threshold,
            required_confirmations=req.required_confirmations,
            enrolled_usns=req.enrolled_usns,
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
    cam_id = next(iter(attendance_engine.active_sessions.keys()), "room-023")
    active_sess = attendance_engine.active_sessions.get(cam_id, {})
    tracker = active_sess.get("tracker")
    tracks_info = []
    if tracker:
        t_objs = tracker.tracks.values() if isinstance(getattr(tracker, "tracks", None), dict) else getattr(tracker, "tracks", [])
        for t in t_objs:
            tracks_info.append({
                "track_id": getattr(t, "track_id", str(t)),
                "student_usn": getattr(t, "student_usn", None),
                "student_name": getattr(t, "student_name", None),
                "marked": getattr(t, "attendance_marked", False),
                "conf": getattr(t, "recognition_confidence", 0.0),
                "hits": len(getattr(t, "confidence_history", [])),
                "bbox": [round(float(x), 1) for x in t.bbox] if hasattr(t, "bbox") else None,
            })
    return {
        "status": "success",
        "camera_id": cam_id,
        "recognized_students": attendance_engine.session_recognized_students,
        "total_recognized": len(attendance_engine.session_recognized_students),
        "marked_students": list(active_sess.get("marked_students", set())),
        "total_marked": len(active_sess.get("marked_students", set())),
        "total_active_tracks": len(tracks_info),
        "tracks": tracks_info,
        "behavior_states": attendance_engine.student_behavior_states,
    }

