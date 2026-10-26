"""SmartCampus AI — Engagement Score Engine.

Computes real-time engagement scores (0-100) for each student
based on actual posture, head orientation, gaze, phone usage, and activity signals.
"""

import time
import logging
import numpy as np
from typing import Dict, Optional, List, Any
from collections import defaultdict
from ..models import (
    EngagementRecord, EngagementLevel, BehaviorType,
    PoseLandmarks, HeadPose,
)
from ..detector.pose_detector import PoseDetector
from ..classifier.behavior_classifier import behavior_classifier

logger = logging.getLogger("smartcampus.engagement_scorer")


class EngagementScorer:
    """Computes engagement scores using weighted factors.

    Factors:
    - Attention: 40% (head orientation, pitch/yaw, gaze label, reading/writing state)
    - Posture: 25% (upright torso vs slumped or head resting on desk)
    - Phone Usage: 20% (penalty for spatial phone association and duration)
    - Activity Level: 15% (active learning, writing notes, inattention, or sleeping)
    """

    SCORING_VERSION = "v1.2-hybrid"

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

    def compute_score_from_track(
        self,
        person: Any,
        session_id: str,
        frame_time: float,
    ) -> Optional[EngagementRecord]:
        """Compute genuine engagement score from a TrackedBehaviorPerson.

        Returns None if visual evidence is insufficient or observations < 3,
        preventing fabrication of scores when underlying signals are missing.
        """
        # 1. Verification of signal sufficiency
        obs_count = getattr(person, "observation_count", 0)
        pose_qual = getattr(person, "pose_landmark_quality", 0.0)
        face_qual = getattr(person, "face_landmark_quality", 0.0)
        landmark_conf = getattr(person, "landmark_confidence", max(pose_qual, face_qual))
        raw_state = getattr(person, "current_state", "NORMAL_ACTIVITY")
        cur_state = raw_state.value if hasattr(raw_state, "value") else str(raw_state)

        if obs_count < 3:
            return None  # Insufficient observation history

        if landmark_conf < 0.20:
            return None  # Landmarks occluded or unreliably detected

        if cur_state in ("TRACK_LOST", "INSUFFICIENT_EVIDENCE"):
            return None

        # 2. Derive Posture Score (25% weight)
        posture_label = getattr(person, "posture_label", "Upright")
        if posture_label == "Upright":
            posture_score = 1.0
        elif posture_label == "Head Lowered":
            posture_score = 0.75
        elif posture_label == "Slumped":
            posture_score = 0.40
        elif posture_label == "Head Resting on Desk":
            posture_score = 0.15
        else:
            posture_score = 0.50

        # 3. Derive Attention Score (40% weight)
        is_reading_writing = getattr(person, "is_reading_writing", False)
        gaze_label = getattr(person, "gaze_label", "Facing Front")
        head_yaw = getattr(person, "head_yaw", 0.0)
        head_pitch = getattr(person, "head_pitch", 0.0)

        if is_reading_writing:
            attention_score = 0.95  # Active note taking is attentive engagement
        elif gaze_label == "Facing Front":
            yaw_penalty = min(0.30, (abs(head_yaw) / 30.0) * 0.30) if abs(head_yaw) > 12.0 else 0.0
            attention_score = max(0.60, 1.0 - yaw_penalty)
        elif gaze_label in ("Looking Left", "Looking Right"):
            attention_score = max(0.30, 0.70 - (abs(head_yaw) / 60.0) * 0.30)
        elif gaze_label == "Down (Phone)":
            attention_score = 0.25  # Inattention caused by phone interaction
        elif gaze_label == "Down (Desk)":
            attention_score = 0.45 if head_pitch < -28.0 else 0.70
        elif gaze_label == "Looking Up":
            attention_score = 0.75
        else:
            attention_score = 0.80

        # 4. Derive Phone Usage Penalty (20% weight)
        phone_associated = getattr(person, "phone_associated", False)
        phone_duration = getattr(person, "accumulated_phone_duration", 0.0)
        if phone_associated:
            if phone_duration >= 2.0:
                phone_penalty = min(1.0, 0.50 + min(1.0, (phone_duration - 2.0) / 3.0) * 0.50)
            else:
                phone_penalty = 0.35
        else:
            phone_penalty = 0.0

        # 5. Derive Activity Score (15% weight)
        acc_sleep_dur = getattr(person, "accumulated_sleeping_duration", 0.0)
        last_alert_type = getattr(person, "last_alert_type", None)

        if cur_state == "PROBABLE_SLEEPING" or acc_sleep_dur >= 10.0 or last_alert_type == "PROBABLE_SLEEPING":
            activity_score = 0.20
        elif cur_state == "ALERTED" and last_alert_type == "PHONE_USAGE":
            activity_score = 0.35
        elif cur_state == "POSSIBLE_INATTENTION":
            activity_score = 0.55
        elif is_reading_writing:
            activity_score = 0.95
        elif cur_state == "NORMAL_ACTIVITY":
            activity_score = 1.0
        else:
            activity_score = 0.80

        # 6. Compute Weighted Raw Score
        raw_score = (
            self._attention_weights["attention"] * attention_score * 100.0 +
            self._attention_weights["posture"] * posture_score * 100.0 +
            self._attention_weights["phone_usage"] * (1.0 - phone_penalty) * 100.0 +
            self._attention_weights["activity"] * activity_score * 100.0
        )

        track_id = str(getattr(person, "track_id", "0"))
        self._score_history[track_id].append(raw_score)
        if len(self._score_history[track_id]) > self._smoothing_window:
            self._score_history[track_id].pop(0)

        smoothed_score = float(np.mean(self._score_history[track_id]))
        final_score = round(max(0.0, min(100.0, smoothed_score)), 1)

        # 7. Determine Engagement Level
        if final_score >= 80.0:
            level = EngagementLevel.HIGH
        elif final_score >= 60.0:
            level = EngagementLevel.MODERATE
        elif final_score >= 40.0:
            level = EngagementLevel.LOW
        else:
            level = EngagementLevel.CRITICAL

        student_id = (
            person.student_id
            if (getattr(person, "is_verified_identity", False) and getattr(person, "student_id", None))
            else f"TRK-{track_id}"
        )

        return EngagementRecord(
            student_id=student_id,
            session_id=session_id,
            score=final_score,
            level=level,
            attention_score=round(attention_score * 100.0, 1),
            posture_score=round(posture_score * 100.0, 1),
            phone_usage_penalty=round(phone_penalty * 100.0, 1),
            activity_score=round(activity_score * 100.0, 1),
            timestamp=frame_time,
            scoring_version=self.SCORING_VERSION,
            is_sufficient_data=True,
            withheld_reason=None,
        )

    def compute_score(self,
                      track_id: str,
                      student_id: str,
                      session_id: str,
                      pose: Optional[PoseLandmarks],
                      head_pose: Optional[HeadPose],
                      phones_detected: int,
                      frame_time: float) -> EngagementRecord:
        """Legacy helper computing engagement score from discrete objects."""
        detector = PoseDetector()

        # 1. Attention score (40% weight)
        attention_score = behavior_classifier.get_attention_score(track_id)
        if head_pose:
            if detector.is_looking_away(head_pose):
                attention_score *= 0.7
            elif abs(head_pose.yaw) > 20.0:
                attention_score *= 0.85

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

        has_landmarks = (pose is not None) or (head_pose is not None)
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
            scoring_version=self.SCORING_VERSION,
            is_sufficient_data=has_landmarks,
            withheld_reason=None if has_landmarks else "MISSING_LANDMARKS",
        )

    def get_classroom_average(self) -> float:
        """Get average engagement across all tracked students."""
        scores = []
        for history in self._score_history.values():
            if history:
                scores.append(np.mean(history[-5:]))
        return round(float(np.mean(scores)), 1) if scores else 0.0

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

    def reset(self):
        """Clear smoothing histories on session reset."""
        self._score_history.clear()


# Global scorer instance
engagement_scorer = EngagementScorer()
