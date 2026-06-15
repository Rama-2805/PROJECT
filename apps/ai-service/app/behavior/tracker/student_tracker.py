"""SmartCampus AI — Student Tracking Service.

Assigns persistent tracking IDs to students across frames,
handling occlusions, re-entry, and multi-person tracking.
"""

import time
import numpy as np
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass, field
from collections import defaultdict
from ..models import DetectedPerson, PoseLandmarks, BehaviorType


@dataclass
class TrackedStudent:
    track_id: str
    student_id: Optional[str] = None
    student_name: Optional[str] = None
    first_seen: float = 0.0
    last_seen: float = 0.0
    positions: List[Tuple[float, float]] = field(default_factory=list)
    behavior_history: List[Tuple[float, BehaviorType]] = field(default_factory=list)
    attention_trend: List[float] = field(default_factory=list)
    is_visible: bool = True
    occlusion_count: int = 0


class StudentTracker:
    """Tracks students across frames using IoU matching.

    Assigns consistent IDs so behavior can be attributed across time.
    """

    def __init__(self):
        self._students: Dict[str, TrackedStudent] = {}
        self._next_id = 1
        self._max_disappeared = 30  # Frames before considering student left
        self._iou_threshold = 0.3

        # Track student-to-ID mapping
        self._student_id_map: Dict[str, str] = {}

    def update(self, persons: List[DetectedPerson], frame_time: float) -> List[TrackedStudent]:
        """Update tracking with new detections.

        Matches new detections to existing tracks using IoU,
        creates new tracks for unmatched detections,
        and removes stale tracks.
        """
        updated_tracks = []

        if not persons:
            # No detections — mark all as invisible
            for track in self._students.values():
                track.occlusion_count += 1
                if track.occlusion_count < self._max_disappeared:
                    track.is_visible = False
                    updated_tracks.append(track)
            return updated_tracks

        # Match detections to existing tracks
        matched_track_ids = set()
        matched_detection_indices = set()

        for track_id, track in list(self._students.items()):
            best_iou = 0
            best_idx = -1

            for i, person in enumerate(persons):
                if i in matched_detection_indices:
                    continue
                iou = self._compute_iou(
                    track.positions[-1] if track.positions else (0, 0),
                    (person.bounding_box[0], person.bounding_box[1]),
                )
                if iou > best_iou:
                    best_iou = iou
                    best_idx = i

            if best_iou >= self._iou_threshold and best_idx >= 0:
                person = persons[best_idx]
                matched_track_ids.add(track_id)
                matched_detection_indices.add(best_idx)
                track.last_seen = frame_time
                track.is_visible = True
                track.occlusion_count = 0
                cx = (person.bounding_box[0] + person.bounding_box[2]) / 2
                cy = (person.bounding_box[1] + person.bounding_box[3]) / 2
                track.positions.append((cx, cy))
                updated_tracks.append(track)

        # Create new tracks for unmatched detections
        for i, person in enumerate(persons):
            if i in matched_detection_indices:
                continue
            track_id = f"TRACK_{self._next_id:03d}"
            self._next_id += 1
            cx = (person.bounding_box[0] + person.bounding_box[2]) / 2
            cy = (person.bounding_box[1] + person.bounding_box[3]) / 2

            track = TrackedStudent(
                track_id=track_id,
                first_seen=frame_time,
                last_seen=frame_time,
                positions=[(cx, cy)],
                is_visible=True,
            )
            self._students[track_id] = track
            updated_tracks.append(track)

        # Remove stale tracks
        stale = []
        for track_id, track in self._students.items():
            if track.occlusion_count >= self._max_disappeared:
                stale.append(track_id)
        for track_id in stale:
            del self._students[track_id]

        return updated_tracks

    def _compute_iou(self, pos1: Tuple[float, float], pos2: Tuple[float, float]) -> float:
        """Simple position-based proximity (simplified IoU)."""
        dist = np.sqrt((pos1[0] - pos2[0]) ** 2 + (pos1[1] - pos2[1]) ** 2)
        return max(0, 1 - dist / 200)

    def associate_with_student(self, track_id: str, student_id: str, student_name: str):
        """Link a track ID to a known student."""
        track = self._students.get(track_id)
        if track:
            track.student_id = student_id
            track.student_name = student_name
            self._student_id_map[student_id] = track_id

    def get_track_by_student(self, student_id: str) -> Optional[TrackedStudent]:
        """Get the track for a known student."""
        track_id = self._student_id_map.get(student_id)
        return self._students.get(track_id)

    def record_behavior(self, track_id: str, behavior: BehaviorType, score: float):
        """Record a behavior observation for a student."""
        track = self._students.get(track_id)
        if track:
            track.behavior_history.append((time.time(), behavior))
            track.attention_trend.append(score)

    def get_stats(self) -> dict:
        """Get tracking statistics."""
        visible = sum(1 for t in self._students.values() if t.is_visible)
        return {
            "total_tracked": len(self._students),
            "visible_now": visible,
            "occluded": len(self._students) - visible,
            "known_students": len(self._student_id_map),
        }


# Global tracker instance
student_tracker = StudentTracker()
