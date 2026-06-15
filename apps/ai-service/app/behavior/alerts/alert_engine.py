"""SmartCampus AI — Behavior Alert Engine.

Generates severity-graded alerts based on detected behaviors,
with cooldowns, persistence, and teacher acknowledgment.
"""

import time
import uuid
from typing import Optional, List, Dict
from collections import defaultdict
from ..models import BehaviorAlert, AlertSeverity, BehaviorEvent, BehaviorType


class AlertEngine:
    """Generates and manages behavior alerts for teachers."""

    def __init__(self):
        self._alerts: Dict[str, BehaviorAlert] = {}
        self._cooldowns: Dict[str, float] = defaultdict(float)
        self._event_listeners: list = []

        # Configuration
        self.alert_cooldowns = {
            BehaviorType.SLEEPING: 60.0,
            BehaviorType.PHONE_USAGE: 30.0,
            BehaviorType.DISTRACTED: 45.0,
            BehaviorType.ABSENT_FROM_SEAT: 120.0,
        }

        self.severity_map = {
            BehaviorType.SLEEPING: AlertSeverity.WARNING,
            BehaviorType.PHONE_USAGE: AlertSeverity.WARNING,
            BehaviorType.DISTRACTED: AlertSeverity.INFO,
            BehaviorType.ABSENT_FROM_SEAT: AlertSeverity.CRITICAL,
        }

        self.alert_titles = {
            BehaviorType.SLEEPING: "Student sleeping detected",
            BehaviorType.PHONE_USAGE: "Phone usage detected",
            BehaviorType.DISTRACTED: "Student distracted",
            BehaviorType.ABSENT_FROM_SEAT: "Student absent from seat",
        }

        self.alert_descriptions = {
            BehaviorType.SLEEPING: "Student has maintained a sleeping posture for an extended period",
            BehaviorType.PHONE_USAGE: "Mobile phone detected in student's hand area",
            BehaviorType.DISTRACTED: "Student is repeatedly looking away from the front",
            BehaviorType.ABSENT_FROM_SEAT: "Student has left their assigned seat",
        }

    def process_behavior(self, event: BehaviorEvent) -> Optional[BehaviorAlert]:
        """Process a behavior event and generate an alert if appropriate."""
        behavior = event.behavior_type
        if behavior == BehaviorType.ATTENTIVE or behavior == BehaviorType.UNKNOWN:
            return None

        # Check cooldown
        track_key = f"{event.track_id}_{behavior.value}"
        now = time.time()
        cooldown = self.alert_cooldowns.get(behavior, 30.0)
        if now - self._cooldowns.get(track_key, 0) < cooldown:
            return None
        self._cooldowns[track_key] = now

        # Determine severity
        if event.confidence >= 0.9:
            severity = self.severity_map.get(behavior, AlertSeverity.INFO)
        elif event.confidence >= 0.75:
            severity = AlertSeverity.INFO if behavior != BehaviorType.PHONE_USAGE else AlertSeverity.WARNING
        else:
            return None  # Too low confidence to alert

        # Promote repeated offenses
        recent_count = sum(
            1 for a in self._alerts.values()
            if a.student_id == event.student_id
            and a.severity == severity
            and a.created_at > now - 300
        )
        if recent_count >= 3:
            if severity == AlertSeverity.INFO:
                severity = AlertSeverity.WARNING
            elif severity == AlertSeverity.WARNING:
                severity = AlertSeverity.CRITICAL

        alert = BehaviorAlert(
            alert_id=f"ALERT_{uuid.uuid4().hex[:8].upper()}",
            student_id=event.student_id,
            severity=severity,
            title=self.alert_titles.get(behavior, "Behavior detected"),
            description=self.alert_descriptions.get(behavior, ""),
            confidence=event.confidence,
            status="ACTIVE",
            created_at=now,
        )
        self._alerts[alert.alert_id] = alert

        # Notify listeners
        self._fire_event(alert)

        return alert

    def acknowledge(self, alert_id: str, by: str) -> Optional[BehaviorAlert]:
        """Acknowledge an alert."""
        alert = self._alerts.get(alert_id)
        if alert and alert.status == "ACTIVE":
            alert.status = "ACKNOWLEDGED"
            alert.acknowledged_by = by
        return alert

    def dismiss(self, alert_id: str) -> Optional[BehaviorAlert]:
        """Dismiss an alert."""
        alert = self._alerts.get(alert_id)
        if alert:
            alert.status = "DISMISSED"
        return alert

    def get_active_alerts(self, severity: Optional[AlertSeverity] = None) -> List[BehaviorAlert]:
        """Get all active alerts, optionally filtered by severity."""
        alerts = [a for a in self._alerts.values() if a.status == "ACTIVE"]
        if severity:
            alerts = [a for a in alerts if a.severity == severity]
        return sorted(alerts, key=lambda a: a.created_at, reverse=True)

    def on_event(self, listener) -> None:
        """Register an event listener for alert creation."""
        self._event_listeners.append(listener)

    def _fire_event(self, alert: BehaviorAlert) -> None:
        """Notify all listeners of a new alert."""
        for listener in self._event_listeners:
            try:
                listener(alert)
            except Exception as e:
                print(f"[AlertEngine] Listener error: {e}")

    def get_stats(self) -> dict:
        """Get alert statistics."""
        alerts = list(self._alerts.values())
        return {
            "total_alerts": len(alerts),
            "active": sum(1 for a in alerts if a.status == "ACTIVE"),
            "acknowledged": sum(1 for a in alerts if a.status == "ACKNOWLEDGED"),
            "dismissed": sum(1 for a in alerts if a.status == "DISMISSED"),
            "critical": sum(1 for a in alerts if a.severity == AlertSeverity.CRITICAL),
            "warning": sum(1 for a in alerts if a.severity == AlertSeverity.WARNING),
            "info": sum(1 for a in alerts if a.severity == AlertSeverity.INFO),
        }


# Global alert engine instance
alert_engine = AlertEngine()
