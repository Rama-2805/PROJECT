"""SmartCampus AI — Behavioral Analytics Data Models."""

from enum import Enum
from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, Field


class BehaviorType(str, Enum):
    ATTENTIVE = "ATTENTIVE"
    SLEEPING = "SLEEPING"
    PHONE_USAGE = "PHONE_USAGE"
    DISTRACTED = "DISTRACTED"
    ABSENT_FROM_SEAT = "ABSENT_FROM_SEAT"
    UNKNOWN = "UNKNOWN"


class AlertSeverity(str, Enum):
    INFO = "INFO"
    WARNING = "WARNING"
    CRITICAL = "CRITICAL"


class EngagementLevel(str, Enum):
    HIGH = "HIGH_ENGAGEMENT"
    MODERATE = "MODERATE_ENGAGEMENT"
    LOW = "LOW_ENGAGEMENT"
    CRITICAL = "CRITICAL_ENGAGEMENT"


class DetectedPerson(BaseModel):
    track_id: str
    bounding_box: tuple[float, float, float, float]
    confidence: float
    face_bbox: Optional[tuple[float, float, float, float]] = None


class PoseLandmarks(BaseModel):
    nose: tuple[float, float, float] = (0, 0, 0)
    left_eye: tuple[float, float, float] = (0, 0, 0)
    right_eye: tuple[float, float, float] = (0, 0, 0)
    left_ear: tuple[float, float, float] = (0, 0, 0)
    right_ear: tuple[float, float, float] = (0, 0, 0)
    left_shoulder: tuple[float, float, float] = (0, 0, 0)
    right_shoulder: tuple[float, float, float] = (0, 0, 0)
    left_hip: tuple[float, float, float] = (0, 0, 0)
    right_hip: tuple[float, float, float] = (0, 0, 0)


class HeadPose(BaseModel):
    yaw: float = 0.0    # Horizontal: negative=left, positive=right
    pitch: float = 0.0  # Vertical: negative=down, positive=up
    roll: float = 0.0   # Rotation


class DetectedObject(BaseModel):
    class_id: int
    label: str
    confidence: float
    bounding_box: tuple[float, float, float, float]


class BehaviorEvent(BaseModel):
    student_id: Optional[str] = None
    track_id: Optional[str] = None
    behavior_type: BehaviorType
    confidence: float
    start_time: float = 0.0
    end_time: Optional[float] = None
    duration: float = 0.0
    classroom_id: str = ""
    camera_id: str = ""
    metadata: Optional[dict] = None


class EngagementRecord(BaseModel):
    student_id: str
    session_id: str
    score: float
    level: EngagementLevel
    attention_score: float = 0.0
    posture_score: float = 0.0
    phone_usage_penalty: float = 0.0
    activity_score: float = 0.0
    timestamp: float = 0.0


class BehaviorAlert(BaseModel):
    alert_id: str = ""
    student_id: Optional[str] = None
    behavior_event_id: Optional[str] = None
    severity: AlertSeverity
    title: str
    description: str = ""
    confidence: float = 0.0
    status: str = "ACTIVE"  # ACTIVE, ACKNOWLEDGED, DISMISSED
    acknowledged_by: Optional[str] = None
    created_at: float = 0.0


class BehaviorAnalysisResult(BaseModel):
    persons: List[DetectedPerson] = []
    poses: List[Optional[PoseLandmarks]] = []
    head_poses: List[Optional[HeadPose]] = []
    phones_detected: int = 0
    behavior_events: List[BehaviorEvent] = []
    engagement_scores: List[EngagementRecord] = []
