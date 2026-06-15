"""SmartCampus AI — Behavior Classification Service.

Combines pose, head orientation, and object detection data
to classify student behavior into attention categories.
"""

import time
import numpy as np
from typing import Optional, List, Dict
from collections import defaultdict
from ..models import (
    BehaviorType, BehaviorEvent, PoseLandmarks, HeadPose,
    DetectedObject, EngagementLevel,
)


class BehaviorClassifier:
    """Classifies student behavior using multi-modal analysis.

    Combines: pose posture + head pose + phone detection + temporal analysis
    """

    def __init__(self):
        self._temporal_buffers: Dict[str, list] = defaultdict(list)
        self._cooldowns: Dict[str, float] = {}
        self.min_consecutive_frames = 3
        self.cooldown_seconds = 10.0

    def classify(self,
                 track_id: str,
                 pose: Optional[PoseLandmarks],
                 head_pose: Optional[HeadPose],
                 phones_nearby: List[DetectedObject],
                 frame_time: float) -> Optional[BehaviorEvent]:
        """Classify behavior for a single student in one frame.

        Returns a BehaviorEvent if behavior is classified above threshold.
        """
        behavior_confidences: Dict[BehaviorType, float] = {}

        # 1. Check for phone usage
        if phones_nearby:
            # Higher confidence if phone detected close to hands/face
            phone_confidence = max(p.confidence for p in phones_nearby)
            behavior_confidences[BehaviorType.PHONE_USAGE] = phone_confidence * 0.9

        if head_pose:
            from ..detector.pose_detector import PoseDetector
            detector = PoseDetector()

            # 2. Check for sleeping (head down + little movement)
            if detector.is_head_down(head_pose, threshold=-25.0):
                behavior_confidences[BehaviorType.SLEEPING] = 0.7 + abs(head_pose.pitch) / 180 * 0.3

            # 3. Check for distraction (looking away repeatedly)
            if detector.is_looking_away(head_pose, threshold=35.0):
                behavior_confidences[BehaviorType.DISTRACTED] = 0.6 + abs(head_pose.yaw) / 180 * 0.3

        # 4. Check posture
        if pose:
            from ..detector.pose_detector import PoseDetector
            detector = PoseDetector()
            posture = detector.classify_posture(pose)
            if posture == "slouching":
                behavior_confidences[BehaviorType.SLEEPING] = max(
                    behavior_confidences.get(BehaviorType.SLEEPING, 0), 0.5
                )

        # 5. Default: attentive
        if not behavior_confidences:
            behavior_confidences[BehaviorType.ATTENTIVE] = 0.95

        # Apply temporal smoothing
        self._temporal_buffers[track_id].append(behavior_confidences)
        if len(self._temporal_buffers[track_id]) > 30:
            self._temporal_buffers[track_id].pop(0)

        # Get the most consistent behavior over recent frames
        recent = self._temporal_buffers[track_id][-self.min_consecutive_frames:]
        if len(recent) < self.min_consecutive_frames:
            return None

        # Average confidences over recent frames
        avg_confidences: Dict[BehaviorType, float] = {}
        for bt in BehaviorType:
            vals = [r.get(bt, 0) for r in recent]
            avg_confidences[bt] = np.mean(vals)

        # Pick the highest confidence behavior
        best_behavior = max(avg_confidences, key=avg_confidences.get)
        best_confidence = avg_confidences[best_behavior]

        if best_behavior == BehaviorType.ATTENTIVE:
            return None  # Don't create events for normal attentive behavior

        if best_confidence < 0.6:
            return None

        # Check cooldown
        cooldown_key = f"{track_id}_{best_behavior.value}"
        last_alert = self._cooldowns.get(cooldown_key, 0)
        if frame_time - last_alert < self.cooldown_seconds:
            return None
        self._cooldowns[cooldown_key] = frame_time

        return BehaviorEvent(
            track_id=track_id,
            behavior_type=best_behavior,
            confidence=round(best_confidence, 3),
            start_time=frame_time,
            duration=0.0,
        )

    def get_attention_score(self, track_id: str) -> float:
        """Get the current attention score (0-1) for a student."""
        recent = self._temporal_buffers.get(track_id, [])
        if not recent:
            return 1.0

        score = 1.0
        for frame_conf in recent[-10:]:
            if BehaviorType.DISTRACTED in frame_conf:
                score -= frame_conf[BehaviorType.DISTRACTED] * 0.15
            if BehaviorType.SLEEPING in frame_conf:
                score -= frame_conf[BehaviorType.SLEEPING] * 0.25
            if BehaviorType.PHONE_USAGE in frame_conf:
                score -= frame_conf[BehaviorType.PHONE_USAGE] * 0.2

        return max(0.0, min(1.0, score))

    def get_dominant_behavior(self, track_id: str) -> Optional[BehaviorType]:
        """Get the dominant behavior observed over recent frames."""
        recent = self._temporal_buffers.get(track_id, [])
        if not recent:
            return BehaviorType.ATTENTIVE

        counts = defaultdict(float)
        for frame_conf in recent[-15:]:
            for bt, conf in frame_conf.items():
                counts[bt] += conf

        if not counts:
            return BehaviorType.ATTENTIVE

        dominant = max(counts, key=counts.get)
        return dominant if dominant != BehaviorType.ATTENTIVE else None


# Global classifier instance
behavior_classifier = BehaviorClassifier()
