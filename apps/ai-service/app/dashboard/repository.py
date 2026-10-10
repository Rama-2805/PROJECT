"""SmartCampus AI — Dashboard Data Repository.

Maintains mock telemetry data for development and dry-run demos,
and provides query frameworks ready for SQLAlchemy/PostgreSQL database connections.
"""

import time
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from sqlalchemy import func

# Try importing models, fallback to mock-only if models aren't fully matching
try:
    from app.models.student import Student
    from app.models.attendance import Attendance
    from app.models.face_profile import FaceProfile
    from app.models.unknown_face import UnknownFace
except ImportError:
    # Local imports fallback
    from ..models.student import Student
    from ..models.attendance import Attendance
    from ..models.face_profile import FaceProfile
    from ..models.unknown_face import UnknownFace


# --- Rich Static Mock Datasets ---

MOCK_STUDENTS = [
    {"id": "CSE2026001", "name": "Arjun Sharma", "dept": "Computer Science"},
    {"id": "CSE2026002", "name": "Siddharth Saxena", "dept": "Computer Science"},
    {"id": "CSE2026003", "name": "Rohan Verma", "dept": "Computer Science"},
    {"id": "CSE2026004", "name": "Ananya Gupta", "dept": "Computer Science"},
    {"id": "CSE2026005", "name": "Vikram Singh", "dept": "Computer Science"},
    {"id": "CSE2026006", "name": "Sneha Reddy", "dept": "Computer Science"},
    {"id": "CSE2026007", "name": "Karan Nair", "dept": "Computer Science"},
    {"id": "CSE2026008", "name": "Isha Desai", "dept": "Computer Science"},
    {"id": "CSE2026009", "name": "Rahul Mehta", "dept": "Computer Science"},
    {"id": "CSE2026010", "name": "Neha Joshi", "dept": "Computer Science"},
    {"id": "CSE2026011", "name": "Amit Kumar", "dept": "Computer Science"},
    {"id": "CSE2026012", "name": "Pooja Iyer", "dept": "Computer Science"},
    {"id": "CSE2026013", "name": "Priya Patel", "dept": "Computer Science"},
    {"id": "CSE2026014", "name": "Shreya Agarwal", "dept": "Computer Science"},
    {"id": "CSE2026015", "name": "Manish Bose", "dept": "Computer Science"},
]

MOCK_EVENTS = [
    {
        "id": "evt-001",
        "time": "09:05 AM",
        "type": "attendance",
        "severity": "info",
        "title": "42 students recognized",
        "description": "Classroom CSE-301",
        "timestamp": (datetime.now() - timedelta(hours=4)).isoformat()
    },
    {
        "id": "evt-002",
        "time": "09:12 AM",
        "type": "alert",
        "severity": "warning",
        "title": "Phone detected",
        "description": "Student ID: CSE2026005 (Vikram Singh)",
        "timestamp": (datetime.now() - timedelta(hours=3, minutes=50)).isoformat()
    },
    {
        "id": "evt-003",
        "time": "09:30 AM",
        "type": "attendance",
        "severity": "info",
        "title": "Attendance report generated",
        "description": "CSE-301 • 45/50 present",
        "timestamp": (datetime.now() - timedelta(hours=3, minutes=30)).isoformat()
    },
    {
        "id": "evt-004",
        "time": "10:00 AM",
        "type": "device",
        "severity": "warning",
        "title": "Device CAMERA_12 offline",
        "description": "Lab 3 • Attempting reconnection",
        "timestamp": (datetime.now() - timedelta(hours=3)).isoformat()
    },
    {
        "id": "evt-005",
        "time": "10:15 AM",
        "type": "system",
        "severity": "info",
        "title": "New AI model available",
        "description": "Face Recognition v2.1 ready for deployment",
        "timestamp": (datetime.now() - timedelta(hours=2, minutes=45)).isoformat()
    },
    {
        "id": "evt-006",
        "time": "10:30 AM",
        "type": "alert",
        "severity": "critical",
        "title": "Recognition accuracy dropped",
        "description": "Camera_08 • Threshold: 92%",
        "timestamp": (datetime.now() - timedelta(hours=2, minutes=30)).isoformat()
    }
]

MOCK_AI_MODELS = [
    {"name": "Face Recognition", "status": "online", "accuracy": 99.2},
    {"name": "Behavior Analysis", "status": "online", "accuracy": 94.7},
    {"name": "Edge Processing", "status": "online", "accuracy": 98.1},
    {"name": "Cloud Sync", "status": "online", "accuracy": 100.0}
]

MOCK_ALERTS = [
    {
        "id": "ALERT_001",
        "student_id": "CSE2026005",
        "student_name": "Vikram Singh",
        "behavior_type": "PHONE_USAGE",
        "severity": "WARNING",
        "confidence": 0.94,
        "status": "ACTIVE",
        "created_at": (datetime.now() - timedelta(minutes=5)).isoformat()
    },
    {
        "id": "ALERT_002",
        "student_id": "CSE2026011",
        "student_name": "Amit Kumar",
        "behavior_type": "SLEEPING",
        "severity": "WARNING",
        "confidence": 0.88,
        "status": "ACTIVE",
        "created_at": (datetime.now() - timedelta(minutes=10)).isoformat()
    },
    {
        "id": "ALERT_003",
        "student_id": "CSE2026009",
        "student_name": "Rahul Mehta",
        "behavior_type": "DISTRACTED",
        "severity": "INFO",
        "confidence": 0.79,
        "status": "ACTIVE",
        "created_at": (datetime.now() - timedelta(minutes=15)).isoformat()
    },
    {
        "id": "ALERT_004",
        "student_id": "CSE2026015",
        "student_name": "Manish Bose",
        "behavior_type": "PHONE_USAGE",
        "severity": "CRITICAL",
        "confidence": 0.96,
        "status": "ACTIVE",
        "created_at": (datetime.now() - timedelta(minutes=20)).isoformat()
    },
    {
        "id": "ALERT_005",
        "student_id": "CSE2026007",
        "student_name": "Karan Nair",
        "behavior_type": "DISTRACTED",
        "severity": "INFO",
        "confidence": 0.72,
        "status": "ACKNOWLEDGED",
        "created_at": (datetime.now() - timedelta(minutes=30)).isoformat()
    }
]

MOCK_CLASSROOMS = [
    {
        "id": "room-023",
        "name": "CSE LAB 301",
        "subject": "Data Structures & Algorithms",
        "teacher": "Dr. Rajesh Kumar",
        "status": "ACTIVE",
        "current_attendance": 45,
        "total_students": 50,
        "average_engagement": 88.5,
        "camera_status": "ONLINE",
        "fps": 29.4
    },
    {
        "id": "room-104",
        "name": "ECE LAB 202",
        "subject": "Embedded Systems Design",
        "teacher": "Prof. Sneha Reddy",
        "status": "ACTIVE",
        "current_attendance": 38,
        "total_students": 42,
        "average_engagement": 84.2,
        "camera_status": "ONLINE",
        "fps": 28.1
    },
    {
        "id": "room-007",
        "name": "ME WORKSHOP",
        "subject": "Thermodynamics Practicals",
        "teacher": "Dr. Arjun Sharma",
        "status": "IDLE",
        "current_attendance": 0,
        "total_students": 30,
        "average_engagement": 0.0,
        "camera_status": "ONLINE",
        "fps": 30.0
    },
    {
        "id": "room-312",
        "name": "PHYSICS LECTURE HALL",
        "subject": "Quantum Mechanics Intro",
        "teacher": "Dr. H. C. Verma",
        "status": "OFFLINE",
        "current_attendance": 0,
        "total_students": 60,
        "average_engagement": 0.0,
        "camera_status": "OFFLINE",
        "fps": 0.0
    }
]


class DashboardRepository:
    """Repository Layer for Dashboard Data.

    Returns rich mock data by default and is setup to query PostgreSQL via SQLAlchemy.
    """

    def get_admin_stats(self, db: Optional[Session] = None) -> Dict[str, Any]:
        """Fetch general stats for the admin overview."""
        # 1. PostgreSQL DB fallback query checks
        if db:
            try:
                db_students_count = db.query(Student).count()
                if db_students_count > 0:
                    # Calculate attendance rates from DB
                    today_str = datetime.now().strftime("%Y-%m-%d")
                    db_present_count = db.query(Attendance.student_id).filter(Attendance.date == today_str).distinct().count()
                    db_avg_accuracy = db.query(func.avg(FaceProfile.accuracy_estimate)).filter(FaceProfile.is_active == True).scalar()
                    db_unknown_count = db.query(func.count(UnknownFace.id)).scalar()

                    return {
                        "totalStudents": db_students_count,
                        "attendanceToday": round((db_present_count / db_students_count * 100.0) if db_students_count > 0 else 96.8, 1),
                        "aiRecognitionAccuracy": round(float(db_avg_accuracy) if db_avg_accuracy else 99.2, 1),
                        "activeClassrooms": 4,
                        "connectedDevices": {"online": 8, "total": 8},
                        "monthlyAttendanceGrowth": 4.8,
                        "averageEngagement": 89.0,
                        "pendingAlerts": db_unknown_count,
                        "greeting": "Welcome back, System Administrator",
                        "aiSummary": "Live database telemetry active. Face spaces synchronized."
                    }
            except Exception as e:
                # Log error and fallback to static mock
                pass

        # Return static mock if DB is not used or unpopulated
        return {
            "totalStudents": 130,
            "attendanceToday": 93.1,
            "aiRecognitionAccuracy": 99.2,
            "activeClassrooms": 4,
            "connectedDevices": {"online": 6, "total": 6},
            "monthlyAttendanceGrowth": 4.8,
            "averageEngagement": 89.0,
            "pendingAlerts": 0,
            "greeting": "Welcome back, System Admin",
            "aiSummary": "Vemana IT SmartCampus operating normally. All 6 edge nodes streaming live."
        }

    def get_recent_events(self) -> List[Dict[str, Any]]:
        """Fetch recent system and telemetry events."""
        return MOCK_EVENTS

    def get_ai_models_status(self) -> List[Dict[str, Any]]:
        """Fetch status and accuracy estimates for core AI models."""
        return MOCK_AI_MODELS

    def get_teacher_summary(self, teacher_id: str) -> Dict[str, Any]:
        """Fetch classes, schedule, stats and events for a specific teacher."""
        # Simulated lookup by ID
        teacher_name = "Dr. Rajesh Kumar" if "301" in teacher_id or "kumar" in teacher_id.lower() else "Prof. Sneha Reddy"
        
        # Select classrooms managed by this teacher
        teacher_rooms = [r for r in MOCK_CLASSROOMS if r["teacher"] == teacher_name]
        if not teacher_rooms:
            teacher_rooms = [MOCK_CLASSROOMS[0]]

        # Construct Schedule
        today_schedule = [
            {"id": "SCH_001", "subject": "Data Structures", "classroom": "CSE LAB 301", "time": "09:00 AM - 10:30 AM", "status": "COMPLETED"},
            {"id": "SCH_002", "subject": "Design & Analysis of Algorithms", "classroom": "CSE LAB 301", "time": "11:00 AM - 12:30 PM", "status": "ACTIVE"},
            {"id": "SCH_003", "subject": "Problem Solving with C++", "classroom": "ROOM 104", "time": "02:00 PM - 03:30 PM", "status": "UPCOMING"}
        ]

        # Calculate Teacher specific KPIs
        stats = {
            "avg_attendance": 95.4,
            "total_classes_conducted": 48,
            "active_alerts_count": len([a for a in MOCK_ALERTS if a["status"] == "ACTIVE" and a["severity"] in ["WARNING", "CRITICAL"]]),
            "avg_engagement_rate": 88.5
        }

        # Filter events for this teacher's rooms
        teacher_events = [e for e in MOCK_EVENTS if "CSE-301" in e["description"]]

        return {
            "teacher_name": teacher_name,
            "classrooms": teacher_rooms,
            "today_schedule": today_schedule,
            "stats": stats,
            "recent_events": teacher_events
        }

    def get_behavior_alerts(self, active_only: bool = False) -> List[Dict[str, Any]]:
        """Fetch recent behavior alerts."""
        if active_only:
            return [a for a in MOCK_ALERTS if a["status"] == "ACTIVE"]
        return MOCK_ALERTS

    def get_attendance_analytics(self) -> Dict[str, Any]:
        """Fetch weekly/monthly attendance trends and distributions."""
        weekly_trend = [
            {"day": "Mon", "rate": 94.2},
            {"day": "Tue", "rate": 96.8},
            {"day": "Wed", "rate": 95.1},
            {"day": "Thu", "rate": 97.3},
            {"day": "Fri", "rate": 93.5},
            {"day": "Sat", "rate": 89.2},
        ]
        department_comparison = [
            {"name": "CSE", "rate": 96.8},
            {"name": "ECE", "rate": 94.5},
            {"name": "ME", "rate": 92.1},
            {"name": "CE", "rate": 93.4},
            {"name": "EEE", "rate": 91.8},
            {"name": "BT", "rate": 95.7},
        ]
        distribution = [
            {"label": "Above 90%", "value": 65, "color": "#10B981"},
            {"label": "75-90%", "value": 22, "color": "#F59E0B"},
            {"label": "60-75%", "value": 8, "color": "#F97316"},
            {"label": "Below 60%", "value": 5, "color": "#EF4444"},
        ]
        monthly_trend = [
            {"month": "Jan", "rate": 91.2},
            {"month": "Feb", "rate": 93.4},
            {"month": "Mar", "rate": 95.1},
            {"month": "Apr", "rate": 92.8},
            {"month": "May", "rate": 94.6},
            {"month": "Jun", "rate": 96.8},
            {"month": "Jul", "rate": 89.5},
            {"month": "Aug", "rate": 90.2},
            {"month": "Sep", "rate": 92.4},
            {"month": "Oct", "rate": 94.7},
            {"month": "Nov", "rate": 95.2},
            {"month": "Dec", "rate": 93.9},
        ]
        return {
            "weekly_trend": weekly_trend,
            "department_comparison": department_comparison,
            "distribution": distribution,
            "monthly_trend": monthly_trend,
            "late_arrivals": 4,
            "absence_rate": 3.2
        }

    def get_classroom_status(self) -> List[Dict[str, Any]]:
        """Fetch statuses of active, idle, and offline classrooms."""
        return MOCK_CLASSROOMS

    def get_student_risks(self) -> List[Dict[str, Any]]:
        """Fetch students categorized with risk factors from behavioral analysis."""
        return [
            {
                "student_id": "CSE2026005",
                "student_name": "Vikram Singh",
                "engagement_score": 42.0,
                "attendance_rate": 88.5,
                "phone_events_count": 8,
                "sleeping_events_count": 3,
                "risk_level": "HIGH",
                "warning_trigger": "High phone usage events + engagement drop below 50%."
            },
            {
                "student_id": "CSE2026015",
                "student_name": "Manish Bose",
                "engagement_score": 48.5,
                "attendance_rate": 91.2,
                "phone_events_count": 12,
                "sleeping_events_count": 0,
                "risk_level": "HIGH",
                "warning_trigger": "Excessive phone usage alert. Critical event detected."
            },
            {
                "student_id": "CSE2026011",
                "student_name": "Amit Kumar",
                "engagement_score": 55.0,
                "attendance_rate": 82.0,
                "phone_events_count": 1,
                "sleeping_events_count": 6,
                "risk_level": "MODERATE",
                "warning_trigger": "Frequent sleeping alerts (6 episodes recorded)."
            },
            {
                "student_id": "CSE2026009",
                "student_name": "Rahul Mehta",
                "engagement_score": 62.4,
                "attendance_rate": 78.4,
                "phone_events_count": 2,
                "sleeping_events_count": 1,
                "risk_level": "MODERATE",
                "warning_trigger": "Absence rate exceeding threshold (attendance 78.4%)."
            }
        ]

    def get_behavior_timeline(self) -> List[Dict[str, Any]]:
        """Generates timeline events matching behavioral classification logs."""
        events = []
        base_time = datetime.now() - timedelta(hours=2)
        for i in range(25):
            student = MOCK_STUDENTS[i % len(MOCK_STUDENTS)]
            # Weighted behaviors
            behaviors = ["ATTENTIVE", "ATTENTIVE", "ATTENTIVE", "DISTRACTED", "PHONE_USAGE", "SLEEPING", "ABSENT_FROM_SEAT"]
            b_type = behaviors[i % len(behaviors)]
            conf = round(0.75 + (i % 5) * 0.05, 2)
            events.append({
                "id": f"BEH_{str(i+1).zfill(3)}",
                "studentId": student["id"],
                "studentName": student["name"],
                "behaviorType": b_type,
                "confidence": conf,
                "duration": 60 * (i % 6 + 1) + (i % 45),
                "timestamp": (base_time + timedelta(minutes=i*5)).isoformat(),
                "classroomId": "room-023"
            })
        return sorted(events, key=lambda x: x["timestamp"], reverse=True)


# Singleton Instance
dashboard_repo = DashboardRepository()
