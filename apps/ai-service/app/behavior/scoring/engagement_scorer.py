"""SmartCampus AI — Engagement Score Engine.

Computes real-time engagement scores (0-100) for each student
based on attention, posture, phone usage, and activity level.
"""

import time
import numpy as np
from typing import Dict, Optional, List
from collections import defaultdict
from ..models import (
    EngagementRecord, EngagementLevel, BehaviorType,
    PoseLandmarks, HeadPose,
)
from ..detector.pose_detector import PoseDetector
from ..classifier.behavior_classifier import behavior_classifier


class EngagementScorer:
    """Computes engagement scores using weighted factors.

    Factors:
    - Attention: 40%
    - Posture: 25%
    - Phone Usage: 20%
    - Activity Level: 15%
    """

    def __init__(self):
        self._attention_weights = {
            "attention": 0.40,
            "posture": 0.25,
            "phone_usage": 0.20,
            "activity": 0.15,
        }

        # Per-student score history for smoothing
        self._score_history: Dict[str, List[float]] = defaultdict(list)
        self._smoothing_window = 15

    def compute_score(self,
                      track_id: str,
                      student_id: str,
                      session_id: str,
                      pose: Optional[PoseLandmarks],
                      head_pose: Optional[HeadPose],
                      phones_detected: int,
                      frame_time: float) -> EngagementRecord:
        """Compute engagement score (0-100) for a student."""
        detector = PoseDetector()

        # 1. Attention score (40% weight)
        attention_score = behavior_classifier.get_attention_score(track_id)
        if head_pose and detector.is_looking_away(head_pose):
            attention_score *= 0.7

        # 2. Posture score (25% weight)
        posture_score = 1.0
        if pose:
            posture = detector.classify_posture(pose)
            posture_score = detector.compute_posture_score(posture)

        # 3. Phone usage penalty (20% weight)
        phone_penalty = min(1.0, phones_detected * 0.5)

        # 4. Activity score (15% weight)
        recent_behavior = behavior_classifier.get_dominant_behavior(track_id)
        activity_score = 1.0
        if recent_behavior == BehaviorType.SLEEPING:
            activity_score = 0.2
        elif recent_behavior == BehaviorType.DISTRACTED:
            activity_score = 0.5

        # Compute weighted score
        raw_score = (
            self._attention_weights["attention"] * attention_score * 100 +
            self._attention_weights["posture"] * posture_score * 100 +
            self._attention_weights["phone_usage"] * (1 - phone_penalty) * 100 +
            self._attention_weights["activity"] * activity_score * 100
        )

        # Apply temporal smoothing
        self._score_history[track_id].append(raw_score)
        if len(self._score_history[track_id]) > self._smoothing_window:
            self._score_history[track_id].pop(0)

        smoothed_score = np.mean(self._score_history[track_id])
        final_score = round(max(0, min(100, smoothed_score)), 1)

        # Determine engagement level
        if final_score >= 80:
            level = EngagementLevel.HIGH
        elif final_score >= 60:
            level = EngagementLevel.MODERATE
        elif final_score >= 40:
            level = EngagementLevel.LOW
        else:
            level = EngagementLevel.CRITICAL

        return EngagementRecord(
            student_id=student_id,
            session_id=session_id,
            score=final_score,
            level=level,
            attention_score=round(attention_score * 100, 1),
            posture_score=round(posture_score * 100, 1),
            phone_usage_penalty=round(phone_penalty * 100, 1),
            activity_score=round(activity_score * 100, 1),
            timestamp=frame_time,
        )

    def get_classroom_average(self) -> float:
        """Get average engagement across all tracked students."""
        scores = []
        for history in self._score_history.values():
            if history:
                scores.append(np.mean(history[-5:]))
        return round(np.mean(scores), 1) if scores else 0.0

    def get_distribution(self) -> dict:
        """Get engagement level distribution across students."""
        distribution = {level.value: 0 for level in EngagementLevel}
        for track_id, history in self._score_history.items():
            if history:
                avg = np.mean(history[-5:])
                if avg >= 80:
                    distribution[EngagementLevel.HIGH.value] += 1
                elif avg >= 60:
                    distribution[EngagementLevel.MODERATE.value] += 1
                elif avg >= 40:
                    distribution[EngagementLevel.LOW.value] += 1
                else:
                    distribution[EngagementLevel.CRITICAL.value] += 1
        return distribution


# Global scorer instance
engagement_scorer = EngagementScorer()
