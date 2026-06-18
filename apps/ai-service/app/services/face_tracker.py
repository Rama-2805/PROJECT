"""SmartCampus AI — Pluggable Face Tracking Engine.

Defines the abstract BaseTracker and a default high-performance IoUTracker.
Tracks detected faces across consecutive frames, maintaining track IDs and frame counts.
"""

import time
import uuid
import logging
from abc import ABC, abstractmethod
from typing import List, Dict, Any, Tuple, Optional

logger = logging.getLogger("smartcampus.tracker")


class TrackedFace:
    """Represents a face currently being tracked across video frames."""

    def __init__(self, track_id: str, bbox: List[int], confidence: float, landmarks: Optional[Any] = None):
        self.track_id = track_id
        self.bbox = bbox  # [x1, y1, x2, y2]
        self.confidence = confidence
        self.landmarks = landmarks
        
        self.first_seen = time.time()
        self.last_seen = self.first_seen
        self.frame_count = 1
        
        # State variables for attendance/recognition association
        self.student_usn: Optional[str] = None
        self.recognition_confidence: float = 0.0
        self.recognition_count = 0


class BaseTracker(ABC):
    """Abstract Base Class defining the modular interface for all face trackers."""

    @abstractmethod
    def update(self, detections: List[Dict[str, Any]]) -> List[TrackedFace]:
        """Update tracker with new detections in the current frame.

        Args:
            detections: List of dicts, each with "bbox", "confidence", and "landmarks"

        Returns:
            List of active TrackedFace objects
        """
        pass

    @abstractmethod
    def reset(self) -> None:
        """Reset all internal tracking states."""
        pass


class IoUTracker(BaseTracker):
    """IoU (Intersection over Union) Face Tracker.

    Associates detections across frames by checking bounding box overlaps.
    """

    def __init__(self, iou_threshold: float = 0.35, max_lost_frames: int = 10):
        self.iou_threshold = iou_threshold
        self.max_lost_frames = max_lost_frames
        
        # Active tracks keyed by track_id
        self.tracks: Dict[str, TrackedFace] = {}
        # Tracks that weren't matched in the current frame (consecutive frame count lost)
        self.lost_frames: Dict[str, int] = {}

    def _calculate_iou(self, box1: List[int], box2: List[int]) -> float:
        """Calculate the Intersection-over-Union (IoU) of two bounding boxes."""
        x1_1, y1_1, x2_1, y2_1 = box1
        x1_2, y1_2, x2_2, y2_2 = box2

        # Determine intersection coordinates
        x_left = max(x1_1, x1_2)
        y_top = max(y1_1, y1_2)
        x_right = min(x2_1, x2_2)
        y_bottom = min(y2_1, y2_2)

        if x_right < x_left or y_bottom < y_top:
            return 0.0

        intersection_area = (x_right - x_left) * (y_bottom - y_top)

        # Union area
        area1 = (x2_1 - x1_1) * (y2_1 - y1_1)
        area2 = (x2_2 - x1_2) * (y2_2 - y1_2)
        union_area = float(area1 + area2 - intersection_area)

        if union_area == 0:
            return 0.0

        return intersection_area / union_area

    def update(self, detections: List[Dict[str, Any]]) -> List[TrackedFace]:
        """Associate detections to active tracks, spawning new ones and cleaning old ones."""
        updated_tracks: List[TrackedFace] = []
        
        # Map out track matches: (detection_index, track_id, IoU)
        matches: List[Tuple[int, str, float]] = []
        
        det_indices = list(range(len(detections)))
        track_ids = list(self.tracks.keys())

        # Compute pairwise IoU
        for d_idx in det_indices:
            bbox_det = detections[d_idx]["bbox"]
            for t_id in track_ids:
                bbox_track = self.tracks[t_id].bbox
                iou = self._calculate_iou(bbox_det, bbox_track)
                if iou >= self.iou_threshold:
                    matches.append((d_idx, t_id, iou))

        # Sort matches by IoU score (descending)
        matches.sort(key=lambda x: x[2], reverse=True)

        matched_detections = set()
        matched_tracks = set()

        # Perform matching
        for d_idx, t_id, iou in matches:
            if d_idx in matched_detections or t_id in matched_tracks:
                continue
            
            matched_detections.add(d_idx)
            matched_tracks.add(t_id)

            # Update existing track
            det = detections[d_idx]
            track = self.tracks[t_id]
            track.bbox = det["bbox"]
            track.confidence = det["confidence"]
            track.landmarks = det.get("landmarks")
            track.last_seen = time.time()
            track.frame_count += 1
            
            self.lost_frames[t_id] = 0
            updated_tracks.append(track)

        # Spawn new tracks for unmatched detections
        for d_idx in det_indices:
            if d_idx not in matched_detections:
                det = detections[d_idx]
                # Create a persistent short tracking ID
                new_id = f"track_{uuid.uuid4().hex[:6]}"
                
                new_track = TrackedFace(
                    track_id=new_id,
                    bbox=det["bbox"],
                    confidence=det["confidence"],
                    landmarks=det.get("landmarks")
                )
                self.tracks[new_id] = new_track
                self.lost_frames[new_id] = 0
                updated_tracks.append(new_track)

        # Handle unmatched active tracks (increment lost frame counts)
        for t_id in track_ids:
            if t_id not in matched_tracks:
                self.lost_frames[t_id] = self.lost_frames.get(t_id, 0) + 1
                if self.lost_frames[t_id] >= self.max_lost_frames:
                    # Clean up lost track
                    self.tracks.pop(t_id, None)
                    self.lost_frames.pop(t_id, None)
                else:
                    # Retain track but do not add to updated returned tracks list
                    pass

        return updated_tracks

    def reset(self) -> None:
        """Clear all active tracks."""
        self.tracks.clear()
        self.lost_frames.clear()
        logger.info("IoUTracker reset completed.")
