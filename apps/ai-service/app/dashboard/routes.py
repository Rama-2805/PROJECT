"""SmartCampus AI — Dashboard API Router.

FastAPI endpoints exposing summaries for Admin, Teacher, Live Alerts Feed,
Attendance Overview, Classroom Status, Student Risk, and Behavior Analytics.
"""

import logging
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import Optional

from ..config.settings import settings
from ..config.database import get_db
from .services import dashboard_service
from .schemas import (
    AdminDashboardSummaryResponse,
    TeacherDashboardSummaryResponse,
    LiveAlertsResponse,
    AttendanceOverviewResponse,
    ClassroomStatusResponse,
    StudentRiskResponse,
    BehaviorAnalyticsSummaryResponse
)

logger = logging.getLogger("smartcampus.dashboard_api")

router = APIRouter(prefix=f"{settings.api_prefix}/dashboard", tags=["Dashboard Telemetry"])


@router.get("/admin", response_model=AdminDashboardSummaryResponse)
def get_admin_dashboard_summary(db: Session = Depends(get_db)):
    """Retrieve summarized telemetry metrics and recent activity feeds for the Admin Dashboard."""
    logger.info("Admin dashboard summary requested")
    # Passes db session to repository to check if live DB records exist
    return dashboard_service.get_admin_dashboard_summary(db)


@router.get("/teacher/{teacher_id}", response_model=TeacherDashboardSummaryResponse)
def get_teacher_dashboard_summary(teacher_id: str):
    """Retrieve schedule, classroom metrics, and alerts for a specific Teacher's Dashboard."""
    logger.info(f"Teacher dashboard summary requested for ID: {teacher_id}")
    return dashboard_service.get_teacher_dashboard_summary(teacher_id)


@router.get("/alerts", response_model=LiveAlertsResponse)
def get_live_alerts_feed(active_only: bool = Query(False, description="Filter for ACTIVE alerts only")):
    """Retrieve live feed of behavior anomalies and classroom alerts."""
    logger.info(f"Live alerts feed requested. Active only: {active_only}")
    return dashboard_service.get_live_alerts_feed(active_only)


@router.get("/attendance-overview", response_model=AttendanceOverviewResponse)
def get_attendance_overview():
    """Retrieve overall system attendance rates, department comparisons, and monthly growth trends."""
    logger.info("Attendance overview trends requested")
    return dashboard_service.get_attendance_overview()


@router.get("/classroom-status", response_model=ClassroomStatusResponse)
def get_classroom_status():
    """Retrieve cameras status, fps, current session subject, and online state of all classrooms."""
    logger.info("Classroom surveillance node statuses requested")
    return dashboard_service.get_classroom_status_summary()


@router.get("/student-risk", response_model=StudentRiskResponse)
def get_student_risk_summary():
    """Retrieve counseling risks summary detailing students with critical engagement scores or behavioral alerts."""
    logger.info("Student risk index requested")
    return dashboard_service.get_student_risk_summary()


@router.get("/behavior-analytics", response_model=BehaviorAnalyticsSummaryResponse)
def get_behavior_analytics_summary():
    """Retrieve detailed behavioral distributions, attention heatmaps, and timelines for class diagnostics."""
    logger.info("Behavior analytics overview graphs requested")
    return dashboard_service.get_behavior_analytics_summary()
