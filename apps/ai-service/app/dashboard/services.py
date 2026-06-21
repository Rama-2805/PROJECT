"""SmartCampus AI — Dashboard Business Logic Service.

Aggregates repository telemetry feeds and organizes them into
clean, validated structures matching schemas.
"""

import math
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session

from .repository import dashboard_repo
from .schemas import (
    AdminDashboardSummaryResponse,
    TeacherDashboardSummaryResponse,
    LiveAlertsResponse,
    AttendanceOverviewResponse,
    ClassroomStatusResponse,
    StudentRiskResponse,
    BehaviorAnalyticsSummaryResponse,
    BehaviorOverviewSchema,
    TrendPointSchema,
    BehaviorDistSchema,
    ClassComparisonSchema,
    StudentRankingSchema,
    AttentionHeatmapRowSchema,
    BehaviorEventSchema,
    BehaviorAlertSchema,
    ActivityEventSchema,
    AIModelStatusSchema,
    TeacherClassroomSchema,
    ScheduleItemSchema,
    TeacherStatsSchema,
    ClassroomStatusSchema,
    StudentRiskSchema
)


class DashboardService:
    """Service Layer implementing aggregations, filters, and business logic for Dashboards."""

    def get_admin_dashboard_summary(self, db: Optional[Session] = None) -> AdminDashboardSummaryResponse:
        """Aggregate stats, recent events, and model statuses for Admin view."""
        stats = dashboard_repo.get_admin_stats(db)
        events = dashboard_repo.get_recent_events()
        models = dashboard_repo.get_ai_models_status()

        recent_events_mapped = [
            ActivityEventSchema(**e) for e in events
        ]
        models_mapped = [
            AIModelStatusSchema(**m) for m in models
        ]

        return AdminDashboardSummaryResponse(
            total_students=stats["totalStudents"],
            attendance_today=stats["attendanceToday"],
            ai_recognition_accuracy=stats["aiRecognitionAccuracy"],
            active_classrooms=stats["activeClassrooms"],
            connected_devices_online=stats["connectedDevices"]["online"],
            connected_devices_total=stats["connectedDevices"]["total"],
            monthly_attendance_growth=stats["monthlyAttendanceGrowth"],
            average_engagement=stats["averageEngagement"],
            pending_alerts=stats["pendingAlerts"],
            greeting=stats["greeting"],
            ai_summary=stats["aiSummary"],
            recent_events=recent_events_mapped,
            ai_models=models_mapped,
            timestamp=datetime.utcnow().isoformat()
        )

    def get_teacher_dashboard_summary(self, teacher_id: str) -> TeacherDashboardSummaryResponse:
        """Fetch dashboard details for a specific instructor."""
        raw_data = dashboard_repo.get_teacher_summary(teacher_id)

        classrooms_mapped = [
            TeacherClassroomSchema(
                id=c["id"],
                name=c["name"],
                subject=c["subject"],
                time="09:00 AM",  # Dummy slot
                status=c["status"],
                attendance_rate=c["average_engagement"] if c["current_attendance"] > 0 else 94.0
            ) for c in raw_data["classrooms"]
        ]

        schedule_mapped = [
            ScheduleItemSchema(**s) for s in raw_data["today_schedule"]
        ]

        stats_mapped = TeacherStatsSchema(**raw_data["stats"])

        events_mapped = [
            ActivityEventSchema(**e) for e in raw_data["recent_events"]
        ]

        return TeacherDashboardSummaryResponse(
            teacher_name=raw_data["teacher_name"],
            classrooms=classrooms_mapped,
            today_schedule=schedule_mapped,
            stats=stats_mapped,
            recent_events=events_mapped,
            timestamp=datetime.utcnow().isoformat()
        )

    def get_live_alerts_feed(self, active_only: bool = False) -> LiveAlertsResponse:
        """Return behavior anomaly alerts feed."""
        alerts = dashboard_repo.get_behavior_alerts(active_only)
        alerts_mapped = [
            BehaviorAlertSchema(
                id=a["id"],
                student_id=a["student_id"],
                student_name=a["student_name"],
                behavior_type=a["behavior_type"],
                severity=a["severity"],
                confidence=a["confidence"],
                status=a["status"],
                acknowledged_by=a.get("acknowledged_by"),
                created_at=a["created_at"]
            ) for a in alerts
        ]

        return LiveAlertsResponse(
            total=len(alerts_mapped),
            alerts=alerts_mapped,
            timestamp=datetime.utcnow().isoformat()
        )

    def get_attendance_overview(self) -> AttendanceOverviewResponse:
        """Fetch general student attendance metrics and trends."""
        raw = dashboard_repo.get_attendance_overview()
        return AttendanceOverviewResponse(
            weekly_trend=raw["weekly_trend"],
            department_comparison=raw["department_comparison"],
            distribution=raw["distribution"],
            monthly_trend=raw["monthly_trend"],
            late_arrivals=raw["late_arrivals"],
            absence_rate=raw["absence_rate"],
            timestamp=datetime.utcnow().isoformat()
        )

    def get_classroom_status_summary(self) -> ClassroomStatusResponse:
        """Compile status updates for all surveillance-enabled classrooms."""
        rooms = dashboard_repo.get_classroom_status()
        
        total_active = len([r for r in rooms if r["status"] == "ACTIVE"])
        total_idle = len([r for r in rooms if r["status"] == "IDLE"])
        total_offline = len([r for r in rooms if r["status"] == "OFFLINE"])

        rooms_mapped = [
            ClassroomStatusSchema(
                id=r["id"],
                name=r["name"],
                subject=r["subject"],
                teacher=r["teacher"],
                status=r["status"],
                current_attendance=r["current_attendance"],
                total_students=r["total_students"],
                average_engagement=r["average_engagement"],
                camera_status=r["camera_status"],
                fps=r["fps"]
            ) for r in rooms
        ]

        return ClassroomStatusResponse(
            total_active=total_active,
            total_idle=total_idle,
            total_offline=total_offline,
            classrooms=rooms_mapped,
            timestamp=datetime.utcnow().isoformat()
        )

    def get_student_risk_summary(self) -> StudentRiskResponse:
        """Identify students requiring counseling based on low engagement and alert triggers."""
        risks = dashboard_repo.get_student_risks()
        
        high_risk = []
        moderate_risk = []

        for r in risks:
            schema = StudentRiskSchema(**r)
            if r["risk_level"] == "HIGH":
                high_risk.append(schema)
            else:
                moderate_risk.append(schema)

        return StudentRiskResponse(
            high_risk_students=high_risk,
            moderate_risk_students=moderate_risk,
            total_high_risk=len(high_risk),
            total_moderate_risk=len(moderate_risk),
            timestamp=datetime.utcnow().isoformat()
        )

    def get_behavior_analytics_summary(self) -> BehaviorAnalyticsSummaryResponse:
        """Consolidate attention tracking statistics, anomalies, and student engagement graphs."""
        timeline = dashboard_repo.get_behavior_timeline()
        alerts = dashboard_repo.get_behavior_alerts()

        # Compute overview
        total_events = len(timeline)
        phone_count = len([e for e in timeline if e["behaviorType"] == "PHONE_USAGE"])
        attentive_count = len([e for e in timeline if e["behaviorType"] == "ATTENTIVE"])
        
        avg_engagement = 85.0
        attention_level = 89.2
        high_risk_count = 2

        overview = BehaviorOverviewSchema(
            averageEngagement=avg_engagement,
            phoneEvents=phone_count,
            attentionLevel=attention_level,
            highRiskStudents=high_risk_count
        )

        # Compute distributions
        dist_map = {}
        for e in timeline:
            dist_map[e["behaviorType"]] = dist_map.get(e["behaviorType"], 0) + 1
        
        distribution = [
            BehaviorDistSchema(type=k, count=v) for k, v in dist_map.items()
        ]

        # Trends
        engagement_trend = [
            TrendPointSchema(time=f"{str(h).zfill(2)}:00", score=round(75 + math.sin(h*0.5)*10 + (h%3)*2, 1))
            for h in range(8, 16)
        ]

        # Comparatives
        classroom_comparison = [
            ClassComparisonSchema(name="CSE Lab 301", engagement=88.5),
            ClassComparisonSchema(name="ECE Lab 202", engagement=84.2),
            ClassComparisonSchema(name="ME Workshop", engagement=78.0),
            ClassComparisonSchema(name="Physics Lecture Hall", engagement=80.1)
        ]

        # Rankings
        student_ranking = [
            StudentRankingSchema(studentId="CSE2026002", studentName="Siddharth Saxena", score=96.4),
            StudentRankingSchema(studentId="CSE2026004", studentName="Ananya Gupta", score=93.8),
            StudentRankingSchema(studentId="CSE2026006", studentName="Sneha Reddy", score=91.0),
            StudentRankingSchema(studentId="CSE2026001", studentName="Arjun Sharma", score=89.5),
            StudentRankingSchema(studentId="CSE2026008", studentName="Isha Desai", score=88.2),
            StudentRankingSchema(studentId="CSE2026003", studentName="Rohan Verma", score=87.0),
            StudentRankingSchema(studentId="CSE2026005", studentName="Vikram Singh", score=42.0),
            StudentRankingSchema(studentId="CSE2026015", studentName="Manish Bose", score=48.5)
        ]

        # Heatmaps
        attention_heatmap = [
            AttentionHeatmapRowSchema(period="08:00-09:00", monday=78, tuesday=82, wednesday=75, thursday=80, friday=72),
            AttentionHeatmapRowSchema(period="09:00-10:00", monday=88, tuesday=91, wednesday=85, thursday=90, friday=84),
            AttentionHeatmapRowSchema(period="10:00-11:00", monday=92, tuesday=88, wednesday=94, thursday=91, friday=86),
            AttentionHeatmapRowSchema(period="11:00-12:00", monday=85, tuesday=79, wednesday=82, thursday=76, friday=73),
            AttentionHeatmapRowSchema(period="12:00-13:00", monday=65, tuesday=62, wednesday=58, thursday=61, friday=55),
            AttentionHeatmapRowSchema(period="13:00-14:00", monday=72, tuesday=75, wednesday=70, thursday=74, friday=68),
        ]

        recent_alerts_mapped = [
            BehaviorAlertSchema(
                id=a["id"],
                student_id=a["student_id"],
                student_name=a["student_name"],
                behavior_type=a["behavior_type"],
                severity=a["severity"],
                confidence=a["confidence"],
                status=a["status"],
                acknowledged_by=a.get("acknowledged_by"),
                created_at=a["created_at"]
            ) for a in alerts
        ]

        timeline_mapped = [
            BehaviorEventSchema(
                id=e["id"],
                studentId=e["studentId"],
                studentName=e["studentName"],
                behaviorType=e["behaviorType"],
                confidence=e["confidence"],
                duration=e["duration"],
                timestamp=e["timestamp"],
                classroomId=e["classroomId"]
            ) for e in timeline
        ]

        return BehaviorAnalyticsSummaryResponse(
            overview=overview,
            engagement_trend=engagement_trend,
            behavior_distribution=distribution,
            classroom_comparison=classroom_comparison,
            student_ranking=student_ranking,
            attention_heatmap=attention_heatmap,
            recent_alerts=recent_alerts_mapped,
            top_events=timeline_mapped[:10],
            student_timeline=timeline_mapped,
            timestamp=datetime.utcnow().isoformat()
        )


# Singleton Instance
dashboard_service = DashboardService()
