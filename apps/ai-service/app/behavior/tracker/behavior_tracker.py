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
from enum import Enum
from typing import Dict, List, Optional, Tuple, Any
from dataclasses import dataclass, field

logger = logging.getLogger("smartcampus.behavior_tracker")


class BehaviorTemporalState(str, Enum):
    NORMAL = "NORMAL"
    OBSERVING_PHONE = "OBSERVING_PHONE"
    POSSIBLE_PHONE_USAGE = "POSSIBLE_PHONE_USAGE"
    OBSERVING_POSTURE = "OBSERVING_POSTURE"
    POSSIBLE_SLEEPING = "POSSIBLE_SLEEPING"
    ALERTED = "ALERTED"
    INSUFFICIENT_VISUAL_EVIDENCE = "INSUFFICIENT_VISUAL_EVIDENCE"
    TRACK_LOST = "TRACK_LOST"


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
    current_state: BehaviorTemporalState = BehaviorTemporalState.NORMAL
    last_alert_time: float = 0.0
    last_alert_type: Optional[str] = None
    alert_lifecycle_status: str = "IDLE"     # "IDLE", "PENDING_CONFIRMATION", "ALERTED", "COOLDOWN"

    # Observation History (rolling window)
    observation_count: int = 0
    recent_observations: List[Dict[str, Any]] = field(default_factory=list)

    def to_dict(self) -> Dict[str, Any]:
        """Convert state to serializable dictionary for UI and API telemetry."""
        identity_label = self.student_name if self.is_verified_identity and self.student_name else f"Student (Track {self.track_id})"
        evidence_duration = max(self.accumulated_phone_duration, self.accumulated_sleeping_duration)
        
        return {
            "track_id": self.track_id,
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
            "sleeping_detected": self.accumulated_sleeping_duration >= 10.0,
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
        sleeping_threshold_sec: float = 10.0,
        cooldown_sec: float = 60.0,
        track_lost_timeout_sec: float = 3.5
    ):
        self.phone_usage_threshold_sec = phone_usage_threshold_sec
        self.sleeping_threshold_sec = sleeping_threshold_sec
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
        phone_confidence: float
    ) -> Tuple[TrackedBehaviorPerson, Optional[Dict[str, Any]]]:
        """Evaluates stage-2 behavioral evidence across time and updates state.
        
        Returns:
            (person_state, generated_alert_dict_or_None)
        """
        person = self._tracks.get(track_id)
        if not person:
            person = self.update_or_create_track(track_id, [0, 0, 0, 0], timestamp)

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

        # Determine Gaze & Looking Angle
        is_looking_towards_phone = False
        if phone_associated and phone_bbox:
            # Check if head tilt angle is oriented downward toward the phone
            # Pitch < -10 deg and yaw directed towards phone center
            px_c = (phone_bbox[0] + phone_bbox[2]) / 2.0
            bx_c = (person.bbox[0] + person.bbox[2]) / 2.0
            dx_rel = px_c - bx_c
            
            # If phone is lower down and head pitch is downward
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
            person.current_state = BehaviorTemporalState.INSUFFICIENT_VISUAL_EVIDENCE
            return person, None

        generated_alert = None

        # ── 1. EVALUATE PHONE USAGE TEMPORAL EVIDENCE ──────────────────
        # Requirement: Phone associated + Head oriented towards phone sustained >= 5.0 seconds
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
                # Phone usage threshold satisfied
                person.current_state = BehaviorTemporalState.ALERTED
                
                # Check cooldown to prevent duplicate per-frame alerts
                if (timestamp - person.last_alert_time >= self.cooldown_sec) or (person.last_alert_type != "PHONE_USAGE"):
                    person.last_alert_time = timestamp
                    person.last_alert_type = "PHONE_USAGE"
                    person.alert_lifecycle_status = "ALERTED"

                    generated_alert = {
                        "event_type": "PHONE_USAGE",
                        "track_id": person.track_id,
                        "student_id": person.student_id,
                        "student_name": person.student_name or f"Student (Track {person.track_id})",
                        "is_verified_identity": person.is_verified_identity,
                        "duration": round(person.accumulated_phone_duration, 1),
                        "confidence": min(0.95, max(0.75, phone_confidence)),
                        "title": "Mobile Phone Usage Detected",
                        "description": f"Sustained mobile phone usage observed ({round(person.accumulated_phone_duration, 1)}s) with head tilted toward device.",
                        "status": "ACTIVE",
                        "timestamp": timestamp,
                    }
        else:
            # Phone evidence interrupted or not looking at phone
            # Gradually decay or reset if upright
            if person.accumulated_phone_duration > 0:
                person.accumulated_phone_duration = max(0.0, person.accumulated_phone_duration - 1.0)
            if person.accumulated_phone_duration == 0:
                person.phone_evidence_start = None

        # ── 2. EVALUATE SLEEPING / INACTIVE TEMPORAL EVIDENCE ───────────
        # Requirement: Sustained forward-slumped / lowered head posture >= 10.0 seconds
        # Label: "Possible sleeping posture"
        is_sleeping_posture_supported = is_slumped or is_head_down or posture_label in ("Slumped", "Head Resting on Desk")
        
        # Avoid treating active phone use as sleeping
        if is_sleeping_posture_supported and not is_looking_towards_phone:
            if person.sleeping_evidence_start is None:
                person.sleeping_evidence_start = timestamp
                person.accumulated_sleeping_duration = 0.0
                person.current_state = BehaviorTemporalState.OBSERVING_POSTURE
            else:
                person.accumulated_sleeping_duration = timestamp - person.sleeping_evidence_start
                if person.accumulated_sleeping_duration >= 3.0 and person.accumulated_sleeping_duration < self.sleeping_threshold_sec:
                    person.current_state = BehaviorTemporalState.POSSIBLE_SLEEPING

            if person.accumulated_sleeping_duration >= self.sleeping_threshold_sec:
                person.current_state = BehaviorTemporalState.ALERTED

                if (timestamp - person.last_alert_time >= self.cooldown_sec) or (person.last_alert_type != "POSSIBLE_SLEEPING"):
                    person.last_alert_time = timestamp
                    person.last_alert_type = "POSSIBLE_SLEEPING"
                    person.alert_lifecycle_status = "ALERTED"

                    generated_alert = {
                        "event_type": "POSSIBLE_SLEEPING_POSTURE",
                        "track_id": person.track_id,
                        "student_id": person.student_id,
                        "student_name": person.student_name or f"Student (Track {person.track_id})",
                        "is_verified_identity": person.is_verified_identity,
                        "duration": round(person.accumulated_sleeping_duration, 1),
                        "confidence": 0.88,
                        "title": "Possible sleeping posture",
                        "description": f"Sustained forward-slumped / lowered head posture detected for {round(person.accumulated_sleeping_duration, 1)}s.",
                        "status": "ACTIVE",
                        "timestamp": timestamp,
                    }
        else:
            # Posture returned to upright: reset immediately
            if not is_sleeping_posture_supported:
                person.sleeping_evidence_start = None
                person.accumulated_sleeping_duration = 0.0
                if person.current_state in (BehaviorTemporalState.OBSERVING_POSTURE, BehaviorTemporalState.POSSIBLE_SLEEPING):
                    person.current_state = BehaviorTemporalState.NORMAL

        # Normal fallback if no behavior is flagged
        if person.current_state not in (
            BehaviorTemporalState.ALERTED,
            BehaviorTemporalState.POSSIBLE_PHONE_USAGE,
            BehaviorTemporalState.POSSIBLE_SLEEPING,
            BehaviorTemporalState.OBSERVING_PHONE,
            BehaviorTemporalState.OBSERVING_POSTURE,
            BehaviorTemporalState.INSUFFICIENT_VISUAL_EVIDENCE,
            BehaviorTemporalState.TRACK_LOST
        ):
            person.current_state = BehaviorTemporalState.NORMAL
            person.alert_lifecycle_status = "IDLE"

        return person, generated_alert

    def prune_stale_tracks(self, current_time: float):
        """Marks tracks lost if unseen beyond timeout, and frees stale memory."""
        stale_ids = []
        for track_id, person in self._tracks.items():
            elapsed = current_time - person.last_seen
            if elapsed > self.track_lost_timeout_sec:
                person.current_state = BehaviorTemporalState.TRACK_LOST
            if elapsed > 30.0:  # Delete tracks lost for > 30s
                stale_ids.append(track_id)

        for tid in stale_ids:
            self._tracks.pop(tid, None)


# Global singleton instance
behavior_tracker_service = BehavioralTrackerService()
