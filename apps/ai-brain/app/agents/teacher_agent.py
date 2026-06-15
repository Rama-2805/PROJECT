# ─── SmartCampus AI — Teacher AI Assistant ───────────
# Part 3: Pre-class preparation, live classroom monitoring,
# post-class reporting, and intervention recommendations.

from __future__ import annotations
from typing import Any, Optional
from datetime import datetime

from ..agent_core import BaseAgent, AgentRecord
from ..mock_data import STUDENTS, TIMETABLE, ENGAGEMENT_PATTERNS


class TeacherAgent(BaseAgent):
    """AI copilot for teachers: class preparation, live monitoring, analytics."""

    def __init__(self, registry, memory, comms):
        super().__init__(registry, memory, comms)
        self.record = AgentRecord(
            agent_id="agent-teacher",
            name="Teacher AI Copilot",
            capabilities=[
                "pre_class_analysis",
                "live_classroom_monitoring",
                "post_class_reports",
                "engagement_analytics",
                "intervention_recommendations",
            ],
            permissions=["read_attendance", "read_engagement", "read_alerts", "read_students"],
            model_version="1.0.0",
            status="online",
            description="AI assistant that helps teachers prepare for classes, monitor classroom engagement in real-time, and generate post-class reports.",
        )
        registry.register(self.record)

    def process(self, query: str, context: dict = None) -> dict:
        ctx = context or {}
        teacher_name = ctx.get("teacher_name", "Dr. Sharma")
        query_lower = query.lower()

        if any(w in query_lower for w in ["prepare", "before class", "pre-class", "students at risk", "intervention"]):
            return self._handle_pre_class(teacher_name)
        elif any(w in query_lower for w in ["monitor", "live", "during class", "engagement", "alert"]):
            return self._handle_live_monitoring(teacher_name)
        elif any(w in query_lower for w in ["report", "summary", "after class", "insight", "post-class"]):
            return self._handle_post_class(teacher_name)
        elif any(w in query_lower for w in ["schedule", "today", "class"]):
            return self._handle_schedule(teacher_name)
        else:
            knowledge = self.search_knowledge(query)
            text = "I can help you prepare for classes, monitor student engagement, and generate reports. "
            if knowledge:
                text += f"Reference: {knowledge[0]['content'][:200]}..."
            return self.respond(text, confidence=0.85, data={"knowledge": knowledge})

    def _handle_pre_class(self, teacher_name: str) -> dict:
        """Pre-class preparation: at-risk students, engagement trends, suggested interventions."""
        # Find students at risk (attendance < 75%)
        at_risk = [s for s in STUDENTS if s["attendance"] < 75]
        low_engagement = [s for s in STUDENTS if s["engagement"] < 60]

        # Find teacher's courses
        teacher_courses = [c for c in TIMETABLE if c["teacher"] == teacher_name]
        today = datetime.now().strftime("%A")
        today_classes = [c for c in teacher_courses if c["day"] == today]

        text = f"**📋 Pre-Class Brief — {teacher_name}**\n\n"

        if today_classes:
            text += f"**Today's Classes:**\n"
            for c in today_classes:
                text += f"• {c['course']} at {c['time']} in {c['room']}\n"
            text += "\n"

        text += f"**⚠️ Students at Risk (Attendance < 75%):** {len(at_risk)}\n"
        for s in at_risk:
            text += f"• {s['name']} — {s['attendance']}% attendance, {s['engagement']}% engagement\n"
            # Add intervention suggestion
            if s["engagement"] < 50:
                text += f"  → **Recommendation:** Schedule 1-on-1 mentoring for {s['name']}\n"
            else:
                text += f"  → **Recommendation:** Send attendance reminder to {s['name']}\n"

        text += f"\n**📊 Low Engagement Students (< 60%):** {len(low_engagement)}\n"
        for s in low_engagement[:3]:
            text += f"• {s['name']} — {s['engagement']}% engagement\n"

        # Overall class stats
        avg_attendance = sum(s["attendance"] for s in STUDENTS) / len(STUDENTS)
        avg_engagement = sum(s["engagement"] for s in STUDENTS) / len(STUDENTS)
        text += f"\n**Class Overview:** {avg_attendance:.0f}% avg attendance • {avg_engagement:.0f}% avg engagement"

        return self.respond(
            text=text,
            confidence=0.92,
            data={
                "teacher": teacher_name,
                "today_classes": today_classes,
                "at_risk_students": at_risk,
                "low_engagement_students": low_engagement,
                "avg_attendance": round(avg_attendance),
                "avg_engagement": round(avg_engagement),
            },
        )

    def _handle_live_monitoring(self, teacher_name: str) -> dict:
        """Live classroom monitoring with engagement alerts."""
        now = datetime.now()
        current_hour = f"{now.hour:02d}:00-{now.hour + 1:02d}:00"

        patterns = ENGAGEMENT_PATTERNS["time_based"]
        current_engagement = patterns.get(current_hour, 70)

        # Simulate alerts
        alerts = []
        if current_engagement < 60:
            alerts.append({
                "type": "low_engagement",
                "severity": "warning",
                "message": f"Classroom engagement is critically low ({current_engagement}%). Consider interactive activities.",
            })
        if current_engagement < 50:
            alerts.append({
                "type": "disturbance",
                "severity": "critical",
                "message": "Possible classroom disturbance detected. Suggested action: Pause and address class.",
            })

        # Find at-risk students currently in class
        monitored_students = [s for s in STUDENTS if s["engagement"] < 60][:3]

        text = f"**🎥 Live Classroom Monitoring — {teacher_name}**\n\n"
        text += f"⏰ Current time slot: **{current_hour}**\n"
        text += f"📊 Current engagement: **{current_engagement}%**\n\n"

        if alerts:
            text += "**🚨 Active Alerts:**\n"
            for alert in alerts:
                icon = "🔴" if alert["severity"] == "critical" else "🟡"
                text += f"{icon} {alert['message']}\n"

        if monitored_students:
            text += "\n**👤 Students Needing Attention:**\n"
            for s in monitored_students:
                text += f"• {s['name']} — {s['engagement']}% engagement\n"

        text += f"\n**✅ Devices:** 4 cameras online • 2 edge AI devices online • All sensors operational"

        return self.respond(
            text=text,
            confidence=0.85,
            data={
                "current_engagement": current_engagement,
                "alerts": alerts,
                "monitored_students": monitored_students,
                "current_time_slot": current_hour,
            },
        )

    def _handle_post_class(self, teacher_name: str) -> dict:
        """Post-class report generation."""
        avg_engagement = sum(s["engagement"] for s in STUDENTS) / len(STUDENTS)
        avg_attendance = sum(s["attendance"] for s in STUDENTS) / len(STUDENTS)

        students_needing_improvement = len([s for s in STUDENTS if s["attendance"] < 75])

        text = (
            f"**📝 Post-Class Report — {teacher_name}**\n\n"
            f"**Class Summary:**\n"
            f"• Total students monitored: {len(STUDENTS)}\n"
            f"• Average attendance: {avg_attendance:.0f}%\n"
            f"• Average engagement: {avg_engagement:.0f}%\n"
            f"• Students needing improvement: {students_needing_improvement}\n\n"
            f"**Engagement Breakdown:**\n"
        )

        for time_slot, score in sorted(ENGAGEMENT_PATTERNS["time_based"].items()):
            icon = "🟢" if score >= 80 else "🟡" if score >= 60 else "🔴"
            text += f"{icon} {time_slot}: {score}%\n"

        text += (
            f"\n**💡 Key Insights:**\n"
            f"• Engagement peaked during morning sessions (85-88%)\n"
            f"• Afternoon sessions show significant drop (45-60%)\n"
            f"• **Recommendation:** Include interactive activities in afternoon classes\n"
        )

        return self.respond(
            text=text,
            confidence=0.93,
            data={
                "teacher": teacher_name,
                "avg_attendance": round(avg_attendance),
                "avg_engagement": round(avg_engagement),
                "engagement_breakdown": ENGAGEMENT_PATTERNS["time_based"],
                "students_monitored": len(STUDENTS),
            },
        )

    def _handle_schedule(self, teacher_name: str) -> dict:
        today = datetime.now().strftime("%A")
        classes = [c for c in TIMETABLE if c["teacher"] == teacher_name and c["day"] == today]

        if not classes:
            text = f"No classes scheduled for today, {teacher_name}."
        else:
            text = f"**📅 Today's Schedule — {teacher_name}**\n\n"
            for c in classes:
                students_in_course = len([s for s in STUDENTS if s["department"] == c["course"][:3]])
                text += f"• {c['time']} — {c['course']}: {c['name']} in {c['room']} ({students_in_course} students)\n"

        return self.respond(text=text, confidence=0.9, data={"today_classes": classes})
