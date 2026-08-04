"""SmartCampus AI — Classroom Video Pipeline.

Processes one or more classroom lecture videos to:
  1. Sample frames at 1 FPS
  2. Detect ALL faces in every frame (multi-student)
  3. Generate ArcFace embeddings per face
  4. Cluster by identity using incremental cosine-similarity matching
  5. Save every accepted face crop to storage/enrollment/{session_id}/cluster_{n}/
  6. Select best.jpg per cluster using quality scoring
  7. Broadcast WebSocket events as processing progresses
  8. Return structured cluster list with image URLs

The pipeline uses a simple but effective greedy incremental clustering approach:
  - Each new embedding is compared against the centroid of all known clusters.
  - If cosine similarity >= IDENTITY_THRESHOLD, it joins that cluster.
  - Otherwise it starts a new cluster.
  - This works well for classroom videos where the same students appear many times.
"""

import os
import cv2
import time
import uuid
import logging
import numpy as np
from pathlib import Path
from typing import List, Dict, Optional, Any, Callable

logger = logging.getLogger("smartcampus.classroom_pipeline")

# ── Tunable constants ──────────────────────────────────────────────────
FRAME_INTERVAL_SEC    = 1.0    # Sample one frame per second
IDENTITY_THRESHOLD    = 0.60   # Cosine similarity to match existing identity
MIN_FACE_PIXELS       = 60     # Minimum face width/height in pixels
MAX_FACE_SCALE        = 1920   # Downscale 4K frames to this width for speed
CLUSTER_PREVIEW_SIZE  = (224, 224)  # Saved crop size
MAX_GALLERY_PER_CLUSTER = 30   # Maximum images saved per cluster
QUALITY_BLUR_THRESH   = 80.0   # Laplacian variance — below = blurry
QUALITY_MIN_SCORE     = 50.0   # Minimum accepted quality score (0-100)
# ───────────────────────────────────────────────────────────────────────


class IdentityCluster:
    """Represents a single discovered student identity."""

    def __init__(self, cluster_id: str, cluster_number: int, session_dir: Path):
        self.cluster_id = cluster_id
        self.cluster_number = cluster_number
        self.session_dir = session_dir

        self.embeddings: List[np.ndarray] = []          # All accepted embeddings
        self.centroid: Optional[np.ndarray] = None      # Running mean embedding
        self.sample_count: int = 0                       # Total matched frames
        self.quality_scores: List[float] = []
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

    def compute_quality_score(self, crop: np.ndarray) -> float:
        """
        Composite quality score 0-100:
          - Blur (Laplacian variance)
          - Brightness (mean pixel value)
          - Face resolution (crop area)
        """
        gray = cv2.cvtColor(crop, cv2.COLOR_BGR2GRAY)
        blur_var = cv2.Laplacian(gray, cv2.CV_64F).var()

        # Blur: 0-40 points
        blur_score = min(40.0, blur_var / 10.0)

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

        return blur_score + brightness_score + res_score

    def save_face(self, crop: np.ndarray, frame_number: int, video_name: str,
                  timestamp_sec: float, quality_score: float) -> Optional[str]:
        """Save a face crop if the gallery isn't full and quality is acceptable."""
        if len(self.image_paths) >= MAX_GALLERY_PER_CLUSTER:
            # Only replace if this is better than the worst saved image
            if quality_score <= min(self.quality_scores) if self.quality_scores else True:
                return None

        # Resize crop to standard preview size
        resized = cv2.resize(crop, CLUSTER_PREVIEW_SIZE, interpolation=cv2.INTER_AREA)
        img_filename = f"img_{frame_number:06d}_{len(self.image_paths) + 1:03d}.jpg"
        img_path = self.cluster_dir / img_filename
        cv2.imwrite(str(img_path), resized, [cv2.IMWRITE_JPEG_QUALITY, 90])

        self.image_paths.append(str(img_path))
        self.quality_scores.append(quality_score)
        self.video_sources.append(video_name)

        return str(img_path)

    def select_best(self) -> Optional[str]:
        """Select and save the highest-quality image as best.jpg."""
        if not self.image_paths:
            return None

        best_idx = int(np.argmax(self.quality_scores))
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
        """Serialize cluster for API response."""
        def make_url(path: Optional[str]) -> Optional[str]:
            if not path:
                return None
            # Convert absolute path to relative storage URL
            norm = os.path.normpath(path)
            idx = norm.find("storage" + os.sep)
            idx_slash = norm.find("storage/")
            if idx != -1:
                rel = norm[idx:].replace(os.sep, "/")
            elif idx_slash != -1:
                rel = norm[idx_slash:]
            else:
                rel = path
            return f"/{rel}"

        gallery = [make_url(p) for p in self.image_paths if p]

        return {
            "clusterId": self.cluster_id,
            "clusterNumber": self.cluster_number,
            "sessionId": session_id,
            "sampleCount": self.sample_count,
            "imageCount": len(self.image_paths),
            "qualityAvg": round(float(np.mean(self.quality_scores)), 2) if self.quality_scores else 0.0,
            "confidence": round(float(np.mean([
                float(np.dot(e, self.centroid)) for e in self.embeddings[-10:]
            ])), 2) if self.centroid is not None and self.embeddings else 0.85,
            "bestImagePath": self.best_image_path,
            "bestImageUrl": make_url(self.best_image_path),
            "gallery": gallery,
            "firstSeenTime": f"{int(self.first_seen_sec // 60):02d}:{int(self.first_seen_sec % 60):02d}",
            "lastSeenTime": f"{int(self.last_seen_sec // 60):02d}:{int(self.last_seen_sec % 60):02d}",
            "status": "UNASSIGNED",
            "processingStatus": "COMPLETE",
        }


class ClassroomPipeline:
    """
    Orchestrates the full multi-student enrollment pipeline for classroom videos.

    Usage:
        pipeline = ClassroomPipeline(session_id, base_storage_dir)
        await pipeline.run(video_paths, db, progress_cb)
        clusters = pipeline.get_results()
    """

    def __init__(self, session_id: str, base_storage_dir: str):
        self.session_id = session_id
        self.session_dir = Path(base_storage_dir) / "enrollment" / session_id
        self.session_dir.mkdir(parents=True, exist_ok=True)
        self.clusters: List[IdentityCluster] = []
        self._next_cluster_num = 1

    # ── Internal helpers ───────────────────────────────────────────────

    def _find_matching_cluster(self, embedding: np.ndarray) -> Optional[IdentityCluster]:
        """Return the closest cluster if similarity >= threshold."""
        best_cluster = None
        best_sim = -1.0

        for cluster in self.clusters:
            if cluster.centroid is None:
                continue
            sim = float(np.dot(embedding, cluster.centroid))
            if sim > best_sim:
                best_sim = sim
                best_cluster = cluster

        if best_sim >= IDENTITY_THRESHOLD:
            return best_cluster
        return None

    def _create_cluster(self) -> IdentityCluster:
        """Create a new identity cluster."""
        cid = f"{self.session_id}_c{self._next_cluster_num:03d}"
        cluster = IdentityCluster(cid, self._next_cluster_num, self.session_dir)
        self.clusters.append(cluster)
        self._next_cluster_num += 1
        return cluster

    def _process_frame(
        self,
        frame: np.ndarray,
        frame_number: int,
        video_name: str,
        timestamp_sec: float,
        face_detector,
        embedding_service,
    ) -> List[IdentityCluster]:
        """Process a single frame: detect all faces, embed, cluster. Returns updated clusters."""
        updated_clusters = []

        # Downscale for detection if needed
        h, w = frame.shape[:2]
        if w > MAX_FACE_SCALE:
            scale = MAX_FACE_SCALE / w
            detect_frame = cv2.resize(frame, None, fx=scale, fy=scale,
                                      interpolation=cv2.INTER_AREA)
            inv_scale = w / MAX_FACE_SCALE
        else:
            detect_frame = frame
            inv_scale = 1.0

        try:
            detections = face_detector.detect_faces(detect_frame)
        except Exception as e:
            logger.debug(f"Face detection error on frame {frame_number}: {e}")
            return []

        if not detections:
            return []

        for det in detections:
            try:
                # Get face crop from original resolution
                if inv_scale != 1.0:
                    bbox = det["bbox"]
                    x1 = max(0, int(bbox[0] * inv_scale))
                    y1 = max(0, int(bbox[1] * inv_scale))
                    x2 = min(w, int(bbox[2] * inv_scale))
                    y2 = min(h, int(bbox[3] * inv_scale))
                else:
                    bbox = det["bbox"]
                    x1, y1 = max(0, int(bbox[0])), max(0, int(bbox[1]))
                    x2, y2 = min(w, int(bbox[2])), min(h, int(bbox[3]))

                crop_w, crop_h = x2 - x1, y2 - y1
                if crop_w < MIN_FACE_PIXELS or crop_h < MIN_FACE_PIXELS:
                    continue  # Too small

                crop = frame[y1:y2, x1:x2].copy()
                if crop.size == 0:
                    continue

                # Get embedding
                raw_face = det.get("raw_face")
                if raw_face is not None and hasattr(raw_face, "embedding") and raw_face.embedding is not None:
                    emb = raw_face.embedding.copy()
                else:
                    emb = embedding_service.generate_embedding(crop)

                if emb is None:
                    continue

                # Normalize
                norm = np.linalg.norm(emb)
                if norm == 0:
                    continue
                emb = emb / norm

                # Find or create cluster
                cluster = self._find_matching_cluster(emb)
                if cluster is None:
                    cluster = self._create_cluster()
                    cluster.first_seen_sec = timestamp_sec

                # Compute quality
                quality = cluster.compute_quality_score(crop)
                if quality < QUALITY_MIN_SCORE:
                    # Still count the detection even if we don't save the image
                    cluster.sample_count += 1
                    cluster.update_centroid(emb)
                    cluster.last_seen_sec = timestamp_sec
                    updated_clusters.append(cluster)
                    continue

                # Save image to cluster gallery
                cluster.save_face(crop, frame_number, video_name, timestamp_sec, quality)

                # Update cluster state
                cluster.sample_count += 1
                cluster.update_centroid(emb)
                cluster.last_seen_sec = timestamp_sec
                updated_clusters.append(cluster)

            except Exception as e:
                logger.debug(f"Error processing detection: {e}")
                continue

        return updated_clusters

    # ── Public API ─────────────────────────────────────────────────────

    async def run(
        self,
        video_paths: List[str],
        progress_callback: Optional[Callable[[dict], None]] = None,
    ) -> List[dict]:
        """
        Run the full pipeline over all videos.

        Args:
            video_paths: List of absolute paths to video files
            progress_callback: Optional async callback receiving progress dicts

        Returns:
            List of cluster dicts ready for API response
        """
        # Lazy imports to avoid loading AI models at import time
        from .face_detector import face_detector
        from .embedding_service import embedding_service

        total_frames_processed = 0
        total_faces_detected = 0
        num_videos = len(video_paths)

        for vid_idx, video_path in enumerate(video_paths):
            video_name = os.path.basename(video_path)
            logger.info(f"[{self.session_id}] Processing video {vid_idx + 1}/{num_videos}: {video_name}")

            cap = cv2.VideoCapture(video_path)
            if not cap.isOpened():
                logger.warning(f"Cannot open video: {video_path}")
                continue

            fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
            total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
            frame_skip = max(1, int(fps * FRAME_INTERVAL_SEC))

            frame_idx = 0
            video_frames_processed = 0

            try:
                while True:
                    ret, frame = cap.read()
                    if not ret:
                        break

                    if frame_idx % frame_skip != 0:
                        frame_idx += 1
                        continue

                    timestamp_sec = frame_idx / fps if fps > 0 else 0.0
                    updated = self._process_frame(
                        frame, frame_idx, video_name, timestamp_sec,
                        face_detector, embedding_service,
                    )

                    total_faces_detected += len(updated)
                    video_frames_processed += 1
                    total_frames_processed += 1
                    frame_idx += 1

                    # Progress update every 30 processed frames
                    if progress_callback and video_frames_processed % 30 == 0:
                        progress_pct = (
                            (vid_idx / num_videos)
                            + (video_frames_processed / max(total_frames / frame_skip, 1)) / num_videos
                        ) * 100
                        await progress_callback({
                            "event": "PROCESSING_PROGRESS",
                            "sessionId": self.session_id,
                            "progressPercentage": round(min(progress_pct, 99.0), 1),
                            "processedFrames": total_frames_processed,
                            "detectedFacesCount": total_faces_detected,
                            "generatedClusters": len(self.clusters),
                            "currentVideo": video_name,
                            "videoIndex": vid_idx + 1,
                            "totalVideos": num_videos,
                        })

            finally:
                cap.release()

        # ── Finalize: select best image per cluster ──────────────────
        for cluster in self.clusters:
            cluster.select_best()

            if progress_callback:
                await progress_callback({
                    "event": "CLUSTER_UPDATED",
                    "sessionId": self.session_id,
                    "clusterId": cluster.cluster_id,
                    "clusterNumber": cluster.cluster_number,
                    "bestImageUrl": cluster.to_dict(self.session_id).get("bestImageUrl"),
                    "imageCount": len(cluster.image_paths),
                    "sampleCount": cluster.sample_count,
                })

        if progress_callback:
            await progress_callback({
                "event": "ENROLLMENT_COMPLETED",
                "sessionId": self.session_id,
                "totalClusters": len(self.clusters),
                "totalFrames": total_frames_processed,
                "totalFaces": total_faces_detected,
                "progressPercentage": 100.0,
            })

        logger.info(
            f"[{self.session_id}] Pipeline complete: "
            f"{total_frames_processed} frames, "
            f"{total_faces_detected} faces, "
            f"{len(self.clusters)} clusters"
        )
        return self.get_results()

    def get_results(self) -> List[dict]:
        """Return all clusters sorted by sample count (most-seen first)."""
        results = [c.to_dict(self.session_id) for c in self.clusters]
        results.sort(key=lambda x: x["sampleCount"], reverse=True)
        return results
