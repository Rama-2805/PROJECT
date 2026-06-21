"""SmartCampus AI — Video-Based Face Enrollment API.

Processes pre-recorded phone videos to automatically enroll students:
  1. Extract frames from 4K/1080p video
  2. Detect faces with quality filtering
  3. Classify poses (front/left/right/up/down)
  4. Select best 20-30 diverse images
  5. Generate ArcFace embeddings
  6. Compute average embedding
  7. Create student profile in DB
  8. Register in FAISS index
"""

import os
import cv2
import time
import logging
import shutil
import numpy as np
from pathlib import Path
from typing import List, Dict, Optional
from pydantic import BaseModel, Field
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from sqlalchemy.orm import Session
from ..config.settings import settings
from ..config.database import get_db
from ..models.student import Student
from ..models.face_profile import FaceProfile
from ..models.embedding import Embedding as EmbeddingModel
from ..models.unknown_face import UnknownFace
from ..services.face_detector import face_detector
from ..services.face_quality_service import face_quality_service
from ..services.embedding_service import embedding_service
from ..services.faiss_service import faiss_service
from ..services.image_storage import image_storage
from ..api.websocket import websocket_manager

logger = logging.getLogger("smartcampus.video_enrollment")

router = APIRouter(prefix=f"{settings.api_prefix}/enrollment", tags=["Video Enrollment"])

# Target frames per pose category
MAX_PER_POSE = 6
TARGET_TOTAL = 30
MIN_TOTAL = 10
MIN_POSES = 3


class VideoEnrollResponse(BaseModel):
    status: str
    message: str
    student: Optional[dict] = None
    stats: Optional[dict] = None


@router.post("/video", response_model=VideoEnrollResponse)
async def enroll_from_video(
    name: str = Form(..., min_length=1, max_length=100, description="Student full name"),
    usn: str = Form(..., min_length=1, max_length=50, description="Student USN"),
    department: str = Form("Computer Science", description="Department"),
    semester: int = Form(6, ge=1, le=8, description="Semester"),
    section: str = Form("A", description="Section"),
    video: UploadFile = File(..., description="Video file (.MOV, .mp4, .avi)"),
    db: Session = Depends(get_db),
):
    """Enroll a student from a pre-recorded phone video.

    Automatically extracts frames, detects faces, validates quality and pose coverage,
    generates ArcFace embeddings, and registers in the FAISS index.
    """
    start_time = time.time()

    # 1. Validate student doesn't already exist
    existing = db.query(Student).filter(Student.usn == usn).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"Student with USN '{usn}' already enrolled.")

    # 2. Save uploaded video to disk
    upload_dir = Path(settings.upload_dir)
    upload_dir.mkdir(parents=True, exist_ok=True)
    video_path = upload_dir / f"enroll_{usn}_{int(time.time())}{Path(video.filename).suffix}"

    try:
        with open(video_path, "wb") as f:
            content = await video.read()
            f.write(content)
        logger.info(f"Video saved: {video_path} ({len(content) / 1024 / 1024:.1f} MB)")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save video: {e}")

    try:
        result = _process_video_enrollment(
            str(video_path), name, usn, department, semester, section, db
        )
        elapsed = time.time() - start_time
        result["stats"]["processing_time_seconds"] = round(elapsed, 1)
        return VideoEnrollResponse(
            status="success",
            message=f"Student '{name}' ({usn}) enrolled successfully via video.",
            student=result["student"],
            stats=result["stats"],
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Video enrollment failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Enrollment failed: {str(e)}")
    finally:
        # Clean up video file
        if video_path.exists():
            video_path.unlink()


@router.post("/video-path", response_model=VideoEnrollResponse)
def enroll_from_video_path(
    name: str = Form(..., min_length=1, max_length=100),
    usn: str = Form(..., min_length=1, max_length=50),
    department: str = Form("Computer Science"),
    semester: int = Form(6, ge=1, le=8),
    section: str = Form("A"),
    video_path: str = Form(..., description="Absolute path to video file on disk"),
    db: Session = Depends(get_db),
):
    """Enroll a student from a video file already on disk (no upload needed).

    Useful for batch enrollment from existing phone recordings.
    """
    start_time = time.time()

    existing = db.query(Student).filter(Student.usn == usn).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"Student with USN '{usn}' already enrolled.")

    if not os.path.exists(video_path):
        raise HTTPException(status_code=404, detail=f"Video file not found: {video_path}")

    try:
        result = _process_video_enrollment(
            video_path, name, usn, department, semester, section, db
        )
        elapsed = time.time() - start_time
        result["stats"]["processing_time_seconds"] = round(elapsed, 1)
        return VideoEnrollResponse(
            status="success",
            message=f"Student '{name}' ({usn}) enrolled successfully via video.",
            student=result["student"],
            stats=result["stats"],
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Video enrollment failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Enrollment failed: {str(e)}")


def _process_video_enrollment(
    video_path: str,
    name: str,
    usn: str,
    department: str,
    semester: int,
    section: str,
    db: Session,
) -> dict:
    """Core video enrollment processing pipeline.

    Steps:
        1. Open video, extract frames at interval
        2. Detect faces in each frame
        3. Quality-filter faces
        4. Classify head pose
        5. Select best diverse images (20-30)
        6. Generate embeddings for selected images
        7. Compute average embedding
        8. Create Student + FaceProfile + Embedding records
        9. Register in FAISS
        10. Save face images to student storage directory
    """
    logger.info(f"Starting video enrollment for {name} ({usn}) from {video_path}")

    # ── Step 1: Open Video ──────────────────────────────────────────
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        raise ValueError(f"Cannot open video file: {video_path}")

    fps = cap.get(cv2.CAP_PROP_FPS)
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    duration = total_frames / fps if fps > 0 else 0

    logger.info(f"Video: {width}x{height} @ {fps:.1f}fps, {total_frames} frames, {duration:.1f}s")

    # For 4K@60fps, sample every ~1 second (every 60 frames)
    # For 1080p@30fps, sample every ~0.5 second (every 15 frames)
    frame_skip = max(1, int(fps * 0.5))  # Every 0.5 seconds

    # ── Step 2-4: Extract, Detect, Quality-Filter, Pose-Classify ──
    pose_buckets: Dict[str, List[dict]] = {
        "front": [], "left": [], "right": [], "up": [], "down": []
    }

    frame_idx = 0
    frames_processed = 0
    faces_detected = 0
    faces_accepted = 0

    while True:
        ret, frame = cap.read()
        if not ret:
            break

        if frame_idx % frame_skip != 0:
            frame_idx += 1
            continue

        frame_idx += 1
        frames_processed += 1

        # Downscale 4K to 1080p for faster detection while keeping quality
        if width > 1920:
            scale = 1920.0 / width
            frame_resized = cv2.resize(frame, None, fx=scale, fy=scale, interpolation=cv2.INTER_AREA)
            inv_scale = width / 1920.0
        else:
            frame_resized = frame
            inv_scale = 1.0

        # Run face detection
        detections = face_detector.detect_faces(frame_resized)
        if not detections:
            continue

        for det in detections:
            faces_detected += 1
            raw_face = det["raw_face"]

            # Crop from original resolution for higher quality size
            if inv_scale != 1.0:
                bbox = det["bbox"]
                x1 = int(bbox[0] * inv_scale)
                y1 = int(bbox[1] * inv_scale)
                x2 = int(bbox[2] * inv_scale)
                y2 = int(bbox[3] * inv_scale)
                x1 = max(0, min(x1, width))
                y1 = max(0, min(y1, height))
                x2 = max(0, min(x2, width))
                y2 = max(0, min(y2, height))
                crop = frame[y1:y2, x1:x2].copy()
            else:
                crop = det["crop"]

            # Quality analysis
            quality = face_quality_service.analyze_quality(crop, raw_face)
            if not quality["is_acceptable"]:
                continue

            # Get the embedding directly from the raw face object (more reliable than re-detecting)
            if hasattr(raw_face, "embedding") and raw_face.embedding is not None:
                emb = raw_face.embedding.copy()
                norm = np.linalg.norm(emb)
                if norm > 0:
                    emb = emb / norm
            else:
                emb = embedding_service.generate_embedding(crop)
                if emb is None:
                    continue

            faces_accepted += 1

            # Classify pose
            pose = quality["pose"]
            yaw, pitch = pose["yaw"], pose["pitch"]

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
            else:
                pose_name = "front"

            # Only keep up to MAX_PER_POSE per category
            if len(pose_buckets[pose_name]) < MAX_PER_POSE:
                pose_buckets[pose_name].append({
                    "crop": crop,
                    "embedding": emb,
                    "quality_score": quality["score"],
                    "pose_name": pose_name,
                    "frame_idx": frame_idx,
                })

        # Early termination if we have enough diverse images
        total_collected = sum(len(b) for b in pose_buckets.values())
        poses_covered = sum(1 for b in pose_buckets.values() if len(b) > 0)
        if total_collected >= TARGET_TOTAL and poses_covered >= MIN_POSES:
            logger.info(f"Early termination: {total_collected} faces across {poses_covered} poses")
            break

    cap.release()

    # ── Step 5: Validate Coverage ──────────────────────────────────
    total_selected = sum(len(b) for b in pose_buckets.values())
    detected_poses = {k for k, v in pose_buckets.items() if len(v) > 0}

    logger.info(
        f"Video scan complete: {frames_processed} frames processed, "
        f"{faces_detected} faces detected, {faces_accepted} accepted, "
        f"{total_selected} selected across {len(detected_poses)} poses "
        f"({', '.join(sorted(detected_poses))})"
    )

    if total_selected < MIN_TOTAL:
        raise ValueError(
            f"Insufficient face captures: only {total_selected} high-quality faces found "
            f"(minimum {MIN_TOTAL} required). Try recording in better lighting."
        )

    if len(detected_poses) < MIN_POSES:
        raise ValueError(
            f"Insufficient pose diversity: only {len(detected_poses)} poses found "
            f"({', '.join(sorted(detected_poses))}). Need at least {MIN_POSES} of: "
            f"front, left, right, up, down. Try rotating head more during recording."
        )

    # ── Step 6: Sort by quality, select best images ────────────────
    all_selected = []
    for pose_name, bucket in pose_buckets.items():
        # Sort by quality score descending
        bucket.sort(key=lambda x: x["quality_score"], reverse=True)
        all_selected.extend(bucket)

    # ── Step 7: Generate Average Embedding ─────────────────────────
    embeddings = [s["embedding"] for s in all_selected]
    avg_embedding = embedding_service.compute_average_embedding(embeddings)
    if avg_embedding is None:
        raise ValueError("Failed to compute average face embedding.")

    # ── Step 8: Save face images to cluster directory ──────────────
    cluster_id = f"video_{usn}_{int(time.time())}"
    cluster_dir = image_storage.clusters_dir / f"cluster_{cluster_id}"
    cluster_dir.mkdir(parents=True, exist_ok=True)

    for i, selected in enumerate(all_selected):
        pose_name = selected["pose_name"]
        filename = f"{pose_name}_{i + 1}.jpg"
        filepath = cluster_dir / filename
        cv2.imwrite(str(filepath), selected["crop"])

    # ── Step 9: Create DB Records ──────────────────────────────────
    student = Student(
        name=name,
        usn=usn,
        department=department,
        semester=semester,
        section=section,
    )
    db.add(student)
    db.commit()
    db.refresh(student)

    avg_quality = float(np.mean([s["quality_score"] for s in all_selected]))
    face_profile = FaceProfile(
        student_id=student.id,
        version=1,
        quality_score=round(avg_quality, 1),
        accuracy_estimate=95.0,
        is_active=True,
    )
    db.add(face_profile)
    db.commit()
    db.refresh(face_profile)

    # Save embedding to student directory
    vector_path = image_storage.save_student_embedding(avg_embedding, usn)
    embedding_record = EmbeddingModel(
        face_profile_id=face_profile.id,
        vector_path=vector_path,
    )
    db.add(embedding_record)
    db.commit()

    # ── Step 10: Register in FAISS ─────────────────────────────────
    faiss_service.add_student(usn, avg_embedding)

    # Move cluster images to student folder
    image_storage.move_cluster_to_student(cluster_id, usn)

    logger.info(
        f"✅ Student {name} ({usn}) enrolled: "
        f"{total_selected} images, {len(detected_poses)} poses, "
        f"quality={avg_quality:.1f}, FAISS vectors={faiss_service.index.ntotal}"
    )

    # Broadcast WebSocket events
    student_data = {
        "id": student.id,
        "name": student.name,
        "usn": student.usn,
        "department": student.department,
        "semester": student.semester,
        "section": student.section,
        "images_count": total_selected,
        "quality_score": face_profile.quality_score,
        "version": face_profile.version,
    }

    try:
        websocket_manager.broadcast_sync("STUDENT_ENROLLED", student_data)
        websocket_manager.broadcast_sync(
            "FAISS_UPDATED",
            {"total_vectors": faiss_service.index.ntotal, "last_action": "VIDEO_ENROLL"},
        )
    except Exception:
        pass  # Don't fail enrollment if WebSocket broadcast fails

    stats = {
        "frames_processed": frames_processed,
        "faces_detected": faces_detected,
        "faces_accepted": faces_accepted,
        "images_selected": total_selected,
        "poses_covered": list(sorted(detected_poses)),
        "average_quality": round(avg_quality, 1),
        "faiss_total_vectors": faiss_service.index.ntotal,
        "pose_distribution": {k: len(v) for k, v in pose_buckets.items()},
    }

    return {"student": student_data, "stats": stats}


@router.post("/verify-video")
def verify_video_faces(
    video_path: str = Form(..., description="Path to video file on disk"),
):
    """Preview face detection from a video without enrolling.

    Returns face count, pose distribution, and quality stats
    to help decide if the video is suitable for enrollment.
    """
    if not os.path.exists(video_path):
        raise HTTPException(status_code=404, detail=f"Video not found: {video_path}")

    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        raise HTTPException(status_code=400, detail=f"Cannot open video: {video_path}")

    fps = cap.get(cv2.CAP_PROP_FPS)
    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    frame_skip = max(1, int(fps * 1.0))  # Every 1 second for quick preview

    pose_counts = {"front": 0, "left": 0, "right": 0, "up": 0, "down": 0}
    quality_scores = []
    frame_idx = 0
    faces_total = 0

    while True:
        ret, frame = cap.read()
        if not ret:
            break

        if frame_idx % frame_skip != 0:
            frame_idx += 1
            continue

        frame_idx += 1

        if width > 1920:
            scale = 1920.0 / width
            frame_resized = cv2.resize(frame, None, fx=scale, fy=scale, interpolation=cv2.INTER_AREA)
            inv_scale = width / 1920.0
        else:
            frame_resized = frame
            inv_scale = 1.0

        detections = face_detector.detect_faces(frame_resized)
        for det in detections:
            faces_total += 1
            raw_face = det["raw_face"]
            
            # Crop from original frame
            if inv_scale != 1.0:
                bbox = det["bbox"]
                x1 = int(bbox[0] * inv_scale)
                y1 = int(bbox[1] * inv_scale)
                x2 = int(bbox[2] * inv_scale)
                y2 = int(bbox[3] * inv_scale)
                x1 = max(0, min(x1, width))
                y1 = max(0, min(y1, height))
                x2 = max(0, min(x2, width))
                y2 = max(0, min(y2, height))
                crop = frame[y1:y2, x1:x2].copy()
            else:
                crop = det["crop"]
                
            quality = face_quality_service.analyze_quality(crop, raw_face)
            if quality["is_acceptable"]:
                quality_scores.append(quality["score"])
                pose = quality["pose"]
                yaw, pitch = pose["yaw"], pose["pitch"]
                if abs(yaw) < 15 and abs(pitch) < 15:
                    pose_counts["front"] += 1
                elif yaw >= 15:
                    pose_counts["left"] += 1
                elif yaw <= -15:
                    pose_counts["right"] += 1
                elif pitch >= 15:
                    pose_counts["up"] += 1
                elif pitch <= -15:
                    pose_counts["down"] += 1

    cap.release()

    return {
        "video_path": video_path,
        "total_faces_detected": faces_total,
        "high_quality_faces": len(quality_scores),
        "average_quality": round(float(np.mean(quality_scores)), 1) if quality_scores else 0,
        "pose_distribution": pose_counts,
        "poses_covered": sum(1 for v in pose_counts.values() if v > 0),
        "enrollment_ready": len(quality_scores) >= MIN_TOTAL and sum(1 for v in pose_counts.values() if v > 0) >= MIN_POSES,
    }
