"""SmartCampus AI — Behavioral Analytics API Routes."""

import time
import uuid
from typing import Optional

from fastapi import APIRouter, HTTPException, WebSocket, WebSocketDisconnect
from pydantic import BaseModel, Field

from ..config.settings import settings
from .models import BehaviorEvent, AlertSeverity
from .classifier.behavior_classifier import behavior_classifier
from .scoring.engagement_scorer import engagement_scorer
from .tracker.student_tracker import student_tracker
from .alerts.alert_engine import alert_engine
from .analytics.behavior_analytics import behavior_analytics

router = APIRouter(prefix=f"{settings.api_prefix}/behavior", tags=["Behavior"])

# WebSocket connections for live behavior updates
live_connections: dict[str, list[WebSocket]] = {}


class StartBehaviorSessionRequest(BaseModel):
    camera_id: str = Field("room-023", description="Camera identifier to monitor.")
    class_id: str = Field(..., description="Target class/lecture identifier.")
    source_path: str = Field("footage", description="Video source: folder path, file path, webcam index or RTSP URL.")
    session_id: Optional[str] = Field(None, description="Actual attendance/class session identifier (e.g. SESS_xxx). If omitted, a deterministic reference is maintained.")


class StopBehaviorSessionRequest(BaseModel):
    camera_id: Optional[str] = Field(None, description="Camera identifier to stop (or omit to stop all).")


@router.post("/session/start")
def start_behavior_session(req: StartBehaviorSessionRequest):
    """Start the behavioural monitoring pipeline for a class.

    Behavioural mode processes frames and generates behavioural events only —
    attendance is never marked from this pipeline.
    """
    from ..services.attendance_engine import attendance_engine

    if not req.class_id or not req.class_id.strip():
        raise HTTPException(status_code=400, detail="A valid class_id is required to start behavioral monitoring.")

    try:
        started = attendance_engine.start_behavior_session(
            camera_id=req.camera_id,
            class_id=req.class_id,
            source_path=req.source_path,
            session_id=req.session_id,
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Behavioral pipeline failed to start: {exc}")

    if not started:
        raise HTTPException(
            status_code=500,
            detail=f"Behavioral monitoring could not start for camera '{req.camera_id}'. Check the video/camera source.",
        )

    return {
        "status": "success",
        "mode": "behavior",
        "camera_id": req.camera_id,
        "class_id": req.class_id,
        "started_at": time.time(),
        "message": "Behavioral monitoring started.",
    }


@router.post("/session/stop")
def stop_behavior_session(req: Optional[StopBehaviorSessionRequest] = None):
    """Stop behavioural monitoring and resolve any open behavioural events."""
    from ..services.attendance_engine import attendance_engine

    cam_id = req.camera_id if req else None
    attendance_engine.stop_behavior_session(cam_id)
    return {"status": "success", "mode": "behavior", "message": "Behavioral monitoring stopped."}


@router.get("/session/status")
def get_behavior_session_status():
    """Return truthful behavioural session + processing status (no simulated values)."""
    from ..services.attendance_engine import attendance_engine
    from .detector.hybrid_behavior_pipeline import hybrid_behavior_pipeline

    status = attendance_engine.get_behavior_session_status()
    try:
        detection_ok = hybrid_behavior_pipeline.yolo_model is not None
    except Exception:
        detection_ok = False
    try:
        pose_ok = hybrid_behavior_pipeline.pose_model is not None
    except Exception:
        pose_ok = False
    status["pipeline"] = {
        "object_detection_available": detection_ok,
        "pose_estimation_available": pose_ok,
        "behavioral_processing_available": bool(detection_ok),
    }
    return status


@router.get("/live")
async def get_live_behavior(camera_id: Optional[str] = None):
    """Retrieve live orientation-based attention and behavioral measurements from attendance engine."""
    from ..services.attendance_engine import attendance_engine
    return attendance_engine.get_live_behavior_metrics(camera_id)


@router.post("/ingest")
async def ingest_behavior(event: BehaviorEvent):
    """Receive a behavior event from the AI service."""
    behavior_analytics.record_behavior(event)
    alert = alert_engine.process_behavior(event)

    return {
        "message": "Behavior ingested",
        "event_id": str(uuid.uuid4()),
        "alert_generated": alert is not None,
        "alert": alert.model_dump() if alert else None,
    }


@router.get("/events")
async def get_behavior_events(
    student_id: Optional[str] = None,
    behavior_type: Optional[str] = None,
    limit: int = 50,
):
    """Get recent behavior events with optional filtering."""
    events = behavior_analytics._behavior_log

    if student_id:
        events = [e for e in events if e.student_id == student_id]
    if behavior_type:
        events = [e for e in events if e.behavior_type.value == behavior_type]

    events = events[-limit:]
    return {"total": len(events), "events": [e.model_dump() for e in events]}


@router.get("/student/{student_id}")
async def get_student_behavior(student_id: str):
    """Get behavior analytics for a specific student."""
    events = [e for e in behavior_analytics._behavior_log if e.student_id == student_id]
    engagement = [r for r in behavior_analytics._engagement_log if r.student_id == student_id]

    recent_events = [e.model_dump() for e in events[-20:]]
    recent_engagement = [r.model_dump() for r in engagement[-20:]]

    return {
        "student_id": student_id,
        "total_events": len(events),
        "recent_events": recent_events,
        "engagement_trend": recent_engagement,
    }


@router.get("/analytics")
async def get_behavior_analytics():
    """Get comprehensive behavior analytics."""
    return behavior_analytics.get_classroom_comparison()


@router.get("/engagement/trend")
async def get_engagement_trend(minutes: int = 30):
    """Get engagement score trend."""
    return {"trend": behavior_analytics.get_engagement_trend(minutes)}


@router.get("/engagement/summary")
async def get_engagement_summary():
    """Get current engagement summary."""
    return behavior_analytics.get_engagement_summary()


@router.get("/alerts")
async def get_alerts(severity: Optional[str] = None):
    """Get active alerts, optionally filtered by severity."""
    sev = AlertSeverity(severity) if severity else None
    alerts = alert_engine.get_active_alerts(sev)
    return {
        "total": len(alerts),
        "alerts": [a.model_dump() for a in alerts],
        "stats": alert_engine.get_stats(),
    }


@router.patch("/alerts/{alert_id}/acknowledge")
async def acknowledge_alert(alert_id: str, by: str = "teacher"):
    """Acknowledge an alert."""
    alert = alert_engine.acknowledge(alert_id, by)
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    return {"message": "Alert acknowledged", "alert": alert.model_dump()}


@router.patch("/alerts/{alert_id}/dismiss")
async def dismiss_alert(alert_id: str):
    """Dismiss an alert."""
    alert = alert_engine.dismiss(alert_id)
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    return {"message": "Alert dismissed", "alert": alert.model_dump()}


@router.get("/distribution")
async def get_behavior_distribution(minutes: int = 60):
    """Get behavior type distribution."""
    return {"distribution": behavior_analytics.get_behavior_distribution(minutes)}


@router.websocket("/live")
async def behavior_websocket(websocket: WebSocket):
    """WebSocket for real-time behavior updates."""
    await websocket.accept()
    connection_id = str(uuid.uuid4())
    live_connections[connection_id] = [websocket]

    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        pass
    finally:
        live_connections.pop(connection_id, None)
