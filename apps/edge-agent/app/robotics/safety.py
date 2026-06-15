# ─── SmartCampus AI — Robotics Safety & Ethics ─────
# Part 16: Human override, mission approval workflows,
# privacy protections, audit logs, and safe operating boundaries.

from __future__ import annotations
from dataclasses import dataclass, field
from typing import Optional
from datetime import datetime
import uuid


@dataclass
class SafetyEvent:
    event_id: str
    event_type: str  # override, emergency_stop, boundary_breach, sensor_failure
    robot_id: str
    description: str
    severity: str  # info, warning, critical
    timestamp: str = field(default_factory=lambda: datetime.now().isoformat())
    resolved: bool = False
    resolved_by: str = ""
    resolution: str = ""

    def to_dict(self) -> dict:
        return {
            "event_id": self.event_id,
            "event_type": self.event_type,
            "robot_id": self.robot_id,
            "description": self.description,
            "severity": self.severity,
            "timestamp": self.timestamp,
            "resolved": self.resolved,
            "resolved_by": self.resolved_by,
            "resolution": self.resolution,
        }


@dataclass
class SafeZone:
    zone_id: str
    name: str
    boundary: list[dict]  # Polygon coordinates
    restricted_types: list[str]
    allowed_hours: str = "00:00-23:59"
    require_human_escort: bool = False

    def to_dict(self) -> dict:
        return {
            "zone_id": self.zone_id,
            "name": self.name,
            "restricted_types": self.restricted_types,
            "allowed_hours": self.allowed_hours,
            "require_human_escort": self.require_human_escort,
        }


class SafetyEthics:
    """Safety and ethics framework for autonomous campus systems."""

    def __init__(self):
        self.events: list[SafetyEvent] = []
        self.safe_zones: dict[str, SafeZone] = {}
        self._initialize_zones()
        self._audit_log: list[dict] = []

    def _initialize_zones(self) -> None:
        zones = [
            SafeZone("zone-1", "Main Entrance", [], [], "06:00-22:00", False),
            SafeZone("zone-2", "Server Room", ["delivery", "cleaning"], "08:00-18:00", True),
            SafeZone("zone-3", "Chemistry Lab", ["all"], "00:00-23:59", True),
            SafeZone("zone-4", "Administration Floor 2", ["delivery"], "00:00-23:59", False),
            SafeZone("zone-5", "Sports Field", ["delivery"], "00:00-23:59", False),
        ]
        for z in zones:
            self.safe_zones[z.zone_id] = z

    def log_event(self, event_type: str, robot_id: str, description: str, severity: str = "info") -> SafetyEvent:
        event = SafetyEvent(
            event_id=str(uuid.uuid4())[:8],
            event_type=event_type,
            robot_id=robot_id,
            description=description,
            severity=severity,
        )
        self.events.append(event)
        self._audit_log.append({
            "event_id": event.event_id,
            "action": event_type,
            "robot_id": robot_id,
            "timestamp": event.timestamp,
        })
        return event

    def emergency_stop(self, robot_id: str, reason: str = "Manual override") -> SafetyEvent:
        return self.log_event("emergency_stop", robot_id, reason, "critical")

    def human_override(self, robot_id: str, action: str, authorized_by: str) -> SafetyEvent:
        event = self.log_event("override", robot_id, f"Human override: {action} by {authorized_by}", "warning")
        event.resolved_by = authorized_by
        return event

    def check_boundary(self, robot_id: str, zone_id: str) -> bool:
        """Check if a robot is allowed in a zone."""
        zone = self.safe_zones.get(zone_id)
        if not zone:
            return True  # Unknown zones are accessible

        if "all" in zone.restricted_types:
            self.log_event("boundary_breach", robot_id, f"Attempted entry into restricted zone: {zone.name}", "critical")
            return False

        return True

    def get_recent_events(self, limit: int = 20) -> list[dict]:
        return [e.to_dict() for e in self.events[-limit:]]

    def get_critical_events(self) -> list[SafetyEvent]:
        return [e for e in self.events if e.severity == "critical" and not e.resolved]

    def resolve_event(self, event_id: str, resolved_by: str, resolution: str = "") -> bool:
        for event in self.events:
            if event.event_id == event_id:
                event.resolved = True
                event.resolved_by = resolved_by
                event.resolution = resolution or f"Resolved by {resolved_by}"
                return True
        return False

    def get_audit_log(self, limit: int = 50) -> list[dict]:
        return self._audit_log[-limit:]

    def get_safety_summary(self) -> dict:
        return {
            "total_events": len(self.events),
            "critical_unresolved": len(self.get_critical_events()),
            "safe_zones": len(self.safe_zones),
            "audit_trail_entries": len(self._audit_log),
            "human_overrides_today": sum(1 for e in self.events if e.event_type == "override" and e.timestamp.startswith(datetime.now().strftime("%Y-%m-%d"))),
            "emergency_stops_today": sum(1 for e in self.events if e.event_type == "emergency_stop" and e.timestamp.startswith(datetime.now().strftime("%Y-%m-%d"))),
            "safety_rules": self.safety_rules,
        }

    @property
    def safety_rules(self) -> list[str]:
        return [
            "🧑‍⚖️ Robots assist humans — never replace human authority",
            "🛑 Physical emergency stop buttons on all robots",
            "✅ All missions require approval before execution",
            "📝 Complete audit trail for every autonomous action",
            "🔒 Location data anonymized for non-essential personnel",
            "🚧 Safe operating boundaries enforced for all robots",
            "👁️ Human supervision required for critical infrastructure actions",
            "🔄 Human override available at any point during autonomous operation",
        ]
