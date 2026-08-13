"""SmartCampus AI — Classroom Video Pipeline.

Processes one or more classroom lecture videos to:
  1. Sample frames at 1 FPS
  2. Detect ALL faces in every frame (multi-student)
  3. Quality Filter (blur, brightness, resolution, confidence)
  4. Generate L2-normalized 512D ArcFace embeddings per face
  5. Apply Temporal Deduplication to prevent redundant adjacent frames
  6. Cluster by identity using two-pass Cosine Similarity matching (Pass 1 online + Pass 2 global merge)
  7. Select top 5-20 representative face images per cluster
  8. Broadcast WebSocket events as processing progresses
  9. Store complete pipeline diagnostics
"""

import os
import cv2
import time
import uuid
import logging
import asyncio
import numpy as np
from pathlib import Path
from typing import List, Dict, Optional, Any, Callable

from app.config.settings import settings

logger = logging.getLogger("smartcampus.classroom_pipeline")

# ── Tunable constants ──────────────────────────────────────────────────
FRAME_INTERVAL_SEC         = 0.5    # Sample 2 frames per second (2 FPS)
IDENTITY_THRESHOLD         = 0.58   # Cosine similarity threshold for identity matching (0.58 ~ cosine dist 0.42)
MIN_FACE_PIXELS            = 20     # Minimum face width/height in pixels
MAX_FACE_SCALE             = 1920   # Downscale frame width for detection if needed
CLUSTER_PREVIEW_SIZE       = (224, 224) # Saved crop preview size
MAX_GALLERY_PER_CLUSTER    = 20     # Maximum images saved per cluster
MAX_EMBEDDINGS_PER_TRACK   = 15     # Configurable max samples per temporal sequence
QUALITY_BLUR_THRESH        = 25.0   # Laplacian variance threshold
QUALITY_MIN_SCORE          = 20.0   # Minimum quality score (0-100)
EMPTY_FRAME_SKIP_AFTER     = 10     # After this many consecutive empty frames, jump forward
EMPTY_FRAME_JUMP_SEC       = 30.0   # Jump this many seconds ahead when skipping empty region
# ───────────────────────────────────────────────────────────────────────


def _make_url(path: Optional[str]) -> Optional[str]:
    """Convert an absolute filesystem path to a relative URL rooted at /storage/..."""
    if not path:
        return None
    norm = os.path.normpath(path)
    idx = norm.find("storage" + os.sep)
    idx_slash = norm.find("storage/")
    if idx != -1:
        rel = norm[idx:].replace(os.sep, "/")
    elif idx_slash != -1:
        rel = norm[idx_slash:]
    else:
        rel = path
    return f"/{rel}" if not rel.startswith("/") else rel



class IdentityCluster:
    """Represents a single discovered student identity."""

    def __init__(self, cluster_id: str, cluster_number: int, session_dir: Path):
        self.cluster_id = cluster_id
        self.cluster_number = cluster_number
        self.session_dir = session_dir

        self.embeddings: List[np.ndarray] = []          # All accepted 512D ArcFace embeddings
        self.centroid: Optional[np.ndarray] = None      # Running mean L2-normalized centroid
        self.sample_count: int = 0                      # Total matched observations
        self.quality_scores: List[float] = []
        self.confidences: List[float] = []
        self.image_paths: List[str] = []                # Saved crop paths
        self.best_image_path: Optional[str] = None
        self.first_seen_sec: float = 0.0
        self.last_seen_sec: float = 0.0
        self.video_sources: List[str] = []

        # Cluster directory
        self.cluster_dir = session_dir / f"cluster_{cluster_number:03d}"
        self.cluster_dir.mkdir(parents=True, exist_ok=True)

    def update_centroid(self, new_embedding: np.ndarray):
        """Add embedding and recompute L2-normalized centroid."""
        self.embeddings.append(new_embedding)
        raw_mean = np.mean(self.embeddings, axis=0)
        norm = np.linalg.norm(raw_mean)
        self.centroid = raw_mean / norm if norm > 0 else raw_mean

    def merge_cluster(self, other: "IdentityCluster"):
        """Merge another cluster into this one (Pass 2 global sweep)."""
        self.embeddings.extend(other.embeddings)
        self.quality_scores.extend(other.quality_scores)
        self.confidences.extend(other.confidences)
        self.image_paths.extend(other.image_paths)
        self.video_sources.extend(other.video_sources)
        self.sample_count += other.sample_count
        self.first_seen_sec = min(self.first_seen_sec, other.first_seen_sec)
        self.last_seen_sec = max(self.last_seen_sec, other.last_seen_sec)

        # Recompute centroid
        raw_mean = np.mean(self.embeddings, axis=0)
        norm = np.linalg.norm(raw_mean)
        self.centroid = raw_mean / norm if norm > 0 else raw_mean

    def compute_quality_score(self, crop: np.ndarray, confidence: float = 0.85) -> dict:
        """
        Composite quality score 0-100:
          - Blur (Laplacian variance: 0-40 pts)
          - Brightness (mean pixel intensity: 0-30 pts)
          - Face resolution (crop size: 0-30 pts)
        """
        gray = cv2.cvtColor(crop, cv2.COLOR_BGR2GRAY)
        blur_var = float(cv2.Laplacian(gray, cv2.CV_64F).var())

        # Blur: 0-40 points
        blur_score = min(40.0, blur_var / 5.0)

        # Brightness: 0-30 points (ideal ~120)
        brightness = float(np.mean(gray))
        if 60 < brightness < 200:
            brightness_score = 30.0
        elif brightness <= 60:
            brightness_score = max(0.0, 30.0 * (brightness / 60.0))
        else:
            brightness_score = max(0.0, 30.0 * ((255.0 - brightness) / 55.0))

        # Resolution: 0-30 points
        h, w = crop.shape[:2]
        res_score = min(30.0, (w * h) / (128 * 128) * 30.0)

        total_score = round(blur_score + brightness_score + res_score, 1)

        # Determine rejection reason if any
        rejection_reason = None
        if w < MIN_FACE_PIXELS or h < MIN_FACE_PIXELS:
            rejection_reason = "too_small"
        elif blur_var < QUALITY_BLUR_THRESH:
            rejection_reason = "blurry"
        elif brightness < 30.0 or brightness > 235.0:
            rejection_reason = "lighting"
        elif total_score < QUALITY_MIN_SCORE:
            rejection_reason = "low_quality"

        return {
            "score": total_score,
            "blur_var": blur_var,
            "brightness": brightness,
            "width": w,
            "height": h,
            "is_acceptable": rejection_reason is None,
            "rejection_reason": rejection_reason,
        }

    def save_face(self, crop: np.ndarray, frame_number: int, video_name: str,
                  timestamp_sec: float, quality_score: float, confidence: float) -> Optional[str]:
        """Save a face crop if gallery isn't full or if quality is higher than lowest."""
        if len(self.image_paths) >= MAX_GALLERY_PER_CLUSTER:
            if self.quality_scores and quality_score <= min(self.quality_scores):
                return None

        resized = cv2.resize(crop, CLUSTER_PREVIEW_SIZE, interpolation=cv2.INTER_AREA)
        img_filename = f"img_{frame_number:06d}_{len(self.image_paths) + 1:03d}.jpg"
        img_path = self.cluster_dir / img_filename
        cv2.imwrite(str(img_path), resized, [cv2.IMWRITE_JPEG_QUALITY, 90])

        self.image_paths.append(str(img_path))
        self.quality_scores.append(quality_score)
        self.confidences.append(confidence)
        self.video_sources.append(video_name)

        return str(img_path)

    def select_best(self) -> Optional[str]:
        """Select and save the best representative image as best.jpg."""
        if not self.image_paths:
            return None

        # Composite metric: highest quality score + similarity to centroid
        scores = []
        for idx, path in enumerate(self.image_paths):
            q_score = self.quality_scores[idx] if idx < len(self.quality_scores) else 50.0
            emb = self.embeddings[idx] if idx < len(self.embeddings) else None
            sim = float(np.dot(emb, self.centroid)) if (emb is not None and self.centroid is not None) else 0.8
            scores.append(0.5 * q_score + 0.5 * (sim * 100.0))

        best_idx = int(np.argmax(scores))
        best_src = self.image_paths[best_idx]

        best_path = self.cluster_dir / "best.jpg"
        try:
            import shutil
            shutil.copy2(best_src, str(best_path))
            self.best_image_path = str(best_path)
        except Exception as e:
            logger.error(f"Failed to copy best image: {e}")
            self.best_image_path = best_src

        return self.best_image_path

    def to_dict(self, session_id: str) -> dict:
        """Serialize cluster representation for API responses."""
        gallery = [_make_url(p) for p in self.image_paths if p]

        avg_quality = round(float(np.mean(self.quality_scores)), 1) if self.quality_scores else 85.0
        avg_conf = round(float(np.mean(self.confidences)), 2) if self.confidences else 0.90

        return {
            "clusterId": self.cluster_id,
            "clusterNumber": self.cluster_number,
            "sessionId": session_id,
            "sampleCount": self.sample_count,
            "imageCount": len(self.image_paths),
            "qualityAvg": avg_quality,
            "confidence": avg_conf,
            "bestImagePath": self.best_image_path,
            "bestImageUrl": _make_url(self.best_image_path) or (gallery[0] if gallery else None),
            "gallery": gallery,
            "firstSeenTime": f"{int(self.first_seen_sec // 60):02d}:{int(self.first_seen_sec % 60):02d}",
            "lastSeenTime": f"{int(self.last_seen_sec // 60):02d}:{int(self.last_seen_sec % 60):02d}",
            "status": "UNASSIGNED",
            "processingStatus": "COMPLETE",
        }


class ClassroomPipeline:
    """
    Orchestrates classroom video frame processing, face detection,
    quality filtering, ArcFace embedding, temporal deduplication,
    identity clustering, and diagnostics tracking.
    """

    def __init__(self, session_id: str, base_storage_dir: str, detector_type: str = None):
        self.session_id = session_id
        self.session_dir = Path(base_storage_dir) / "enrollment" / session_id
        self.session_dir.mkdir(parents=True, exist_ok=True)
        self.detector_type = detector_type or settings.detection_model
        self.detector_name = "SCRFD 10G"

        self.clusters: List[IdentityCluster] = []
        self._next_cluster_num = 1

        # Face Tracker
        from .face_tracker import IoUTracker
        self.tracker = IoUTracker(iou_threshold=0.25, max_lost_frames=15)

        # Diagnostics & Detection Tracking
        self.total_video_frames: int = 0
        self.frames_processed: int = 0         # Evaluated frames
        self.frames_with_faces: int = 0        # Count of evaluated frames containing >= 1 face
        self.face_detections: int = 0          # Total face bounding box detections
        self.quality_accepted: int = 0
        self.quality_rejected: int = 0
        self.current_frame_faces: int = 0
        self.confidence_scores: List[float] = []
        self.start_time: float = 0.0
        self.rejection_reasons: Dict[str, int] = {
            "too_small": 0,
            "blurry": 0,
            "lighting": 0,
            "low_quality": 0,
            "low_confidence": 0,
        }
        self.embeddings_generated: int = 0
        self.embeddings_used_for_clustering: int = 0

        # Timing profiling dictionary (in milliseconds)
        self.timing_ms: Dict[str, float] = {
            "scrfd": 0.0,
            "tracking": 0.0,
            "quality": 0.0,
            "mediapipe": 0.0,
            "arcface": 0.0,
            "hdbscan": 0.0,
            "total": 0.0,
        }

        # Tracks directory
        self.tracks_dir = self.session_dir / "tracks"
        self.tracks_dir.mkdir(parents=True, exist_ok=True)

    def _process_frame(
        self,
        frame: np.ndarray,
        frame_number: int,
        video_name: str,
        timestamp_sec: float,
        face_detector,
        embedding_service,
    ) -> List[Any]:
        """Stage 1 Fast Collection: SCRFD 10G face detection -> IoU face tracking -> Quality Filter & Best Sample Selection (ZERO ArcFace ONNX calls)."""
        t0 = time.time()
        h, w = frame.shape[:2]
        if w > MAX_FACE_SCALE:
            scale = MAX_FACE_SCALE / w
            detect_frame = cv2.resize(frame, None, fx=scale, fy=scale, interpolation=cv2.INTER_AREA)
            inv_scale = w / MAX_FACE_SCALE
        else:
            detect_frame = frame
            inv_scale = 1.0

        # Time SCRFD 10G Detection (Adaptive Multi-Scale Small-Face Detection)
        t_scrfd_start = time.time()
        try:
            if hasattr(face_detector, "detect_multiscale_faces"):
                detections = face_detector.detect_multiscale_faces(detect_frame)
            else:
                detections = face_detector.detect_faces(detect_frame)
        except Exception as e:
            logger.debug(f"Face detection error on frame {frame_number}: {e}")
            detections = []
        scrfd_t_ms = (time.time() - t_scrfd_start) * 1000.0
        self.timing_ms["scrfd"] += scrfd_t_ms

        # Scale bounding box coordinates back if scaled
        scaled_detections = []
        for det in (detections or []):
            d = dict(det)
            if inv_scale != 1.0:
                bbox = d["bbox"]
                d["bbox"] = [
                    max(0, int(bbox[0] * inv_scale)),
                    max(0, int(bbox[1] * inv_scale)),
                    min(w, int(bbox[2] * inv_scale)),
                    min(h, int(bbox[3] * inv_scale)),
                ]
            scaled_detections.append(d)

        valid_count = len(scaled_detections)
        self.current_frame_faces = valid_count

        if valid_count > 0:
            self.frames_with_faces += 1
            self.face_detections += valid_count

        # Time IoU Tracker Update
        t_track_start = time.time()
        active_tracks = self.tracker.update(scaled_detections, timestamp=timestamp_sec)
        track_t_ms = (time.time() - t_track_start) * 1000.0
        self.timing_ms["tracking"] += track_t_ms

        # Time Quality Filtering & Best Sample Selection (Max 5 per track, ZERO ArcFace inference calls)
        t_q_start = time.time()
        for track in active_tracks:
            bx1, by1, bx2, by2 = [int(v) for v in track.bbox]
            crop_w, crop_h = max(0, bx2 - bx1), max(0, by2 - by1)

            if crop_w < 20 or crop_h < 20:
                self.quality_rejected += 1
                self.rejection_reasons["too_small"] += 1
                continue

            crop = frame[by1:by2, bx1:bx2].copy()
            if crop.size == 0:
                continue

            sample_dict = track.consider_sample(
                crop=crop,
                timestamp=timestamp_sec,
                source_video=video_name,
                min_quality_threshold=settings.min_track_quality_threshold,
                max_samples=settings.max_samples_per_track
            )

            if sample_dict is None:
                self.quality_rejected += 1
                continue

            self.quality_accepted += 1

            # Save crop image to track directory
            track_dir = self.tracks_dir / track.track_id
            track_dir.mkdir(parents=True, exist_ok=True)
            crop_filename = f"{sample_dict['sample_id']}.jpg"
            crop_path = track_dir / crop_filename
            cv2.imwrite(str(crop_path), crop, [cv2.IMWRITE_JPEG_QUALITY, 92])
            sample_dict["image_path"] = str(crop_path)
            sample_dict["crop"] = crop

        q_t_ms = (time.time() - t_q_start) * 1000.0
        self.timing_ms["quality"] += q_t_ms
        self.timing_ms["mediapipe"] += q_t_ms

        scrfd_cnt = len(detections) if detections else 0
        valid_cnt = valid_count
        tracked_cnt = len(active_tracks)
        q_pass_cnt = self.quality_accepted
        arcface_cnt = self.embeddings_generated
        faiss_cnt = arcface_cnt
        known_cnt = getattr(self, "known_matches", 0)
        unknown_cnt = getattr(self, "unknown_matches", 0)
        rejected_cnt = self.quality_rejected

        logger.info(
            f"[FRAME #{frame_number}] SCRFD={scrfd_cnt} VALID={valid_cnt} TRACKED={tracked_cnt} "
            f"QUALITY_PASS={q_pass_cnt} ARCFACE={arcface_cnt} FAISS={faiss_cnt} "
            f"KNOWN={known_cnt} UNKNOWN={unknown_cnt} REJECTED={rejected_cnt}"
        )

        # Diagnostic Visual Overlay
        try:
            annotated = frame.copy()
            if active_tracks:
                for track in active_tracks:
                    bx1, by1, bx2, by2 = [max(0, int(v)) for v in track.bbox]
                    st_name = getattr(track, "assigned_name", None) or "UNKNOWN"
                    sim_val = getattr(track, "recognition_similarity", 0.0)
                    color = (0, 255, 0) if st_name != "UNKNOWN" else (0, 165, 255) # Green for known, Orange for unknown

                    cv2.rectangle(annotated, (bx1, by1), (bx2, by2), color, 2)
                    
                    # Bounding Box Label Overlay
                    lbl_line1 = f"{st_name}"
                    lbl_line2 = f"{track.track_id.upper()} (q:{int(track.current_quality)}%)"
                    lbl_line3 = f"sim: {sim_val:.2f}"

                    cv2.putText(annotated, lbl_line1, (bx1, max(15, by1 - 25)), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (255, 255, 255), 2)
                    cv2.putText(annotated, lbl_line2, (bx1, max(30, by1 - 12)), cv2.FONT_HERSHEY_SIMPLEX, 0.40, (255, 255, 255), 1)
                    cv2.putText(annotated, lbl_line3, (bx1, max(42, by1 + 2)), cv2.FONT_HERSHEY_SIMPLEX, 0.40, (255, 255, 0), 1)
            else:
                status_str = f"{self.detector_name} LIVE STREAM · FRAME #{frame_number} · TRACKING ACTIVE..."
                cv2.putText(annotated, status_str, (20, 40), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 255), 2)

            preview_path = self.session_dir / "live_preview.jpg"
            cv2.imwrite(str(preview_path), annotated)
        except Exception as err:
            logger.debug(f"Failed writing live_preview.jpg overlay: {err}")

        return active_tracks

    def _extract_deferred_embeddings(self, embedding_service) -> int:
        """Stage 2 Deferred Feature Extraction: Run ArcFace ONNX batch inference ONLY on selected track crops (max 5 per track)."""
        t_start = time.time()
        crop_tasks = []

        for t_id, track in self.tracker.tracks.items():
            for sample_dict in track.selected_samples:
                crop = sample_dict.get("crop")
                sample_id = sample_dict.get("sample_id")
                source_video = sample_dict.get("source_video", "")
                timestamp = sample_dict.get("timestamp", 0.0)
                quality_score = sample_dict.get("quality_score", 70.0)

                # Skip if embedding already generated for this sample_id
                already_has_emb = any(e.get("sample_id") == sample_id for e in track.embeddings)
                if not already_has_emb and crop is not None:
                    crop_tasks.append((track, sample_id, crop, quality_score, timestamp, source_video))

        if not crop_tasks:
            logger.info("[ARCFACE STAGE 2] No new selected crops for deferred ArcFace embedding extraction.")
            return 0

        crops_only = [ct[2] for ct in crop_tasks]
        logger.info(f"[ARCFACE STAGE 2] Running batch ArcFace 512D feature extraction on {len(crops_only)} selected quality crops across {len(self.tracker.tracks)} tracks...")
        
        embeddings = embedding_service.generate_embeddings_batch(crops_only)

        from .faiss_service import faiss_service

        generated_count = 0
        for (track, sample_id, crop, quality_score, timestamp, source_video), emb in zip(crop_tasks, embeddings):
            if emb is not None:
                crop_h, crop_w = crop.shape[:2]
                emb_norm = float(np.linalg.norm(emb))
                logger.info(f"[ARCFACE CROP INSPECTION] Track {track.track_id}: face={crop_w}x{crop_h} quality={quality_score:.2f} embedding_norm={emb_norm:.2f}")

                track.add_embedding(
                    sample_id=sample_id,
                    embedding=emb,
                    quality_score=quality_score,
                    timestamp=timestamp,
                    source_video=source_video
                )
                self.embeddings_generated += 1
                generated_count += 1

                # Query FAISS Vector Index & Register Temporal Voting Match
                match = faiss_service.search_face(emb, threshold=getattr(settings, "recognition_threshold", 0.58))
                if match:
                    usn, similarity = match
                    if not hasattr(self, "known_matches"): self.known_matches = 0
                    self.known_matches += 1
                    track.add_recognition_vote(student_id=usn, student_name=usn, similarity=similarity, margin=0.10, conf_state="HIGH")
                    logger.info(f"[FAISS SEARCH] Track {track.track_id} sample {sample_id} → FAISS Match: USN={usn}, Similarity={similarity:.3f}")
                else:
                    if not hasattr(self, "unknown_matches"): self.unknown_matches = 0
                    self.unknown_matches += 1
                    track.add_recognition_vote(student_id="UNKNOWN", student_name="UNKNOWN", similarity=0.0, margin=0.0, conf_state="LOW")
                    logger.info(f"[FAISS SEARCH] Track {track.track_id} sample {sample_id} → UNKNOWN (No FAISS match >= {getattr(settings, 'recognition_threshold', 0.58)})")

        t_elapsed_ms = (time.time() - t_start) * 1000.0
        self.timing_ms["arcface"] += t_elapsed_ms

        logger.info(
            f"[TIMING STAGE 2] ArcFace Deferred Batch Extraction: "
            f"{generated_count} 512D embeddings generated for {len(crop_tasks)} crops in {t_elapsed_ms:.1f}ms "
            f"({t_elapsed_ms / max(1, generated_count):.1f}ms/crop)"
        )
        return generated_count

    async def run(
        self,
        video_paths: List[str],
        progress_callback: Optional[Callable[[dict], None]] = None,
    ) -> List[dict]:
        """Run the full multi-stage pipeline over all video inputs."""
        dtype = (self.detector_type or settings.detection_model).lower()
        if dtype in ("yolo11", "yolo"):
            from .yolo_detector import yolo_detector
            face_detector = yolo_detector
            self.detector_name = "YOLO11"
        elif dtype == "combined":
            from .combined_detector import combined_detector
            face_detector = combined_detector
            self.detector_name = "SCRFD 10G + YOLO11"
        else:
            from .face_detector import face_detector
            face_detector = face_detector
            self.detector_name = "SCRFD 10G"

        from .embedding_service import embedding_service

        num_videos = len(video_paths)
        if self.start_time == 0.0:
            self.start_time = time.time()

        for vid_idx, video_path in enumerate(video_paths):
            video_name = os.path.basename(video_path)
            v_exists = os.path.exists(video_path)
            v_size = os.path.getsize(video_path) if v_exists else 0
            logger.info(f"[DIAGNOSTIC-VCAP] Attempting VideoCapture for video {vid_idx + 1}/{num_videos}: path='{video_path}', exists={v_exists}, sizeBytes={v_size}")

            cap = cv2.VideoCapture(video_path)
            is_open = cap.isOpened()
            w = cap.get(cv2.CAP_PROP_FRAME_WIDTH) if is_open else 0
            h = cap.get(cv2.CAP_PROP_FRAME_HEIGHT) if is_open else 0
            fps = (cap.get(cv2.CAP_PROP_FPS) if is_open else 0.0) or 30.0
            total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT)) if is_open else 0
            duration_sec = (total_frames / max(0.1, fps)) if is_open else 0.0

            logger.info(f"[DIAGNOSTIC-VCAP] isOpened={is_open}, width={w}, height={h}, FPS={fps:.2f}, total_frames={total_frames}, duration={duration_sec:.2f}s")

            if not is_open:
                logger.error(f"[DIAGNOSTIC-VCAP-FAIL] VideoCapture failed to open video path: '{video_path}' (exists={v_exists}, size={v_size})")
                continue

            self.total_video_frames += total_frames
            # Dynamic AI Frame Sampler: Process at TARGET_PROCESSING_FPS (default 3.0 FPS) regardless of video FPS
            target_ai_fps = getattr(settings, "target_processing_fps", 3.0)
            frame_skip = max(1, round(fps / max(0.1, target_ai_fps)))
            logger.info(f"[DYNAMIC-SAMPLER] Video Source FPS={fps:.1f} → AI Processing at {target_ai_fps:.1f} FPS (evaluating every {frame_skip} frames)")

            frame_idx = 0
            video_frames_processed = 0
            consecutive_empty_frames = 0

            try:
                while True:
                    # Ultra-fast grab for skipped non-AI frames (0.05ms vs 30ms decode)
                    skipped = False
                    for _ in range(frame_skip - 1):
                        if not cap.grab():
                            skipped = True
                            break
                        frame_idx += 1

                    if skipped:
                        break

                    ret, frame = cap.read()
                    if not ret:
                        break
                    frame_idx += 1

                    timestamp_sec = frame_idx / fps if fps > 0 else 0.0
                    logger.info(f"[FRAME-SAMPLER] Processed sampled frame #{frame_idx} ({timestamp_sec:.2f}s)")
                    updated = await asyncio.to_thread(
                        self._process_frame,
                        frame, frame_idx, video_name, timestamp_sec,
                        face_detector, embedding_service,
                    )

                    if not updated:
                        consecutive_empty_frames += 1
                    else:
                        consecutive_empty_frames = 0

                    if consecutive_empty_frames >= EMPTY_FRAME_SKIP_AFTER:
                        consecutive_empty_frames = 0
                        jump_frames = int(EMPTY_FRAME_JUMP_SEC * fps)
                        new_frame_idx = frame_idx + jump_frames
                        if new_frame_idx < total_frames:
                            cap.set(cv2.CAP_PROP_POS_FRAMES, new_frame_idx)
                            frame_idx = new_frame_idx
                            logger.info(f"[{self.session_id}] Fast-forwarding empty segment: jumped {EMPTY_FRAME_JUMP_SEC}s to frame {frame_idx}/{total_frames}")

                    video_frames_processed += 1
                    self.frames_processed += 1
                    await asyncio.sleep(0.01)
                    frame_idx += 1

                    if progress_callback and (video_frames_processed % 5 == 0 or video_frames_processed == 1):
                        progress_pct = (
                            (vid_idx / num_videos)
                            + (video_frames_processed / max(total_frames / frame_skip, 1)) / num_videos
                        ) * 100
                        await progress_callback({
                            "event": "PROCESSING_PROGRESS",
                            "sessionId": self.session_id,
                            "progressPercentage": round(min(max(progress_pct, 1.0), 90.0), 1),
                            "processedFrames": self.frames_processed,
                            "evaluated_frames": self.frames_processed,
                            "frames_with_faces": self.frames_with_faces,
                            "detectedFacesCount": self.face_detections,
                            "face_detections": self.face_detections,
                            "current_frame_faces": getattr(self, "current_frame_faces", 0),
                            "generatedClusters": len(getattr(self, "hdbscan_clusters", [])),
                            "currentVideo": video_name,
                            "videoIndex": vid_idx + 1,
                            "totalVideos": num_videos,
                            "diagnostics": self.get_diagnostics(),
                        })

            finally:
                cap.release()

        # ── Stage 2: Deferred ArcFace Batch Feature Extraction ─────────
        logger.info(f"[{self.session_id}] Entering Stage 2: Deferred ArcFace Batch Extraction...")
        self._extract_deferred_embeddings(embedding_service)

        # ── Stage 3: HDBSCAN Track-Level Unsupervised Clustering ──────
        logger.info(f"[{self.session_id}] Entering Stage 3: HDBSCAN Track-Level Clustering...")
        t_hdb_start = time.time()
        clustering_res = self.run_hdbscan_clustering()
        self.timing_ms["hdbscan"] += (time.time() - t_hdb_start) * 1000.0

        # Persist clusters.json and diagnostics.json to session disk
        try:
            import json
            results = self.get_results()
            diag = self.get_diagnostics()
            clusters_path = self.session_dir / "clusters.json"
            diag_path = self.session_dir / "diagnostics.json"
            
            with open(clusters_path, "w") as f:
                json.dump(results, f, indent=2)
            with open(diag_path, "w") as f:
                json.dump(diag, f, indent=2)
            logger.info(f"[{self.session_id}] Persisted clusters.json and diagnostics.json to {self.session_dir}")
        except Exception as p_err:
            logger.warning(f"[{self.session_id}] Failed persisting clusters/diagnostics to disk: {p_err}")

        if progress_callback:
            await progress_callback({
                "event": "ENROLLMENT_COMPLETED",
                "sessionId": self.session_id,
                "totalClusters": len(self.hdbscan_clusters),
                "totalNoise": len(self.noise_samples),
                "totalEmbeddings": clustering_res.get("total_embeddings", 0),
                "duplicateCandidates": len(self.duplicate_candidates),
                "totalFrames": self.frames_processed,
                "totalFaces": self.face_detections,
                "progressPercentage": 100.0,
            })

        logger.info(
            f"[{self.session_id}] Two-Stage Pipeline Complete: "
            f"{self.frames_processed} sampled frames, "
            f"{self.face_detections} SCRFD detections, "
            f"{len(self.tracker.tracks)} unique tracks, "
            f"{self.embeddings_generated} ArcFace embeddings, "
            f"{len(self.hdbscan_clusters)} HDBSCAN clusters in "
            f"{self.timing_ms['total'] / 1000.0:.2f}s "
            f"(SCRFD: {self.timing_ms['scrfd']:.0f}ms | "
            f"Tracking: {self.timing_ms['tracking']:.0f}ms | "
            f"Quality: {self.timing_ms['quality']:.0f}ms | "
            f"ArcFace: {self.timing_ms['arcface']:.0f}ms | "
            f"HDBSCAN: {self.timing_ms['hdbscan']:.0f}ms)"
        )
        return self.get_results()

    def run_hdbscan_clustering(self) -> dict:
        """Cluster TRACK-LEVEL ArcFace 512D centroid representations using HDBSCAN.

        Operates primarily on ONE centroid vector per TrackedFace (not thousands of frame embeddings).
        Configured via settings.hdbscan_min_cluster_size and settings.hdbscan_min_samples.
        Preserves UNKNOWN / NOISE tracks (label == -1).
        """
        import hdbscan

        track_representations = []
        track_centroids = []

        for t_id, track in self.tracker.tracks.items():
            centroid = track.track_centroid
            if centroid is not None:
                logger.info(f"[TRACK-REPRESENTATION] Track {t_id} → centroid vector created from {len(track.embeddings)} ArcFace embeddings")
                best_sample = max(track.selected_samples, key=lambda s: s.get("quality_score", 0.0)) if track.selected_samples else None
                best_img_p = best_sample.get("image_path") if best_sample else None

                track_representations.append({
                    "track_id": t_id,
                    "sample_count": len(track.selected_samples),
                    "embedding_count": len(track.embeddings),
                    "quality_score": track.best_quality,
                    "first_seen": track.first_seen,
                    "last_seen": track.last_seen,
                    "best_image_path": best_img_p,
                    "best_image_url": _make_url(best_img_p) if best_img_p else None,
                    "centroid": centroid,
                    "track_obj": track,
                })
                track_centroids.append(centroid)

        if not track_centroids:
            logger.info(f"[{self.session_id}] No track representations to cluster.")
            self.hdbscan_clusters = []
            self.noise_samples = []
            self.duplicate_candidates = []
            return {"clusters": [], "noise_count": 0, "duplicate_candidates": []}

        X = np.array(track_centroids, dtype=np.float32)

        min_c_size = max(2, getattr(settings, "hdbscan_min_cluster_size", 2))
        min_samp = max(1, getattr(settings, "hdbscan_min_samples", 1))

        if len(X) < min_c_size:
            logger.info(f"[{self.session_id}] Track representations count ({len(X)}) < min_cluster_size ({min_c_size}). Marked as noise.")
            self.hdbscan_clusters = []
            self.noise_samples = track_representations
            self.duplicate_candidates = []
            return {"clusters": [], "noise_count": len(track_representations), "duplicate_candidates": []}

        sim_matrix = np.clip(np.dot(X, X.T), -1.0, 1.0)
        dist_matrix = (1.0 - sim_matrix).astype(np.float64)

        clusterer = hdbscan.HDBSCAN(
            metric="precomputed",
            min_cluster_size=min_c_size,
            min_samples=min_samp,
            allow_single_cluster=True
        )
        labels = clusterer.fit_predict(dist_matrix)

        clusters_map = {}
        noise_tracks = []

        for track_rep, label in zip(track_representations, labels):
            if label == -1:
                noise_tracks.append(track_rep)
            else:
                if label not in clusters_map:
                    clusters_map[label] = []
                clusters_map[label].append(track_rep)

        logger.info(f"[HDBSCAN] Input track representations: {len(track_centroids)} | Clusters: {len(clusters_map)} | Noise tracks: {len(noise_tracks)}")

        hdb_clusters = []
        for label, group in clusters_map.items():
            cluster_num = int(label) + 1
            cluster_id = f"cluster_{cluster_num:03d}"

            group_centroids = [tr["centroid"] for tr in group]
            mean_emb = np.mean(group_centroids, axis=0)
            norm = np.linalg.norm(mean_emb)
            cluster_centroid = mean_emb / norm if norm > 0 else mean_emb

            sims = [float(np.dot(tr["centroid"], cluster_centroid)) for tr in group]
            avg_sim = round(float(np.mean(sims)) * 100, 1)
            min_sim = round(float(np.min(sims)) * 100, 1)
            max_sim = round(float(np.max(sims)) * 100, 1)

            best_tr = max(group, key=lambda tr: tr["quality_score"])
            best_img_url = best_tr["best_image_url"]
            best_img_path = best_tr["best_image_path"]

            all_track_ids = [tr["track_id"] for tr in group]
            total_samples = sum(tr["sample_count"] for tr in group)
            first_seen_vals = [tr["first_seen"] for tr in group]
            last_seen_vals = [tr["last_seen"] for tr in group]

            sample_details = []
            for tr in group:
                track_obj = tr["track_obj"]
                for s in track_obj.selected_samples:
                    img_p = s.get("image_path")
                    sample_details.append({
                        "sampleId": s["sample_id"],
                        "trackId": tr["track_id"],
                        "qualityScore": round(s.get("quality_score", 70.0), 1),
                        "timestamp": round(s.get("timestamp", 0.0), 2),
                        "sourceVideo": s.get("source_video", ""),
                        "imageUrl": _make_url(img_p) if img_p else None,
                    })

            hdb_clusters.append({
                "clusterId": cluster_id,
                "clusterNumber": cluster_num,
                "sampleCount": total_samples,
                "trackCount": len(all_track_ids),
                "tracks": all_track_ids,
                "averageSimilarity": avg_sim,
                "minSimilarity": min_sim,
                "maxSimilarity": max_sim,
                "consistencyPercentage": avg_sim,
                "centroid": cluster_centroid.tolist(),
                "bestQualityScore": round(best_tr["quality_score"], 1),
                "bestImageUrl": best_img_url,
                "bestImagePath": best_img_path,
                "firstSeenSec": round(min(first_seen_vals), 2) if first_seen_vals else 0.0,
                "lastSeenSec": round(max(last_seen_vals), 2) if last_seen_vals else 0.0,
                "status": "UNASSIGNED",
                "assignedStudent": None,
                "samples": sample_details,
            })

        hdb_clusters.sort(key=lambda c: c["sampleCount"], reverse=True)

        thresh = settings.duplicate_cluster_threshold
        duplicate_candidates = []

        for i in range(len(hdb_clusters)):
            for j in range(i + 1, len(hdb_clusters)):
                c1 = hdb_clusters[i]
                c2 = hdb_clusters[j]
                vec1 = np.array(c1["centroid"], dtype=np.float32)
                vec2 = np.array(c2["centroid"], dtype=np.float32)
                sim = float(np.dot(vec1, vec2))

                if sim >= thresh:
                    duplicate_candidates.append({
                        "clusterA": c1["clusterId"],
                        "clusterB": c2["clusterId"],
                        "similarityPct": round(sim * 100, 1),
                        "bestImageUrlA": c1["bestImageUrl"],
                        "bestImageUrlB": c2["bestImageUrl"],
                        "sampleCountA": c1["sampleCount"],
                        "sampleCountB": c2["sampleCount"],
                        "status": "CANDIDATE",
                    })

        self.hdbscan_clusters = hdb_clusters
        self.noise_samples = noise_tracks
        self.duplicate_candidates = duplicate_candidates

        return {
            "clusters": hdb_clusters,
            "noise_count": len(noise_tracks),
            "total_embeddings": self.embeddings_generated,
            "total_tracks": len(track_representations),
            "duplicate_candidates": duplicate_candidates,
        }

    def get_results(self) -> List[dict]:
        """Return HDBSCAN clusters or face tracks."""
        if hasattr(self, "hdbscan_clusters") and self.hdbscan_clusters:
            return self.hdbscan_clusters

        results = []
        for t_id, track in self.tracker.tracks.items():
            samples = []
            best_img_url = None
            for s in track.selected_samples:
                img_path = s.get("image_path")
                img_url = _make_url(img_path) if img_path else None
                if img_url and not best_img_url:
                    best_img_url = img_url
                samples.append({
                    "sampleId": s.get("sample_id"),
                    "qualityScore": s.get("quality_score"),
                    "blurScore": s.get("blur_score"),
                    "bboxSize": s.get("bbox_size"),
                    "timestamp": s.get("timestamp"),
                    "imageUrl": img_url,
                })
            results.append({
                "trackId": track.track_id,
                "firstSeenSec": round(track.first_seen, 2),
                "lastSeenSec": round(track.last_seen, 2),
                "detectionCount": track.detection_count,
                "sampleCount": len(track.selected_samples),
                "embeddingCount": len(track.embeddings),
                "bestQuality": round(track.best_quality, 1),
                "currentQuality": round(track.current_quality, 1),
                "bestImageUrl": best_img_url,
                "gallery": [s["imageUrl"] for s in samples if s.get("imageUrl")],
                "samples": samples,
            })
        results.sort(key=lambda x: x["sampleCount"], reverse=True)
        return results

    def get_diagnostics(self) -> dict:
        """Return comprehensive pipeline execution diagnostics separating detection and enrollment statistics."""
        elapsed_sec = max(0.1, time.time() - self.start_time) if self.start_time > 0 else 1.0
        avg_conf = float(np.mean(self.confidence_scores)) if self.confidence_scores else 0.0
        avg_faces = float(self.face_detections / max(self.frames_with_faces, 1))

        active_tracks_cnt = len(self.tracker.tracks)
        total_tracks_cnt = self.tracker.total_tracks_created
        total_quality_samples = sum(len(t.selected_samples) for t in self.tracker.tracks.values())
        tracks_with_good_samples = sum(1 for t in self.tracker.tracks.values() if len(t.selected_samples) > 0)

        hdb_clusters = getattr(self, "hdbscan_clusters", [])
        noise_samples = getattr(self, "noise_samples", [])
        dup_candidates = getattr(self, "duplicate_candidates", [])

        return {
            "active_detector": getattr(self, "detector_name", "SCRFD 10G"),
            # Detection Statistics
            "total_video_frames": self.total_video_frames,
            "evaluated_frames": self.frames_processed,
            "frames_processed": self.frames_processed,
            "frames_with_faces": self.frames_with_faces,
            "face_detections": self.face_detections,
            "total_face_detections": self.face_detections,
            "current_frame_faces": getattr(self, "current_frame_faces", 0),
            "avg_faces_per_frame": round(avg_faces, 2),
            "avg_confidence": round(avg_conf, 3),
            "processing_fps": round(self.frames_processed / elapsed_sec, 2),
            # Timing Profile (ms)
            "timing_breakdown": {
                "scrfd_ms": round(self.timing_ms.get("scrfd", 0.0), 1),
                "tracking_ms": round(self.timing_ms.get("tracking", 0.0), 1),
                "quality_ms": round(self.timing_ms.get("quality", 0.0), 1),
                "mediapipe_ms": round(self.timing_ms.get("mediapipe", 0.0), 1),
                "arcface_ms": round(self.timing_ms.get("arcface", 0.0), 1),
                "hdbscan_ms": round(self.timing_ms.get("hdbscan", 0.0), 1),
                "total_ms": round(self.timing_ms.get("total", 0.0), 1),
            },
            "active_tracks": active_tracks_cnt,
            "total_tracks": total_tracks_cnt,
            "tracks_with_quality_samples": tracks_with_good_samples,
            "arcface_embeddings": self.embeddings_generated,
            "arcface_failures": 0,
            "quality_accepted": self.quality_accepted,
            "raw_quality_passes": self.quality_accepted,
            "quality_rejected": self.quality_rejected,
            "quality_samples": total_quality_samples,
            "stored_gallery_crops": total_quality_samples,
            "clusters_count": len(hdb_clusters),
            "generated_clusters": len(hdb_clusters),
            "faiss_vectors": getattr(self, "embeddings_generated", 0),
            "noise_count": len(noise_samples),
            "duplicate_candidates_count": len(dup_candidates),
            "duplicate_candidates": dup_candidates,
            # Extended Small-Face Diagnostic Metrics
            "primary_detections": getattr(self, "primary_detections", self.face_detections),
            "roi_detections": getattr(self, "roi_detections", 0),
            "small_face_candidates": getattr(self, "small_face_candidates", 0),
            "small_face_recovered": getattr(self, "small_face_recovered", 0),
            "small_face_quality_passed": self.quality_accepted,
            "small_face_quality_rejected": self.quality_rejected,
            "small_face_arcface_success": self.embeddings_generated,
            "small_face_arcface_failures": 0,
            "duplicate_detections_removed": getattr(self, "duplicate_detections_removed", 0),
        }

