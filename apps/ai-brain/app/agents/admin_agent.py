# ─── SmartCampus AI — Administrator AI Governor ─────
# Part 4: University operations intelligence, resource optimization,
# predictive analytics, and executive reporting.

from __future__ import annotations
from typing import Any, Optional
from datetime import datetime, timedelta
import random as _random

from ..agent_core import BaseAgent, AgentRecord
from ..mock_data import STUDENTS, BUILDINGS, DEVICES, ENGAGEMENT_PATTERNS


class AdminGovernorAgent(BaseAgent):
    """AI Governor for university operations: resource optimization, predictions, executive reports."""

    def __init__(self, registry, memory, comms):
        super().__init__(registry, memory, comms)
        self.record = AgentRecord(
            agent_id="agent-admin",
            name="Admin AI Governor",
            capabilities=[
                "resource_optimization",
                "predictive_analytics",
                "executive_reporting",
                "classroom_utilization",
                "staff_requirements",
                "device_failure_prediction",
            ],
            permissions=["read_all", "manage_resources", "view_reports"],
            model_version="1.0.0",
            status="online",
            description="AI Governor that oversees university operations, optimizes resource allocation, predicts issues, and generates executive reports.",
        )
        registry.register(self.record)

    def process(self, query: str, context: dict = None) -> dict:
        query_lower = query.lower()

        if any(w in query_lower for w in ["resource", "utilization", "classroom", "underutilized", "overload"]):
            return self._handle_resource_optimization()
        elif any(w in query_lower for w in ["predict", "forecast", "future", "expected", "trend"]):
            return self._handle_predictions()
        elif any(w in query_lower for w in ["report", "executive", "summary", "overview", "performance"]):
            return self._handle_executive_report()
        elif any(w in query_lower for w in ["department", "cse", "ece", "mech", "admin"]):
            return self._handle_department_analytics(query)
        elif any(w in query_lower for w in ["device", "camera", "sensor", "edge", "failure"]):
            return self._handle_device_predictions()
        else:
            return self._handle_executive_report()

    def _handle_resource_optimization(self) -> dict:
        """Analyze classroom utilization across buildings."""
        text = "**🏛️ Resource Optimization Report**\n\n"

        underutilized = []
        overloaded = []
        for name, info in BUILDINGS.items():
            utilization = (info["current_occupancy"] / info["total_capacity"]) * 100
            if utilization < 60:
                underutilized.append({"building": name, "utilization": round(utilization)})
                text += f"📉 **{name}:** {utilization:.0f}% utilized — {info['current_occupancy']}/{info['total_capacity']} seats filled\n"
                if info["active_classes"] > 0:
                    text += f"  → {info['active_classes']} active classes, {info['classrooms']} classrooms\n"
            elif utilization > 90:
                overloaded.append({"building": name, "utilization": round(utilization)})
                text += f"🔴 **{name}:** {utilization:.0f}% utilized — OVERLOADED\n"
            else:
                text += f"🟢 **{name}:** {utilization:.0f}% utilized — Optimal\n"

        text += "\n**💡 Recommendations:**\n"
        if underutilized:
            b = underutilized[0]
            text += f"• Consolidate classes in {b['building']} (only {b['utilization']}% utilized)\n"
        if overloaded:
            b = overloaded[0]
            text += f"• Redistribute load from {b['building']} to underutilized buildings\n"
        text += "• Consider AI-optimized timetable to balance classroom usage\n"

        return self.respond(
            text=text,
            confidence=0.9,
            data={
                "buildings": BUILDINGS,
                "underutilized": underutilized,
                "overloaded": overloaded,
            },
        )

    def _handle_predictions(self) -> dict:
        """Generate campus predictions."""
        # Simulated predictions
        predictions = [
            {
                "prediction": "CSE Block will reach 95% occupancy at 10:00 AM tomorrow",
                "confidence": 88,
                "impact": "Students may struggle to find seats in CSE Block during peak hours",
                "recommendation": "Open overflow classrooms in adjacent buildings",
            },
            {
                "prediction": "Afternoon engagement (1-3 PM) expected to drop to 52%",
                "confidence": 82,
                "impact": "Reduced learning effectiveness in post-lunch sessions",
                "recommendation": "Schedule interactive workshops during afternoon slots",
            },
            {
                "prediction": "Library occupancy to exceed capacity by 15% during exam week",
                "confidence": 91,
                "impact": "Students may not have adequate study space",
                "recommendation": "Extend library hours and open additional study halls",
            },
            {
                "prediction": "Overall campus attendance to increase 7% next semester",
                "confidence": 75,
                "impact": "Increased load on cafeteria, parking, and classroom resources",
                "recommendation": "Begin resource planning for next semester allocation",
            },
        ]

        text = "**🔮 Campus Predictions**\n\n"
        for p in predictions:
            conf_icon = "🟢" if p["confidence"] >= 85 else "🟡" if p["confidence"] >= 70 else "🔴"
            text += (
                f"{conf_icon} **{p['prediction']}**\n"
                f"   Confidence: {p['confidence']}%\n"
                f"   Impact: {p['impact']}\n"
                f"   → **Recommendation:** {p['recommendation']}\n\n"
            )

        return self.respond(text=text, confidence=0.86, data={"predictions": predictions})

    def _handle_executive_report(self) -> dict:
        """Daily executive summary."""
        avg_attendance = sum(s["attendance"] for s in STUDENTS) / len(STUDENTS)
        avg_engagement = sum(s["engagement"] for s in STUDENTS) / len(STUDENTS)
        total_occupancy = sum(b["current_occupancy"] for b in BUILDINGS.values())
        total_capacity = sum(b["total_capacity"] for b in BUILDINGS.values())
        online_devices = sum(1 for d in DEVICES if d["status"] == "online")
        total_devices = len(DEVICES)
        at_risk = [s for s in STUDENTS if s["attendance"] < 75]

        text = (
            f"**📋 Daily Executive Report — {datetime.now().strftime('%B %d, %Y')}**\n\n"
            f"**Campus Health:**\n"
            f"🟢 Campus Status: **NORMAL**\n\n"
            f"**📊 Key Metrics:**\n"
            f"• Students: {len(STUDENTS)} enrolled\n"
            f"• Average Attendance: {avg_attendance:.0f}%\n"
            f"• Average Engagement: {avg_engagement:.0f}%\n"
            f"• Campus Occupancy: {total_occupancy}/{total_capacity} ({total_occupancy * 100 // total_capacity if total_capacity else 0}%)\n"
            f"• Devices Online: {online_devices}/{total_devices}\n"
            f"• Students at Risk: {len(at_risk)}\n\n"
            f"**⚠️ Items Requiring Attention:**\n"
        )

        if at_risk:
            text += f"• {len(at_risk)} students have attendance below 75%\n"
        if total_devices - online_devices > 0:
            text += f"• {total_devices - online_devices} device(s) are offline\n"

        text += (
            f"\n**✅ All systems operational.** AI agents functioning normally.\n"
            f"Recommendation: Review at-risk student list for intervention."
        )

        return self.respond(
            text=text,
            confidence=0.95,
            data={
                "date": datetime.now().isoformat(),
                "avg_attendance": round(avg_attendance),
                "avg_engagement": round(avg_engagement),
                "total_occupancy": total_occupancy,
                "online_devices": online_devices,
                "at_risk_students": len(at_risk),
                "campus_status": "NORMAL",
            },
        )

    def _handle_department_analytics(self, query: str) -> dict:
        query_lower = query.lower()
        # Find which department
        for dept_code in ["cse", "ece", "mech", "admin", "library"]:
            if dept_code in query_lower:
                dept_name = dept_code.upper()
                break
        else:
            return self._handle_executive_report()

        dept_students = [s for s in STUDENTS if s["department"] == dept_name]
        if not dept_students:
            return self.respond(f"No data found for {dept_name} department.", confidence=0.5)

        dept_attendance = sum(s["attendance"] for s in dept_students) / len(dept_students)
        dept_engagement = sum(s["engagement"] for s in dept_students) / len(dept_students)

        text = (
            f"**🏛️ {dept_name} Department Analytics**\n\n"
            f"• Students: {len(dept_students)}\n"
            f"• Average Attendance: {dept_attendance:.0f}%\n"
            f"• Average Engagement: {dept_engagement:.0f}%\n\n"
            f"**Students:**\n"
        )
        for s in dept_students:
            att_icon = "🟢" if s["attendance"] >= 85 else "🟡" if s["attendance"] >= 75 else "🔴"
            eng_icon = "🟢" if s["engagement"] >= 80 else "🟡" if s["engagement"] >= 60 else "🔴"
            text += f"{att_icon} {s['name']} — Sem {s['semester']} — Attendance: {s['attendance']}% — Engagement: {s['engagement']}%\n"

        return self.respond(
            text=text,
            confidence=0.9,
            data={"department": dept_name, "students": dept_students},
        )

    def _handle_device_predictions(self) -> dict:
        """Predict device failures."""
        predictions = []
        for device in DEVICES:
            if device["status"] == "warning":
                fail_probability = _random.randint(65, 95)
                days = _random.randint(3, 10)
                predictions.append({
                    "device_id": device["id"],
                    "name": device["name"],
                    "failure_probability": fail_probability,
                    "predicted_days": days,
                    "recommendation": f"Schedule maintenance within {days} days" if fail_probability > 80 else "Monitor device status",
                })

        text = "**🔧 Device Failure Predictions**\n\n"
        if not predictions:
            text += "✅ All devices operating within normal parameters. No failures predicted in the next 7 days."
        else:
            for p in predictions:
                icon = "🔴" if p["failure_probability"] >= 80 else "🟡"
                text += (
                    f"{icon} **{p['name']} ({p['device_id']})**\n"
                    f"   Failure probability: {p['failure_probability']}%\n"
                    f"   Predicted timeframe: {p['predicted_days']} days\n"
                    f"   → **Recommendation:** {p['recommendation']}\n\n"
                )

        return self.respond(
            text=text,
            confidence=0.82,
            data={"device_predictions": predictions},
        )
