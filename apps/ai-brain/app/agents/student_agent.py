# ─── SmartCampus AI — Student AI Assistant ───────────
# Part 2: Provides attendance intelligence, academic assistance,
# learning analytics, and personalized recommendations.

from __future__ import annotations
from typing import Any, Optional
from datetime import datetime, timedelta

from ..agent_core import BaseAgent, AgentRecord
from ..mock_data import STUDENTS, COURSES, TIMETABLE, ATTENDANCE_RECORDS, ENGAGEMENT_PATTERNS


class StudentAgent(BaseAgent):
    """AI assistant for students: attendance, academics, learning analytics."""

    def __init__(self, registry, memory, comms):
        super().__init__(registry, memory, comms)
        self.record = AgentRecord(
            agent_id="agent-student",
            name="Student AI Copilot",
            capabilities=[
                "attendance_intelligence",
                "academic_assistance",
                "learning_analytics",
                "schedule_queries",
                "recommendations",
            ],
            permissions=["read_attendance", "read_schedule", "read_engagement"],
            model_version="1.0.0",
            status="online",
            description="AI assistant that helps students track attendance, understand academic performance, and get personalized learning recommendations.",
        )
        registry.register(self.record)

    def process(self, query: str, context: dict = None) -> dict:
        ctx = context or {}
        student_id = ctx.get("student_id", "STU001")
        query_lower = query.lower()

        # Route to appropriate handler
        if any(w in query_lower for w in ["attendance", "missed", "absent", "present"]):
            return self._handle_attendance(query, student_id)
        elif any(w in query_lower for w in ["engagement", "focus", "attention", "learning"]):
            return self._handle_learning_analytics(query, student_id)
        elif any(w in query_lower for w in ["schedule", "class", "timetable", "next", "today"]):
            return self._handle_schedule(query, student_id)
        elif any(w in query_lower for w in ["course", "subject", "assignment", "exam", "deadline"]):
            return self._handle_academic(query, student_id)
        elif any(w in query_lower for w in ["recommend", "suggest", "improve", "help"]):
            return self._handle_recommendations(student_id)
        else:
            # General knowledge retrieval
            knowledge = self.search_knowledge(query)
            text = "I can help with attendance tracking, academic queries, schedules, and learning recommendations. "
            if knowledge:
                text += f"Based on university records: {knowledge[0]['content'][:200]}..."
            return self.respond(text, confidence=0.85, data={"knowledge": knowledge})

    def _handle_attendance(self, query: str, student_id: str) -> dict:
        student = next((s for s in STUDENTS if s["id"] == student_id), None)
        if not student:
            return self.respond("Student not found.", confidence=0.5)

        records = ATTENDANCE_RECORDS.get(student_id, [])
        total = len(records)
        present = sum(1 for r in records if r["present"])
        percentage = round((present / total * 100)) if total > 0 else 0

        # Calculate needed classes to reach 85%
        needed_for_85 = 0
        current_total = total
        while ((present + needed_for_85) / (current_total + needed_for_85)) * 100 < 85:
            needed_for_85 += 1

        # Recent trend (last 7 days)
        recent = records[:7]
        recent_present = sum(1 for r in recent if r["present"])

        text = (
            f"You have attended {present} out of {total} classes. "
            f"Your attendance is **{percentage}%**. "
        )
        if percentage >= 85:
            text += "Great job maintaining attendance above the minimum threshold! 🎉"
        elif percentage >= 75:
            text += (
                f"You are currently above 75% but below 85%. "
                f"Attend the next **{needed_for_85}** classes to reach 85%."
            )
        else:
            text += (
                f"⚠️ Your attendance is below 75%. "
                f"You need to attend **{needed_for_85}** consecutive classes to reach 85%. "
                "Please prioritize attending classes to avoid academic probation."
            )

        return self.respond(
            text=text,
            confidence=0.95,
            data={
                "student_id": student_id,
                "total_classes": total,
                "present": present,
                "absent": total - present,
                "percentage": percentage,
                "needed_for_85": needed_for_85,
                "recent_trend": [
                    {"date": r["date"], "present": r["present"], "course": r["course"]}
                    for r in records[:14]
                ],
            },
        )

    def _handle_learning_analytics(self, query: str, student_id: str) -> dict:
        patterns = ENGAGEMENT_PATTERNS["time_based"]
        best_time = max(patterns, key=patterns.get)
        worst_time = min(patterns, key=patterns.get)

        student = next((s for s in STUDENTS if s["id"] == student_id), None)
        engagement = student["engagement"] if student else 65

        text = (
            f"Your engagement score is **{engagement}%**. "
            f"📊 Your engagement is highest during **{best_time}** ({patterns[best_time]}%) "
            f"and lowest during **{worst_time}** ({patterns[worst_time]}%).\n\n"
            f"💡 **Recommendation:** Your engagement is highest between 9 AM and 12 PM. "
            f"Consider scheduling difficult subjects during this period for optimal learning."
        )

        return self.respond(
            text=text,
            confidence=0.88,
            data={
                "engagement_score": engagement,
                "patterns": patterns,
                "best_time_slot": best_time,
                "worst_time_slot": worst_time,
                "recommendation": "Schedule difficult subjects during 9 AM - 12 PM peak engagement window.",
            },
        )

    def _handle_schedule(self, query: str, student_id: str) -> dict:
        today = datetime.now().strftime("%A")
        today_classes = [c for c in TIMETABLE if c["day"] == today]

        if not today_classes:
            text = "You have no classes scheduled for today. Enjoy your free time! 🎉"
        else:
            text = "**Today's Schedule:**\n"
            for cls in today_classes:
                text += f"• {cls['time']} — {cls['course']} ({cls['room']}) with {cls['teacher']}\n"

            # Next class
            now = datetime.now()
            current_time = now.strftime("%H:%M")
            next_class = None
            for cls in today_classes:
                start_time = cls["time"].split("-")[0]
                if start_time > current_time:
                    next_class = cls
                    break

            if next_class:
                text += f"\n⏰ **Next class:** {next_class['course']} at {next_class['time']} in {next_class['room']}"

        return self.respond(text=text, confidence=0.9, data={"today_classes": today_classes})

    def _handle_academic(self, query: str, student_id: str) -> dict:
        student = next((s for s in STUDENTS if s["id"] == student_id), None)
        dept = student["department"] if student else "CSE"
        dept_courses = [c for c in COURSES if c["department"] == dept]

        text = f"📚 **{dept} Department — Available Courses:**\n"
        for c in dept_courses:
            text += f"• {c['code']}: {c['name']} ({c['credits']} credits) — {c['teacher']}\n"

        return self.respond(
            text=text,
            confidence=0.9,
            data={"department": dept, "courses": dept_courses},
        )

    def _handle_recommendations(self, student_id: str) -> dict:
        student = next((s for s in STUDENTS if s["id"] == student_id), None)
        if not student:
            return self.respond("Unable to generate recommendations.", confidence=0.5)

        recommendations = []
        if student["attendance"] < 80:
            recommendations.append("⚠️ Increase class attendance — currently below 80%")
        if student["engagement"] < 70:
            recommendations.append("🧠 Try active learning techniques — engagement score needs improvement")
        if student["semester"] <= 3:
            recommendations.append("📖 Consider joining a study group for better subject understanding")
        if student["engagement"] >= 85:
            recommendations.append("🌟 Excellent engagement! Consider mentoring other students")

        text = "**Personalized Recommendations:**\n\n" + "\n".join(f"• {r}" for r in recommendations)
        return self.respond(
            text=text,
            confidence=0.85,
            data={"student_id": student_id, "recommendations": recommendations},
        )
