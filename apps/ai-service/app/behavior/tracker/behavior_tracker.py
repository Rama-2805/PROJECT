"""SmartCampus AI — Two-Stage Behavioral Temporal Tracking Service.

Maintains per-person temporal behavioral state across frames using real elapsed
timestamps (not fixed FPS). Evaluates sustained evidence thresholds for:
- Phone-usage detection (5.0s minimum sustained evidence)
- Sleeping-posture detection (10.0s minimum sustained evidence, labeled 'Possible sleeping posture')

Strictly separates tracking IDs from student identities. Associates confirmed student
identity if recognized; otherwise maintains an unidentified-person label.
"""

import time
import math
import logging
import re
from enum import Enum
from typing import Dict, List, Optional, Tuple, Any
from dataclasses import dataclass, field
import numpy as np

logger = logging.getLogger("smartcampus.behavior_tracker")


class BehaviorTemporalState(str, Enum):
    """Explicit classification states for classroom behavioral monitoring."""
    NORMAL_ACTIVITY = "NORMAL_ACTIVITY"
    NORMAL = "NORMAL_ACTIVITY"
    OBSERVING = "OBSERVING"
    OBSERVING_POSTURE = "OBSERVING"
    OBSERVING_PHONE = "OBSERVING_PHONE"
    POSSIBLE_INATTENTION = "POSSIBLE_INATTENTION"
    POSSIBLE_SLEEPING = "POSSIBLE_INATTENTION"
    POSSIBLE_PHONE_USAGE = "POSSIBLE_PHONE_USAGE"
    PROBABLE_SLEEPING = "PROBABLE_SLEEPING"
    ALERTED = "ALERTED"
    INSUFFICIENT_EVIDENCE = "INSUFFICIENT_EVIDENCE"
    INSUFFICIENT_VISUAL_EVIDENCE = "INSUFFICIENT_EVIDENCE"
    RESOLVED = "RESOLVED"
    TRACK_LOST = "TRACK_LOST"


def format_anonymous_track_ref(track_id: str) -> str:
    """Formats a session-scoped anonymous track reference (e.g. 'Track P-014')."""
    tid_str = str(track_id).strip()
    digits = re.findall(r'\d+', tid_str)
    if digits:
        num = int(digits[-1])
        return f"Track P-{num:03d}"
    return f"Track P-{tid_str[:6]}"


@dataclass
class TrackedBehaviorPerson:
    """Represents a single tracked person's behavioral state across time."""
    track_id: str
    student_id: Optional[str] = None         # Database student ID or USN if verified
    student_name: Optional[str] = None       # Display name if verified
    is_verified_identity: bool = False       # True ONLY if verified by face recognition

    # Timestamps (real elapsed time)
    first_seen: float = 0.0
    last_seen: float = 0.0

    # Spatial ROI (bounding box [x1, y1, x2, y2])
    bbox: List[float] = field(default_factory=lambda: [0.0, 0.0, 0.0, 0.0])

    # Landmark Quality & Measurement Reliability (0.0 to 1.0)
    pose_landmark_quality: float = 0.0
    face_landmark_quality: float = 0.0

    # Posture Evidence
    posture_label: str = "Upright"           # "Upright", "Slumped", "Head Lowered", "Head Resting on Desk"
    is_slumped: bool = False
    is_head_down: bool = False

    # Head Orientation Evidence
    head_pitch: float = 0.0                  # Negative = looking down
    head_yaw: float = 0.0                    # Negative = left, positive = right
    head_roll: float = 0.0
    gaze_label: str = "Facing Front"         # "Facing Front", "Down (Desk)", "Down (Phone)", "Looking Left/Right"
    is_looking_towards_phone: bool = False

    # Phone Association Evidence
    phone_associated: bool = False
    phone_confidence: float = 0.0
    phone_distance_px: float = 0.0
    phone_bbox: Optional[List[float]] = None

    # Temporal Evidence Accumulation
    phone_evidence_start: Optional[float] = None
    accumulated_phone_duration: float = 0.0

    sleeping_evidence_start: Optional[float] = None
    accumulated_sleeping_duration: float = 0.0

    # Behavioral State Machine
    current_state: BehaviorTemporalState = BehaviorTemporalState.NORMAL_ACTIVITY
    last_alert_time: float = 0.0
    last_alert_type: Optional[str] = None
    alert_lifecycle_status: str = "IDLE"     # "IDLE", "PENDING_CONFIRMATION", "ALERTED", "COOLDOWN"

    # Observation History (rolling window)
    observation_count: int = 0
    recent_observations: List[Dict[str, Any]] = field(default_factory=list)
    calibrated_confidence: float = 0.0
    is_reading_writing: bool = False

    @property
    def track_ref(self) -> str:
        return format_anonymous_track_ref(self.track_id)

    def to_dict(self) -> Dict[str, Any]:
        """Convert state to serializable dictionary for UI and API telemetry."""
        anonymous_ref = format_anonymous_track_ref(self.track_id)
        # Identity is kept separate: do not expose student names in sleeping telemetry
        identity_label = self.student_name if self.is_verified_identity and self.student_name else anonymous_ref
        evidence_duration = max(self.accumulated_phone_duration, self.accumulated_sleeping_duration)
        
        return {
            "track_id": self.track_id,
            "track_ref": anonymous_ref,
            "student_id": self.student_id,
            "student_name": identity_label,
            "is_verified_identity": self.is_verified_identity,
            "usn": self.student_id or f"TRK-{self.track_id}",
            "name": identity_label,
            "bbox": self.bbox,
            "current_state": self.current_state.value,
            "posture": self.posture_label,
            "gaze": self.gaze_label,
            "pitch": round(self.head_pitch, 1),
            "yaw": round(self.head_yaw, 1),
            "roll": round(self.head_roll, 1),
            "pose_landmark_quality": round(self.pose_landmark_quality, 2),
            "phone_detected": self.phone_associated,
            "sleeping_detected": self.accumulated_sleeping_duration >= 30.0,
            "accumulated_phone_duration": round(self.accumulated_phone_duration, 1),
            "accumulated_sleeping_duration": round(self.accumulated_sleeping_duration, 1),
            "evidence_duration": round(evidence_duration, 1),
            "alert_lifecycle_status": self.alert_lifecycle_status,
            "observation_count": self.observation_count,
            "first_seen": self.first_seen,
            "last_seen": self.last_seen,
            "last_updated": time.strftime("%I:%M:%S %p", time.localtime(self.last_seen)) if self.last_seen > 0 else "Just now"
        }


class BehavioralTrackerService:
    """Dedicated behavioral tracking and temporal evidence accumulation service."""

    def __init__(
        self,
        phone_usage_threshold_sec: float = 5.0,
        sleeping_threshold_sec: float = 30.0,
        min_valid_obs_ratio: float = 0.80,
        decision_confidence_threshold: float = 0.90,
        cooldown_sec: float = 60.0,
        track_lost_timeout_sec: float = 3.5
    ):
        self.phone_usage_threshold_sec = phone_usage_threshold_sec
        self.sleeping_threshold_sec = sleeping_threshold_sec
        self.min_valid_obs_ratio = min_valid_obs_ratio
        self.decision_confidence_threshold = decision_confidence_threshold
        self.cooldown_sec = cooldown_sec
        self.track_lost_timeout_sec = track_lost_timeout_sec

        self._tracks: Dict[str, TrackedBehaviorPerson] = {}
        self._next_numeric_id: int = 1

    def get_track(self, track_id: str) -> Optional[TrackedBehaviorPerson]:
        return self._tracks.get(track_id)

    def get_all_tracks(self) -> List[TrackedBehaviorPerson]:
        return list(self._tracks.values())

    def update_or_create_track(
        self,
        track_id: str,
        bbox: List[float],
        timestamp: float,
        student_id: Optional[str] = None,
        student_name: Optional[str] = None
    ) -> TrackedBehaviorPerson:
        """Find or initialize person track."""
        if track_id not in self._tracks:
            person = TrackedBehaviorPerson(
                track_id=track_id,
                first_seen=timestamp,
                last_seen=timestamp,
                bbox=bbox,
                student_id=student_id,
                student_name=student_name,
                is_verified_identity=bool(student_id)
            )
            self._tracks[track_id] = person
        else:
            person = self._tracks[track_id]
            person.last_seen = timestamp
            person.bbox = bbox
            if student_id and not person.is_verified_identity:
                person.student_id = student_id
                person.student_name = student_name
                person.is_verified_identity = True

        return person

    def evaluate_behavior_evidence(
        self,
        track_id: str,
        timestamp: float,
        posture_label: str,
        is_slumped: bool,
        is_head_down: bool,
        head_pitch: float,
        head_yaw: float,
        head_roll: float,
        pose_quality: float,
        face_quality: float,
        phone_associated: bool,
        phone_bbox: Optional[List[float]],
        phone_confidence: float,
        student_id: Optional[str] = None,
        student_name: Optional[str] = None,
        is_verified_identity: bool = False,
    ) -> Tuple[TrackedBehaviorPerson, Optional[Dict[str, Any]]]:
        """Evaluates stage-2 behavioral evidence across time and updates state.
        
        Returns:
            (person_state, generated_alert_dict_or_None)
        """
        person = self._tracks.get(track_id)
        if not person:
            person = self.update_or_create_track(track_id, [0, 0, 0, 0], timestamp)

        # Synchronize authoritative identity mapping with track switch protection
        if student_id and is_verified_identity:
            person.student_id = student_id
            person.student_name = student_name or student_id
            person.is_verified_identity = True
        elif student_id is None and not is_verified_identity:
            # Clear identity if track lost verified association or switched to unverified person
            person.student_id = None
            person.student_name = None
            person.is_verified_identity = False

        # Track interruption: deduct gaps > 3.0s from sleeping duration
        gap = timestamp - person.last_seen if person.last_seen > 0 else 0.0
        if gap > 3.0 and person.sleeping_evidence_start is not None and person.observation_count >= 3:
            # Shift start forward so missing frames do not count toward sleeping duration
            person.sleeping_evidence_start += max(0.0, gap - 1.5)

        person.last_seen = timestamp
        person.observation_count += 1
        person.pose_landmark_quality = pose_quality
        person.face_landmark_quality = face_quality
        person.posture_label = posture_label
        person.is_slumped = is_slumped
        person.is_head_down = is_head_down
        person.head_pitch = head_pitch
        person.head_yaw = head_yaw
        person.head_roll = head_roll
        person.phone_associated = phone_associated
        person.phone_bbox = phone_bbox
        person.phone_confidence = phone_confidence

        # Record observation in bounded rolling history
        is_obs_valid = (pose_quality >= 0.25 or face_quality >= 0.25)
        person.recent_observations.append({
            "timestamp": timestamp,
            "pitch": head_pitch,
            "yaw": head_yaw,
            "roll": head_roll,
            "posture": posture_label,
            "is_slumped": is_slumped,
            "is_head_down": is_head_down,
            "pose_quality": pose_quality,
            "face_quality": face_quality,
            "is_valid": is_obs_valid,
        })
        # Bounded history window (last 60 seconds)
        cutoff = timestamp - 60.0
        person.recent_observations = [o for o in person.recent_observations if o["timestamp"] >= cutoff]

        # Determine Gaze & Looking Angle
        is_looking_towards_phone = False
        if phone_associated and phone_bbox:
            px_c = (phone_bbox[0] + phone_bbox[2]) / 2.0
            bx_c = (person.bbox[0] + person.bbox[2]) / 2.0
            dx_rel = px_c - bx_c
            
            if head_pitch < -12.0:
                if abs(dx_rel) < 80 and abs(head_yaw) < 25.0:
                    is_looking_towards_phone = True
                elif dx_rel < -80 and head_yaw < -15.0:
                    is_looking_towards_phone = True
                elif dx_rel > 80 and head_yaw > 15.0:
                    is_looking_towards_phone = True

        person.is_looking_towards_phone = is_looking_towards_phone

        if is_looking_towards_phone:
            person.gaze_label = "Down (Phone)"
        elif is_head_down:
            person.gaze_label = "Down (Desk)"
        elif abs(head_yaw) > 28.0:
            person.gaze_label = "Looking Left" if head_yaw < -28.0 else "Looking Right"
        elif head_pitch > 20.0:
            person.gaze_label = "Looking Up"
        else:
            person.gaze_label = "Facing Front"

        # Check visual landmark sufficiency
        if pose_quality < 0.20 and face_quality < 0.20:
            person.current_state = BehaviorTemporalState.INSUFFICIENT_EVIDENCE
            return person, None

        generated_alert = None

        # ── 1. EVALUATE PHONE USAGE TEMPORAL EVIDENCE ──────────────────
        if phone_associated and (is_looking_towards_phone or (head_pitch < -18.0 and phone_confidence > 0.60)):
            if person.phone_evidence_start is None:
                person.phone_evidence_start = timestamp
                person.accumulated_phone_duration = 0.0
                person.current_state = BehaviorTemporalState.OBSERVING_PHONE
            else:
                person.accumulated_phone_duration = timestamp - person.phone_evidence_start
                if person.accumulated_phone_duration >= 2.0 and person.accumulated_phone_duration < self.phone_usage_threshold_sec:
                    person.current_state = BehaviorTemporalState.POSSIBLE_PHONE_USAGE

            if person.accumulated_phone_duration >= self.phone_usage_threshold_sec:
                person.current_state = BehaviorTemporalState.ALERTED
                
                if (timestamp - person.last_alert_time >= self.cooldown_sec) or (person.last_alert_type != "PHONE_USAGE"):
                    person.last_alert_time = timestamp
                    person.last_alert_type = "PHONE_USAGE"
                    person.alert_lifecycle_status = "ALERTED"

                    anonymous_ref = format_anonymous_track_ref(person.track_id)
                    is_verified = bool(person.is_verified_identity and person.student_id)
                    s_id = person.student_id if is_verified else None
                    s_name = person.student_name if is_verified else f"UNKNOWN ({anonymous_ref})"
                    alert_title = (
                        f"Mobile Phone Usage Detected — {person.student_name}"
                        if is_verified
                        else f"Mobile Phone Usage — {anonymous_ref} (UNKNOWN)"
                    )

                    generated_alert = {
                        "event_type": "PHONE_USAGE",
                        "track_id": person.track_id,
                        "track_ref": anonymous_ref,
                        "student_id": s_id,
                        "student_name": s_name,
                        "is_verified_identity": is_verified,
                        "duration": round(person.accumulated_phone_duration, 1),
                        "confidence": min(0.95, max(0.75, phone_confidence)),
                        "title": alert_title,
                        "description": f"Sustained mobile phone usage observed ({round(person.accumulated_phone_duration, 1)}s) with head tilted toward device.",
                        "status": "ACTIVE",
                        "timestamp": timestamp,
                    }
        else:
            if person.accumulated_phone_duration > 0:
                person.accumulated_phone_duration = max(0.0, person.accumulated_phone_duration - 1.0)
            if person.accumulated_phone_duration == 0:
                person.phone_evidence_start = None

        # ── 2. EVALUATE SLEEPING / SUSTAINED POSTURE TEMPORAL EVIDENCE ──
        # Phase 4 Strict Rules:
        # A downward-facing head alone is NOT evidence of sleeping.
        # Ordinary writing, reading textbooks, looking down at notebooks have upright/supported torso.
        is_resting_on_desk = (posture_label == "Head Resting on Desk")
        is_severe_slump = (is_slumped and (head_pitch < -28.0 or posture_label == "Slumped"))
        is_sleeping_posture_candidate = (is_resting_on_desk or is_severe_slump)

        # Distinguish reading/writing notes from sleeping:
        is_reading_writing = False
        if is_head_down and not is_resting_on_desk and not is_severe_slump:
            is_reading_writing = True
            person.is_reading_writing = True

        # Check motion variance over recent observations
        valid_history = [o for o in person.recent_observations if o["is_valid"]]
        total_pose_var = 0.0
        if len(valid_history) >= 4:
            pitches = [o["pitch"] for o in valid_history]
            yaws = [o["yaw"] for o in valid_history]
            total_pose_var = float(np.var(pitches) + np.var(yaws))
            # Active pitch/yaw adjustments while reading/writing
            if total_pose_var > 12.0 and not is_resting_on_desk:
                is_reading_writing = True

        if is_reading_writing:
            # Normal reading / writing activity: reset sleeping accumulation immediately
            person.sleeping_evidence_start = None
            person.accumulated_sleeping_duration = 0.0
            if person.current_state in (
                BehaviorTemporalState.OBSERVING,
                BehaviorTemporalState.POSSIBLE_INATTENTION,
                BehaviorTemporalState.PROBABLE_SLEEPING,
            ):
                person.current_state = BehaviorTemporalState.NORMAL_ACTIVITY

        elif is_sleeping_posture_candidate and not is_looking_towards_phone:
            if person.sleeping_evidence_start is None:
                person.sleeping_evidence_start = timestamp
                person.accumulated_sleeping_duration = 0.0
                person.current_state = BehaviorTemporalState.OBSERVING
            else:
                person.accumulated_sleeping_duration = timestamp - person.sleeping_evidence_start

            # Window metrics across evaluation period
            window_obs = [
                o for o in person.recent_observations
                if o["timestamp"] >= (person.sleeping_evidence_start - 0.5)
            ]
            valid_obs = [o for o in window_obs if o["is_valid"]]
            valid_ratio = len(valid_obs) / max(1, len(window_obs))

            # Calibrated confidence calculation based on independent signals:
            # Signal 1: Posture factor (0.50 max)
            posture_factor = 0.50 if is_resting_on_desk else 0.45
            # Signal 2: Temporal continuity factor (0.30 max)
            temporal_factor = 0.30 * min(1.0, valid_ratio / self.min_valid_obs_ratio)
            # Signal 3: Inactivity / stillness factor (0.20 max)
            if is_resting_on_desk:
                stillness_factor = 0.20
            else:
                stillness_factor = 0.20 * max(0.0, 1.0 - (total_pose_var / 12.0))

            calibrated_confidence = round(min(0.98, posture_factor + temporal_factor + stillness_factor), 2)
            person.calibrated_confidence = calibrated_confidence

            # Strict threshold evaluation:
            has_sufficient_duration = person.accumulated_sleeping_duration >= self.sleeping_threshold_sec
            has_sufficient_validity = valid_ratio >= self.min_valid_obs_ratio
            has_sufficient_confidence = calibrated_confidence >= self.decision_confidence_threshold

            if has_sufficient_duration and has_sufficient_validity and has_sufficient_confidence:
                person.current_state = BehaviorTemporalState.PROBABLE_SLEEPING
                anonymous_ref = format_anonymous_track_ref(person.track_id)

                if (timestamp - person.last_alert_time >= self.cooldown_sec) or (person.last_alert_type != "PROBABLE_SLEEPING"):
                    person.last_alert_time = timestamp
                    person.last_alert_type = "PROBABLE_SLEEPING"
                    person.alert_lifecycle_status = "ALERTED"

                    is_verified = bool(person.is_verified_identity and person.student_id)
                    s_id = person.student_id if is_verified else None
                    s_name = person.student_name if is_verified else f"UNKNOWN ({anonymous_ref})"
                    alert_title = (
                        f"Sleeping Detected — {person.student_name}"
                        if is_verified
                        else f"Probable Sleeping — {anonymous_ref} (UNKNOWN)"
                    )

                    generated_alert = {
                        "event_type": "PROBABLE_SLEEPING",
                        "track_id": person.track_id,
                        "track_ref": anonymous_ref,
                        "student_id": s_id,
                        "student_name": s_name,
                        "is_verified_identity": is_verified,
                        "duration": round(person.accumulated_sleeping_duration, 1),
                        "confidence": calibrated_confidence,
                        "title": alert_title,
                        "description": f"Sustained probable sleeping posture observed ({round(person.accumulated_sleeping_duration, 1)}s) with calibrated confidence {int(round(calibrated_confidence * 100))}%.",
                        "status": "ACTIVE",
                        "timestamp": timestamp,
                    }
            elif person.accumulated_sleeping_duration >= 3.0:
                person.current_state = BehaviorTemporalState.POSSIBLE_INATTENTION
            else:
                person.current_state = BehaviorTemporalState.OBSERVING
        else:
            # Posture returned to upright / normal: reset immediately
            person.sleeping_evidence_start = None
            person.accumulated_sleeping_duration = 0.0
            if person.current_state in (
                BehaviorTemporalState.OBSERVING,
                BehaviorTemporalState.POSSIBLE_INATTENTION,
                BehaviorTemporalState.PROBABLE_SLEEPING,
            ):
                person.current_state = BehaviorTemporalState.NORMAL_ACTIVITY

        # Check inattention (looking away, yaw > 28°)
        if abs(head_yaw) > 28.0 and not phone_associated and not is_sleeping_posture_candidate:
            person.current_state = BehaviorTemporalState.POSSIBLE_INATTENTION

        # Normal fallback
        if person.current_state not in (
            BehaviorTemporalState.ALERTED,
            BehaviorTemporalState.PROBABLE_SLEEPING,
            BehaviorTemporalState.POSSIBLE_PHONE_USAGE,
            BehaviorTemporalState.POSSIBLE_INATTENTION,
            BehaviorTemporalState.OBSERVING_PHONE,
            BehaviorTemporalState.OBSERVING,
            BehaviorTemporalState.INSUFFICIENT_EVIDENCE,
            BehaviorTemporalState.TRACK_LOST,
        ):
            person.current_state = BehaviorTemporalState.NORMAL_ACTIVITY
            person.alert_lifecycle_status = "IDLE"

        return person, generated_alert

    def prune_stale_tracks(self, current_time: float):
        """Marks tracks lost if unseen beyond timeout, and frees stale memory."""
        stale_ids = []
        for track_id, person in list(self._tracks.items()):
            elapsed = current_time - person.last_seen
            if elapsed > self.track_lost_timeout_sec:
                if person.current_state != BehaviorTemporalState.TRACK_LOST:
                    person.current_state = BehaviorTemporalState.TRACK_LOST
                    person.alert_lifecycle_status = "IDLE"
                    person.phone_evidence_start = None
                    person.accumulated_phone_duration = 0.0
                    person.sleeping_evidence_start = None
                    person.accumulated_sleeping_duration = 0.0
            if elapsed > 30.0:  # Delete tracks lost for > 30s
                stale_ids.append(track_id)

        for tid in stale_ids:
            self._tracks.pop(tid, None)

    def reset(self):
        """Clear all temporal behavioural state (called when a monitoring session starts/stops)."""
        self._tracks.clear()


# Global singleton instance
behavior_tracker_service = BehavioralTrackerService()

