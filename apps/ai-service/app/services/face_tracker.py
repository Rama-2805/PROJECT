"""SmartCampus AI — Pluggable Face Tracking Engine.

Defines the abstract BaseTracker and a default high-performance IoUTracker.
Tracks detected faces across consecutive frames, maintaining track IDs, lifecycle states, and spatial seat anchors.
"""

import time
import uuid
import logging
import numpy as np
from abc import ABC, abstractmethod
from typing import List, Dict, Any, Tuple, Optional
from app.config.settings import settings

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
    """Represents a face currently being tracked across video frames with sample gallery, embedding storage, and lifecycle history."""

    def __init__(self, track_id: str, bbox: List[int], confidence: float, landmarks: Optional[Any] = None, timestamp: Optional[float] = None, frame_number: int = 0):
        self.track_id = track_id
        self.bbox = [float(v) for v in bbox]  # [x1, y1, x2, y2]
        self.previous_bbox = [float(v) for v in bbox]
        self.velocity = [0.0, 0.0, 0.0, 0.0]
        self.velocity_x: float = 0.0
        self.velocity_y: float = 0.0
        self.confidence = confidence
        self.landmarks = landmarks
        
        self.first_seen = timestamp or time.time()
        self.last_seen = self.first_seen
        self.first_frame: int = frame_number
        self.last_frame: int = frame_number
        self.frame_count = 1
        self.detection_count = 1
        self.hits: int = 1
        self.consecutive_hits: int = 1
        self.consecutive_misses: int = 0
        self.total_hits: int = 1
        self.total_misses: int = 0
        self.revivals_count: int = 0
        self.max_lost_duration: int = 0
        self.age: int = 1
        self.state: str = "ACTIVE"  # "ACTIVE", "PREDICTED", "LOST", "DEAD"
        
        # Track confidence (Tentative vs Confirmed)
        self.is_tentative: bool = True
        self.is_confirmed: bool = False

        w = max(1.0, self.bbox[2] - self.bbox[0])
        h = max(1.0, self.bbox[3] - self.bbox[1])
        self.face_size: float = max(w, h)
        
        # Stable seat location anchor
        self.stable_seat_center: Tuple[float, float] = ((self.bbox[0] + self.bbox[2]) / 2.0, (self.bbox[1] + self.bbox[3]) / 2.0)
        self.stable_seat_size: float = self.face_size
        self.stable_seat_bbox: List[float] = list(self.bbox)

        self.current_quality: float = 0.0
        self.best_quality: float = 0.0
        self.quality_eval_attempts: int = 0  # Counter for crop quality evaluation attempts
        
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

        # Temporal Majority Voting Track Attributes
        self.recognition_votes: List[Dict[str, Any]] = []
        self.assigned_student_id: Optional[str] = None
        self.assigned_name: str = "UNKNOWN"
        self.recognition_similarity: float = 0.0

    def add_recognition_vote(self, student_id: str, student_name: str, similarity: float, margin: float, conf_state: str):
        """Record FAISS recognition search vote for track identity temporal voting."""
        if not hasattr(self, "recognition_votes"):
            self.recognition_votes = []
        self.recognition_votes.append({
            "student_id": student_id,
            "student_name": student_name,
            "similarity": similarity,
            "margin": margin,
            "state": conf_state
        })

        # Apply Temporal Majority Voting across track samples
        votes_count: Dict[str, int] = {}
        sim_sums: Dict[str, float] = {}
        for vote in self.recognition_votes:
            sid = vote["student_id"]
            votes_count[sid] = votes_count.get(sid, 0) + 1
            sim_sums[sid] = sim_sums.get(sid, 0.0) + vote["similarity"]

        best_sid = max(votes_count.keys(), key=lambda s: (votes_count[s], sim_sums[s]))
        majority_name = next((v["student_name"] for v in reversed(self.recognition_votes) if v["student_id"] == best_sid), best_sid)

        self.assigned_student_id = best_sid
        self.assigned_name = majority_name
        self.recognition_similarity = float(sim_sums[best_sid] / votes_count[best_sid])
        self.recognition_confidence = self.recognition_similarity

    def consider_sample(
        self,
        crop: np.ndarray,
        timestamp: float,
        source_video: str,
        min_quality_threshold: float = 35.0,
        max_samples: Optional[int] = None
    ) -> Optional[Dict[str, Any]]:
        """Evaluate quality and pose using MediaPipe Face Landmarker.
        Adds to selected_samples gallery if pose is within limits and quality is high.
        Returns sample dict if added, else None.
        """
        if max_samples is None:
            max_samples = getattr(settings, "max_samples_per_track", 5)

        if crop is None or crop.size == 0:
            return None

        # Return immediately if track has already reached max quality sample limit (max 5)
        if len(self.selected_samples) >= max_samples:
            return None

        # Return immediately if track has exceeded max quality evaluation attempts (e.g. 100 attempts)
        max_attempts = getattr(settings, "max_quality_attempts_per_track", 100)
        if getattr(self, "quality_eval_attempts", 0) >= max_attempts:
            return None
        self.quality_eval_attempts = getattr(self, "quality_eval_attempts", 0) + 1

        # Enforce minimum temporal interval between crop samples (1.0 second)
        if self.selected_samples:
            last_ts = self.selected_samples[-1].get("timestamp", 0.0)
            if abs(timestamp - last_ts) < getattr(settings, "embedding_frame_interval_sec", 1.0):
                return None

        # MediaPipe Quality & Pose Filter
        if getattr(settings, "enable_mediapipe_quality", True):
            from .mediapipe_face_quality import mediapipe_face_quality_service
            mp_res = mediapipe_face_quality_service.evaluate_crop(crop)
            if not mp_res.get("is_acceptable", False):
                logger.debug(f"[MEDIAPIPE-FILTER] Track {self.track_id} sample rejected: {mp_res.get('rejection_reason')}")
                return None

            q_score = mp_res["overall_quality_score"] * 100.0  # Scale to 0-100 for display compatibility
            self.current_quality = q_score
            if q_score > self.best_quality:
                self.best_quality = q_score

            yaw = mp_res.get("head_yaw", 0.0)
            pitch = mp_res.get("head_pitch", 0.0)
            roll = mp_res.get("head_roll", 0.0)
            blur_score = mp_res.get("sharpness", 0.0)
            w, h = mp_res.get("face_width", crop.shape[1]), mp_res.get("face_height", crop.shape[0])
        else:
            q_metrics = calculate_face_quality(crop, self.bbox)
            q_score = q_metrics["quality_score"]
            self.current_quality = q_score
            if q_score > self.best_quality:
                self.best_quality = q_score
            if q_score < min_quality_threshold:
                return None
            yaw, pitch, roll = 0.0, 0.0, 0.0
            blur_score = q_metrics["blur_score"]
            w, h = q_metrics["w"], q_metrics["h"]

        # Check for near-duplicates in time or crop similarity
        for existing in self.selected_samples:
            dt = abs(timestamp - existing.get("timestamp", 0.0))
            if dt < 0.3:  # Too close in time (within 300ms)
                if q_score > existing.get("quality_score", 0.0) + 10.0:
                    sample_id = existing["sample_id"]
                    new_sample = {
                        "sample_id": sample_id,
                        "crop": crop,
                        "quality_score": q_score,
                        "blur_score": blur_score,
                        "bbox_size": (w, h),
                        "head_yaw": yaw,
                        "head_pitch": pitch,
                        "head_roll": roll,
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
            "blur_score": blur_score,
            "bbox_size": (w, h),
            "head_yaw": yaw,
            "head_pitch": pitch,
            "head_roll": roll,
            "timestamp": timestamp,
            "source_video": source_video,
            "track_id": self.track_id,
        }

        self.selected_samples.append(sample_dict)

        # Maintain pose diversity & quality when gallery exceeds max_samples
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
        """Store ArcFace 512-D L2-normalized embedding attached to track, enforcing near-duplicate rejection (cosine sim >= 0.95)."""
        if embedding is None:
            return {}
        emb_arr = np.asarray(embedding, dtype=np.float32)
        norm = np.linalg.norm(emb_arr)
        if norm > 1e-6:
            emb_arr = emb_arr / norm

        # Near-duplicate rejection: if cosine similarity with any existing embedding in this track is >= 0.95, discard as redundant
        dup_thresh = getattr(settings, "duplicate_embedding_threshold", 0.95)
        for existing in self.embeddings:
            ex_emb = existing.get("embedding")
            if ex_emb is not None:
                sim = float(np.dot(emb_arr, ex_emb))
                if sim >= dup_thresh:
                    return {}

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

    def accumulate_embedding(self, emb: Any) -> None:
        """Accumulate normalized embedding vector to maintain rolling mean."""
        if emb is None:
            return
        while isinstance(emb, dict):
            emb = emb.get("embedding")
        if emb is None:
            return
        try:
            e = np.asarray(emb, dtype=np.float32)
        except (ValueError, TypeError):
            return
        if e.ndim != 1 or len(e) != 512:
            return
        norm = float(np.linalg.norm(e))
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

    @property
    def track_centroid(self) -> Optional[np.ndarray]:
        """Compute L2-normalized mean centroid of all ArcFace embeddings collected for this track."""
        valid_embs = [e["embedding"] for e in self.embeddings if e.get("embedding") is not None]
        if not valid_embs:
            return None
        raw_mean = np.mean(valid_embs, axis=0)
        norm = np.linalg.norm(raw_mean)
        return raw_mean / norm if norm > 1e-6 else raw_mean

    def predict(self) -> List[int]:
        """Predict next bounding box location based on constant-velocity linear state with shift clamping."""
        w = max(1.0, self.bbox[2] - self.bbox[0])
        h = max(1.0, self.bbox[3] - self.bbox[1])
        face_size = max(w, h)

        # Max movement restriction per frame
        max_shift = min(25.0, 0.4 * face_size) if face_size >= 60 else min(15.0, 0.3 * face_size)

        # Apply velocity with max shift clamping
        vx = max(-max_shift, min(max_shift, self.velocity_x))
        vy = max(-max_shift, min(max_shift, self.velocity_y))

        px1 = self.bbox[0] + vx
        py1 = self.bbox[1] + vy
        px2 = self.bbox[2] + vx
        py2 = self.bbox[3] + vy

        return [int(round(px1)), int(round(py1)), int(round(px2)), int(round(py2))]

    def update_state(self, new_bbox: List[int], confidence: float, landmarks: Optional[Any] = None, timestamp: Optional[float] = None, frame_number: int = 0) -> None:
        """Update bounding box, smooth velocity vectors, update seat anchor, and confirm track."""
        new_bbox_f = [float(v) for v in new_bbox]
        old_cx = (self.bbox[0] + self.bbox[2]) / 2.0
        old_cy = (self.bbox[1] + self.bbox[3]) / 2.0
        new_cx = (new_bbox_f[0] + new_bbox_f[2]) / 2.0
        new_cy = (new_bbox_f[1] + new_bbox_f[3]) / 2.0

        measured_vx = new_cx - old_cx
        measured_vy = new_cy - old_cy

        # Velocity smoothing (alpha = 0.80)
        alpha_v = 0.80
        self.velocity_x = alpha_v * self.velocity_x + (1.0 - alpha_v) * measured_vx
        self.velocity_y = alpha_v * self.velocity_y + (1.0 - alpha_v) * measured_vy

        # Smooth bbox coordinates (alpha = 0.70)
        alpha_b = 0.70
        self.previous_bbox = list(self.bbox)
        for i in range(4):
            self.velocity[i] = (1.0 - 0.40) * self.velocity[i] + 0.40 * (new_bbox_f[i] - self.bbox[i])
            self.bbox[i] = alpha_b * new_bbox_f[i] + (1.0 - alpha_b) * self.bbox[i]

        w = max(1.0, self.bbox[2] - self.bbox[0])
        h = max(1.0, self.bbox[3] - self.bbox[1])
        self.face_size = max(w, h)

        # Update stable seat anchor with low-pass filter (for stationary classroom seats)
        alpha_seat = 0.90
        scx = alpha_seat * self.stable_seat_center[0] + (1.0 - alpha_seat) * new_cx
        scy = alpha_seat * self.stable_seat_center[1] + (1.0 - alpha_seat) * new_cy
        self.stable_seat_center = (scx, scy)
        self.stable_seat_size = alpha_seat * self.stable_seat_size + (1.0 - alpha_seat) * self.face_size
        self.stable_seat_bbox = [
            alpha_seat * self.stable_seat_bbox[i] + (1.0 - alpha_seat) * new_bbox_f[i] for i in range(4)
        ]

        self.confidence = confidence
        self.landmarks = landmarks
        self.last_seen = timestamp or time.time()
        self.last_frame = frame_number
        self.frame_count += 1
        self.detection_count += 1
        self.hits += 1
        self.total_hits += 1
        self.consecutive_hits += 1
        self.consecutive_misses = 0
        self.state = "ACTIVE"

        # Track confirmation threshold (Task 8): 2 consecutive hits confirm the track
        if self.consecutive_hits >= 2 or self.hits >= 3:
            self.is_tentative = False
            self.is_confirmed = True


class BaseTracker(ABC):
    """Abstract Base Class defining the modular interface for all face trackers."""

    @abstractmethod
    def update(self, detections: List[Dict[str, Any]]) -> List[TrackedFace]:
        pass

    @abstractmethod
    def reset(self) -> None:
        pass


class IoUTracker(BaseTracker):
    """Controlled Multi-Stage Face Tracker with Long-Term Seat Anchor Persistence, Lifecycle State Machine & Diagnostics."""

    def __init__(
        self,
        iou_threshold: float = 0.22,
        max_lost_frames: int = 240,
        embed_min_sim: float = 0.35,
        small_face_size_thresh: float = 60.0,
        max_center_distance: float = 65.0,
    ):
        self.iou_threshold = iou_threshold
        self.max_lost_frames = max_lost_frames
        self.embed_min_sim = embed_min_sim
        self.small_face_size_thresh = small_face_size_thresh
        self.max_center_distance = max_center_distance

        self.tracks: Dict[str, TrackedFace] = {}
        self.lost_frames: Dict[str, int] = {}
        self.total_tracks_created: int = 0

        # Long-term historical seat anchors (for stationary classroom students who look away)
        self.seat_anchors: Dict[str, Dict[str, Any]] = {}

        # Detailed temporal metrics
        self.total_frames_evaluated: int = 0
        self.total_detections_count: int = 0
        self.matched_detections_count: int = 0
        self.unmatched_detections_count: int = 0
        self.new_tracks_after_init: int = 0
        self.deleted_tracks_count: int = 0
        self.small_face_assoc_success: int = 0
        self.duplicate_active_prevented: int = 0
        self.track_id_switches: int = 0
        self.small_face_tracks_count: int = 0

        # New Temporal Diagnostics Metrics
        self.detector_detections: int = 0
        self.tracker_predictions: int = 0
        self.recovered_detections: int = 0
        self.temporary_track_misses: int = 0
        self.track_recoveries: int = 0
        self.track_expirations: int = 0
        self.new_tracks_count: int = 0
        self.duplicate_track_preventions: int = 0
        self.max_simultaneous_tracks: int = 0
        self.track_lifetimes: List[int] = []

        # Multi-Stage Association Counters (Task 11)
        self.successful_iou_matches: int = 0
        self.successful_center_dist_matches: int = 0
        self.successful_spatial_revivals: int = 0
        self.successful_seat_anchor_revivals: int = 0
        self.sum_matched_iou: float = 0.0
        self.sum_matched_dist: float = 0.0

        # New-track creation reasons accounting (Task 11)
        self.creation_reasons: Dict[str, int] = {
            "NO_CANDIDATE": 0,
            "IOU_GATE_FAILED": 0,
            "DISTANCE_GATE_FAILED": 0,
            "SIZE_GATE_FAILED": 0,
            "ANCHOR_OCCUPIED": 0,
            "INVALID_DETECTION": 0,
        }

    @property
    def active_tracks_list(self) -> List[TrackedFace]:
        """Tracks active or recently predicted (lost_frames <= 3). Renderable in UI."""
        return [t for t_id, t in self.tracks.items() if self.lost_frames.get(t_id, 0) <= 3]

    @property
    def predicted_tracks_list(self) -> List[TrackedFace]:
        """Tracks currently in PREDICTED state (1 <= lost_frames <= 3)."""
        return [t for t_id, t in self.tracks.items() if 1 <= self.lost_frames.get(t_id, 0) <= 3]

    @property
    def lost_tracks_list(self) -> List[TrackedFace]:
        """Tracks currently lost (3 < lost_frames <= max_lost_frames)."""
        return [t for t_id, t in self.tracks.items() if 3 < self.lost_frames.get(t_id, 0) <= self.max_lost_frames]

    @property
    def confirmed_tracks_list(self) -> List[TrackedFace]:
        """Tracks that have achieved confirmed state (>= 2 consecutive hits)."""
        return [t for t in self.tracks.values() if getattr(t, "is_confirmed", False)]

    def _calculate_iou(self, box1: List[int], box2: List[int]) -> float:
        """Calculate Intersection-over-Union (IoU) of two bounding boxes."""
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
            return 0.0
        a = np.asarray(a, dtype=np.float32)
        b = np.asarray(b, dtype=np.float32)
        na, nb = np.linalg.norm(a), np.linalg.norm(b)
        if na < 1e-6 or nb < 1e-6:
            return 0.0
        return float(np.dot(a, b) / (na * nb))

    def update(self, detections: List[Dict[str, Any]], timestamp: Optional[float] = None) -> List[TrackedFace]:
        """Associate detections to tracks across Active, Predicted, Lost, and Historical Seat Anchors."""
        self.total_frames_evaluated += 1
        curr_frame = self.total_frames_evaluated
        num_dets = len(detections)
        self.total_detections_count += num_dets
        self.detector_detections += num_dets

        det_indices = list(range(num_dets))
        track_ids = list(self.tracks.keys())

        matched_detections = set()
        matched_tracks = set()
        small_assoc_in_frame = 0
        dup_prevented_in_frame = 0

        # Predict positions and compute centers for all tracks currently in memory
        track_preds = {}
        track_centers = {}
        for t_id in track_ids:
            track = self.tracks[t_id]
            pred_b = track.predict()
            track_preds[t_id] = pred_b
            track_centers[t_id] = (
                (pred_b[0] + pred_b[2]) / 2.0,
                (pred_b[1] + pred_b[3]) / 2.0
            )

        # ── STAGE 1: Composite Geometric & IoU Association (ACTIVE & PREDICTED, lost <= 5) ─
        # Candidates in Stage 1 prioritize active or recently observed tracks
        stage1_candidates = []
        for d_idx in det_indices:
            bbox_det = detections[d_idx]["bbox"]
            det_w = max(1.0, abs(bbox_det[2] - bbox_det[0]))
            det_h = max(1.0, abs(bbox_det[3] - bbox_det[1]))
            det_size = max(det_w, det_h)
            dcx = (bbox_det[0] + bbox_det[2]) / 2.0
            dcy = (bbox_det[1] + bbox_det[3]) / 2.0
            det_emb = detections[d_idx].get("embedding")

            for t_id in track_ids:
                lost_dur = self.lost_frames.get(t_id, 0)
                if lost_dur > 5:
                    continue  # Reserved for Stage 2 & 3

                track = self.tracks[t_id]
                pred_bbox = track_preds[t_id]
                iou = self._calculate_iou(bbox_det, pred_bbox)
                
                tcx, tcy = track_centers[t_id]
                dist = float(np.sqrt((dcx - tcx) ** 2 + (dcy - tcy) ** 2))
                norm_dist = dist / max(1.0, max(det_size, track.face_size))

                tw = max(1.0, pred_bbox[2] - pred_bbox[0])
                th = max(1.0, pred_bbox[3] - pred_bbox[1])
                track_size = max(tw, th)
                size_ratio = min(det_size, track_size) / max(det_size, track_size)

                # Embedding similarity gate when available
                if det_emb is not None and track.rolling_embedding is not None:
                    sim = self._cosine_sim(track.rolling_embedding, det_emb)
                    if sim < self.embed_min_sim:
                        continue

                # Stage 1 geometric matching criteria (IoU or tight normalized center distance)
                is_valid = (
                    iou >= self.iou_threshold
                    or (norm_dist <= 0.65 and size_ratio >= 0.35 and iou >= 0.04)
                    or (norm_dist <= 0.40 and size_ratio >= 0.40)
                )

                if is_valid:
                    cost = (1.0 - max(0.0, iou)) + 0.5 * norm_dist
                    stage1_candidates.append((cost, d_idx, t_id, iou, dist))

        stage1_candidates.sort(key=lambda x: x[0])

        for cost, d_idx, t_id, iou, dist in stage1_candidates:
            if d_idx in matched_detections or t_id in matched_tracks:
                continue

            matched_detections.add(d_idx)
            matched_tracks.add(t_id)

            det = detections[d_idx]
            track = self.tracks[t_id]

            if self.lost_frames.get(t_id, 0) > 3:
                self.track_recoveries += 1
                track.revivals_count += 1

            track.update_state(det["bbox"], det["confidence"], det.get("landmarks"), timestamp=timestamp, frame_number=curr_frame)
            track.crop = det.get("crop")
            track.raw_face = det.get("raw_face")
            if det.get("embedding") is not None:
                track.accumulate_embedding(det["embedding"])

            self.lost_frames[t_id] = 0
            self.successful_iou_matches += 1
            self.sum_matched_iou += iou
            self.matched_detections_count += 1

        # ── STAGE 2: Adaptive Matching against RECENTLY LOST tracks (5 < lost <= 30) ─
        unmatched_dets = [d for d in det_indices if d not in matched_detections]

        for d_idx in unmatched_dets:
            bbox_det = detections[d_idx]["bbox"]
            det_w = max(1.0, abs(bbox_det[2] - bbox_det[0]))
            det_h = max(1.0, abs(bbox_det[3] - bbox_det[1]))
            det_size = max(det_w, det_h)
            dcx = (bbox_det[0] + bbox_det[2]) / 2.0
            dcy = (bbox_det[1] + bbox_det[3]) / 2.0
            det_emb = detections[d_idx].get("embedding")

            if det_w <= self.small_face_size_thresh or det_h <= self.small_face_size_thresh:
                max_allowed_dist = max(35.0, min(65.0, 1.4 * det_size))
                self.small_face_tracks_count += 1
            else:
                max_allowed_dist = max(30.0, min(55.0, 0.9 * det_size))

            best_t_id = None
            best_dist = float("inf")

            for t_id in track_ids:
                if t_id in matched_tracks:
                    continue

                lost_dur = self.lost_frames.get(t_id, 0)
                if lost_dur > 30:
                    continue

                track = self.tracks[t_id]
                tcx, tcy = track_centers[t_id]
                dist = float(np.sqrt((dcx - tcx) ** 2 + (dcy - tcy) ** 2))

                tw = max(1.0, track.bbox[2] - track.bbox[0])
                th = max(1.0, track.bbox[3] - track.bbox[1])
                track_size = max(tw, th)
                size_ratio = min(det_size, track_size) / max(det_size, track_size)

                if det_emb is not None and track.rolling_embedding is not None:
                    if self._cosine_sim(track.rolling_embedding, det_emb) < self.embed_min_sim:
                        continue

                if dist <= max_allowed_dist and size_ratio >= 0.35 and dist < best_dist:
                    best_dist = dist
                    best_t_id = t_id

            if best_t_id is not None:
                matched_detections.add(d_idx)
                matched_tracks.add(best_t_id)

                det = detections[d_idx]
                track = self.tracks[best_t_id]

                if self.lost_frames.get(best_t_id, 0) > 3:
                    self.track_recoveries += 1
                    track.revivals_count += 1

                track.update_state(det["bbox"], det["confidence"], det.get("landmarks"), timestamp=timestamp, frame_number=curr_frame)
                track.crop = det.get("crop")
                track.raw_face = det.get("raw_face")
                if det.get("embedding") is not None:
                    track.accumulate_embedding(det["embedding"])

                self.lost_frames[best_t_id] = 0
                self.small_face_assoc_success += 1
                small_assoc_in_frame += 1
                self.successful_center_dist_matches += 1
                self.sum_matched_dist += best_dist
                self.matched_detections_count += 1

        # ── STAGE 3: Global Spatial Revival of OLDER LOST tracks (30 < lost <= max_lost_frames) ─
        remaining_unmatched = [d for d in det_indices if d not in matched_detections]

        for d_idx in remaining_unmatched:
            det = detections[d_idx]
            bbox_det = det["bbox"]
            det_w = max(1.0, abs(bbox_det[2] - bbox_det[0]))
            det_h = max(1.0, abs(bbox_det[3] - bbox_det[1]))
            det_size = max(det_w, det_h)
            dcx = (bbox_det[0] + bbox_det[2]) / 2.0
            dcy = (bbox_det[1] + bbox_det[3]) / 2.0
            det_emb = det.get("embedding")

            best_revive_id = None
            best_revive_dist = float("inf")

            for t_id, track in self.tracks.items():
                if t_id in matched_tracks:
                    continue

                # Check both current bbox and stable seat center
                tcx, tcy = track.stable_seat_center
                dist = float(np.sqrt((dcx - tcx) ** 2 + (dcy - tcy) ** 2))
                iou = self._calculate_iou(bbox_det, [int(v) for v in track.bbox])

                max_dup_dist = max(35.0, min(70.0, 1.5 * det_size))
                size_ratio = min(det_size, track.face_size) / max(det_size, track.face_size)

                if det_emb is not None and track.rolling_embedding is not None:
                    if self._cosine_sim(track.rolling_embedding, det_emb) < self.embed_min_sim:
                        continue

                if (dist <= max_dup_dist or iou >= 0.08) and size_ratio >= 0.30 and dist < best_revive_dist:
                    best_revive_dist = dist
                    best_revive_id = t_id

            if best_revive_id is not None:
                track = self.tracks[best_revive_id]
                if self.lost_frames.get(best_revive_id, 0) > 3:
                    self.track_recoveries += 1
                    track.revivals_count += 1

                track.update_state(det["bbox"], det["confidence"], det.get("landmarks"), timestamp=timestamp, frame_number=curr_frame)
                track.crop = det.get("crop")
                track.raw_face = det.get("raw_face")
                if det.get("embedding") is not None:
                    track.accumulate_embedding(det["embedding"])

                self.lost_frames[best_revive_id] = 0
                matched_detections.add(d_idx)
                matched_tracks.add(best_revive_id)
                self.duplicate_active_prevented += 1
                self.duplicate_track_preventions += 1
                self.successful_spatial_revivals += 1
                self.matched_detections_count += 1
                dup_prevented_in_frame += 1

        # ── STAGE 4: Long-Term Spatial Seat Anchor Re-activation (Task 4, 5, 6) ─
        # For students who looked away for > max_lost_frames, check historical seat anchors
        unmatched_after_stage3 = [d for d in det_indices if d not in matched_detections]

        for d_idx in unmatched_after_stage3:
            det = detections[d_idx]
            bbox_det = det["bbox"]
            det_w = max(1.0, abs(bbox_det[2] - bbox_det[0]))
            det_h = max(1.0, abs(bbox_det[3] - bbox_det[1]))
            det_size = max(det_w, det_h)
            dcx = (bbox_det[0] + bbox_det[2]) / 2.0
            dcy = (bbox_det[1] + bbox_det[3]) / 2.0

            best_anchor_id = None
            best_anchor_dist = float("inf")

            for a_id, anchor in list(self.seat_anchors.items()):
                # Ensure no other active or predicted track is currently sitting at this seat
                is_occupied = False
                for act_id in matched_tracks:
                    if act_id in self.tracks:
                        act_cx = (self.tracks[act_id].bbox[0] + self.tracks[act_id].bbox[2]) / 2.0
                        act_cy = (self.tracks[act_id].bbox[1] + self.tracks[act_id].bbox[3]) / 2.0
                        if np.sqrt((act_cx - anchor["center"][0]) ** 2 + (act_cy - anchor["center"][1]) ** 2) < 30.0:
                            is_occupied = True
                            break

                if is_occupied:
                    continue

                acx, acy = anchor["center"]
                dist = float(np.sqrt((dcx - acx) ** 2 + (dcy - acy) ** 2))
                anchor_size = anchor["size"]
                size_ratio = min(det_size, anchor_size) / max(det_size, anchor_size)
                max_anchor_dist = max(50.0, min(95.0, 1.8 * anchor_size))

                if dist <= max_anchor_dist and size_ratio >= 0.30 and dist < best_anchor_dist:
                    best_anchor_dist = dist
                    best_anchor_id = a_id

            if best_anchor_id is not None:
                # Re-activate historical track from seat anchor!
                anchor = self.seat_anchors.pop(best_anchor_id)
                track = anchor["track"]
                track.revivals_count += 1
                track.update_state(det["bbox"], det["confidence"], det.get("landmarks"), timestamp=timestamp, frame_number=curr_frame)
                track.crop = det.get("crop")
                track.raw_face = det.get("raw_face")
                if det.get("embedding") is not None:
                    track.accumulate_embedding(det["embedding"])

                self.tracks[best_anchor_id] = track
                self.lost_frames[best_anchor_id] = 0
                matched_detections.add(d_idx)
                matched_tracks.add(best_anchor_id)
                self.successful_seat_anchor_revivals += 1
                self.track_recoveries += 1
                self.matched_detections_count += 1
                dup_prevented_in_frame += 1

        # ── STAGE 5: New Track Creation with Diagnostic Reason Logging (Task 11) ─
        final_unmatched_dets = [d for d in det_indices if d not in matched_detections]
        self.unmatched_detections_count += len(final_unmatched_dets)
        new_tracks_in_frame = 0

        for d_idx in final_unmatched_dets:
            det = detections[d_idx]
            bbox_det = det["bbox"]
            det_w = max(1.0, abs(bbox_det[2] - bbox_det[0]))
            det_h = max(1.0, abs(bbox_det[3] - bbox_det[1]))
            det_size = max(det_w, det_h)
            dcx = (bbox_det[0] + bbox_det[2]) / 2.0
            dcy = (bbox_det[1] + bbox_det[3]) / 2.0

            # Diagnose creation reason
            reason = "NO_CANDIDATE"
            for t_id, track in self.tracks.items():
                tcx = (track.bbox[0] + track.bbox[2]) / 2.0
                tcy = (track.bbox[1] + track.bbox[3]) / 2.0
                dist = float(np.sqrt((dcx - tcx) ** 2 + (dcy - tcy) ** 2))
                if dist < 120.0:
                    tw = max(1.0, track.bbox[2] - track.bbox[0])
                    th = max(1.0, track.bbox[3] - track.bbox[1])
                    size_ratio = min(det_size, max(tw, th)) / max(det_size, max(tw, th))
                    if size_ratio < 0.35:
                        reason = "SIZE_GATE_FAILED"
                    else:
                        reason = "DISTANCE_GATE_FAILED"
                    break

            self.creation_reasons[reason] = self.creation_reasons.get(reason, 0) + 1

            self.total_tracks_created += 1
            self.new_tracks_count += 1
            if self.total_frames_evaluated > 3:
                self.new_tracks_after_init += 1

            new_id = f"track_{self.total_tracks_created:03d}"
            new_track = TrackedFace(
                track_id=new_id,
                bbox=det["bbox"],
                confidence=det["confidence"],
                landmarks=det.get("landmarks"),
                timestamp=timestamp,
                frame_number=curr_frame
            )
            new_track.crop = det.get("crop")
            new_track.raw_face = det.get("raw_face")
            if det.get("embedding") is not None:
                new_track.accumulate_embedding(det["embedding"])

            self.tracks[new_id] = new_track
            self.lost_frames[new_id] = 0
            matched_tracks.add(new_id)
            new_tracks_in_frame += 1

        # ── STAGE 6: Unmatched Track Decay & Lifecycle Transitions ────────
        deleted_in_frame = 0
        for t_id in list(self.tracks.keys()):
            if t_id not in matched_tracks:
                track = self.tracks[t_id]
                self.lost_frames[t_id] = self.lost_frames.get(t_id, 0) + 1
                track.consecutive_misses += 1
                track.total_misses += 1
                track.consecutive_hits = 0
                track.age += 1

                if self.lost_frames[t_id] > track.max_lost_duration:
                    track.max_lost_duration = self.lost_frames[t_id]

                # Apply constant-velocity prediction
                pred_b = track.predict()
                track.bbox = [float(v) for v in pred_b]

                if self.lost_frames[t_id] <= 3:
                    track.state = "PREDICTED"
                    self.tracker_predictions += 1
                    self.temporary_track_misses += 1
                elif self.lost_frames[t_id] <= self.max_lost_frames:
                    track.state = "LOST"
                else:
                    track.state = "DEAD"
                    self.track_lifetimes.append(track.age)

                    # Retain stable seat anchor if track was confirmed
                    if getattr(track, "is_confirmed", False) or track.hits >= 2:
                        self.seat_anchors[t_id] = {
                            "center": track.stable_seat_center,
                            "size": track.stable_seat_size,
                            "bbox": track.stable_seat_bbox,
                            "track": track,
                            "last_frame": curr_frame,
                        }

                    self.tracks.pop(t_id, None)
                    self.lost_frames.pop(t_id, None)
                    self.deleted_tracks_count += 1
                    self.track_expirations += 1
                    deleted_in_frame += 1

        # ── STAGE 7: Active Duplicate Track Merging (Part 6 Requirement) ─
        self._merge_duplicate_active_tracks()

        current_simultaneous = len(self.tracks)
        if current_simultaneous > self.max_simultaneous_tracks:
            self.max_simultaneous_tracks = current_simultaneous

        active_tracks_res = self.active_tracks_list
        lost_tracks_res = self.lost_tracks_list

        logger.info(
            f"[FRAME #{self.total_frames_evaluated:03d} TRACK DEBUG] detections={num_dets} "
            f"matched={len(matched_detections)} unmatched_dets={len(final_unmatched_dets)} "
            f"new_tracks={new_tracks_in_frame} active_tracks={len(active_tracks_res)} "
            f"predicted_tracks={len(self.predicted_tracks_list)} lost_tracks={len(lost_tracks_res)} "
            f"seat_anchors={len(self.seat_anchors)} deleted_tracks={deleted_in_frame} dup_prevented={dup_prevented_in_frame}"
        )

        return active_tracks_res

    def _merge_duplicate_active_tracks(self) -> None:
        """Inspect active tracks and merge spatial duplicates representing the same physical face (Part 6)."""
        active_ids = [t_id for t_id, t in self.tracks.items() if self.lost_frames.get(t_id, 0) <= 3]
        if len(active_ids) < 2:
            return

        to_remove = set()
        for i in range(len(active_ids)):
            t1_id = active_ids[i]
            if t1_id in to_remove or t1_id not in self.tracks:
                continue
            t1 = self.tracks[t1_id]

            for j in range(i + 1, len(active_ids)):
                t2_id = active_ids[j]
                if t2_id in to_remove or t2_id not in self.tracks:
                    continue
                t2 = self.tracks[t2_id]

                iou = self._calculate_iou([int(v) for v in t1.bbox], [int(v) for v in t2.bbox])
                cx1 = (t1.bbox[0] + t1.bbox[2]) / 2.0
                cy1 = (t1.bbox[1] + t1.bbox[3]) / 2.0
                cx2 = (t2.bbox[0] + t2.bbox[2]) / 2.0
                cy2 = (t2.bbox[1] + t2.bbox[3]) / 2.0
                dist = float(np.sqrt((cx1 - cx2) ** 2 + (cy1 - cy2) ** 2))

                min_size = min(t1.face_size, t2.face_size)
                dist_thresh = max(25.0, min(50.0, 0.6 * min_size))

                emb_sim = self._cosine_sim(t1.rolling_embedding, t2.rolling_embedding) if (t1.rolling_embedding is not None and t2.rolling_embedding is not None) else 0.0

                if iou >= 0.40 or dist <= dist_thresh or emb_sim >= 0.85:
                    # Decide which track to keep (older/stronger track)
                    if t1.hits >= t2.hits:
                        kept_t, removed_t = t1, t2
                        kept_id, removed_id = t1_id, t2_id
                    else:
                        kept_t, removed_t = t2, t1
                        kept_id, removed_id = t2_id, t1_id

                    # Merge selected samples & embeddings into kept track
                    for s in removed_t.selected_samples:
                        if len(kept_t.selected_samples) < 5:
                            kept_t.selected_samples.append(s)

                    for emb in removed_t.embeddings:
                        kept_t.accumulate_embedding(emb)

                    to_remove.add(removed_id)
                    self.duplicate_track_preventions += 1
                    self.duplicate_active_prevented += 1

                    logger.info(
                        f"[DUPLICATE TRACK MERGE] kept_track_id={kept_id} removed_track_id={removed_id} "
                        f"reason=spatial_overlap(iou={iou:.2f}, dist={dist:.1f}px, sim={emb_sim:.2f})"
                    )

        for rem_id in to_remove:
            self.tracks.pop(rem_id, None)
            self.lost_frames.pop(rem_id, None)

    def get_extended_diagnostics(self) -> Dict[str, Any]:
        """Compute advanced tracking diagnostic metrics, lifetime distributions, and creation reasons (Task 11)."""
        all_lifetimes = list(self.track_lifetimes)
        # Include current active/lost track ages
        for t in self.tracks.values():
            all_lifetimes.append(t.age)
        for anchor in self.seat_anchors.values():
            if "track" in anchor:
                all_lifetimes.append(anchor["track"].age)

        mean_lifetime = float(np.mean(all_lifetimes)) if all_lifetimes else 0.0
        median_lifetime = float(np.median(all_lifetimes)) if all_lifetimes else 0.0

        buckets = {
            "under_10": sum(1 for l in all_lifetimes if l < 10),
            "10_to_25": sum(1 for l in all_lifetimes if 10 <= l <= 25),
            "25_to_50": sum(1 for l in all_lifetimes if 25 < l <= 50),
            "50_to_100": sum(1 for l in all_lifetimes if 50 < l <= 100),
            "100_to_200": sum(1 for l in all_lifetimes if 100 < l <= 200),
            "over_200": sum(1 for l in all_lifetimes if l > 200),
        }

        bucket_percentages = {}
        tot_l = len(all_lifetimes) or 1
        for k, v in buckets.items():
            bucket_percentages[k] = round((v / tot_l) * 100.0, 1)

        max_simul = max(1, self.max_simultaneous_tracks)
        active_cnt = len(self.active_tracks_list)
        confirmed_cnt = len(self.confirmed_tracks_list)

        return {
            "total_tracks_created": self.total_tracks_created,
            "confirmed_tracks_count": confirmed_cnt,
            "tentative_tracks_count": max(0, self.total_tracks_created - confirmed_cnt),
            "max_simultaneous_tracks": self.max_simultaneous_tracks,
            "active_tracks_count": active_cnt,
            "predicted_tracks_count": len(self.predicted_tracks_list),
            "lost_tracks_count": len(self.lost_tracks_list),
            "seat_anchors_retained": len(self.seat_anchors),
            "matched_detections_count": self.matched_detections_count,
            "unmatched_detections_count": self.unmatched_detections_count,
            "stage1_iou_matches": self.successful_iou_matches,
            "stage2_center_matches": self.successful_center_dist_matches,
            "stage3_spatial_revivals": self.successful_spatial_revivals,
            "stage4_seat_anchor_revivals": self.successful_seat_anchor_revivals,
            "duplicate_track_merges": self.duplicate_track_preventions,
            "creation_reasons": self.creation_reasons,
            "avg_match_iou": round(self.sum_matched_iou / max(1, self.successful_iou_matches), 3),
            "avg_match_center_dist": round(self.sum_matched_dist / max(1, self.successful_center_dist_matches), 1),
            "track_creation_ratio": round(self.total_tracks_created / max_simul, 2),
            "persistent_identity_ratio": round(self.total_tracks_created / max_simul, 2),
            "legacy_fragmentation_ratio": round(self.total_tracks_created / max(1, active_cnt), 2),
            "detection_association_rate": round(self.matched_detections_count / max(1, self.total_detections_count), 3),
            "track_recovery_rate": round(self.track_recoveries / max(1, self.track_recoveries + self.track_expirations), 3),
            "track_expiration_rate": round(self.track_expirations / max(1, self.total_tracks_created), 3),
            "mean_track_lifetime": round(mean_lifetime, 1),
            "median_track_lifetime": round(median_lifetime, 1),
            "lifetime_buckets": buckets,
            "lifetime_bucket_percentages": bucket_percentages,
            "tracks_surviving_50_plus": sum(1 for l in all_lifetimes if l >= 50),
            "tracks_surviving_100_plus": sum(1 for l in all_lifetimes if l >= 100),
            "tracks_surviving_200_plus": sum(1 for l in all_lifetimes if l >= 200),
        }

    def reset(self) -> None:
        """Clear all active tracks and historical anchors."""
        self.tracks.clear()
        self.lost_frames.clear()
        self.seat_anchors.clear()
        self.total_tracks_created = 0
        self.total_frames_evaluated = 0
        self.total_detections_count = 0
        self.matched_detections_count = 0
        self.unmatched_detections_count = 0
        self.new_tracks_after_init = 0
        self.deleted_tracks_count = 0
        self.small_face_assoc_success = 0
        self.duplicate_active_prevented = 0
        self.track_id_switches = 0
        self.small_face_tracks_count = 0
        self.detector_detections = 0
        self.tracker_predictions = 0
        self.recovered_detections = 0
        self.temporary_track_misses = 0
        self.track_recoveries = 0
        self.track_expirations = 0
        self.new_tracks_count = 0
        self.duplicate_track_preventions = 0
        self.max_simultaneous_tracks = 0
        self.track_lifetimes.clear()
        self.successful_iou_matches = 0
        self.successful_center_dist_matches = 0
        self.successful_spatial_revivals = 0
        self.successful_seat_anchor_revivals = 0
        self.sum_matched_iou = 0.0
        self.sum_matched_dist = 0.0
        for k in self.creation_reasons:
            self.creation_reasons[k] = 0
        logger.info("IoUTracker reset completed.")
