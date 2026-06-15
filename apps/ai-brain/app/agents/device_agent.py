# ─── SmartCampus AI — Device AI Engineer ─────────────
# Part 5: IoT infrastructure monitoring, failure prediction,
# firmware management, and maintenance scheduling.

from __future__ import annotations
from typing import Any, Optional
from datetime import datetime
import random

from ..agent_core import BaseAgent, AgentRecord
from ..mock_data import DEVICES


class DeviceEngineerAgent(BaseAgent):
    """AI Engineer for IoT infrastructure: device health, predictions, maintenance."""

    def __init__(self, registry, memory, comms):
        super().__init__(registry, memory, comms)
        self.record = AgentRecord(
            agent_id="agent-device",
            name="Device AI Engineer",
            capabilities=[
                "device_health_monitoring",
                "failure_prediction",
                "firmware_management",
                "maintenance_scheduling",
                "network_quality_analysis",
            ],
            permissions=["read_devices", "manage_devices", "schedule_maintenance"],
            model_version="1.0.0",
            status="online",
            description="AI Engineer responsible for monitoring IoT device health, predicting failures, managing firmware updates, and scheduling maintenance.",
        )
        registry.register(self.record)

    def process(self, query: str, context: dict = None) -> dict:
        query_lower = query.lower()

        if any(w in query_lower for w in ["health", "status", "all device", "overview", "dashboard"]):
            return self._handle_device_overview()
        elif any(w in query_lower for w in ["predict", "failure", "risk", "fail", "probability"]):
            return self._handle_failure_predictions()
        elif any(w in query_lower for w in ["firmware", "update", "version", "upgrade"]):
            return self._handle_firmware_management()
        elif any(w in query_lower for w in ["maintenance", "schedule", "repair", "fix"]):
            return self._handle_maintenance()
        elif any(w in query_lower for w in ["offline", "disconnect", "down", "warning", "critical"]):
            return self._handle_device_alerts()
        else:
            return self._handle_device_overview()

    def _handle_device_overview(self) -> dict:
        """Full device health overview."""
        online = sum(1 for d in DEVICES if d["status"] == "online")
        warning = sum(1 for d in DEVICES if d["status"] == "warning")
        offline = sum(1 for d in DEVICES if d["status"] == "offline")
        total = len(DEVICES)

        avg_cpu = sum(d["cpu"] for d in DEVICES if d["status"] == "online") / max(online, 1)
        avg_temp = sum(d["temp"] for d in DEVICES if d["status"] == "online") / max(online, 1)
        avg_uptime = sum(d["uptime"] for d in DEVICES) / total

        text = (
            f"**📡 Device Infrastructure Overview**\n\n"
            f"**System Health:**\n"
            f"🟢 Online: {online}/{total}\n"
            f"🟡 Warning: {warning}\n"
            f"🔴 Offline: {offline}\n\n"
            f"**Performance Metrics:**\n"
            f"• Avg CPU Usage: {avg_cpu:.0f}%\n"
            f"• Avg Temperature: {avg_temp:.0f}°C\n"
            f"• Avg Uptime: {avg_uptime:.0f}%\n\n"
            f"**Device List:**\n"
        )

        for d in DEVICES:
            icon = "🟢" if d["status"] == "online" else "🟡" if d["status"] == "warning" else "🔴"
            text += f"{icon} **{d['name']}** — CPU: {d['cpu']}% — Temp: {d['temp']}°C — Uptime: {d['uptime']}%\n"

        return self.respond(
            text=text,
            confidence=0.94,
            data={
                "total_devices": total,
                "online": online,
                "warning": warning,
                "offline": offline,
                "devices": DEVICES,
            },
        )

    def _handle_failure_predictions(self) -> dict:
        """Predict device failures based on health metrics."""
        predictions = []
        for device in DEVICES:
            # Calculate failure probability based on metrics
            risk_score = 0
            if device["temp"] > 60:
                risk_score += 30
            if device["cpu"] > 80:
                risk_score += 25
            if device["uptime"] < 70:
                risk_score += 20
            if device["status"] == "offline":
                risk_score += 15
            if device["status"] == "warning":
                risk_score += 20

            risk_score = min(risk_score + random.randint(5, 15), 99)

            if risk_score > 40:
                days = max(1, int((100 - risk_score) / 10))
                predictions.append({
                    "device_id": device["id"],
                    "name": device["name"],
                    "risk_score": risk_score,
                    "predicted_days": days,
                    "status": device["status"],
                    "recommendation": (
                        "URGENT: Replace within 24 hours" if risk_score > 85 else
                        f"Schedule maintenance within {days} days" if risk_score > 65 else
                        "Monitor device regularly"
                    ),
                })

        predictions.sort(key=lambda p: p["risk_score"], reverse=True)

        text = "**🔮 Device Failure Predictions**\n\n"
        if not predictions:
            text += "✅ All devices are healthy. No failures predicted in the near term."
        else:
            text += f"Devices at risk: {len(predictions)}\n\n"
            for p in predictions[:5]:
                icon = "🔴" if p["risk_score"] >= 80 else "🟡" if p["risk_score"] >= 60 else "🟠"
                text += (
                    f"{icon} **{p['name']}** — Risk: {p['risk_score']}%\n"
                    f"   Predicted failure: ~{p['predicted_days']} days\n"
                    f"   → {p['recommendation']}\n\n"
                )

        return self.respond(
            text=text,
            confidence=0.83,
            data={"predictions": predictions[:10]},
        )

    def _handle_firmware_management(self) -> dict:
        """Check firmware versions and recommend updates."""
        firmware_status = []
        for device in DEVICES:
            firmware_version = f"v{random.randint(1, 3)}.{random.randint(0, 9)}.{random.randint(0, 5)}"
            latest_version = "v3.2.1"
            needs_update = firmware_version < latest_version

            firmware_status.append({
                "device_id": device["id"],
                "name": device["name"],
                "current_version": firmware_version,
                "latest_version": latest_version,
                "needs_update": needs_update,
            })

        update_count = sum(1 for f in firmware_status if f["needs_update"])

        text = "**🔄 Firmware Management**\n\n"
        text += f"Devices needing update: {update_count}/{len(firmware_status)}\n\n"

        for f in firmware_status:
            if f["needs_update"]:
                text += (
                    f"⚠️ **{f['name']}** — {f['current_version']} → {f['latest_version']}\n"
                    f"   → Schedule update during off-peak hours\n"
                )

        if update_count == 0:
            text += "✅ All devices running latest firmware versions."

        text += "\n**Recommended action:** Batch update during weekend maintenance window."

        return self.respond(
            text=text,
            confidence=0.88,
            data={"firmware_status": firmware_status, "needs_update": update_count},
        )

    def _handle_maintenance(self) -> dict:
        """Maintenance schedule and recommendations."""
        now = datetime.now()
        maintenance_items = []

        for i, device in enumerate(DEVICES):
            if device["status"] == "warning" or device["temp"] > 55:
                days_from_now = i * 2
                maintenance_date = (now + __import__("datetime").timedelta(days=days_from_now)).strftime("%Y-%m-%d")
                maintenance_items.append({
                    "device_id": device["id"],
                    "name": device["name"],
                    "issue": f"Temperature {device['temp']}°C exceeds threshold" if device["temp"] > 55 else "Device reporting warnings",
                    "scheduled_date": maintenance_date,
                    "priority": "high" if device["status"] == "warning" else "normal",
                })

        text = "**🔧 Maintenance Schedule**\n\n"
        if not maintenance_items:
            text += "✅ No maintenance required at this time."
        else:
            high_priority = [m for m in maintenance_items if m["priority"] == "high"]
            text += f"Total scheduled: {len(maintenance_items)} items"
            if high_priority:
                text += f" ({len(high_priority)} high priority)\n\n"
            for m in maintenance_items:
                icon = "🔴" if m["priority"] == "high" else "🟡"
                text += f"{icon} **{m['name']}** — {m['issue']}\n"
                text += f"   Scheduled: {m['scheduled_date']}\n"

        return self.respond(
            text=text,
            confidence=0.9,
            data={"maintenance_items": maintenance_items},
        )

    def _handle_device_alerts(self) -> dict:
        """Get device alerts and warnings."""
        alerts = []
        for device in DEVICES:
            if device["status"] != "online":
                alerts.append({
                    "device_id": device["id"],
                    "name": device["name"],
                    "status": device["status"],
                    "severity": "critical" if device["status"] == "offline" else "warning",
                    "message": (
                        f"Device {device['name']} is OFFLINE. Last known state: CPU {device['cpu']}%, Temp {device['temp']}°C"
                        if device["status"] == "offline" else
                        f"Device {device['name']} reporting WARNING. CPU: {device['cpu']}%, Temp: {device['temp']}°C"
                    ),
                })

        text = "**🚨 Device Alerts**\n\n"
        if not alerts:
            text += "✅ No active device alerts. All systems normal."
        else:
            critical = [a for a in alerts if a["severity"] == "critical"]
            warnings = [a for a in alerts if a["severity"] == "warning"]
            text += f"🔴 Critical: {len(critical)} | 🟡 Warnings: {len(warnings)}\n\n"
            for alert in alerts:
                icon = "🔴" if alert["severity"] == "critical" else "🟡"
                text += f"{icon} {alert['message']}\n"

        return self.respond(
            text=text,
            confidence=0.93,
            data={"alerts": alerts, "critical_count": sum(1 for a in alerts if a["severity"] == "critical")},
        )
