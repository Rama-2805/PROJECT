"""SmartCampus AI — Dashboard API Schemas.

Pydantic schemas for Admin Dashboard, Teacher Dashboard, Live Alerts Feed,
Attendance Overview, Classroom Status, Student Risk, and Behavior Analytics summaries.
"""

from datetime import datetime
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field


# --- Shared / Sub-Schemas ---

class ActivityEventSchema(BaseModel):
    id: str
    time: str
    type: str  # attendance, alert, system, device
    severity: str  # info, warning, critical
    title: str
    description: str
    timestamp: str


class AIModelStatusSchema(BaseModel):
    name: str
    status: str  # online, offline, degraded
    accuracy: Optional[float] = None


# --- Admin Dashboard Summary ---

class DeviceStatusSchema(BaseModel):
    online: int
    total: int


class AdminDashboardSummaryResponse(BaseModel):
    total_students: int
    attendance_today: float
    ai_recognition_accuracy: float
    active_classrooms: int
    connected_devices_online: int
    connected_devices_total: int
    monthly_attendance_growth: float
    average_engagement: float
    pending_alerts: int
    greeting: str
    ai_summary: str
    recent_events: List[ActivityEventSchema]
    ai_models: List[AIModelStatusSchema]
    timestamp: str


# --- Teacher Dashboard Summary ---

class TeacherClassroomSchema(BaseModel):
    id: str
    name: str
    subject: str
    time: str
    status: str  # ACTIVE, IDLE, OFFLINE
    attendance_rate: float


class ScheduleItemSchema(BaseModel):
    id: str
    subject: str
    classroom: str
    time: str
    status: str


class TeacherStatsSchema(BaseModel):
    avg_attendance: float
    total_classes_conducted: int
    active_alerts_count: int
    avg_engagement_rate: float


class TeacherDashboardSummaryResponse(BaseModel):
    teacher_name: str
    classrooms: List[TeacherClassroomSchema]
    today_schedule: List[ScheduleItemSchema]
    stats: TeacherStatsSchema
    recent_events: List[ActivityEventSchema]
    timestamp: str


# --- Live Alerts Feed ---

class BehaviorAlertSchema(BaseModel):
    id: str
    student_id: str
    student_name: str
    behavior_type: str  # ATTENTIVE, SLEEPING, PHONE_USAGE, DISTRACTED, ABSENT_FROM_SEAT, UNKNOWN
    severity: str  # INFO, WARNING, CRITICAL
    confidence: float
    status: str  # ACTIVE, ACKNOWLEDGED, DISMISSED
    acknowledged_by: Optional[str] = None
    created_at: str


class LiveAlertsResponse(BaseModel):
    total: int
    alerts: List[BehaviorAlertSchema]
    timestamp: str


# --- Attendance Overview ---

class DayAttendanceRateSchema(BaseModel):
    day: str
    rate: float


class DeptAttendanceRateSchema(BaseModel):
    name: str
    rate: float


class AttendanceDistributionSchema(BaseModel):
    label: str
    value: int
    color: str


class MonthAttendanceRateSchema(BaseModel):
    month: str
    rate: float


class AttendanceOverviewResponse(BaseModel):
    weekly_trend: List[DayAttendanceRateSchema]
    department_comparison: List[DeptAttendanceRateSchema]
    distribution: List[AttendanceDistributionSchema]
    monthly_trend: List[MonthAttendanceRateSchema]
    late_arrivals: int
    absence_rate: float
    timestamp: str


# --- Classroom Status ---

class ClassroomStatusSchema(BaseModel):
    id: str
    name: str
    subject: str
    teacher: str
    status: str  # ACTIVE, IDLE, OFFLINE
    current_attendance: int
    total_students: int
    average_engagement: float
    camera_status: str  # ONLINE, OFFLINE, DEGRADED
    fps: float


class ClassroomStatusResponse(BaseModel):
    total_active: int
    total_idle: int
    total_offline: int
    classrooms: List[ClassroomStatusSchema]
    timestamp: str


# --- Student Risk Summary ---

class StudentRiskSchema(BaseModel):
    student_id: str
    student_name: str
    engagement_score: float
    attendance_rate: float
    phone_events_count: int
    sleeping_events_count: int
    risk_level: str  # HIGH, MODERATE
    warning_trigger: str  # Reason for alert


class StudentRiskResponse(BaseModel):
    high_risk_students: List[StudentRiskSchema]
    moderate_risk_students: List[StudentRiskSchema]
    total_high_risk: int
    total_moderate_risk: int
    timestamp: str


# --- Behavior Analytics Summary ---

class BehaviorOverviewSchema(BaseModel):
    averageEngagement: float
    phoneEvents: int
    attentionLevel: float
    highRiskStudents: int


class TrendPointSchema(BaseModel):
    time: str
    score: float


class BehaviorDistSchema(BaseModel):
    type: str
    count: int


class ClassComparisonSchema(BaseModel):
    name: str
    engagement: float


class StudentRankingSchema(BaseModel):
    studentId: str
    studentName: str
    score: float


class AttentionHeatmapRowSchema(BaseModel):
    period: str
    monday: float
    tuesday: float
    wednesday: float
    thursday: float
    friday: float


class BehaviorEventSchema(BaseModel):
    id: str
    studentId: str
    studentName: str
    behaviorType: str
    confidence: float
    duration: int
    timestamp: str
    classroomId: str


class BehaviorAnalyticsSummaryResponse(BaseModel):
    overview: BehaviorOverviewSchema
    engagement_trend: List[TrendPointSchema]
    behavior_distribution: List[BehaviorDistSchema]
    classroom_comparison: List[ClassComparisonSchema]
    student_ranking: List[StudentRankingSchema]
    attention_heatmap: List[AttentionHeatmapRowSchema]
    recent_alerts: List[BehaviorAlertSchema]
    top_events: List[BehaviorEventSchema]
    student_timeline: List[BehaviorEventSchema]
    timestamp: str
