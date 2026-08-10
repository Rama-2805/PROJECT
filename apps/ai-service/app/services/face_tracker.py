"""SmartCampus AI — Pluggable Face Tracking Engine.

Defines the abstract BaseTracker and a default high-performance IoUTracker.
Tracks detected faces across consecutive frames, maintaining track IDs and frame counts.
"""

import time
import uuid
import logging
import numpy as np
from abc import ABC, abstractmethod
from typing import List, Dict, Any, Tuple, Optional

logger = logging.getLogger("smartcampus.tracker")


import cv2


def calculate_face_quality(crop: np.ndarray, bbox: List[float], frame_w: int = 1920, frame_h: int = 1080) -> Dict[str, float]:
    """Calculate multi-factor face quality score (0 - 100).
    
    Factors:
    - Blur score (Laplacian variance): > 40.0 is crisp.
    - Resolution score: Face size relative to frame.
    - Brightness & Contrast score: Mean gray intensity 60-200.
    - Aspect Ratio & Geometry: Valid face bounding box.
    """
    if crop is None or crop.size == 0:
        return {"quality_score": 0.0, "blur_score": 0.0, "resolution_score": 0.0, "brightness_score": 0.0, "geometry_score": 0.0}

    h, w = crop.shape[:2]
    if w < 20 or h < 20:
        return {"quality_score": 0.0, "blur_score": 0.0, "resolution_score": 0.0, "brightness_score": 0.0, "geometry_score": 0.0}

    # 1. Blur score (Laplacian Variance)
    gray = cv2.cvtColor(crop, cv2.COLOR_BGR2GRAY) if len(crop.shape) == 3 else crop
    blur_var = float(cv2.Laplacian(gray, cv2.CV_64F).var())
    # Scale blur score: 0 to 40+ maps to 0 to 35 pts
    blur_score = min(35.0, (blur_var / 50.0) * 35.0)

    # 2. Resolution score (Face Size)
    face_area = float(w * h)
    ideal_area = 100.0 * 100.0
    resolution_score = min(35.0, (face_area / ideal_area) * 35.0)

    # 3. Brightness / Contrast score
    mean_val = float(np.mean(gray))
    std_val = float(np.std(gray))
    if 60.0 <= mean_val <= 200.0 and std_val > 20.0:
        brightness_score = 15.0
    else:
        brightness_score = max(0.0, 15.0 - abs(mean_val - 130.0) / 10.0)

    # 4. Aspect Ratio & Geometry score
    aspect_ratio = float(w) / float(max(1, h))
    if 0.5 <= aspect_ratio <= 1.8:
        geometry_score = 15.0
    else:
        geometry_score = max(0.0, 15.0 - abs(aspect_ratio - 1.0) * 10.0)

    total_quality = min(100.0, blur_score + resolution_score + brightness_score + geometry_score)

    return {
        "quality_score": round(total_quality, 2),
        "blur_score": round(blur_var, 2),
        "resolution_score": round(resolution_score, 2),
        "brightness_score": round(brightness_score, 2),
        "geometry_score": round(geometry_score, 2),
        "w": w,
        "h": h
    }


class TrackedFace:
    """Represents a face currently being tracked across video frames with sample gallery and embedding storage."""

    def __init__(self, track_id: str, bbox: List[int], confidence: float, landmarks: Optional[Any] = None, timestamp: Optional[float] = None):
        self.track_id = track_id
        self.bbox = [float(v) for v in bbox]  # [x1, y1, x2, y2]
        self.velocity = [0.0, 0.0, 0.0, 0.0]
        self.confidence = confidence
        self.landmarks = landmarks
        
        self.first_seen = timestamp or time.time()
        self.last_seen = self.first_seen
        self.frame_count = 1
        self.detection_count = 1
        
        self.current_quality: float = 0.0
        self.best_quality: float = 0.0
        
        # Sample selection gallery (5 - 15 samples per track)
        self.selected_samples: List[Dict[str, Any]] = []
        
        # ArcFace 512D Embeddings for selected samples
        self.embeddings: List[Dict[str, Any]] = []
        
        # State variables for attendance/recognition association
        self.student_usn: Optional[str] = None
        self.recognition_confidence: float = 0.0
        self.recognition_count = 0

        # Rolling mean embedding accumulator
        self._embedding_sum: Optional[np.ndarray] = None
        self._embedding_count: int = 0
        self.crop: Optional[np.ndarray] = None
        self.raw_face: Optional[Any] = None

    def consider_sample(
        self,
        crop: np.ndarray,
        timestamp: float,
        source_video: str,
        min_quality_threshold: float = 35.0,
        max_samples: int = 15
    ) -> Optional[Dict[str, Any]]:
        """Evaluate quality and add to selected_samples if diverse and high quality.
        Returns sample dict if added, else None.
        """
        if crop is None or crop.size == 0:
            return None

        q_metrics = calculate_face_quality(crop, self.bbox)
        q_score = q_metrics["quality_score"]
        self.current_quality = q_score
        if q_score > self.best_quality:
            self.best_quality = q_score

        if q_score < min_quality_threshold:
            return None

        # Check for near-duplicates in time or crop similarity
        for existing in self.selected_samples:
            dt = abs(timestamp - existing.get("timestamp", 0.0))
            if dt < 0.3:  # Too close in time (within 300ms)
                # If new crop has significantly higher quality, replace existing
                if q_score > existing.get("quality_score", 0.0) + 10.0:
                    sample_id = existing["sample_id"]
                    new_sample = {
                        "sample_id": sample_id,
                        "crop": crop,
                        "quality_score": q_score,
                        "blur_score": q_metrics["blur_score"],
                        "bbox_size": (q_metrics["w"], q_metrics["h"]),
                        "timestamp": timestamp,
                        "source_video": source_video,
                        "track_id": self.track_id,
                    }
                    idx = self.selected_samples.index(existing)
                    self.selected_samples[idx] = new_sample
                    return new_sample
                return None

        # Add new diverse sample
        sample_id = f"sample_{uuid.uuid4().hex[:6]}"
        sample_dict = {
            "sample_id": sample_id,
            "crop": crop,
            "quality_score": q_score,
            "blur_score": q_metrics["blur_score"],
            "bbox_size": (q_metrics["w"], q_metrics["h"]),
            "timestamp": timestamp,
            "source_video": source_video,
            "track_id": self.track_id,
        }

        self.selected_samples.append(sample_dict)

        # If gallery exceeds max_samples, prune lowest quality sample
        if len(self.selected_samples) > max_samples:
            self.selected_samples.sort(key=lambda s: s.get("quality_score", 0.0), reverse=True)
            self.selected_samples = self.selected_samples[:max_samples]

        return sample_dict

    def add_embedding(
        self,
        sample_id: str,
        embedding: np.ndarray,
        quality_score: float,
        timestamp: float,
        source_video: str
    ) -> Dict[str, Any]:
        """Store ArcFace 512-D L2-normalized embedding attached to track."""
        if embedding is None:
            return {}
        emb_arr = np.asarray(embedding, dtype=np.float32)
        norm = np.linalg.norm(emb_arr)
        if norm > 1e-6:
            emb_arr = emb_arr / norm

        emb_id = f"emb_{uuid.uuid4().hex[:6]}"
        emb_dict = {
            "embedding_id": emb_id,
            "track_id": self.track_id,
            "sample_id": sample_id,
            "embedding": emb_arr,
            "quality_score": quality_score,
            "timestamp": timestamp,
            "source_video": source_video,
        }
        self.embeddings.append(emb_dict)
        self.accumulate_embedding(emb_arr)
        return emb_dict

    def accumulate_embedding(self, emb: np.ndarray) -> None:
        """Accumulate normalized embedding vector to maintain rolling mean."""
        if emb is None:
            return
        e = np.asarray(emb, dtype=np.float32)
        norm = np.linalg.norm(e)
        if norm < 1e-6:
            return
        e = e / norm
        if self._embedding_sum is None:
            self._embedding_sum = e.copy()
        else:
            self._embedding_sum += e
        self._embedding_count += 1

    @property
    def rolling_embedding(self) -> Optional[np.ndarray]:
        if self._embedding_sum is None or self._embedding_count == 0:
            return None
        mean = self._embedding_sum / self._embedding_count
        norm = np.linalg.norm(mean)
        return mean / norm if norm > 1e-6 else mean

    def predict(self) -> List[int]:
        """Predict next bounding box location based on Kalman velocity linear state."""
        return [int(b + v) for b, v in zip(self.bbox, self.velocity)]

    def update_state(self, new_bbox: List[int], confidence: float, landmarks: Optional[Any] = None, timestamp: Optional[float] = None) -> None:
        """Update bounding box and smooth Kalman velocity vectors."""
        alpha = 0.65
        beta = 0.40
        new_bbox_f = [float(v) for v in new_bbox]

        for i in range(4):
            self.velocity[i] = (1.0 - beta) * self.velocity[i] + beta * (new_bbox_f[i] - self.bbox[i])
            self.bbox[i] = alpha * new_bbox_f[i] + (1.0 - alpha) * self.bbox[i]

        self.confidence = confidence
        self.landmarks = landmarks
        self.last_seen = timestamp or time.time()
        self.frame_count += 1
        self.detection_count += 1


class BaseTracker(ABC):
    """Abstract Base Class defining the modular interface for all face trackers."""

    @abstractmethod
    def update(self, detections: List[Dict[str, Any]]) -> List[TrackedFace]:
        pass

    @abstractmethod
    def reset(self) -> None:
        pass


class IoUTracker(BaseTracker):
    """IoU + Kalman Velocity + Embedding Gate Face Tracker."""

    def __init__(self, iou_threshold: float = 0.25, max_lost_frames: int = 15, embed_min_sim: float = 0.35):
        self.iou_threshold = iou_threshold
        self.max_lost_frames = max_lost_frames
        self.embed_min_sim = embed_min_sim
        
        self.tracks: Dict[str, TrackedFace] = {}
        self.lost_frames: Dict[str, int] = {}
        self.total_tracks_created: int = 0

    def _calculate_iou(self, box1: List[int], box2: List[int]) -> float:
        """Calculate the Intersection-over-Union (IoU) of two bounding boxes."""
        x1_1, y1_1, x2_1, y2_1 = box1
        x1_2, y1_2, x2_2, y2_2 = box2

        x_left = max(x1_1, x1_2)
        y_top = max(y1_1, y1_2)
        x_right = min(x2_1, x2_2)
        y_bottom = min(y2_1, y2_2)

        if x_right <= x_left or y_bottom <= y_top:
            return 0.0

        intersection_area = (x_right - x_left) * (y_bottom - y_top)
        area1 = max(0, x2_1 - x1_1) * max(0, y2_1 - y1_1)
        area2 = max(0, x2_2 - x1_2) * max(0, y2_2 - y1_2)
        union_area = float(area1 + area2 - intersection_area)

        if union_area <= 0:
            return 0.0

        return intersection_area / union_area

    def _cosine_sim(self, a: Optional[np.ndarray], b: Optional[np.ndarray]) -> float:
        if a is None or b is None:
            return 1.0
        a = np.asarray(a, dtype=np.float32)
        b = np.asarray(b, dtype=np.float32)
        na, nb = np.linalg.norm(a), np.linalg.norm(b)
        if na < 1e-6 or nb < 1e-6:
            return 1.0
        return float(np.dot(a, b) / (na * nb))

    def update(self, detections: List[Dict[str, Any]], timestamp: Optional[float] = None) -> List[TrackedFace]:
        """Associate detections to active tracks using prediction, IoU overlap, and embedding validation."""
        updated_tracks: List[TrackedFace] = []
        matches: List[Tuple[int, str, float]] = []
        
        det_indices = list(range(len(detections)))
        track_ids = list(self.tracks.keys())

        # Compute pairwise prediction IoU and embedding similarity
        for d_idx in det_indices:
            bbox_det = detections[d_idx]["bbox"]
            det_emb = detections[d_idx].get("embedding")

            for t_id in track_ids:
                track = self.tracks[t_id]
                pred_bbox = track.predict()
                iou = self._calculate_iou(bbox_det, pred_bbox)
                
                if iou >= self.iou_threshold:
                    sim = self._cosine_sim(track.rolling_embedding, det_emb)
                    if sim >= self.embed_min_sim:
                        matches.append((d_idx, t_id, iou))

        # Sort matches by IoU score (descending)
        matches.sort(key=lambda x: x[2], reverse=True)

        matched_detections = set()
        matched_tracks = set()

        for d_idx, t_id, iou in matches:
            if d_idx in matched_detections or t_id in matched_tracks:
                continue
            
            matched_detections.add(d_idx)
            matched_tracks.add(t_id)

            det = detections[d_idx]
            track = self.tracks[t_id]
            track.update_state(det["bbox"], det["confidence"], det.get("landmarks"), timestamp=timestamp)
            track.crop = det.get("crop")
            track.raw_face = det.get("raw_face")
            if det.get("embedding") is not None:
                track.accumulate_embedding(det["embedding"])

            self.lost_frames[t_id] = 0
            updated_tracks.append(track)

        # Spawn new tracks for unmatched detections
        for d_idx in det_indices:
            if d_idx not in matched_detections:
                det = detections[d_idx]
                self.total_tracks_created += 1
                new_id = f"track_{self.total_tracks_created:03d}"
                
                new_track = TrackedFace(
                    track_id=new_id,
                    bbox=det["bbox"],
                    confidence=det["confidence"],
                    landmarks=det.get("landmarks"),
                    timestamp=timestamp
                )
                new_track.crop = det.get("crop")
                new_track.raw_face = det.get("raw_face")
                if det.get("embedding") is not None:
                    new_track.accumulate_embedding(det["embedding"])

                self.tracks[new_id] = new_track
                self.lost_frames[new_id] = 0
                updated_tracks.append(new_track)

        # Handle unmatched active tracks (prediction drift during occlusion)
        for t_id in track_ids:
            if t_id not in matched_tracks:
                track = self.tracks[t_id]
                track.bbox = [b + v for b, v in zip(track.bbox, track.velocity)]
                self.lost_frames[t_id] = self.lost_frames.get(t_id, 0) + 1
                if self.lost_frames[t_id] >= self.max_lost_frames:
                    self.tracks.pop(t_id, None)
                    self.lost_frames.pop(t_id, None)

        return updated_tracks

    def reset(self) -> None:
        """Clear all active tracks."""
        self.tracks.clear()
        self.lost_frames.clear()
        self.total_tracks_created = 0
        logger.info("IoUTracker reset completed.")
