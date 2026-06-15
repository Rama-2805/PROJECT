# ─── SmartCampus AI — Autonomous Security System ────
# Part 5: AI-powered campus security with smart cameras,
# security robots, intrusion detection, and human-centered control.

from __future__ import annotations
from dataclasses import dataclass, field
from typing import Optional
from datetime import datetime
import random


@dataclass
class SecurityAlert:
    alert_id: str
    alert_type: str  # intrusion, unauthorized_access, emergency, suspicious, fire
    severity: str  # low, medium, high, critical
    location: str
    description: str
    camera_id: str = ""
    detected_by: str = ""  # camera, robot, sensor
    timestamp: str = field(default_factory=lambda: datetime.now().isoformat())
    status: str = "active"  # active, investigating, resolved
    requires_human: bool = True  # Critical decisions under human control
    resolution: str = ""

    def to_dict(self) -> dict:
        return {
            "alert_id": self.alert_id,
            "alert_type": self.alert_type,
            "severity": self.severity,
            "location": self.location,
            "description": self.description,
            "camera_id": self.camera_id,
            "detected_by": self.detected_by,
            "timestamp": self.timestamp,
            "status": self.status,
            "requires_human": self.requires_human,
            "resolution": self.resolution,
        }


@dataclass
class PatrolRoute:
    id: str
    name: str
    waypoints: list[str]
    interval_min: int = 30
    assigned_robot: str = ""
    active: bool = True

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "name": self.name,
            "waypoints": self.waypoints,
            "interval_min": self.interval_min,
            "assigned_robot": self.assigned_robot,
            "active": self.active,
        }


PATROL_ROUTES = [
    PatrolRoute("route-1", "Main Campus Perimeter", ["node-01", "node-02", "node-03", "node-10"], 20),
    PatrolRoute("route-2", "Academic Block Circuit", ["node-03", "node-04", "node-05", "node-07"], 30),
    PatrolRoute("route-3", "Student Areas Patrol", ["node-12", "node-13", "node-15", "node-09"], 45),
]


class AutonomousSecurity:
    """AI-powered campus security system."""

    def __init__(self):
        self.alerts: dict[str, SecurityAlert] = {}
        self.patrol_routes: list[PatrolRoute] = PATROL_ROUTES
        self._alert_counter = 0

    def detect_intrusion(self, location: str, camera_id: str = "") -> SecurityAlert:
        """Detect and report an intrusion."""
        self._alert_counter += 1
        alert = SecurityAlert(
            alert_id=f"alert-{self._alert_counter:04d}",
            alert_type="intrusion",
            severity="high",
            location=location,
            description=f"Unauthorized access detected at {location}",
            camera_id=camera_id,
            detected_by="camera" if camera_id else "robot",
            requires_human=True,
        )
        self.alerts[alert.alert_id] = alert
        return alert

    def detect_emergency(self, location: str, description: str) -> SecurityAlert:
        """Detect and report an emergency."""
        self._alert_counter += 1
        alert = SecurityAlert(
            alert_id=f"alert-{self._alert_counter:04d}",
            alert_type="emergency",
            severity="critical",
            location=location,
            description=description,
            requires_human=True,
        )
        self.alerts[alert.alert_id] = alert
        return alert

    def active_alerts_count(self) -> int:
        return sum(1 for a in self.alerts.values() if a.status == "active")

    def resolve_alert(self, alert_id: str, resolution: str = "Investigated — no threat found") -> bool:
        """Resolve a security alert (human action)."""
        alert = self.alerts.get(alert_id)
        if not alert:
            return False
        alert.status = "resolved"
        alert.resolution = resolution
        return True

    def get_active_alerts(self) -> list[SecurityAlert]:
        return [a for a in self.alerts.values() if a.status == "active"]

    def get_patrol_status(self) -> list[dict]:
        return [r.to_dict() for r in self.patrol_routes]

    def simulate_incident(self, incident_type: str = "intrusion") -> dict:
        """Simulate a security incident for demo mode."""
        locations = [
            "Engineering Block - Main Entrance",
            "Library - Back Entrance",
            "Science Block - Roof Access",
            "Administration - Server Room",
            "Auditorium - Stage Area",
            "Parking Lot - East Gate",
        ]
        location = random.choice(locations)

        if incident_type == "intrusion":
            alert = self.detect_intrusion(location, f"cam-{random.randint(1, 5):03d}")
            return {"alert": alert.to_dict(), "message": f"🚨 Intrusion detected at {location}. Security personnel notified."}
        elif incident_type == "emergency":
            alert = self.detect_emergency(location, f"Fire alarm triggered at {location}")
            return {"alert": alert.to_dict(), "message": f"🔥 Emergency detected at {location}. Evacuation recommended."}
        elif incident_type == "suspicious":
            alert = SecurityAlert(
                alert_id=f"alert-{self._alert_counter + 1:04d}",
                alert_type="suspicious",
                severity="medium",
                location=location,
                description=f"Suspicious activity detected near {location}",
                detected_by="robot",
                requires_human=True,
            )
            self.alerts[alert.alert_id] = alert
            return {"alert": alert.to_dict(), "message": f"👀 Suspicious activity at {location}. Dispatching security robot."}
        return {}

    def get_security_summary(self) -> dict:
        return {
            "active_alerts": self.active_alerts_count(),
            "critical": sum(1 for a in self.alerts.values() if a.severity == "critical" and a.status == "active"),
            "high": sum(1 for a in self.alerts.values() if a.severity == "high" and a.status == "active"),
            "medium": sum(1 for a in self.alerts.values() if a.severity == "medium" and a.status == "active"),
            "active_patrols": sum(1 for r in self.patrol_routes if r.active),
            "resolved_today": sum(1 for a in self.alerts.values() if a.status == "resolved" and a.timestamp.startswith(datetime.now().strftime("%Y-%m-%d"))),
            "human_controlled": True,  # Critical decisions remain under human control
        }

    @property
    def safety_rules(self) -> list[str]:
        return [
            "🔒 The system only provides alerts and assists human responders",
            "👮 Critical decisions must remain under human control",
            "🚨 No automated punitive actions — AI recommends, humans decide",
            "📹 Live video feeds are role-restricted",
            "🛑 Human override buttons available for all automated actions",
        ]
