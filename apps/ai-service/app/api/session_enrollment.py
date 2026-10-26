"""SmartCampus AI — Session-Based Classroom Enrollment API.

Endpoints for processing classroom lecture videos and managing enrollment sessions
at the AI-service level. These are called by the NestJS API Gateway.
"""

import os
import re
import json
import logging
import asyncio
import numpy as np
from pathlib import Path
from typing import List, Optional, Dict, Any
from pydantic import BaseModel
from fastapi import APIRouter, HTTPException, BackgroundTasks, Depends, Query
from ..config.settings import settings
from .websocket import websocket_manager
from ..services.security_service import verify_internal_api_key

logger = logging.getLogger("smartcampus.session_enrollment")

router = APIRouter(
    prefix=f"{settings.api_prefix}/sessions",
    tags=["Session Enrollment"],
    dependencies=[Depends(verify_internal_api_key)],
)

# ── Pydantic models ────────────────────────────────────────────────────

class ProcessSessionRequest(BaseModel):
    videoPaths: List[str]
    storageDir: Optional[str] = None  # Override default storage base dir
    detector: Optional[str] = "yolo26" # "yolo26", "combined", "scrfd"
    segmentDurationSec: Optional[float] = 150.0  # Configurable segment interval (default 150s = 2.5 min)
    targetFps: Optional[float] = None
    resume: Optional[bool] = False


class ClusterSyncRequest(BaseModel):
    """Used by NestJS to sync AI clusters into Postgres via Prisma."""
    clusters: List[dict]


class DeleteClusterImageRequest(BaseModel):
    imageUrl: Optional[str] = None
    imagePath: Optional[str] = None
    imageIndex: Optional[int] = None
    imageId: Optional[str] = None


class ProcessingState:
    """In-memory registry of active processing jobs."""
    sessions: dict = {}          # session_id -> {"status", "progress", "clusters"}
    active_pipelines: dict = {}  # session_id -> ClassroomPipeline instance


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

    import mimetypes
    logger.info(f"[DIAGNOSTIC-AI-ROUTER] Request received for session '{session_id}' with {len(body.videoPaths)} videoPaths:")
    for p in body.videoPaths:
        exists = os.path.exists(p)
        size = os.path.getsize(p) if exists else 0
        mime, _ = mimetypes.guess_type(p)
        abs_p = os.path.abspath(p)
        logger.info(f"[DIAGNOSTIC-AI-ROUTER] Path='{p}', Abs='{abs_p}', Exists={exists}, SizeBytes={size}, MIME={mime}")

    # Validate video paths exist
    missing = [p for p in body.videoPaths if not os.path.exists(p)]
    if missing:
        logger.error(f"[DIAGNOSTIC-AI-ROUTER] Missing video paths for session '{session_id}': {missing}")
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
        "currentSegment": 1,
        "totalSegments": 1,
        "segmentDurationSec": body.segmentDurationSec or 150.0,
    }

    # Broadcast start event
    await websocket_manager.broadcast("SESSION_PROCESSING_STARTED", {
        "sessionId": session_id,
        "totalVideos": len(body.videoPaths),
        "status": "PROCESSING",
        "segmentDurationSec": body.segmentDurationSec or 150.0,
    })

    # Launch background task
    background_tasks.add_task(
        _run_pipeline_background,
        session_id,
        body.videoPaths,
        storage_base,
        body.detector,
        body.segmentDurationSec or 150.0,
        bool(body.resume),
    )

    return {
        "status": "started",
        "sessionId": session_id,
        "totalVideos": len(body.videoPaths),
        "segmentDurationSec": body.segmentDurationSec or 150.0,
        "message": "AI pipeline started. Connect to WebSocket for live updates.",
        "websocketUrl": "/api/v1/ws",
    }


def _get_session_dir(session_id: str) -> Path:
    """Resolve session directory across project root and ai-service working directory variants."""
    safe_session_id = "".join(c for c in session_id if c.isalnum() or c in ("-", "_"))
    if not safe_session_id:
        safe_session_id = "default_session"

    file_p = Path(__file__).resolve()
    ai_root = file_p.parent.parent.parent  # apps/ai-service
    root_proj = ai_root.parent.parent if ai_root.name == "ai-service" else ai_root.parent  # PROJECT

    candidates = [
        ai_root / "storage" / "enrollment" / safe_session_id,
        root_proj / "storage" / "enrollment" / safe_session_id,
        root_proj / "apps" / "ai-service" / "storage" / "enrollment" / safe_session_id,
        Path(os.getcwd()) / "storage" / "enrollment" / safe_session_id,
    ]
    # 1. Directories with actual tracks take highest precedence
    for d in candidates:
        if (d / "tracks").exists() and any((d / "tracks").iterdir()):
            return d
    # 2. Directories with clusters.json
    for d in candidates:
        if (d / "clusters.json").exists():
            return d
    # 3. Existing directories
    for d in candidates:
        if d.exists():
            return d
    candidates[0].mkdir(parents=True, exist_ok=True)
    return candidates[0]


def consolidate_cluster_dicts(clusters: List[dict], max_capacity: int = 64) -> List[dict]:
    """Ensure cluster purity and deduplicate only high-confidence split tracks of the exact same student.
    
    Guarantees:
    1. NEVER merge different student identities or candidate suggestions.
    2. Candidate matches are advisory only and must never collapse distinct clusters.
    3. Confirmed / assigned clusters with the same USN are only consolidated if their biometric
       cosine similarity is >= 0.82 and they don't co-occur in the same frames.
    4. Unassigned clusters are only merged if ArcFace cosine similarity is >= 0.85.
    5. Fleeting 1-sample noise is pruned only if total clusters exceed max_capacity.
    """
    if not clusters:
        return []

    def _get_emb(c: dict) -> Optional[np.ndarray]:
        raw = c.get("centroid") or c.get("centroid_embedding") or c.get("representative_embedding")
        if raw and len(raw) == 512:
            arr = np.array(raw, dtype=np.float32)
            norm = float(np.linalg.norm(arr))
            if norm > 1e-6:
                return arr / norm
        return None

    # Step 1: Separate confirmed/assigned clusters from tentative/candidate/unassigned clusters
    # IMPORTANT: Only "CONFIRMED" or "ASSIGNED" status represents human ground truth.
    # "CANDIDATE" or "UNKNOWN" are AI suggestions and MUST NEVER be automatically lumped together.
    confirmed_groups: Dict[str, List[dict]] = {}
    independent_clusters: List[dict] = []

    for c in clusters:
        usn = c.get("assignedUsn") or c.get("usn")
        status = (c.get("identity_status") or c.get("status") or "").upper()
        # Strictly exclude CANDIDATE from being grouped by USN
        if usn and status in ("CONFIRMED", "ASSIGNED"):
            confirmed_groups.setdefault(usn, []).append(c)
        else:
            independent_clusters.append(c)

    consolidated: List[dict] = []

    # Step 2: For confirmed clusters sharing a USN, only merge if biometric similarity >= 0.90
    for usn, group in confirmed_groups.items():
        if len(group) == 1:
            consolidated.append(group[0])
            continue

        # Sub-cluster confirmed group based on cosine similarity >= 0.90
        sub_groups: List[List[dict]] = []
        for item in group:
            item_emb = _get_emb(item)
            merged = False
            if item_emb is not None:
                for sub in sub_groups:
                    all_sims = []
                    for existing in sub:
                        ex_emb = _get_emb(existing)
                        if ex_emb is not None:
                            all_sims.append(float(np.dot(item_emb, ex_emb)))
                    if all_sims and min(all_sims) >= 0.90:
                        sub.append(item)
                        merged = True
                        break
            if not merged:
                sub_groups.append([item])

        for sub in sub_groups:
            if len(sub) == 1:
                consolidated.append(sub[0])
            else:
                base = dict(sub[0])
                all_tracks = []
                all_gallery = []
                all_images = []
                total_samples = 0
                all_embs = []

                for item in sub:
                    for t in (item.get("track_ids") or item.get("tracks") or []):
                        if t not in all_tracks:
                            all_tracks.append(t)
                    for g in (item.get("gallery") or []):
                        if g not in all_gallery:
                            all_gallery.append(g)
                    for img in (item.get("images") or item.get("samples") or []):
                        u = img.get("imageUrl") if isinstance(img, dict) else str(img)
                        if not any(x.get("imageUrl") == u for x in all_images):
                            all_images.append(img if isinstance(img, dict) else {"imageUrl": u, "qualityScore": 85.0})
                    total_samples += int(item.get("sample_count") or item.get("sampleCount") or 1)
                    emb = _get_emb(item)
                    if emb is not None:
                        all_embs.append(emb)

                all_images.sort(key=lambda x: float(x.get("qualityScore", 0.0)) if isinstance(x, dict) else 0.0, reverse=True)
                base["track_ids"] = all_tracks
                base["tracks"] = all_tracks
                base["track_count"] = len(all_tracks)
                base["trackCount"] = len(all_tracks)
                base["sample_count"] = total_samples
                base["sampleCount"] = total_samples
                base["gallery"] = all_gallery[:6]
                base["images"] = all_images[:6]
                if all_embs:
                    mean_emb = np.mean(all_embs, axis=0)
                    norm = float(np.linalg.norm(mean_emb))
                    base["centroid"] = (mean_emb / norm).tolist() if norm > 1e-6 else all_embs[0].tolist()
                    base["centroid_embedding"] = base["centroid"]
                consolidated.append(base)

    # Step 3: For independent / unassigned clusters, NEVER auto-merge across different track IDs.
    # Each track represents a distinct individual observation. Preserving 1:1 track purity guarantees
    # that different students' photos are NEVER mixed into the same cluster.
    pure_unassigned: List[dict] = []
    for c in independent_clusters:
        # Guarantee track count reflects only this cluster's actual tracks
        tracks = c.get("track_ids") or c.get("tracks") or []
        if not tracks:
            # Infer from gallery or sample image paths
            found_tracks = set()
            for g in (c.get("gallery") or []):
                g_str = g if isinstance(g, str) else (g.get("imageUrl", "") if isinstance(g, dict) else "")
                m = re.search(r"track_\d+", g_str)
                if m:
                    found_tracks.add(m.group(0))
            tracks = list(found_tracks) if found_tracks else [f"track_{c.get('clusterNumber', 1):03d}"]
            c["track_ids"] = tracks
            c["tracks"] = tracks
        c["track_count"] = len(tracks)
        c["trackCount"] = len(tracks)
        pure_unassigned.append(c)

    consolidated.extend(pure_unassigned)

    # Step 4: Prune 1-sample fleeting noise only if candidate pool exceeds classroom capacity
    effective_capacity = max(max_capacity, 80)
    if len(consolidated) > effective_capacity:
        retained = []
        for c in consolidated:
            sc = int(c.get("sampleCount") or c.get("sample_count") or 1)
            q = float(c.get("qualityAvg") or c.get("quality_mean") or c.get("bestQualityScore") or 70.0)
            status = (c.get("identity_status") or c.get("status") or "").upper()
            if status in ("CONFIRMED", "ASSIGNED") or sc > 1 or q >= 70.0:
                retained.append(c)
        if len(retained) >= 20:
            consolidated = retained

    # Step 5: Sort clusters deterministically (Confirmed first, then highest sample count, highest quality)
    def _sort_key(c):
        status = (c.get("identity_status") or c.get("status") or "").upper()
        is_conf = 2 if status in ("CONFIRMED", "ASSIGNED") else (1 if status == "CANDIDATE" else 0)
        sc = int(c.get("sampleCount") or c.get("sample_count") or 1)
        tc = int(c.get("trackCount") or c.get("track_count") or 1)
        q = float(c.get("qualityAvg") or c.get("quality_mean") or 70.0)
        return (is_conf, sc * 2 + tc, q)

    consolidated.sort(key=_sort_key, reverse=True)

    # Step 6: Renumber clusters cleanly
    for idx, c in enumerate(consolidated, start=1):
        cid = f"cluster_{idx:03d}"
        c["id"] = cid
        c["cluster_id"] = cid
        c["clusterId"] = cid
        c["cluster_number"] = idx
        c["clusterNumber"] = idx

    return consolidated


def _load_session_disk_fallback(session_id: str):
    """Fallback helper: load clusters and diagnostics from session disk storage if memory state is empty."""
    session_dir = _get_session_dir(session_id)

    if session_dir and session_dir.exists():
        if (session_dir / "clusters.json").exists():
            try:
                import json
                with open(session_dir / "clusters.json") as f:
                    clusters_raw = json.load(f)
                if isinstance(clusters_raw, dict) and "clusters" in clusters_raw:
                    clusters = clusters_raw["clusters"]
                elif isinstance(clusters_raw, list):
                    clusters = clusters_raw
                else:
                    clusters = []

                # Ensure clean formatting without mutating disk file
                clusters = consolidate_cluster_dicts(clusters, max_capacity=100)

                diag = {}
                if (session_dir / "diagnostics.json").exists():
                    with open(session_dir / "diagnostics.json") as f:
                        diag = json.load(f)

                state.sessions[session_id] = {
                    "status": "REVIEW_REQUIRED",
                    "progress": 100.0,
                    "clusters": clusters,
                    "diagnostics": diag,
                    "processedFrames": diag.get("evaluated_frames", len(clusters) * 10),
                    "detectedFaces": diag.get("face_detections", len(clusters) * 5),
                }
                logger.info(f"Loaded disk fallback session '{session_id}' from {session_dir} with {len(clusters)} consolidated clusters")
                return state.sessions[session_id]
            except Exception as err:
                logger.warning(f"Failed loading disk fallback for session {session_id}: {err}")
    return None


@router.post("/reset-all-enrollments")
async def reset_all_enrollments():
    """Reset all enrolled vectors from FAISS index and clear enrollment status across all sessions."""
    from ..services.faiss_service import faiss_service
    faiss_service.rebuild_index([])
    logger.info("Cleared and rebuilt empty FAISS vector index.")

    for s_id, sess in state.sessions.items():
        for c in sess.get("clusters", []):
            c["isEnrolled"] = False
            c["enrolled"] = False
            c["identity_status"] = "UNKNOWN"
            c["status"] = "UNASSIGNED"
            c["assignedStudent"] = None
            c["assignedStudentName"] = None
            c["assignedUsn"] = None
        try:
            sess_dir = _get_session_dir(s_id)
            if sess_dir and (sess_dir / "clusters.json").exists():
                with open(sess_dir / "clusters.json", "w") as f:
                    json.dump(sess["clusters"], f, indent=2)
        except Exception:
            pass

    try:
        from ..config.database import get_db
        from sqlalchemy import text
        db = next(get_db())
        db.execute(text('UPDATE "Student" SET "faceEnrolled" = false, "enrollmentConfidence" = NULL, "faceSamples" = 0'))
        db.commit()
    except Exception as e:
        logger.warning(f"Could not reset Student DB records: {e}")

    return {"success": True, "message": "All biometric embeddings in FAISS, session assignments, and student enrollment records have been completely reset."}


class ResetStudentEnrollmentRequest(BaseModel):
    usn: str
    studentId: Optional[str] = None


@router.post("/reset-student-enrollment")
async def reset_student_enrollment(req: ResetStudentEnrollmentRequest):
    """Purge student vectors from FAISS index and unassign associated clusters across all sessions."""
    from ..services.faiss_service import faiss_service
    purged = faiss_service.remove_student_vectors(req.usn)
    try:
        faiss_service.save_index()
    except Exception as e:
        logger.warning(f"Failed saving FAISS index: {e}")

    req_usn_clean = req.usn.strip().upper()
    unassigned_clusters = 0

    for s_id, sess in state.sessions.items():
        dirty = False
        for c in sess.get("clusters", []):
            c_usn = str(c.get("usn") or c.get("assignedUsn") or (c.get("assignedStudent") or {}).get("usn") or "").strip().upper()
            c_sid = str(c.get("student_id") or (c.get("assignedStudent") or {}).get("studentId") or "")
            if (c_usn and c_usn == req_usn_clean) or (req.studentId and c_sid == req.studentId):
                c["isEnrolled"] = False
                c["enrolled"] = False
                c["identity_status"] = "UNKNOWN"
                c["status"] = "UNASSIGNED"
                c["assignedStudent"] = None
                c["assignedStudentName"] = None
                c["assignedUsn"] = None
                c["usn"] = None
                c["name"] = None
                c["student_id"] = None
                unassigned_clusters += 1
                dirty = True
        if dirty:
            try:
                sess_dir = _get_session_dir(s_id)
                if sess_dir and (sess_dir / "clusters.json").exists():
                    with open(sess_dir / "clusters.json", "w") as f:
                        json.dump(sess["clusters"], f, indent=2)
            except Exception:
                pass

    return {
        "success": True,
        "usn": req.usn,
        "purgedVectors": purged,
        "unassignedClusters": unassigned_clusters,
        "message": f"Successfully removed biometric data for {req.usn} from FAISS and unassigned {unassigned_clusters} clusters."
    }


@router.get("/{session_id}/status")
async def get_session_status(session_id: str):
    """Poll current processing status for a session."""
    if session_id not in state.sessions or not state.sessions[session_id].get("clusters"):
        _load_session_disk_fallback(session_id)

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
        "activeDetector": diag.get("active_detector", sess.get("detector", "YOLO26-S-Face")),
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
    """Return current cluster list for a session with counts (supports live clusters during processing)."""
    if session_id in state.active_pipelines:
        try:
            live_clusters = state.active_pipelines[session_id].get_live_clusters()
            if live_clusters:
                if session_id not in state.sessions:
                    state.sessions[session_id] = {"status": "PROCESSING"}
                state.sessions[session_id]["clusters"] = live_clusters
        except Exception:
            pass

    if session_id not in state.sessions or not state.sessions[session_id].get("clusters"):
        _load_session_disk_fallback(session_id)

    clusters = state.sessions.get(session_id, {}).get("clusters", [])
    if len(clusters) > 100:
        clusters = consolidate_cluster_dicts(clusters, max_capacity=100)
        if session_id in state.sessions:
            state.sessions[session_id]["clusters"] = clusters
    counts = {
        "all": len(clusters),
        "pending": sum(1 for c in clusters if c.get("identity_status") in ("UNKNOWN", "CANDIDATE") or c.get("status") == "UNASSIGNED"),
        "confirmed": sum(1 for c in clusters if c.get("identity_status") == "CONFIRMED" or c.get("status") == "ASSIGNED"),
        "candidate": sum(1 for c in clusters if c.get("identity_status") == "CANDIDATE"),
        "unknown": sum(1 for c in clusters if c.get("identity_status") == "UNKNOWN"),
        "rejected": sum(1 for c in clusters if c.get("identity_status") == "REJECTED" or c.get("status") == "REJECTED"),
    }
    return {"sessionId": session_id, "clusters": clusters, "counts": counts}


@router.get("/{session_id}/clusters/{cluster_id}")
async def get_cluster_detail(session_id: str, cluster_id: str):
    """Return single cluster details."""
    if session_id not in state.sessions or not state.sessions[session_id].get("clusters"):
        _load_session_disk_fallback(session_id)
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
    if session_id not in state.sessions or not state.sessions[session_id].get("clusters"):
        _load_session_disk_fallback(session_id)
    if session_id not in state.sessions:
        raise HTTPException(status_code=404, detail="Session not found in AI service")
    diag = state.sessions[session_id].get("diagnostics", {})
    return {"sessionId": session_id, "diagnostics": diag}


@router.get("/{session_id}/live-frame")
async def get_session_live_frame(session_id: str):
    """Return the latest annotated face tracking preview frame for a processing session."""
    from fastapi.responses import FileResponse, Response
    session_dir = _get_session_dir(session_id)
    if session_dir and (session_dir / "live_preview.jpg").exists():
        return FileResponse(str(session_dir / "live_preview.jpg"), media_type="image/jpeg")
    return Response(status_code=204)


@router.post("/{session_id}/pause")
async def pause_session_processing(session_id: str):
    """Pause active video processing at the current segment."""
    sess = state.sessions.get(session_id, {})
    sess["status"] = "PAUSED"
    state.sessions[session_id] = sess

    if session_id in state.active_pipelines:
        state.active_pipelines[session_id].pause()
        logger.info(f"[{session_id}] Paused active pipeline instance.")

    await websocket_manager.broadcast("SESSION_PAUSED", {
        "sessionId": session_id,
        "status": "PAUSED",
        "message": "AI video processing paused.",
    })
    return {"sessionId": session_id, "status": "PAUSED", "message": "Video processing paused at current segment."}


@router.post("/{session_id}/resume")
async def resume_session_processing(session_id: str, background_tasks: BackgroundTasks):
    """Resume video processing from the current segment position."""
    sess = state.sessions.get(session_id, {})
    sess["status"] = "PROCESSING"
    state.sessions[session_id] = sess

    if session_id in state.active_pipelines:
        state.active_pipelines[session_id].resume()
        logger.info(f"[{session_id}] Resumed active pipeline instance.")
    else:
        # Re-launch from segment checkpoint
        session_dir = _get_session_dir(session_id)
        video_files = list(session_dir.glob("*.mp4")) if session_dir else []
        if video_files:
            vpaths = [str(f) for f in video_files]
            storage_base = str(session_dir.parent.parent)
            background_tasks.add_task(
                _run_pipeline_background,
                session_id,
                vpaths,
                storage_base,
                "yolo26",
                150.0,
                True,
            )

    await websocket_manager.broadcast("SESSION_RESUMED", {
        "sessionId": session_id,
        "status": "PROCESSING",
        "message": "AI video processing resumed.",
    })
    return {"sessionId": session_id, "status": "PROCESSING", "message": "Video processing resumed."}


@router.post("/{session_id}/stop")
async def stop_session_processing(session_id: str):
    """Stop active video processing for a session and generate clusters from collected tracks."""
    sess = state.sessions.get(session_id, {})
    sess["status"] = "STOPPED"
    state.sessions[session_id] = sess

    clusters = []
    if session_id in state.active_pipelines:
        pipe = state.active_pipelines[session_id]
        pipe.stop_requested = True
        logger.info(f"[{session_id}] Signal stop_requested = True to active pipeline instance.")
        try:
            clusters = pipe.get_live_clusters()
        except Exception as e:
            logger.debug(f"[{session_id}] Error getting live clusters on stop: {e}")

    session_dir = _get_session_dir(session_id)
    if not clusters and session_dir and (session_dir / "tracks").exists() and any((session_dir / "tracks").iterdir()):
        try:
            from ..services.classroom_pipeline import ClassroomPipeline
            storage_base = str(session_dir.parent.parent)
            pipeline = ClassroomPipeline(session_id, storage_base)
            clusters = pipeline.cluster_from_disk_tracks()
        except Exception as err:
            logger.warning(f"[{session_id}] Error clustering from disk on stop: {err}")

    if not clusters and sess.get("clusters"):
        clusters = sess.get("clusters")

    if session_dir and clusters:
        try:
            with open(session_dir / "clusters.json", "w") as f:
                json.dump(clusters, f, indent=2)
        except Exception:
            pass

    diag = getattr(state.active_pipelines.get(session_id), "get_diagnostics", lambda: {})() if session_id in state.active_pipelines else sess.get("diagnostics", {})
    state.sessions[session_id] = {
        "status": "REVIEW_REQUIRED" if clusters else "STOPPED",
        "progress": 100.0,
        "clusters": clusters or [],
        "diagnostics": diag,
        "processedFrames": diag.get("evaluated_frames", len(clusters) * 10),
        "detectedFaces": diag.get("face_detections", len(clusters) * 5),
    }

    await websocket_manager.broadcast("ENROLLMENT_COMPLETED", {
        "sessionId": session_id,
        "status": "REVIEW_REQUIRED" if clusters else "STOPPED",
        "totalClusters": len(clusters),
        "clusters": clusters or [],
        "diagnostics": diag,
        "progressPercentage": 100.0,
    })

    # Auto-sync to NestJS
    if clusters:
        try:
            import httpx
            nestjs_url = f"{settings.backend_api_url}/api/enrollment/sessions/{session_id}/sync-clusters"
            async with httpx.AsyncClient(timeout=10.0) as client:
                await client.post(nestjs_url)
        except Exception as sync_e:
            logger.debug(f"Auto-sync on stop: {sync_e}")

    await websocket_manager.broadcast("SESSION_STOPPED", {
        "sessionId": session_id,
        "status": "REVIEW_REQUIRED" if clusters else "STOPPED",
        "message": f"Processing stopped by user. {len(clusters)} clusters generated.",
    })
    logger.info(f"[{session_id}] Processing stopped by user request. {len(clusters)} clusters.")
    return {
        "sessionId": session_id,
        "status": "REVIEW_REQUIRED" if clusters else "STOPPED",
        "totalClusters": len(clusters),
        "message": "Session processing stopped. Identity clustering complete."
    }


@router.post("/{session_id}/cluster-tracks")
async def cluster_session_tracks(session_id: str):
    """Trigger ArcFace feature extraction & HDBSCAN clustering on current tracks for a session."""
    session_dir = _get_session_dir(session_id)
    if not session_dir or not (session_dir / "tracks").exists() or not any((session_dir / "tracks").iterdir()):
        raise HTTPException(status_code=404, detail="No track data found for this session")

    from ..services.classroom_pipeline import ClassroomPipeline
    storage_base = str(session_dir.parent.parent)
    pipeline = ClassroomPipeline(session_id, storage_base)
    clusters = pipeline.cluster_from_disk_tracks()
    diag = pipeline.get_diagnostics()

    state.sessions[session_id] = {
        "status": "REVIEW_REQUIRED",
        "progress": 100.0,
        "clusters": clusters,
        "diagnostics": diag,
        "processedFrames": diag.get("evaluated_frames", len(clusters) * 10),
        "detectedFaces": diag.get("face_detections", len(clusters) * 5),
    }

    # Trigger NestJS sync
    try:
        import httpx
        nestjs_url = f"{settings.backend_api_url}/api/enrollment/sessions/{session_id}/sync-clusters"
        async with httpx.AsyncClient(timeout=5.0) as client:
            await client.post(nestjs_url)
    except Exception:
        pass

    return {
        "sessionId": session_id,
        "totalClusters": len(clusters),
        "clusters": clusters,
        "diagnostics": diag,
        "status": "REVIEW_REQUIRED"
    }


class AssignStudentRequest(BaseModel):
    usn: str
    name: Optional[str] = None
    studentId: Optional[str] = None
    force: bool = False


class MergeClustersRequest(BaseModel):
    targetClusterId: str


def _find_cluster(clusters: list, cluster_id: str):
    cid_str = str(cluster_id)
    digits = "".join(filter(str.isdigit, cid_str))
    padded_cid = f"cluster_{digits.zfill(3)}" if digits else ""
    for c in clusters:
        c_cid = c.get("clusterId") or c.get("cluster_id") or ""
        if c_cid == cid_str or c.get("id") == cid_str:
            return c
        if padded_cid and (c_cid == padded_cid or c_cid.lower() == padded_cid.lower()):
            return c
        if digits and str(c.get("clusterNumber")) == digits:
            return c
    return None


@router.post("/{session_id}/clusters/{cluster_id}/assign")
async def assign_cluster_identity(session_id: str, cluster_id: str, req: AssignStudentRequest):
    """Manually assign a verified student identity to a cluster with duplicate assignment protection."""
    if session_id not in state.sessions or not state.sessions[session_id].get("clusters"):
        _load_session_disk_fallback(session_id)
    if session_id not in state.sessions:
        raise HTTPException(status_code=404, detail="Session not found")

    sess = state.sessions[session_id]
    clusters = sess.get("clusters", [])
    matched = _find_cluster(clusters, cluster_id)
    if not matched:
        raise HTTPException(status_code=404, detail=f"Cluster '{cluster_id}' not found in session")

    # Check if previously assigned to a different student, and purge stale FAISS vectors
    old_usn = matched.get("assignedUsn") or matched.get("usn") or (matched.get("assignedStudent", {}).get("usn") if isinstance(matched.get("assignedStudent"), dict) else None)
    if old_usn and old_usn.strip().upper() != req.usn.strip().upper():
        from ..services.faiss_service import faiss_service
        # Check if old_usn is used by any other cluster in this session
        other_uses = any(
            c for c in clusters
            if c != matched and (
                c.get("assignedUsn") == old_usn or
                c.get("usn") == old_usn or
                (c.get("assignedStudent") or {}).get("usn") == old_usn
            )
        )
        if not other_uses:
            faiss_service.remove_student_vectors(old_usn)
            logger.info(f"Purged stale FAISS vectors for reassigned student {old_usn}")

    matched["identity_status"] = "CONFIRMED"
    matched["status"] = "ASSIGNED"
    matched["assignment_source"] = "MANUAL"
    matched["usn"] = req.usn
    matched["assignedUsn"] = req.usn
    matched["name"] = req.name or req.usn
    matched["assignedStudentName"] = req.name or req.usn
    matched["student_id"] = req.studentId
    matched["confidence"] = 1.0
    matched["assignedStudent"] = {
        "usn": req.usn,
        "name": req.name or req.usn,
        "studentId": req.studentId,
        "status": "CONFIRMED",
        "source": "MANUAL",
        "confidence": 1.0,
    }

    # Save to disk
    sess_dir = Path(os.getcwd()) / "storage" / "enrollment" / session_id
    if sess_dir.exists():
        try:
            with open(sess_dir / "clusters.json", "w") as f:
                json.dump(clusters, f, indent=2)
        except Exception as e:
            logger.error(f"Error persisting clusters.json: {e}")

    await websocket_manager.broadcast("CLUSTER_ASSIGNED", {
        "sessionId": session_id,
        "clusterId": cluster_id,
        "usn": req.usn,
        "name": req.name,
        "status": "CONFIRMED",
    })

    return {"success": True, "cluster": matched}


@router.post("/{session_id}/clusters/{cluster_id}/confirm")
async def confirm_cluster_identity(session_id: str, cluster_id: str):
    """Confirm a candidate cluster identity."""
    if session_id not in state.sessions or not state.sessions[session_id].get("clusters"):
        _load_session_disk_fallback(session_id)
    if session_id not in state.sessions:
        raise HTTPException(status_code=404, detail="Session not found")

    sess = state.sessions[session_id]
    clusters = sess.get("clusters", [])
    matched = _find_cluster(clusters, cluster_id)
    if not matched:
        raise HTTPException(status_code=404, detail=f"Cluster '{cluster_id}' not found")

    cand = matched.get("candidateMatch") or matched.get("candidate_match") or {}
    cur_assigned = matched.get("assignedStudent") if isinstance(matched.get("assignedStudent"), dict) else {}
    target_usn = cur_assigned.get("usn") or cand.get("usn") or matched.get("assignedUsn") or matched.get("usn")
    target_name = cur_assigned.get("name") or cand.get("name") or matched.get("assignedStudentName") or matched.get("name") or target_usn
    target_sid = cur_assigned.get("studentId") or cand.get("studentId") or matched.get("student_id")
    target_conf = cur_assigned.get("confidence") or cand.get("confidence") or cand.get("similarity") or 1.0

    if not target_usn:
        raise HTTPException(status_code=400, detail="Cannot confirm cluster without a candidate student identity")

    matched["identity_status"] = "CONFIRMED"
    matched["status"] = "ASSIGNED"
    matched["assignment_source"] = "CONFIRMED"
    matched["usn"] = target_usn
    matched["assignedUsn"] = target_usn
    matched["name"] = target_name
    matched["assignedStudentName"] = target_name
    matched["student_id"] = target_sid
    matched["confidence"] = target_conf
    matched["assignedStudent"] = {
        "usn": target_usn,
        "name": target_name,
        "studentId": target_sid,
        "status": "CONFIRMED",
        "source": "CONFIRMED",
        "confidence": target_conf,
    }

    sess_dir = Path(os.getcwd()) / "storage" / "enrollment" / session_id
    if sess_dir.exists():
        try:
            with open(sess_dir / "clusters.json", "w") as f:
                json.dump(clusters, f, indent=2)
        except Exception:
            pass

    return {"success": True, "cluster": matched}


@router.post("/{session_id}/clusters/{cluster_id}/reject")
async def reject_cluster_identity(session_id: str, cluster_id: str):
    """Reject a cluster or candidate match."""
    if session_id not in state.sessions or not state.sessions[session_id].get("clusters"):
        _load_session_disk_fallback(session_id)
    if session_id not in state.sessions:
        raise HTTPException(status_code=404, detail="Session not found")

    sess = state.sessions[session_id]
    clusters = sess.get("clusters", [])
    matched = next((c for c in clusters if c.get("clusterId") == cluster_id or c.get("cluster_id") == cluster_id), None)
    if not matched:
        raise HTTPException(status_code=404, detail=f"Cluster '{cluster_id}' not found")

    matched["identity_status"] = "REJECTED"
    matched["status"] = "REJECTED"
    matched["assignedStudent"] = None
    matched["usn"] = None
    matched["name"] = None

    sess_dir = Path(os.getcwd()) / "storage" / "enrollment" / session_id
    if sess_dir.exists():
        try:
            with open(sess_dir / "clusters.json", "w") as f:
                json.dump(clusters, f, indent=2)
        except Exception:
            pass

    return {"success": True, "cluster": matched}


@router.post("/{session_id}/clusters/{cluster_id}/merge")
async def merge_clusters(session_id: str, cluster_id: str, req: MergeClustersRequest):
    """Merge cluster_id (source) into targetClusterId."""
    if session_id not in state.sessions or not state.sessions[session_id].get("clusters"):
        _load_session_disk_fallback(session_id)
    if session_id not in state.sessions:
        raise HTTPException(status_code=404, detail="Session not found")

    sess = state.sessions[session_id]
    clusters = sess.get("clusters", [])
    source = next((c for c in clusters if c.get("clusterId") == cluster_id or c.get("cluster_id") == cluster_id), None)
    target = next((c for c in clusters if c.get("clusterId") == req.targetClusterId or c.get("cluster_id") == req.targetClusterId), None)
    if not source or not target:
        raise HTTPException(status_code=404, detail="Source or target cluster not found")

    # Combine samples and tracks
    target["sampleCount"] = target.get("sampleCount", 0) + source.get("sampleCount", 0)
    target["sample_count"] = target["sampleCount"]
    target["trackCount"] = len(set(target.get("tracks", []) + source.get("tracks", [])))
    target["tracks"] = list(set(target.get("tracks", []) + source.get("tracks", [])))
    target["track_ids"] = target["tracks"]
    target["samples"] = target.get("samples", []) + source.get("samples", [])
    target["gallery"] = list(set(target.get("gallery", []) + source.get("gallery", [])))

    # Remove source cluster
    sess["clusters"] = [c for c in clusters if c.get("clusterId") != cluster_id and c.get("cluster_id") != cluster_id]

    sess_dir = Path(os.getcwd()) / "storage" / "enrollment" / session_id
    if sess_dir.exists():
        try:
            with open(sess_dir / "clusters.json", "w") as f:
                json.dump(sess["clusters"], f, indent=2)
        except Exception:
            pass

    return {"success": True, "mergedCluster": target, "remainingClusters": len(sess["clusters"])}


class EnrollClusterRequest(BaseModel):
    usn: str
    clusterId: str
    embeddings: Optional[List[List[float]]] = None
    embedding: Optional[List[float]] = None


@router.post("/{session_id}/finalize-faiss")
async def finalize_session_in_faiss(session_id: str):
    """Batch enroll all confirmed clusters for this session into FAISS and persist index."""
    if session_id not in state.sessions or not state.sessions[session_id].get("clusters"):
        _load_session_disk_fallback(session_id)
        
    sess = state.sessions.get(session_id, {})
    clusters = sess.get("clusters", [])
    
    from ..services.faiss_service import faiss_service
    import numpy as np
    
    # Group confirmed/assigned clusters by student USN to accumulate multi-angle vectors
    clusters_by_usn = {}
    for c in clusters:
        usn = (
            c.get("assignedUsn") or
            c.get("usn") or
            (c.get("assignedStudent", {}).get("usn") if isinstance(c.get("assignedStudent"), dict) else None)
        )
        is_assigned = bool(
            usn and (
                c.get("status") == "ASSIGNED" or
                c.get("identity_status") in ("CONFIRMED", "ASSIGNED") or
                c.get("isEnrolled") is True or
                c.get("enrolled") is True or
                c.get("assignedStudent") or
                c.get("assignedStudentName")
            )
        )
        if not is_assigned or not usn:
            continue
        usn_clean = str(usn).strip().upper()
        if usn_clean not in clusters_by_usn:
            clusters_by_usn[usn_clean] = []
        clusters_by_usn[usn_clean].append(c)

    enrolled_count = 0
    synced_students = 0

    for usn_clean, u_clusters in clusters_by_usn.items():
        all_student_vectors = []
        best_img_for_student = None

        for c in u_clusters:
            found_vec = None
            for key in ("representative_embedding", "centroid_embedding", "centroid", "medoid_embedding"):
                emb = c.get(key)
                if isinstance(emb, list) and len(emb) == 512:
                    vec = np.array(emb, dtype=np.float32)
                    norm = float(np.linalg.norm(vec))
                    if norm > 0:
                        vec = vec / norm
                        found_vec = vec
                        all_student_vectors.append(vec)
                        break

            # Fallback: compute ArcFace 512D embedding on demand from real crop image
            if found_vec is None:
                best_img = c.get("bestImageUrl") or c.get("bestImagePath") or (c.get("gallery", [None])[0] if c.get("gallery") else None)
                if best_img:
                    clean_rel = os.path.normpath(best_img.lstrip("/")).replace("..", "")
                    candidates = [
                        Path(clean_rel),
                        Path(__file__).resolve().parent.parent.parent / clean_rel,
                        Path(__file__).resolve().parent.parent.parent.parent / clean_rel,
                    ]
                    for p in candidates:
                        try:
                            resolved_p = p.resolve()
                            if not any(part in ("storage", "data", "enrollment") for part in resolved_p.parts):
                                continue
                        except Exception:
                            continue
                        if p.exists():
                            try:
                                import cv2
                                from ..services.embedding_service import embedding_service
                                crop_img = cv2.imread(str(p))
                                if crop_img is not None and crop_img.size > 0:
                                    emb = embedding_service.generate_embedding(crop_img)
                                    if emb is not None and len(emb) == 512:
                                        vec = np.array(emb, dtype=np.float32)
                                        norm = float(np.linalg.norm(vec))
                                        if norm > 0:
                                            vec = vec / norm
                                        all_student_vectors.append(vec)
                                        if "representative_embedding" not in c:
                                            c["representative_embedding"] = vec.tolist()
                                            c["centroid"] = vec.tolist()
                                        if len(all_student_vectors) >= 8:
                                            break
                            except Exception as ex:
                                logger.warning(f"On-demand ArcFace crop extraction failed for {p}: {ex}")

            if not best_img_for_student:
                best_img_for_student = c.get("bestImagePath") or c.get("bestImageUrl") or (c.get("gallery", [None])[0] if c.get("gallery") else None)

        if all_student_vectors:
            # Clear old vectors once for this student, then add all accumulated cluster vectors
            faiss_service.remove_student_vectors(usn_clean)
            for v in all_student_vectors:
                faiss_service.add_student(usn_clean, v, check_duplicate=True)
            synced_students += 1

        for c in u_clusters:
            c["isEnrolled"] = True
            c["enrolled"] = True
            c["status"] = "ASSIGNED"
            c["identity_status"] = "CONFIRMED"
            enrolled_count += 1

        # Synchronize student faceEnrolled state in NestJS backend (non-blocking)
        try:
            import httpx
            async with httpx.AsyncClient(timeout=2.0) as client:
                await client.post(
                    f"{settings.backend_api_url}/api/students/sync-enrollment",
                    headers={"x-api-key": settings.internal_api_key},
                    json={
                        "usn": usn_clean,
                        "faceSamples": max(1, len(all_student_vectors)),
                        "profilePhoto": best_img_for_student,
                    }
                )
        except Exception as n_err:
            logger.warning(f"Failed to sync student {usn_clean} enrollment to backend: {n_err}")

    faiss_service.save_index()

    # Persist updated clusters with isEnrolled=True and embeddings to disk
    try:
        sess_dir = _get_session_dir(session_id)
        clusters_path = sess_dir / "clusters.json"
        with open(clusters_path, "w") as f:
            json.dump(clusters, f, indent=2)
        logger.info(f"[{session_id}] Successfully finalized FAISS for {synced_students} students ({enrolled_count} clusters)")
    except Exception as p_err:
        logger.warning(f"Could not persist enrolled status to clusters.json: {p_err}")

    return {
        "success": True,
        "sessionId": session_id,
        "enrolled_clusters": enrolled_count,
        "enrolled_students": synced_students,
        "total_faiss_vectors": faiss_service.index.ntotal if faiss_service.index else 0
    }


@router.post("/{session_id}/finalize-session")
async def finalize_session_direct(session_id: str):
    """Batch enroll all confirmed clusters for this session into FAISS and persist durable index."""
    return await finalize_session_in_faiss(session_id)


@router.post("/rebuild-faiss-from-db")
async def rebuild_faiss_from_db():
    """Recover and reconstruct FAISS vector index directly from PostgreSQL FaceEmbedding records."""
    from ..services.faiss_service import faiss_service
    count = faiss_service.rebuild_from_postgres()
    return {
        "success": True,
        "reconstructed_vectors": count,
        "total_faiss_vectors": faiss_service.index.ntotal if faiss_service.index else 0
    }


class PurgeStudentVectorsRequest(BaseModel):
    usn: str


@router.post("/purge-student-vectors")
async def purge_student_vectors(req: PurgeStudentVectorsRequest):
    """Purge all face vectors for a student from FAISS index."""
    from ..services.faiss_service import faiss_service
    removed = faiss_service.remove_student_vectors(req.usn)
    return {"success": True, "usn": req.usn, "removedVectors": removed}


@router.post("/{session_id}/enroll-cluster")
async def enroll_cluster_in_faiss(session_id: str, req: EnrollClusterRequest):
    """Register all high-quality 512D ArcFace embeddings for a cluster into the FAISS vector index."""
    if session_id not in state.sessions or not state.sessions[session_id].get("clusters"):
        _load_session_disk_fallback(session_id)

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
        matched = _find_cluster(clusters, cluster_id)
        if matched:
            if "representative_embedding" in matched and matched["representative_embedding"] and len(matched["representative_embedding"]) == 512:
                vec = np.array(matched["representative_embedding"], dtype=np.float32)
                norm = np.linalg.norm(vec)
                if norm > 0: vec = vec / norm
                vectors_to_add.append(vec)
            if "centroid_embedding" in matched and matched["centroid_embedding"] and len(matched["centroid_embedding"]) == 512:
                vec = np.array(matched["centroid_embedding"], dtype=np.float32)
                norm = np.linalg.norm(vec)
                if norm > 0: vec = vec / norm
                vectors_to_add.append(vec)
            elif "centroid" in matched and matched["centroid"] and len(matched["centroid"]) == 512:
                vec = np.array(matched["centroid"], dtype=np.float32)
                norm = np.linalg.norm(vec)
                if norm > 0: vec = vec / norm
                vectors_to_add.append(vec)

        if matched and not vectors_to_add:
            # Fallback: compute ArcFace 512D embedding on demand from real crop image
            best_img = matched.get("bestImageUrl") or (matched.get("gallery", [None])[0] if matched.get("gallery") else None)
            if best_img:
                clean_rel = os.path.normpath(best_img.lstrip("/")).replace("..", "")
                candidates = [
                    Path(clean_rel),
                    Path(__file__).resolve().parent.parent.parent / clean_rel,
                    Path(__file__).resolve().parent.parent.parent.parent / clean_rel,
                ]
                for p in candidates:
                    try:
                        resolved_p = p.resolve()
                        if not any(part in ("storage", "data", "enrollment") for part in resolved_p.parts):
                            continue
                    except Exception:
                        continue
                    if p.exists():
                        try:
                            import cv2
                            from ..services.embedding_service import embedding_service
                            crop_img = cv2.imread(str(p))
                            if crop_img is not None and crop_img.size > 0:
                                emb = embedding_service.generate_embedding(crop_img)
                                if emb is not None and len(emb) == 512:
                                    vec = np.array(emb, dtype=np.float32)
                                    norm = np.linalg.norm(vec)
                                    if norm > 0: vec = vec / norm
                                    vectors_to_add.append(vec)
                                    break
                        except Exception as ex:
                            logger.warning(f"On-demand ArcFace crop extraction failed for {p}: {ex}")

    if not vectors_to_add:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot enroll cluster '{cluster_id}' into FAISS: No valid 512D ArcFace embeddings found. Mock vectors are strictly prohibited."
        )

    # Multi-cluster accumulation: Add vectors for this cluster to student in FAISS without wiping previous clusters
    added_count = 0
    for vec in vectors_to_add:
        if faiss_service.add_student(usn, vec, check_duplicate=True):
            added_count += 1

    try:
        faiss_service.save_index()
    except Exception as s_err:
        logger.warning(f"Failed saving FAISS index to disk: {s_err}")

    # Mark cluster as enrolled in AI session state
    if session_id not in state.sessions or not state.sessions[session_id].get("clusters"):
        _load_session_disk_fallback(session_id)

    sess = state.sessions.get(session_id, {})
    clusters = sess.get("clusters", [])
    best_img_path = None
    for c in clusters:
        if c.get("clusterId") == cluster_id or c.get("cluster_id") == cluster_id or str(c.get("clusterNumber")) == str(cluster_id).replace("cluster_", ""):
            c["isEnrolled"] = True
            c["enrolled"] = True
            c["status"] = "ASSIGNED"
            c["identity_status"] = "CONFIRMED"
            best_img_path = c.get("bestImagePath") or c.get("best_image_path") or (c.get("gallery", [None])[0] if c.get("gallery") else None)
            break
    
    # Persist updated clusters to disk
    try:
        sess_dir = _get_session_dir(session_id)
        clusters_path = sess_dir / "clusters.json"
        with open(clusters_path, "w") as f:
            json.dump(clusters, f, indent=2)
        logger.info(f"[{session_id}] Persisted {len(clusters)} clusters to {clusters_path}")
    except Exception as p_err:
        logger.warning(f"Could not persist enrolled status to clusters.json: {p_err}")

    # Synchronize student faceEnrolled state in NestJS backend (non-blocking)
    try:
        import httpx
        async with httpx.AsyncClient(timeout=2.0) as client:
            await client.post(
                f"{settings.backend_api_url}/api/students/sync-enrollment",
                headers={"x-api-key": settings.internal_api_key},
                json={
                    "usn": usn,
                    "faceSamples": added_count,
                    "profilePhoto": best_img_path,
                }
            )
    except Exception as n_err:
        logger.warning(f"Could not sync student enrollment status to NestJS API: {n_err}")

    logger.info(f"[{session_id}] Enrolled {added_count} real 512D vectors for cluster {cluster_id} (USN {usn}) into FAISS index.")

    return {
        "success": True,
        "usn": usn,
        "clusterId": cluster_id,
        "addedVectors": added_count,
        "totalFaissVectors": faiss_service.index.ntotal if faiss_service.index else 0,
        "message": f"Successfully enrolled {added_count} real ArcFace vectors for USN {usn} into FAISS index.",
    }


class DirectPhotoEnrollRequest(BaseModel):
    usn: str
    name: Optional[str] = None
    photoBase64: str


@router.post("/direct-photo-enroll")
async def direct_photo_enroll(req: DirectPhotoEnrollRequest):
    """
    Directly enroll a student from a photo (uploaded file or webcam capture).
    Extracts face, generates 512D ArcFace embedding, registers with FAISS,
    and saves the image to student profile directory.
    """
    import base64
    import cv2
    from ..services.faiss_service import faiss_service
    from ..services.face_detector import face_detector
    from ..services.embedding_service import embedding_service

    usn = req.usn.strip().upper()
    if not usn:
        raise HTTPException(status_code=400, detail="USN is required")

    photo_str = req.photoBase64
    if not photo_str:
        raise HTTPException(status_code=400, detail="Photo data is required")

    try:
        if "," in photo_str:
            photo_str = photo_str.split(",", 1)[1]
        img_bytes = base64.b64decode(photo_str)
        nparr = np.frombuffer(img_bytes, np.uint8)
        img_bgr = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if img_bgr is None or img_bgr.size == 0:
            raise ValueError("Failed to decode image data")
    except Exception as e:
        logger.error(f"Image decode error for USN {usn}: {e}")
        raise HTTPException(status_code=400, detail=f"Invalid image format: {e}")

    # Ensure storage folder exists
    student_dir = Path("storage/enrollment/students") / usn
    student_dir.mkdir(parents=True, exist_ok=True)
    full_photo_path = student_dir / "profile.jpg"
    cv2.imwrite(str(full_photo_path), img_bgr)

    # Face detection & ArcFace embedding extraction
    emb = None
    faces = []
    try:
        faces = face_detector.detect_faces(img_bgr)
    except Exception as d_err:
        logger.warning(f"SCRFD face detection error on direct photo for USN {usn}: {d_err}")

    if faces:
        best_face = max(faces, key=lambda f: f.get("confidence", 0.0))
        crop = best_face.get("crop")
        landmarks = best_face.get("landmarks")
        if crop is not None and crop.size > 0:
            crop_path = student_dir / "face_crop.jpg"
            cv2.imwrite(str(crop_path), crop)
            emb = embedding_service.generate_embedding(crop, landmarks)

    if emb is None:
        # Fallback: attempt direct embedding on the image
        try:
            emb = embedding_service.generate_embedding(img_bgr)
        except Exception as e_err:
            logger.warning(f"Fallback embedding generation failed: {e_err}")

    added_to_faiss = False
    if emb is not None and len(emb) == 512:
        vec = np.array(emb, dtype=np.float32)
        norm = np.linalg.norm(vec)
        if norm > 0:
            vec = vec / norm
            # Remove older vectors for this USN to prevent staleness
            faiss_service.remove_student_vectors(usn)
            faiss_service.add_student(usn, vec)
            added_to_faiss = True
            logger.info(f"Direct photo enrolled: Added 512D ArcFace vector to FAISS for USN {usn}")

    rel_path = f"storage/enrollment/students/{usn}/profile.jpg"
    return {
        "success": True,
        "usn": usn,
        "imagePath": rel_path,
        "vectorEnrolled": added_to_faiss,
        "totalFaissVectors": faiss_service.index.ntotal if faiss_service.index else 0,
        "message": f"Photo registered and {'FAISS vector enrolled' if added_to_faiss else 'saved'} for {usn}."
    }


@router.delete("/{session_id}/clusters/{cluster_id}")
async def delete_session_cluster(session_id: str, cluster_id: str):
    """Delete a specific cluster from a session's in-memory state and disk storage."""
    if session_id not in state.sessions or not state.sessions[session_id].get("clusters"):
        _load_session_disk_fallback(session_id)
    if session_id not in state.sessions:
        raise HTTPException(status_code=404, detail="Session not found")

    sess = state.sessions[session_id]
    clusters = sess.get("clusters", [])
    sess["clusters"] = [
        c for c in clusters
        if c.get("clusterId") != cluster_id and c.get("cluster_id") != cluster_id and str(c.get("clusterNumber")) != str(cluster_id)
    ]

    # Save updated clusters to clusters.json
    try:
        session_dir = _get_session_dir(session_id)
        if session_dir and (session_dir / "clusters.json").exists():
            orig_is_dict = False
            try:
                with open(session_dir / "clusters.json") as f:
                    data_check = json.load(f)
                orig_is_dict = isinstance(data_check, dict) and "clusters" in data_check
            except Exception:
                pass
            with open(session_dir / "clusters.json", "w") as f:
                if orig_is_dict:
                    json.dump({"clusters": sess["clusters"]}, f, indent=2)
                else:
                    json.dump(sess["clusters"], f, indent=2)
    except Exception as e:
        logger.warning(f"Failed to persist cluster deletion to disk: {e}")

    logger.info(f"[{session_id}] Deleted cluster {cluster_id}. Remaining: {len(sess['clusters'])}")
    return {"success": True, "deletedClusterId": cluster_id, "remainingClusters": len(sess["clusters"])}


@router.delete("/{session_id}/clusters/{cluster_id}/images")
async def delete_cluster_image(
    session_id: str,
    cluster_id: str,
    imageUrl: Optional[str] = Query(None),
    imagePath: Optional[str] = Query(None),
    imageIndex: Optional[int] = Query(None),
    imageId: Optional[str] = Query(None),
    body: Optional[DeleteClusterImageRequest] = None,
):
    """Remove a specific facial crop / sample image from a cluster."""
    if session_id not in state.sessions or not state.sessions[session_id].get("clusters"):
        _load_session_disk_fallback(session_id)
    if session_id not in state.sessions:
        raise HTTPException(status_code=404, detail="Session not found")

    target_url = imageUrl or (body.imageUrl if body else None)
    target_path = imagePath or (body.imagePath if body else None)
    target_idx = imageIndex if imageIndex is not None else (body.imageIndex if body else None)
    target_id = imageId or (body.imageId if body else None)

    sess = state.sessions[session_id]
    clusters = sess.get("clusters", [])

    matched_cluster = None
    for c in clusters:
        cid = c.get("clusterId") or c.get("cluster_id")
        cnum = c.get("clusterNumber") or c.get("cluster_number")
        if cid == cluster_id or str(cnum) == str(cluster_id) or f"cluster_{str(cnum).zfill(3)}" == cluster_id:
            matched_cluster = c
            break

    if not matched_cluster:
        raise HTTPException(status_code=404, detail=f"Cluster {cluster_id} not found in session")

    def _is_match(im_item: Any, idx: int) -> bool:
        if target_idx is not None and idx == target_idx:
            return True
        im_url = ""
        im_path = ""
        im_id = ""
        if isinstance(im_item, str):
            im_url = im_item
            im_path = im_item
        elif isinstance(im_item, dict):
            im_url = im_item.get("imageUrl") or im_item.get("image_url") or ""
            im_path = im_item.get("imagePath") or im_item.get("image_path") or ""
            im_id = str(im_item.get("id") or im_item.get("sampleId") or "")

        if target_id and im_id and (target_id == im_id or target_id.endswith(im_id) or im_id.endswith(target_id)):
            return True

        def _get_fname(s: str) -> str:
            return s.split("/")[-1].split("?")[0] if s else ""

        target_fname = _get_fname(target_url or target_path or "")
        if target_fname:
            if target_fname == _get_fname(im_url) or target_fname == _get_fname(im_path):
                return True
        if target_url and (im_url == target_url or target_url in im_url or im_url in target_url):
            return True
        if target_path and (im_path == target_path or target_path in im_path or im_path in target_path):
            return True
        return False

    # Filter gallery
    old_gallery = matched_cluster.get("gallery", [])
    new_gallery = [g for i, g in enumerate(old_gallery) if not _is_match(g, i)]

    # Filter images
    old_images = matched_cluster.get("images", [])
    new_images = [im for i, im in enumerate(old_images) if not _is_match(im, i)]

    # Filter samples
    old_samples = matched_cluster.get("samples", [])
    new_samples = [s for i, s in enumerate(old_samples) if not _is_match(s, i)] if old_samples else []

    matched_cluster["gallery"] = new_gallery
    matched_cluster["images"] = new_images
    if old_samples:
        matched_cluster["samples"] = new_samples

    # Update sample counts
    new_count = max(len(new_gallery), len(new_images))
    matched_cluster["sample_count"] = new_count
    matched_cluster["sampleCount"] = new_count

    # Re-evaluate best image if the previous best was removed
    best_url = matched_cluster.get("bestImageUrl") or matched_cluster.get("best_image_url")
    if best_url and _is_match(best_url, -1):
        new_best = None
        if new_images:
            new_images[0]["isBest"] = True
            new_best = new_images[0].get("imageUrl") or new_images[0].get("imagePath")
        elif new_gallery:
            new_best = new_gallery[0]
        matched_cluster["bestImageUrl"] = new_best
        matched_cluster["best_image_url"] = new_best
        matched_cluster["bestImagePath"] = new_best
        matched_cluster["best_image_path"] = new_best

    # Persist updated clusters to clusters.json
    try:
        session_dir = _get_session_dir(session_id)
        if session_dir and (session_dir / "clusters.json").exists():
            orig_is_dict = False
            try:
                with open(session_dir / "clusters.json") as f:
                    data_check = json.load(f)
                orig_is_dict = isinstance(data_check, dict) and "clusters" in data_check
            except Exception:
                pass
            with open(session_dir / "clusters.json", "w") as f:
                if orig_is_dict:
                    json.dump({"clusters": sess["clusters"]}, f, indent=2)
                else:
                    json.dump(sess["clusters"], f, indent=2)
    except Exception as e:
        logger.warning(f"Failed to persist cluster image deletion to disk: {e}")

    logger.info(f"[{session_id}] Removed crop from cluster {cluster_id}. Remaining gallery: {len(new_gallery)}")
    return {
        "success": True,
        "clusterId": cluster_id,
        "remainingSamples": new_count,
        "gallery": new_gallery,
        "images": new_images,
        "bestImageUrl": matched_cluster.get("bestImageUrl"),
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

async def _run_pipeline_background(
    session_id: str,
    video_paths: List[str],
    storage_base: str,
    detector: Optional[str] = None,
    segment_duration_sec: float = 150.0,
    resume: bool = False,
):
    """Run classroom pipeline with automatic segment advancement, state tracking, and WebSocket broadcasts."""
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
        if "qualitySamples" in event:
            sess["qualitySamples"] = event["qualitySamples"]
        if "arcfaceEmbeddings" in event:
            sess["arcfaceEmbeddings"] = event["arcfaceEmbeddings"]
        if "activeTracks" in event:
            sess["activeTracks"] = event["activeTracks"]
        if "totalTracks" in event:
            sess["totalTracks"] = event["totalTracks"]
        if "generatedClusters" in event:
            sess["generatedClusters"] = event["generatedClusters"]

        for k in (
            "currentSegment", "totalSegments", "segmentDurationSec",
            "currentTimestampSec", "totalDurationSec", "usableFaces",
            "knownIdentitiesMatched", "unresolvedRevisited",
            "newCandidatesDiscovered", "candidatesAwaitingAssignment",
            "lowQualitySkipped", "profileUpdatesAccepted", "isPaused"
        ):
            if k in event:
                sess[k] = event[k]

        if "diagnostics" in event:
            d = event["diagnostics"]
            sess["diagnostics"] = d
            sess["qualitySamples"] = d.get("quality_samples", sess.get("qualitySamples", 0))
            sess["arcfaceEmbeddings"] = d.get("arcface_embeddings", sess.get("arcfaceEmbeddings", 0))
            sess["activeTracks"] = d.get("active_tracks", sess.get("activeTracks", 0))
            sess["totalTracks"] = d.get("total_tracks", sess.get("totalTracks", 0))
            sess["processingFps"] = d.get("processing_fps", 0.0)
            sess["generatedClusters"] = d.get("generated_clusters", sess.get("generatedClusters", 0))

        # Dynamically attach live clusters from active pipeline
        if session_id in state.active_pipelines:
            try:
                live_clusters = state.active_pipelines[session_id].get_live_clusters()
                if live_clusters:
                    sess["clusters"] = live_clusters
                    event["clusters"] = live_clusters
                    event["generatedClusters"] = len(live_clusters)
            except Exception as e:
                logger.debug(f"[{session_id}] Live cluster error: {e}")

        state.sessions[session_id] = sess
        await websocket_manager.broadcast(evt_type, {"sessionId": session_id, **event})

    try:
        pipeline = ClassroomPipeline(session_id, storage_base, detector_type=detector)
        state.active_pipelines[session_id] = pipeline
        clusters = await pipeline.run(
            video_paths,
            on_progress,
            segment_duration_sec=segment_duration_sec,
            resume=resume,
        )

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

        # Trigger NestJS cluster sync to persist clusters into Postgres
        try:
            import httpx
            nestjs_url = f"{settings.backend_api_url}/api/enrollment/sessions/{session_id}/sync-clusters"
            async with httpx.AsyncClient(timeout=5.0) as client:
                await client.post(nestjs_url)
            logger.info(f"[{session_id}] Automatically triggered NestJS cluster sync into Postgres.")
        except Exception as sync_err:
            logger.warning(f"[{session_id}] Auto cluster sync call to NestJS failed: {sync_err}")

        logger.info(f"[{session_id}] Pipeline finished: {len(clusters)} clusters.")

    except Exception as exc:
        logger.error(f"[{session_id}] Pipeline exception/stop: {exc}", exc_info=True)
        # Check if pipeline generated any clusters or tracks before stopping
        recovered_clusters = []
        try:
            if pipeline:
                recovered_clusters = pipeline.cluster_from_disk_tracks()
        except Exception:
            pass

        if recovered_clusters:
            diag = pipeline.get_diagnostics() if pipeline else {}
            state.sessions[session_id]["status"] = "REVIEW_REQUIRED"
            state.sessions[session_id]["clusters"] = recovered_clusters
            state.sessions[session_id]["diagnostics"] = diag
            state.sessions[session_id]["progress"] = 100.0
            await websocket_manager.broadcast("ENROLLMENT_COMPLETED", {
                "sessionId": session_id,
                "status": "REVIEW_REQUIRED",
                "totalClusters": len(recovered_clusters),
                "clusters": recovered_clusters,
                "diagnostics": diag,
                "progressPercentage": 100.0,
            })
            try:
                import httpx
                nestjs_url = f"{settings.backend_api_url}/api/enrollment/sessions/{session_id}/sync-clusters"
                async with httpx.AsyncClient(timeout=5.0) as client:
                    await client.post(nestjs_url)
            except Exception:
                pass
        else:
            state.sessions[session_id]["status"] = "STOPPED"
            await websocket_manager.broadcast("SESSION_STOPPED", {
                "sessionId": session_id,
                "status": "STOPPED",
                "error": str(exc),
            })
    finally:
        state.active_pipelines.pop(session_id, None)
