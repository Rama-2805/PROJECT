"""SmartCampus AI — Session-Based Classroom Enrollment API.

Endpoints for processing classroom lecture videos and managing enrollment sessions
at the AI-service level. These are called by the NestJS API Gateway.
"""

import os
import logging
import asyncio
from pathlib import Path
from typing import List, Optional
from pydantic import BaseModel
from fastapi import APIRouter, HTTPException, BackgroundTasks
from ..config.settings import settings
from .websocket import websocket_manager

logger = logging.getLogger("smartcampus.session_enrollment")

router = APIRouter(prefix=f"{settings.api_prefix}/sessions", tags=["Session Enrollment"])

# ── Pydantic models ────────────────────────────────────────────────────

class ProcessSessionRequest(BaseModel):
    videoPaths: List[str]
    storageDir: Optional[str] = None  # Override default storage base dir


class ClusterSyncRequest(BaseModel):
    """Used by NestJS to sync AI clusters into Postgres via Prisma."""
    clusters: List[dict]


class ProcessingState:
    """In-memory registry of active processing jobs."""
    sessions: dict = {}  # session_id -> {"status", "progress", "clusters"}


state = ProcessingState()


# ── Endpoints ──────────────────────────────────────────────────────────

@router.post("/{session_id}/process")
async def process_session_videos(
    session_id: str,
    body: ProcessSessionRequest,
    background_tasks: BackgroundTasks,
):
    """
    Start asynchronous AI processing of classroom lecture videos.

    Triggers the classroom pipeline in a background task and immediately returns
    so NestJS can poll for status. Progress is broadcast over WebSocket.
    """
    if session_id in state.sessions and state.sessions[session_id].get("status") == "PROCESSING":
        return {
            "status": "already_processing",
            "sessionId": session_id,
            "message": "Session is already being processed.",
        }

    # Validate video paths exist
    missing = [p for p in body.videoPaths if not os.path.exists(p)]
    if missing:
        raise HTTPException(
            status_code=404,
            detail=f"Video files not found: {missing[:3]}{'...' if len(missing) > 3 else ''}",
        )

    storage_base = body.storageDir or str(Path(os.getcwd()) / "storage")

    # Register session as processing
    state.sessions[session_id] = {
        "status": "PROCESSING",
        "progress": 0.0,
        "clusters": [],
        "processedFrames": 0,
        "detectedFaces": 0,
    }

    # Broadcast start event
    await websocket_manager.broadcast("SESSION_PROCESSING_STARTED", {
        "sessionId": session_id,
        "totalVideos": len(body.videoPaths),
        "status": "PROCESSING",
    })

    # Launch background task
    background_tasks.add_task(
        _run_pipeline_background,
        session_id,
        body.videoPaths,
        storage_base,
    )

    return {
        "status": "started",
        "sessionId": session_id,
        "totalVideos": len(body.videoPaths),
        "message": "AI pipeline started. Connect to WebSocket for live updates.",
        "websocketUrl": "/api/v1/ws",
    }


@router.get("/{session_id}/status")
async def get_session_status(session_id: str):
    """Poll current processing status for a session."""
    if session_id not in state.sessions:
        raise HTTPException(status_code=404, detail="Session not found in AI service")

    sess = state.sessions[session_id]
    return {
        "sessionId": session_id,
        "status": sess.get("status", "UNKNOWN"),
        "progressPercentage": sess.get("progress", 0.0),
        "processedFrames": sess.get("processedFrames", 0),
        "detectedFacesCount": sess.get("detectedFaces", 0),
        "generatedClusters": len(sess.get("clusters", [])),
        "clusters": sess.get("clusters", []),
    }


@router.get("/{session_id}/clusters")
async def get_session_clusters(session_id: str):
    """Return current cluster list for a session."""
    if session_id not in state.sessions:
        raise HTTPException(status_code=404, detail="Session not found in AI service")
    return {"sessionId": session_id, "clusters": state.sessions[session_id].get("clusters", [])}


# ── Background pipeline runner ─────────────────────────────────────────

async def _run_pipeline_background(session_id: str, video_paths: List[str], storage_base: str):
    """Run classroom pipeline and update in-memory state + broadcast WS events."""
    from ..services.classroom_pipeline import ClassroomPipeline

    async def on_progress(event: dict):
        """Update in-memory state and broadcast every progress tick."""
        evt_type = event.pop("event", "PROCESSING_PROGRESS")
        sess = state.sessions.get(session_id, {})

        if "progressPercentage" in event:
            sess["progress"] = event["progressPercentage"]
        if "processedFrames" in event:
            sess["processedFrames"] = event["processedFrames"]
        if "detectedFacesCount" in event:
            sess["detectedFaces"] = event["detectedFacesCount"]

        state.sessions[session_id] = sess
        await websocket_manager.broadcast(evt_type, {"sessionId": session_id, **event})

    try:
        pipeline = ClassroomPipeline(session_id, storage_base)
        clusters = await pipeline.run(video_paths, on_progress)

        # Store results
        state.sessions[session_id]["status"] = "REVIEW_REQUIRED"
        state.sessions[session_id]["clusters"] = clusters
        state.sessions[session_id]["progress"] = 100.0

        # Final broadcast
        await websocket_manager.broadcast("ENROLLMENT_COMPLETED", {
            "sessionId": session_id,
            "status": "REVIEW_REQUIRED",
            "totalClusters": len(clusters),
            "clusters": clusters,
            "progressPercentage": 100.0,
        })

        logger.info(f"[{session_id}] Pipeline finished: {len(clusters)} clusters.")

    except Exception as exc:
        logger.error(f"[{session_id}] Pipeline failed: {exc}", exc_info=True)
        state.sessions[session_id]["status"] = "FAILED"
        await websocket_manager.broadcast("SESSION_FAILED", {
            "sessionId": session_id,
            "status": "FAILED",
            "error": str(exc),
        })
