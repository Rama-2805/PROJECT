# ─── SmartCampus AI — AI Decision Engine ─────────────
# Part 11: Risk scoring, recommendations, and predictions
# for students, classrooms, and devices.

from __future__ import annotations
from dataclasses import dataclass, field
from typing import Any, Optional
from datetime import datetime
import random

from .mock_data import STUDENTS, BUILDINGS, DEVICES, COURSES, ATTENDANCE_RECORDS


@dataclass
class RiskAssessment:
    entity_type: str  # student, classroom, device
    entity_id: str
    entity_name: str
    risk_score: float  # 0-100
    risk_level: str  # low, medium, high, critical
    factors: list[dict] = field(default_factory=list)
    recommendation: str = ""
    confidence: float = 0.0
    timestamp: str = field(default_factory=lambda: datetime.now().isoformat())

    def to_dict(self) -> dict:
        return {
            "entity_type": self.entity_type,
            "entity_id": self.entity_id,
            "entity_name": self.entity_name,
            "risk_score": self.risk_score,
            "risk_level": self.risk_level,
            "factors": self.factors,
            "recommendation": self.recommendation,
            "confidence": self.confidence,
            "timestamp": self.timestamp,
        }


class DecisionEngine:
    """AI Decision Engine that assesses risk and generates recommendations."""

    def assess_student_risk(self, student_id: str) -> RiskAssessment:
        """Assess risk for a specific student."""
        student = next((s for s in STUDENTS if s["id"] == student_id), None)
        if not student:
            return RiskAssessment(
                entity_type="student", entity_id=student_id, entity_name="Unknown",
                risk_score=0, risk_level="unknown", recommendation="Student not found.",
            )

        factors = []
        risk_score = 0

        # Attendance risk
        if student["attendance"] < 60:
            risk_score += 40
            factors.append({"name": "Attendance", "severity": "critical", "value": student["attendance"], "threshold": 60})
        elif student["attendance"] < 75:
            risk_score += 25
            factors.append({"name": "Attendance", "severity": "high", "value": student["attendance"], "threshold": 75})
        elif student["attendance"] < 85:
            risk_score += 10
            factors.append({"name": "Attendance", "severity": "medium", "value": student["attendance"], "threshold": 85})
        else:
            factors.append({"name": "Attendance", "severity": "low", "value": student["attendance"], "threshold": 85})

        # Engagement risk
        if student["engagement"] < 50:
            risk_score += 35
            factors.append({"name": "Engagement", "severity": "critical", "value": student["engagement"], "threshold": 50})
        elif student["engagement"] < 65:
            risk_score += 20
            factors.append({"name": "Engagement", "severity": "high", "value": student["engagement"], "threshold": 65})
        elif student["engagement"] < 80:
            risk_score += 8
            factors.append({"name": "Engagement", "severity": "medium", "value": student["engagement"], "threshold": 80})
        else:
            factors.append({"name": "Engagement", "severity": "low", "value": student["engagement"], "threshold": 80})

        # Attendance trend (last 7 days)
        records = ATTENDANCE_RECORDS.get(student_id, [])
        recent = records[:7]
        if recent:
            recent_present = sum(1 for r in recent if r["present"])
            recent_pct = (recent_present / len(recent)) * 100
            if recent_pct < 60:
                risk_score += 15
                factors.append({"name": "Recent Trend", "severity": "high", "value": round(recent_pct), "threshold": 60})
            elif recent_pct < 80:
                risk_score += 5
                factors.append({"name": "Recent Trend", "severity": "medium", "value": round(recent_pct), "threshold": 80})

        # Semester factor (early semester students often need more support)
        if student["semester"] <= 2:
            risk_score += 5
            factors.append({"name": "Semester", "severity": "low", "value": student["semester"], "threshold": 2})

        risk_score = min(risk_score, 100)
        risk_level = self._score_to_level(risk_score)
        recommendation = self._student_recommendation(risk_level, student)

        return RiskAssessment(
            entity_type="student",
            entity_id=student_id,
            entity_name=student["name"],
            risk_score=risk_score,
            risk_level=risk_level,
            factors=factors,
            recommendation=recommendation,
            confidence=0.88,
        )

    def assess_classroom_risk(self, building_name: str) -> RiskAssessment:
        """Assess risk for a classroom/building."""
        building = BUILDINGS.get(building_name)
        if not building:
            return RiskAssessment(
                entity_type="classroom", entity_id=building_name, entity_name=building_name,
                risk_score=0, risk_level="unknown", recommendation="Building not found.",
            )

        factors = []
        risk_score = 0
        utilization = (building["current_occupancy"] / building["total_capacity"]) * 100 if building["total_capacity"] > 0 else 0

        # Overcrowding risk
        if utilization > 95:
            risk_score += 40
            factors.append({"name": "Overcrowding", "severity": "critical", "value": round(utilization), "threshold": 95})
        elif utilization > 85:
            risk_score += 25
            factors.append({"name": "Overcrowding", "severity": "high", "value": round(utilization), "threshold": 85})
        elif utilization > 70:
            risk_score += 10
            factors.append({"name": "Overcrowding", "severity": "medium", "value": round(utilization), "threshold": 70})
        else:
            factors.append({"name": "Overcrowding", "severity": "low", "value": round(utilization), "threshold": 70})

        # Active class load
        if building["classrooms"] > 0:
            class_utilization = (building["active_classes"] / building["classrooms"]) * 100
            if class_utilization > 90:
                risk_score += 20
                factors.append({"name": "Class Load", "severity": "high", "value": round(class_utilization), "threshold": 90})
            elif class_utilization > 75:
                risk_score += 10
                factors.append({"name": "Class Load", "severity": "medium", "value": round(class_utilization), "threshold": 75})

        risk_score = min(risk_score, 100)
        risk_level = self._score_to_level(risk_score)
        recommendation = self._classroom_recommendation(risk_level, building_name, utilization)

        return RiskAssessment(
            entity_type="classroom",
            entity_id=building_name,
            entity_name=building_name,
            risk_score=risk_score,
            risk_level=risk_level,
            factors=factors,
            recommendation=recommendation,
            confidence=0.85,
        )

    def assess_device_risk(self, device_id: str) -> RiskAssessment:
        """Assess risk for a device."""
        device = next((d for d in DEVICES if d["id"] == device_id), None)
        if not device:
            return RiskAssessment(
                entity_type="device", entity_id=device_id, entity_name=device_id,
                risk_score=0, risk_level="unknown", recommendation="Device not found.",
            )

        factors = []
        risk_score = 0

        # Status-based risk
        if device["status"] == "offline":
            risk_score += 50
            factors.append({"name": "Status", "severity": "critical", "value": "offline", "threshold": "online"})
        elif device["status"] == "warning":
            risk_score += 30
            factors.append({"name": "Status", "severity": "high", "value": "warning", "threshold": "online"})

        # Temperature risk
        if device["temp"] > 70:
            risk_score += 25
            factors.append({"name": "Temperature", "severity": "critical", "value": device["temp"], "threshold": 70})
        elif device["temp"] > 55:
            risk_score += 15
            factors.append({"name": "Temperature", "severity": "high", "value": device["temp"], "threshold": 55})

        # CPU risk
        if device["cpu"] > 85:
            risk_score += 20
            factors.append({"name": "CPU Usage", "severity": "high", "value": device["cpu"], "threshold": 85})
        elif device["cpu"] > 70:
            risk_score += 10
            factors.append({"name": "CPU Usage", "severity": "medium", "value": device["cpu"], "threshold": 70})

        # Uptime risk
        if device["uptime"] < 60:
            risk_score += 15
            factors.append({"name": "Uptime", "severity": "high", "value": device["uptime"], "threshold": 60})
        elif device["uptime"] < 80:
            risk_score += 5
            factors.append({"name": "Uptime", "severity": "medium", "value": device["uptime"], "threshold": 80})

        risk_score = min(risk_score, 100)
        risk_level = self._score_to_level(risk_score)
        recommendation = self._device_recommendation(risk_level, device)

        return RiskAssessment(
            entity_type="device",
            entity_id=device_id,
            entity_name=device["name"],
            risk_score=risk_score,
            risk_level=risk_level,
            factors=factors,
            recommendation=recommendation,
            confidence=0.9,
        )

    def assess_all_students(self) -> list[RiskAssessment]:
        """Assess risk for all students."""
        return [self.assess_student_risk(s["id"]) for s in STUDENTS]

    def assess_all_devices(self) -> list[RiskAssessment]:
        """Assess risk for all devices."""
        return [self.assess_device_risk(d["id"]) for d in DEVICES]

    def get_high_risk_entities(self, threshold: float = 70.0) -> dict:
        """Get all high-risk entities across categories."""
        return {
            "students": [a for a in self.assess_all_students() if a.risk_score >= threshold],
            "devices": [a for a in self.assess_all_devices() if a.risk_score >= threshold],
            "classrooms": [
                self.assess_classroom_risk(b)
                for b in BUILDINGS
                if self.assess_classroom_risk(b).risk_score >= threshold
            ],
        }

    def _score_to_level(self, score: float) -> str:
        if score >= 85:
            return "critical"
        elif score >= 65:
            return "high"
        elif score >= 40:
            return "medium"
        else:
            return "low"

    def _student_recommendation(self, level: str, student: dict) -> str:
        recs = {
            "critical": f"URGENT: Schedule immediate counselor meeting for {student['name']}. "
                        f"Attendance ({student['attendance']}%) and engagement ({student['engagement']}%) critically low.",
            "high": f"Schedule intervention for {student['name']}. "
                    f"Attendance at {student['attendance']}% needs improvement. Consider mentoring program.",
            "medium": f"Monitor {student['name']} closely. Current metrics indicate potential risk developing. "
                      f"Recommended: Weekly check-in with academic advisor.",
            "low": f"{student['name']} is performing well. Continue current support structure.",
        }
        return recs.get(level, "No action required at this time.")

    def _classroom_recommendation(self, level: str, building: str, utilization: float) -> str:
        recs = {
            "critical": f"URGENT: {building} is critically overloaded ({utilization:.0f}%). "
                        f"Immediately redistribute classes to underutilized buildings.",
            "high": f"{building} is nearing capacity ({utilization:.0f}%). "
                    f"Consider AI-optimized rescheduling to balance load.",
            "medium": f"{building} has moderate utilization ({utilization:.0f}%). "
                      f"Continue monitoring during peak hours.",
            "low": f"{building} is optimally utilized ({utilization:.0f}%). No action needed.",
        }
        return recs.get(level, "No action required.")

    def _device_recommendation(self, level: str, device: dict) -> str:
        recs = {
            "critical": f"URGENT: Replace {device['name']} immediately. "
                        f"Device is {device['status']} with temperature {device['temp']}°C.",
            "high": f"Schedule maintenance for {device['name']} within 48 hours. "
                    f"Device metrics indicate impending failure risk.",
            "medium": f"Monitor {device['name']} closely. Schedule firmware check within the week.",
            "low": f"{device['name']} operating normally. Regular maintenance schedule sufficient.",
        }
        return recs.get(level, "No action required.")
