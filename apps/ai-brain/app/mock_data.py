# ─── SmartCampus AI — Mock University Knowledge Base ──
# All data is simulated for ₹0 budget demo mode.

from datetime import datetime, timedelta
import random

# ─── Students ────────────────────────────
STUDENTS = [
    {"id": "STU001", "name": "Arjun Sharma", "department": "CSE", "semester": 3, "attendance": 82, "engagement": 78, "email": "arjun.s@campus.edu"},
    {"id": "STU002", "name": "Priya Patel", "department": "CSE", "semester": 5, "attendance": 95, "engagement": 92, "email": "priya.p@campus.edu"},
    {"id": "STU003", "name": "Rahul Verma", "department": "ECE", "semester": 3, "attendance": 68, "engagement": 55, "email": "rahul.v@campus.edu"},
    {"id": "STU004", "name": "Sneha Reddy", "department": "MECH", "semester": 5, "attendance": 74, "engagement": 65, "email": "sneha.r@campus.edu"},
    {"id": "STU005", "name": "Vikram Singh", "department": "CSE", "semester": 1, "attendance": 88, "engagement": 85, "email": "vikram.s@campus.edu"},
    {"id": "STU006", "name": "Ananya Gupta", "department": "ECE", "semester": 5, "attendance": 91, "engagement": 88, "email": "ananya.g@campus.edu"},
    {"id": "STU007", "name": "Rohit Kumar", "department": "MECH", "semester": 3, "attendance": 45, "engagement": 40, "email": "rohit.k@campus.edu"},
    {"id": "STU008", "name": "Divya Nair", "department": "CSE", "semester": 7, "attendance": 97, "engagement": 95, "email": "divya.n@campus.edu"},
]

# ─── Courses ─────────────────────────────
COURSES = [
    {"code": "CSE201", "name": "Data Structures", "department": "CSE", "credits": 4, "teacher": "Dr. Sharma"},
    {"code": "CSE301", "name": "Algorithms", "department": "CSE", "credits": 4, "teacher": "Dr. Gupta"},
    {"code": "ECE201", "name": "Digital Electronics", "department": "ECE", "credits": 3, "teacher": "Prof. Mehta"},
    {"code": "MECH101", "name": "Engineering Mechanics", "department": "MECH", "credits": 3, "teacher": "Dr. Singh"},
    {"code": "CSE101", "name": "Programming Fundamentals", "department": "CSE", "credits": 4, "teacher": "Dr. Sharma"},
]

# ─── Timetable ───────────────────────────
TIMETABLE = [
    {"course": "CSE201", "day": "Monday", "time": "09:00-10:30", "room": "CSE-101", "teacher": "Dr. Sharma"},
    {"course": "CSE301", "day": "Monday", "time": "11:00-12:30", "room": "CSE-201", "teacher": "Dr. Gupta"},
    {"course": "ECE201", "day": "Tuesday", "time": "09:00-10:30", "room": "ECE-101", "teacher": "Prof. Mehta"},
    {"course": "CSE201", "day": "Wednesday", "time": "09:00-10:30", "room": "CSE-101", "teacher": "Dr. Sharma"},
    {"course": "MECH101", "day": "Thursday", "time": "14:00-15:30", "room": "MECH-101", "teacher": "Dr. Singh"},
    {"course": "CSE101", "day": "Friday", "time": "09:00-10:30", "room": "CSE-101", "teacher": "Dr. Sharma"},
]

# ─── Attendance Records (past 30 days) ───
ATTENDANCE_RECORDS = {}
for student in STUDENTS:
    records = []
    for day in range(30):
        date = (datetime.now() - timedelta(days=day)).strftime("%Y-%m-%d")
        present = random.random() < (student["attendance"] / 100)
        records.append({"date": date, "present": present, "course": random.choice(COURSES)["code"]})
    ATTENDANCE_RECORDS[student["id"]] = records

# ─── Devices ─────────────────────────────
DEVICES = [
    {"id": "CAM-101", "name": "Camera CSE-101", "type": "camera", "status": "online", "cpu": 45, "temp": 42, "uptime": 95},
    {"id": "CAM-201", "name": "Camera ECE-201", "type": "camera", "status": "warning", "cpu": 72, "temp": 65, "uptime": 88},
    {"id": "JSN-001", "name": "Edge AI CSE-101", "type": "edge_ai", "status": "online", "cpu": 78, "temp": 58, "uptime": 97},
    {"id": "JSN-003", "name": "Edge AI LAB-302", "type": "edge_ai", "status": "offline", "cpu": 0, "temp": 28, "uptime": 45},
    {"id": "SENS-001", "name": "Temp Sensor Library", "type": "sensor", "status": "online", "cpu": 12, "temp": 32, "uptime": 99},
    {"id": "SENS-008", "name": "Air Quality Lab", "type": "sensor", "status": "warning", "cpu": 25, "temp": 48, "uptime": 78},
]

# ─── Buildings / Classrooms ──────────────
BUILDINGS = {
    "CSE Block": {"total_capacity": 1200, "current_occupancy": 980, "classrooms": 20, "active_classes": 18},
    "ECE Block": {"total_capacity": 800, "current_occupancy": 750, "classrooms": 18, "active_classes": 15},
    "MECH Block": {"total_capacity": 500, "current_occupancy": 420, "classrooms": 12, "active_classes": 8},
    "Library": {"total_capacity": 600, "current_occupancy": 890, "classrooms": 0, "active_classes": 0},
    "Admin": {"total_capacity": 200, "current_occupancy": 120, "classrooms": 0, "active_classes": 0},
}

# ─── Engagement Data ─────────────────────
ENGAGEMENT_PATTERNS = {
    "time_based": {
        "09:00-10:00": 85,
        "10:00-11:00": 88,
        "11:00-12:00": 82,
        "12:00-13:00": 65,
        "13:00-14:00": 55,
        "14:00-15:00": 60,
        "15:00-16:00": 58,
        "16:00-17:00": 45,
    },
}

# ─── Knowledge Articles (for RAG) ────────
KNOWLEDGE_ARTICLES = [
    {"id": "k1", "title": "University Attendance Policy", "content": "Students must maintain a minimum of 75% attendance in each course to be eligible for examinations. Attendance below 60% may result in academic probation.", "category": "policy"},
    {"id": "k2", "title": "CSE Department Academic Calendar", "content": "Fall semester: Sept-Jan. Spring semester: Feb-June. Mid-term exams in Oct & Mar. Final exams in Dec & May.", "category": "academic"},
    {"id": "k3", "title": "Campus Security Guidelines", "content": "All visitors must register at the security desk. Students must carry ID cards. AI cameras monitor all entry points.", "category": "security"},
    {"id": "k4", "title": "Device Maintenance Protocol", "content": "Edge AI devices require firmware updates every 30 days. Cameras need calibration every 60 days. Temperature above 70°C triggers immediate maintenance.", "category": "technical"},
    {"id": "k5", "title": "Student Engagement Guidelines", "content": "Engagement scores below 50% trigger intervention. Recommended actions: personalized mentoring, study groups, interactive sessions.", "category": "academic"},
    {"id": "k6", "title": "Classroom Allocation Policy", "content": "Priority given to courses with >30 students. Labs must be scheduled in specialty rooms. Smart allocation uses AI optimization.", "category": "operations"},
    {"id": "k7", "title": "Emergency Response Plan", "content": "Fire: evacuate via nearest exit. Medical: call campus health center. Security threat: lock down classrooms, alert security AI.", "category": "security"},
    {"id": "k8", "title": "AI Ethics Guidelines", "content": "AI recommendations are advisory only. No automated punitive actions. Human approval required for critical decisions affecting student records.", "category": "policy"},
]
