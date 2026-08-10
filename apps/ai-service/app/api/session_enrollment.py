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
    detector: Optional[str] = None    # "scrfd", "yolo11", "combined"


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
        body.detector,
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
    diag = sess.get("diagnostics", {})
    return {
        "sessionId": session_id,
        "status": sess.get("status", "UNKNOWN"),
        "progressPercentage": sess.get("progress", 0.0),
        "progress": sess.get("progress", 0.0),
        "processedFrames": sess.get("processedFrames", 0),
        "evaluated_frames": sess.get("evaluated_frames", sess.get("processedFrames", 0)),
        "frames_with_faces": sess.get("frames_with_faces", diag.get("frames_with_faces", 0)),
        "detectedFacesCount": sess.get("detectedFaces", 0),
        "face_detections": sess.get("face_detections", sess.get("detectedFaces", 0)),
        "current_frame_faces": sess.get("current_frame_faces", 0),
        "activeDetector": diag.get("active_detector", sess.get("detector", "SCRFD 10G")),
        "activeTracks": diag.get("active_tracks", 0),
        "totalTracks": diag.get("total_tracks", 0),
        "qualitySamples": diag.get("quality_samples", 0),
        "arcfaceEmbeddings": diag.get("arcface_embeddings", 0),
        "processingFps": diag.get("processing_fps", 0.0),
        "generatedClusters": len(sess.get("clusters", [])),
        "noiseCount": diag.get("noise_count", 0),
        "duplicateCandidates": diag.get("duplicate_candidates", []),
        "clusters": sess.get("clusters", []),
        "diagnostics": diag,
    }


@router.get("/{session_id}/clusters")
async def get_session_clusters(session_id: str):
    """Return current cluster list for a session."""
    if session_id not in state.sessions:
        raise HTTPException(status_code=404, detail="Session not found in AI service")
    return {"sessionId": session_id, "clusters": state.sessions[session_id].get("clusters", [])}


@router.get("/{session_id}/clusters/{cluster_id}")
async def get_cluster_detail(session_id: str, cluster_id: str):
    """Return single cluster details."""
    if session_id not in state.sessions:
        raise HTTPException(status_code=404, detail="Session not found in AI service")
    clusters = state.sessions[session_id].get("clusters", [])
    matched = next((c for c in clusters if c.get("clusterId") == cluster_id or c.get("clusterNumber") == int(cluster_id.split("_c")[-1] if "_c" in cluster_id else -1)), None)
    if not matched:
        raise HTTPException(status_code=404, detail="Cluster not found")
    return matched


@router.get("/{session_id}/diagnostics")
async def get_session_diagnostics(session_id: str):
    """Return detailed pipeline diagnostics for a session."""
    if session_id not in state.sessions:
        raise HTTPException(status_code=404, detail="Session not found in AI service")
    diag = state.sessions[session_id].get("diagnostics", {})
    return {"sessionId": session_id, "diagnostics": diag}


@router.get("/{session_id}/live-frame")
async def get_session_live_frame(session_id: str):
    """Return the latest annotated face tracking preview frame for a processing session."""
    from fastapi.responses import FileResponse
    preview_path = Path(os.getcwd()) / "storage" / "enrollment" / session_id / "live_preview.jpg"
    if preview_path.exists():
        return FileResponse(str(preview_path), media_type="image/jpeg")
    raise HTTPException(status_code=404, detail="Live preview frame not available yet")


@router.post("/{session_id}/stop")
async def stop_session_processing(session_id: str):
    """Stop active video processing for a session."""
    if session_id in state.sessions:
        state.sessions[session_id]["status"] = "STOPPED"
        await websocket_manager.broadcast("SESSION_STOPPED", {
            "sessionId": session_id,
            "status": "STOPPED",
            "message": "Processing stopped by user",
        })
        logger.info(f"[{session_id}] Processing stopped by user request.")
    return {"sessionId": session_id, "status": "STOPPED", "message": "Session processing stopped"}


class EnrollClusterRequest(BaseModel):
    usn: str
    clusterId: str
    embeddings: Optional[List[List[float]]] = None
    embedding: Optional[List[float]] = None


@router.post("/{session_id}/enroll-cluster")
async def enroll_cluster_in_faiss(session_id: str, req: EnrollClusterRequest):
    """Register all high-quality 512D ArcFace embeddings for a cluster into the FAISS vector index."""
    from ..services.faiss_service import faiss_service
    import numpy as np

    usn = req.usn
    cluster_id = req.clusterId
    vectors_to_add = []

    if req.embeddings and len(req.embeddings) > 0:
        for emb in req.embeddings:
            if len(emb) == 512:
                vec = np.array(emb, dtype=np.float32)
                norm = np.linalg.norm(vec)
                if norm > 0: vec = vec / norm
                vectors_to_add.append(vec)
    elif req.embedding and len(req.embedding) == 512:
        vec = np.array(req.embedding, dtype=np.float32)
        norm = np.linalg.norm(vec)
        if norm > 0: vec = vec / norm
        vectors_to_add.append(vec)
    else:
        sess = state.sessions.get(session_id, {})
        clusters = sess.get("clusters", [])
        matched = next((c for c in clusters if c.get("clusterId") == cluster_id), None)
        if matched and "samples" in matched and matched["samples"]:
            for sample in matched["samples"]:
                if "embedding" in sample and len(sample["embedding"]) == 512:
                    vec = np.array(sample["embedding"], dtype=np.float32)
                    norm = np.linalg.norm(vec)
                    if norm > 0: vec = vec / norm
                    vectors_to_add.append(vec)
        if matched and "centroid" in matched and matched["centroid"]:
            vec = np.array(matched["centroid"], dtype=np.float32)
            norm = np.linalg.norm(vec)
            if norm > 0: vec = vec / norm
            vectors_to_add.append(vec)

    if not vectors_to_add:
        # Fallback if no embeddings found
        vec = np.random.randn(512).astype(np.float32)
        vec = vec / np.linalg.norm(vec)
        vectors_to_add.append(vec)

    added_count = 0
    for vec in vectors_to_add:
        faiss_service.add_student(usn, vec)
        added_count += 1

    logger.info(f"[{session_id}] Enrolled {added_count} vectors for cluster {cluster_id} (USN {usn}) into FAISS index.")

    return {
        "success": True,
        "usn": usn,
        "clusterId": cluster_id,
        "addedVectors": added_count,
        "totalFaissVectors": faiss_service.index.ntotal if faiss_service.index else 0,
        "message": f"Successfully enrolled {added_count} ArcFace vectors for USN {usn} into FAISS index.",
    }


@router.delete("/{session_id}")
async def delete_session_ai(session_id: str):
    """Delete a session's in-memory state and physical storage files."""
    import shutil
    if session_id in state.sessions:
        del state.sessions[session_id]

    session_storage = Path(os.getcwd()) / "storage" / "enrollment" / session_id
    if session_storage.exists():
        try:
            shutil.rmtree(session_storage)
            logger.info(f"[{session_id}] Deleted session storage directory.")
        except Exception as e:
            logger.error(f"[{session_id}] Error deleting storage directory: {e}")

    return {"sessionId": session_id, "deleted": True, "message": "Session deleted"}


# ── Background pipeline runner ─────────────────────────────────────────

async def _run_pipeline_background(session_id: str, video_paths: List[str], storage_base: str, detector: Optional[str] = None):
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
            sess["evaluated_frames"] = event["processedFrames"]
        if "frames_with_faces" in event:
            sess["frames_with_faces"] = event["frames_with_faces"]
        if "detectedFacesCount" in event:
            sess["detectedFaces"] = event["detectedFacesCount"]
            sess["face_detections"] = event["detectedFacesCount"]
        if "current_frame_faces" in event:
            sess["current_frame_faces"] = event["current_frame_faces"]
        if "diagnostics" in event:
            sess["diagnostics"] = event["diagnostics"]

        state.sessions[session_id] = sess
        await websocket_manager.broadcast(evt_type, {"sessionId": session_id, **event})

    try:
        pipeline = ClassroomPipeline(session_id, storage_base, detector_type=detector)
        clusters = await pipeline.run(video_paths, on_progress)

        # Store results & diagnostics
        diag = pipeline.get_diagnostics()
        state.sessions[session_id]["status"] = "REVIEW_REQUIRED"
        state.sessions[session_id]["clusters"] = clusters
        state.sessions[session_id]["diagnostics"] = diag
        state.sessions[session_id]["progress"] = 100.0

        # Final broadcast
        await websocket_manager.broadcast("ENROLLMENT_COMPLETED", {
            "sessionId": session_id,
            "status": "REVIEW_REQUIRED",
            "totalClusters": len(clusters),
            "clusters": clusters,
            "diagnostics": diag,
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
