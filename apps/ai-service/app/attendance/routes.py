"""SmartCampus AI — Real-Time Attendance API Routes."""

import time
import uuid
from typing import List, Optional

from fastapi import APIRouter, HTTPException, WebSocket, WebSocketDisconnect

from ..config.settings import settings
from ..camera.camera_manager import camera_manager, CameraConfig, CameraSource
from ..recognition.face_recognizer import face_recognizer
from ..attendance.attendance_engine import attendance_engine
from ..streaming.live_pipeline import live_pipeline

router = APIRouter(prefix=f"{settings.api_prefix}/attendance", tags=["Attendance"])

# Active WebSocket connections for live updates
live_connections: dict[str, list[WebSocket]] = {}


@router.post("/sessions/start")
async def start_session(
    session_id: str,
    classroom_id: str,
    subject: str = "",
    teacher: str = "",
):
    """Start a new attendance session for a classroom."""
    session = attendance_engine.start_session(
        session_id=session_id,
        classroom_id=classroom_id,
        subject=subject,
        teacher=teacher,
    )
    return {"message": "Session started", "session": session}


@router.post("/sessions/{session_id}/end")
async def end_session(session_id: str):
    """End an attendance session and return summary."""
    summary = attendance_engine.end_session(session_id)
    if not summary:
        raise HTTPException(status_code=404, detail="Session not found")
    return {"message": "Session ended", "summary": summary}


@router.get("/sessions/{session_id}/stats")
async def get_session_stats(session_id: str):
    """Get current statistics for a session."""
    stats = attendance_engine.get_session_stats(session_id)
    if not stats:
        raise HTTPException(status_code=404, detail="Session not found")
    return stats


@router.get("/sessions/{session_id}/present")
async def get_present_students(session_id: str):
    """Get all students currently marked present."""
    students = attendance_engine.get_present_students(session_id)
    return {"session_id": session_id, "present_count": len(students), "students": students}


@router.post("/cameras/register")
async def register_camera(
    camera_id: str,
    classroom_id: str,
    source: str = "WEBCAM",
    source_path: str = "0",
    location: str = "",
):
    """Register a camera for live monitoring."""
    try:
        source_type = CameraSource(source)
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Invalid camera source: {source}")

    config = CameraConfig(
        camera_id=camera_id,
        classroom_id=classroom_id,
        source=source_type,
        source_path=source_path,
        location=location,
    )
    camera_manager.register_camera(config)
    success = camera_manager.start_camera(camera_id)

    return {
        "message": "Camera registered",
        "camera_id": camera_id,
        "started": success,
    }


@router.post("/cameras/{camera_id}/start")
async def start_camera(camera_id: str, session_id: str):
    """Start the processing pipeline for a camera."""
    success = camera_manager.start_camera(camera_id)
    if not success:
        raise HTTPException(status_code=404, detail="Camera not found")

    live_pipeline.start_pipeline(camera_id, session_id)
    return {"message": "Pipeline started", "camera_id": camera_id}


@router.post("/cameras/{camera_id}/stop")
async def stop_camera(camera_id: str):
    """Stop the camera and pipeline."""
    live_pipeline.stop_pipeline(camera_id)
    camera_manager.stop_camera(camera_id)
    return {"message": "Camera stopped", "camera_id": camera_id}


@router.get("/cameras")
async def list_cameras():
    """List all registered cameras with states."""
    return {"cameras": camera_manager.list_cameras()}


@router.get("/cameras/{camera_id}/health")
async def camera_health(camera_id: str):
    """Get health metrics for a specific camera."""
    return camera_manager.get_health(camera_id)


@router.get("/pipeline/status")
async def pipeline_status():
    """Get live pipeline processing status."""
    return live_pipeline.get_pipeline_status()


@router.get("/pipeline/latency")
async def pipeline_latency():
    """Get processing latency statistics."""
    return live_pipeline.get_latency_stats()


@router.post("/database/load")
async def load_face_database(embeddings: list):
    """Load student embeddings into the recognition database."""
    formatted = []
    for emb in embeddings:
        formatted.append((emb["student_id"], emb["student_name"], emb["embedding"]))
    count = face_recognizer.load_database(formatted)
    return {"message": f"Loaded {count} embeddings", "count": count}


@router.websocket("/live/{session_id}")
async def live_feed(websocket: WebSocket, session_id: str):
    """WebSocket endpoint for real-time attendance updates."""
    await websocket.accept()

    if session_id not in live_connections:
        live_connections[session_id] = []
    live_connections[session_id].append(websocket)

    try:
        while True:
            # Keep connection alive and listen for any client messages
            data = await websocket.receive_text()
            # Handle client commands (e.g., refresh, filter)
    except WebSocketDisconnect:
        pass
    finally:
        if session_id in live_connections:
            live_connections[session_id].remove(websocket)
            if not live_connections[session_id]:
                del live_connections[session_id]
