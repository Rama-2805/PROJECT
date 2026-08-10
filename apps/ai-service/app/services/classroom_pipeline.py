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
        """Process a single frame: SCRFD face detection -> IoU face tracking -> quality filter -> sample selection -> ArcFace 512D."""
        h, w = frame.shape[:2]
        if w > MAX_FACE_SCALE:
            scale = MAX_FACE_SCALE / w
            detect_frame = cv2.resize(frame, None, fx=scale, fy=scale, interpolation=cv2.INTER_AREA)
            inv_scale = w / MAX_FACE_SCALE
        else:
            detect_frame = frame
            inv_scale = 1.0

        try:
            detections = face_detector.detect_faces(detect_frame)
        except Exception as e:
            logger.debug(f"Face detection error on frame {frame_number}: {e}")
            detections = []

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
        
        det_class = getattr(face_detector, "__class__", None).__name__
        if "YOLO" in det_class:
            log_tag = "YOLO11"
        elif "Combined" in det_class:
            log_tag = "COMBINED"
        else:
            log_tag = "SCRFD"

        logger.info(f"[{log_tag}] Frame #{frame_number} → {valid_count} detections")

        if valid_count > 0:
            self.frames_with_faces += 1
            self.face_detections += valid_count

        if self.frames_processed % 10 == 0 or self.frames_processed == 1:
            avg_per_frame = round(self.face_detections / max(1, self.frames_processed), 2)
            logger.info(
                f"[{log_tag} STATS] Evaluated: {self.frames_processed} | "
                f"Frames With Faces: {self.frames_with_faces} | "
                f"Total Detections: {self.face_detections} | "
                f"Average Detections/Frame: {avg_per_frame}"
            )

        # Update IoU Face Tracker with current frame detections
        active_tracks = self.tracker.update(scaled_detections, timestamp=timestamp_sec)

        # For each active face track, perform Quality Filtering & Deferred ArcFace Embedding
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

            # Evaluate face quality & consider adding to track's sample gallery
            sample_dict = track.consider_sample(
                crop=crop,
                timestamp=timestamp_sec,
                source_video=video_name,
                min_quality_threshold=35.0,
                max_samples=15
            )

            if sample_dict is None:
                self.quality_rejected += 1
                continue

            self.quality_accepted += 1

            # Save real classroom crop image to disk under track directory
            track_dir = self.tracks_dir / track.track_id
            track_dir.mkdir(parents=True, exist_ok=True)
            crop_filename = f"{sample_dict['sample_id']}.jpg"
            crop_path = track_dir / crop_filename
            cv2.imwrite(str(crop_path), crop, [cv2.IMWRITE_JPEG_QUALITY, 92])
            sample_dict["image_path"] = str(crop_path)

            # Deferred ArcFace 512D Embedding Generation (Only for accepted diverse samples)
            pre_emb = getattr(track, "raw_face", None)
            if pre_emb is not None and hasattr(pre_emb, "embedding") and pre_emb.embedding is not None:
                emb = pre_emb.embedding.copy()
            else:
                emb = embedding_service.generate_embedding(crop)

            if emb is not None:
                track.add_embedding(
                    sample_id=sample_dict["sample_id"],
                    embedding=emb,
                    quality_score=sample_dict["quality_score"],
                    timestamp=timestamp_sec,
                    source_video=video_name
                )
                self.embeddings_generated += 1

        # Save live face tracking preview frame with persistent track bounding boxes
        try:
            annotated = frame.copy()
            if active_tracks:
                for track in active_tracks:
                    bx1, by1, bx2, by2 = [max(0, int(v)) for v in track.bbox]
                    conf = track.confidence
                    color = (255, 200, 0)  # Cyan / Gold
                    cv2.rectangle(annotated, (bx1, by1), (bx2, by2), color, 2)
                    label = f"{track.track_id.upper()} ({int(track.current_quality)}%)"
                    cv2.putText(annotated, label, (bx1, max(15, by1 - 8)), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (255, 255, 255), 2)
            else:
                # Add status overlay for empty frames
                status_str = f"{self.detector_name} LIVE STREAM · FRAME #{frame_number} · TRACKING ACTIVE..."
                cv2.putText(annotated, status_str, (20, 40), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 255), 2)

            preview_path = self.session_dir / "live_preview.jpg"
            cv2.imwrite(str(preview_path), annotated)
        except Exception as err:
            logger.debug(f"Failed writing live_preview.jpg: {err}")

        return active_tracks

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
            logger.info(f"[{self.session_id}] Processing video {vid_idx + 1}/{num_videos}: {video_name}")

            cap = cv2.VideoCapture(video_path)
            if not cap.isOpened():
                logger.warning(f"Cannot open video: {video_path}")
                continue

            fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
            total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
            self.total_video_frames += total_frames
            frame_skip = max(1, int(fps * FRAME_INTERVAL_SEC))

            frame_idx = 0
            video_frames_processed = 0
            consecutive_empty_frames = 0

            try:
                while True:
                    ret, frame = cap.read()
                    if not ret:
                        break

                    if frame_idx % frame_skip != 0:
                        frame_idx += 1
                        continue

                    timestamp_sec = frame_idx / fps if fps > 0 else 0.0
                    updated = await asyncio.to_thread(
                        self._process_frame,
                        frame, frame_idx, video_name, timestamp_sec,
                        face_detector, embedding_service,
                    )

                    if not updated:
                        consecutive_empty_frames += 1
                    else:
                        consecutive_empty_frames = 0

                    # Smart empty video fast-forward: if no faces detected for 10 sampled frames in a row, jump ahead by 30 seconds
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
                    # Yield event loop so HTTP status endpoints respond instantly (<5ms)
                    await asyncio.sleep(0.01)
                    frame_idx += 1

                    if progress_callback and (video_frames_processed % 2 == 0 or video_frames_processed == 1):
                        progress_pct = (
                            (vid_idx / num_videos)
                            + (video_frames_processed / max(total_frames / frame_skip, 1)) / num_videos
                        ) * 100
                        await progress_callback({
                            "event": "PROCESSING_PROGRESS",
                            "sessionId": self.session_id,
                            "progressPercentage": round(min(max(progress_pct, 1.0), 99.0), 1),
                            "processedFrames": self.frames_processed,
                            "evaluated_frames": self.frames_processed,
                            "frames_with_faces": self.frames_with_faces,
                            "detectedFacesCount": self.face_detections,
                            "face_detections": self.face_detections,
                            "current_frame_faces": getattr(self, "current_frame_faces", 0),
                            "generatedClusters": len(self.clusters),
                            "currentVideo": video_name,
                            "videoIndex": vid_idx + 1,
                            "totalVideos": num_videos,
                            "diagnostics": self.get_diagnostics(),
                        })

            finally:
                cap.release()

        # ── Pass 2: HDBSCAN Unsupervised Face Embedding Clustering ─────
        clustering_res = self.run_hdbscan_clustering()

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
            f"[{self.session_id}] Pipeline complete: "
            f"{self.frames_processed} frames, "
            f"{self.face_detections} detections, "
            f"{self.quality_accepted} accepted, "
            f"{self.quality_rejected} rejected, "
            f"{self.embeddings_generated} embeddings, "
            f"{len(self.hdbscan_clusters)} HDBSCAN clusters, "
            f"{len(self.noise_samples)} noise samples"
        )
        return self.get_results()

    def run_hdbscan_clustering(self) -> dict:
        """Cluster all ArcFace 512D embeddings collected from diverse track samples using HDBSCAN.

        Configured via settings.hdbscan_min_cluster_size and settings.hdbscan_min_samples.
        Preserves UNKNOWN / NOISE points (label == -1).
        Identifies candidate duplicate clusters via centroid similarity >= settings.duplicate_cluster_threshold.
        """
        import hdbscan

        all_samples = []
        all_embeddings = []

        for t_id, track in self.tracker.tracks.items():
            for emb_dict in track.embeddings:
                emb = emb_dict.get("embedding")
                sample_id = emb_dict.get("sample_id", "")
                if emb is not None:
                    emb = np.asarray(emb, dtype=np.float32)
                    norm = np.linalg.norm(emb)
                    if norm > 0:
                        emb = emb / norm
                    # Try to find matching selected_sample for image path
                    sample_match = next((s for s in track.selected_samples if s.get("sample_id") == sample_id), None)
                    image_path = sample_match.get("image_path") if sample_match else None
                    all_samples.append({
                        "sample_id": sample_id,
                        "track_id": t_id,
                        "image_path": image_path,
                        "quality_score": emb_dict.get("quality_score", 70.0),
                        "timestamp": emb_dict.get("timestamp", 0.0),
                        "source_video": emb_dict.get("source_video", ""),
                        "embedding": emb,
                    })
                    all_embeddings.append(emb)

        if not all_embeddings:
            logger.info(f"[{self.session_id}] No embeddings to cluster.")
            self.hdbscan_clusters = []
            self.noise_samples = []
            self.duplicate_candidates = []
            return {"clusters": [], "noise_count": 0, "duplicate_candidates": []}

        X = np.array(all_embeddings, dtype=np.float32)

        min_c_size = max(2, settings.hdbscan_min_cluster_size)
        min_samp = max(1, settings.hdbscan_min_samples)

        if len(X) < min_c_size:
            logger.info(f"[{self.session_id}] Embeddings count ({len(X)}) < min_cluster_size ({min_c_size}). Marked as noise.")
            self.hdbscan_clusters = []
            self.noise_samples = all_samples
            self.duplicate_candidates = []
            return {"clusters": [], "noise_count": len(all_samples), "duplicate_candidates": []}

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
        noise_samples = []

        for sample, label in zip(all_samples, labels):
            if label == -1:
                noise_samples.append(sample)
            else:
                if label not in clusters_map:
                    clusters_map[label] = []
                clusters_map[label].append(sample)

        hdb_clusters = []
        for label, group in clusters_map.items():
            cluster_num = int(label) + 1
            cluster_id = f"cluster_{cluster_num:03d}"

            group_embs = [s["embedding"] for s in group]
            mean_emb = np.mean(group_embs, axis=0)
            norm = np.linalg.norm(mean_emb)
            centroid = mean_emb / norm if norm > 0 else mean_emb

            sims = [float(np.dot(s["embedding"], centroid)) for s in group]
            avg_sim = round(float(np.mean(sims)) * 100, 1)
            min_sim = round(float(np.min(sims)) * 100, 1)
            max_sim = round(float(np.max(sims)) * 100, 1)

            best_sample = max(group, key=lambda s: s["quality_score"])
            best_img_path = best_sample.get("image_path")
            best_img_url = _make_url(best_img_path) if best_img_path else None

            unique_tracks = list(set(s["track_id"] for s in group))
            timestamps = [s["timestamp"] for s in group]
            source_vids = list(set(s["source_video"] for s in group if s.get("source_video")))

            sample_details = []
            for s in group:
                img_p = s.get("image_path")
                sample_details.append({
                    "sampleId": s["sample_id"],
                    "trackId": s["track_id"],
                    "qualityScore": round(s["quality_score"], 1),
                    "timestamp": round(s["timestamp"], 2),
                    "sourceVideo": s["source_video"],
                    "similarityToCentroid": round(float(np.dot(s["embedding"], centroid)) * 100, 1),
                    "imageUrl": _make_url(img_p) if img_p else None,
                    "embedding": s["embedding"].tolist(),
                })

            hdb_clusters.append({
                "clusterId": cluster_id,
                "clusterNumber": cluster_num,
                "sampleCount": len(group),
                "trackCount": len(unique_tracks),
                "tracks": unique_tracks,
                "averageSimilarity": avg_sim,
                "minSimilarity": min_sim,
                "maxSimilarity": max_sim,
                "centroid": centroid.tolist(),
                "bestQualityScore": round(best_sample["quality_score"], 1),
                "bestImageUrl": best_img_url,
                "bestImagePath": best_img_path,
                "firstSeenSec": round(min(timestamps), 2) if timestamps else 0.0,
                "lastSeenSec": round(max(timestamps), 2) if timestamps else 0.0,
                "sourceVideos": source_vids,
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
        self.noise_samples = noise_samples
        self.duplicate_candidates = duplicate_candidates

        logger.info(
            f"[{self.session_id}] HDBSCAN Clustering Complete: "
            f"{len(all_embeddings)} embeddings -> {len(hdb_clusters)} clusters, "
            f"{len(noise_samples)} noise, {len(duplicate_candidates)} duplicate candidates."
        )

        return {
            "clusters": hdb_clusters,
            "noise_count": len(noise_samples),
            "total_embeddings": len(all_embeddings),
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
        """Return comprehensive pipeline execution diagnostics."""
        elapsed_sec = max(0.1, time.time() - self.start_time) if self.start_time > 0 else 1.0
        avg_conf = float(np.mean(self.confidence_scores)) if self.confidence_scores else 0.0
        avg_faces = float(self.face_detections / max(self.frames_with_faces, 1))

        active_tracks_cnt = len(self.tracker.tracks)
        total_tracks_cnt = self.tracker.total_tracks_created
        total_quality_samples = sum(len(t.selected_samples) for t in self.tracker.tracks.values())

        hdb_clusters = getattr(self, "hdbscan_clusters", [])
        noise_samples = getattr(self, "noise_samples", [])
        dup_candidates = getattr(self, "duplicate_candidates", [])

        return {
            "active_detector": getattr(self, "detector_name", "SCRFD 10G"),
            "total_video_frames": self.total_video_frames,
            "evaluated_frames": self.frames_processed,
            "frames_processed": self.frames_processed,
            "frames_with_faces": self.frames_with_faces,
            "face_detections": self.face_detections,
            "total_face_detections": self.face_detections,
            "active_tracks": active_tracks_cnt,
            "total_tracks": total_tracks_cnt,
            "quality_samples": total_quality_samples,
            "avg_faces_per_frame": round(avg_faces, 2),
            "avg_confidence": round(avg_conf, 3),
            "processing_fps": round(self.frames_processed / elapsed_sec, 2),
            "quality_accepted": self.quality_accepted,
            "quality_rejected": self.quality_rejected,
            "rejection_reasons": self.rejection_reasons,
            "embeddings_generated": self.embeddings_generated,
            "arcface_embeddings": self.embeddings_generated,
            "current_frame_faces": getattr(self, "current_frame_faces", 0),
            "clusters_count": len(hdb_clusters),
            "noise_count": len(noise_samples),
            "duplicate_candidates_count": len(dup_candidates),
            "duplicate_candidates": dup_candidates,
        }

