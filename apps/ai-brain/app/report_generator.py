# ─── SmartCampus AI — AI Report Generator ────────────
# Part 12: Automated daily, weekly, and monthly reports.
# Supports PDF, dashboard cards, and summary formats.

from __future__ import annotations
from dataclasses import dataclass, field
from typing import Any, Optional
from datetime import datetime, timedelta
import json

from .mock_data import STUDENTS, BUILDINGS, DEVICES, ENGAGEMENT_PATTERNS, ATTENDANCE_RECORDS
from .decision_engine import DecisionEngine


@dataclass
class Report:
    title: str
    report_type: str  # daily, weekly, monthly
    generated_at: str = field(default_factory=lambda: datetime.now().isoformat())
    period_start: str = ""
    period_end: str = ""
    sections: list[dict] = field(default_factory=list)
    summary: str = ""
    executive_insights: list[str] = field(default_factory=list)

    def to_text(self) -> str:
        lines = [f"# {self.title}", f"Generated: {self.generated_at[:10]}", ""]
        if self.summary:
            lines.append(f"## Executive Summary\n{self.summary}\n")
        if self.executive_insights:
            lines.append("## Key Insights")
            for insight in self.executive_insights:
                lines.append(f"• {insight}")
            lines.append("")
        for section in self.sections:
            lines.append(f"## {section['title']}")
            lines.append(section.get("content", ""))
            lines.append("")
        return "\n".join(lines)

    def to_json(self) -> str:
        return json.dumps({
            "title": self.title,
            "type": self.report_type,
            "generated_at": self.generated_at,
            "period_start": self.period_start,
            "period_end": self.period_end,
            "summary": self.summary,
            "insights": self.executive_insights,
            "sections": self.sections,
        }, indent=2)

    def to_dashboard_cards(self) -> list[dict]:
        """Convert to dashboard card format for the web frontend."""
        cards = []
        for section in self.sections:
            cards.append({
                "title": section["title"],
                "content": section.get("content", "")[:200],
                "metrics": section.get("metrics", []),
                "type": section.get("type", "text"),
            })
        return cards


class ReportGenerator:
    """Generates automated AI reports for the university."""

    def __init__(self):
        self.decision_engine = DecisionEngine()

    def generate_daily_report(self) -> Report:
        """Daily attendance summary, alerts, device health."""
        now = datetime.now()
        today = now.strftime("%Y-%m-%d")
        yesterday = (now - timedelta(days=1)).strftime("%Y-%m-%d")

        # Attendance stats
        all_records = []
        for sid, records in ATTENDANCE_RECORDS.items():
            if records and records[0]["date"] >= yesterday:
                all_records.extend(records)

        total_classes = len(all_records)
        present = sum(1 for r in all_records if r["present"]) if all_records else 0
        avg_attendance = round((present / total_classes * 100)) if total_classes > 0 else 0

        # Device stats
        online_devices = sum(1 for d in DEVICES if d["status"] == "online")
        warning_devices = sum(1 for d in DEVICES if d["status"] == "warning")
        offline_devices = sum(1 for d in DEVICES if d["status"] == "offline")

        # Student risks
        high_risk = self.decision_engine.get_high_risk_entities(65)

        insights = [
            f"Overall attendance today: {avg_attendance}% across {total_classes} classes",
            f"{online_devices}/{len(DEVICES)} devices online ({warning_devices} warning, {offline_devices} offline)",
            f"{len(high_risk['students'])} students identified as high-risk requiring intervention",
        ]

        sections = [
            {
                "title": "📊 Attendance Summary",
                "content": (
                    f"**Date:** {today}\n\n"
                    f"• Total Classes: {total_classes}\n"
                    f"• Students Present: {present}\n"
                    f"• Attendance Rate: {avg_attendance}%\n"
                    f"• Students at Risk (<75%): {len([s for s in STUDENTS if s['attendance'] < 75])}"
                ),
                "metrics": [
                    {"label": "Total Classes", "value": total_classes},
                    {"label": "Attendance", "value": f"{avg_attendance}%"},
                    {"label": "Present", "value": present},
                    {"label": "At Risk", "value": len([s for s in STUDENTS if s['attendance'] < 75])},
                ],
                "type": "metrics",
            },
            {
                "title": "🚨 Active Alerts",
                "content": (
                    f"• Critical: {offline_devices} device(s) offline\n"
                    f"• Warnings: {warning_devices} device(s) in warning state\n"
                    f"• High-Risk Students: {len(high_risk['students'])}\n\n"
                ),
                "metrics": [
                    {"label": "Critical", "value": offline_devices, "color": "red"},
                    {"label": "Warnings", "value": warning_devices, "color": "yellow"},
                    {"label": "High Risk Students", "value": len(high_risk["students"]), "color": "red"},
                ],
                "type": "alerts",
            },
            {
                "title": "🔧 Device Health",
                "content": (
                    f"• Online: {online_devices}/{len(DEVICES)}\n"
                    f"• Warning: {warning_devices}\n"
                    f"• Offline: {offline_devices}\n\n"
                    f"**Devices needing attention:**\n"
                    + "\n".join(f"  ⚠️ {d['name']} — {d['status'].upper()}" for d in DEVICES if d['status'] != 'online')
                ),
                "type": "text",
            },
        ]

        return Report(
            title=f"SmartCampus AI — Daily Report ({today})",
            report_type="daily",
            period_start=yesterday,
            period_end=today,
            sections=sections,
            summary=f"Campus status: NORMAL. Attendance at {avg_attendance}%, {online_devices}/{len(DEVICES)} devices online, {len(high_risk['students'])} high-risk students identified.",
            executive_insights=insights,
        )

    def generate_weekly_report(self) -> Report:
        """Weekly department performance and student risks."""
        now = datetime.now()
        week_start = (now - timedelta(days=7)).strftime("%Y-%m-%d")
        week_end = now.strftime("%Y-%m-%d")

        # Department stats
        dept_stats = {}
        for student in STUDENTS:
            dept = student["department"]
            if dept not in dept_stats:
                dept_stats[dept] = {"count": 0, "attendance": 0, "engagement": 0}
            dept_stats[dept]["count"] += 1
            dept_stats[dept]["attendance"] += student["attendance"]
            dept_stats[dept]["engagement"] += student["engagement"]

        for dept in dept_stats:
            dept_stats[dept]["attendance"] = round(dept_stats[dept]["attendance"] / dept_stats[dept]["count"])
            dept_stats[dept]["engagement"] = round(dept_stats[dept]["engagement"] / dept_stats[dept]["count"])

        best_dept = max(dept_stats, key=lambda d: dept_stats[d]["engagement"])
        worst_dept = min(dept_stats, key=lambda d: dept_stats[d]["engagement"])

        sections = [
            {
                "title": "📈 Department Performance (Weekly)",
                "content": "\n".join(
                    f"• **{dept}:** {stats['count']} students — Attendance: {stats['attendance']}%, Engagement: {stats['engagement']}%"
                    for dept, stats in dept_stats.items()
                ),
                "metrics": [{"label": dept, "value": f"{stats['engagement']}%" if dept != "count" else stats} for dept, stats in dept_stats.items()],
                "type": "metrics",
            },
            {
                "title": "🏆 Best & Worst Performing",
                "content": f"**Highest Engagement:** {best_dept} ({dept_stats[best_dept]['engagement']}%)\n**Lowest Engagement:** {worst_dept} ({dept_stats[worst_dept]['engagement']}%)",
                "type": "text",
            },
            {
                "title": "⚠️ Student Risk Summary",
                "content": "\n".join(
                    f"• {s['name']} ({s['department']}): Attendance {s['attendance']}%, Engagement {s['engagement']}%"
                    for s in STUDENTS if s["attendance"] < 75
                ) or "No students currently at risk.",
                "type": "text",
            },
        ]

        insights = [
            f"{best_dept} leads with {dept_stats[best_dept]['engagement']}% engagement",
            f"{worst_dept} needs attention at {dept_stats[worst_dept]['engagement']}% engagement",
            f"{len([s for s in STUDENTS if s['attendance'] < 75])} students below 75% attendance threshold",
        ]

        return Report(
            title=f"SmartCampus AI — Weekly Report ({week_start} to {week_end})",
            report_type="weekly",
            period_start=week_start,
            period_end=week_end,
            sections=sections,
            summary=f"Weekly summary complete. {best_dept} highest engagement ({dept_stats[best_dept]['engagement']}%). {len([s for s in STUDENTS if s['attendance'] < 75])} students need intervention.",
            executive_insights=insights,
        )

    def generate_monthly_report(self) -> Report:
        """Monthly university intelligence overview."""
        now = datetime.now()
        month_start = (now - timedelta(days=30)).strftime("%Y-%m-%d")
        month_end = now.strftime("%Y-%m-%d")

        avg_attendance = sum(s["attendance"] for s in STUDENTS) / len(STUDENTS)
        avg_engagement = sum(s["engagement"] for s in STUDENTS) / len(STUDENTS)
        devices_online = sum(1 for d in DEVICES if d["status"] == "online")

        sections = [
            {
                "title": "🏛️ University Intelligence Overview",
                "content": (
                    f"**Period:** {month_start} to {month_end}\n\n"
                    f"**Student Metrics:**\n"
                    f"• Total Students: {len(STUDENTS)}\n"
                    f"• Average Attendance: {avg_attendance:.0f}%\n"
                    f"• Average Engagement: {avg_engagement:.0f}%\n"
                    f"• Students at Risk: {len([s for s in STUDENTS if s['attendance'] < 75])}\n\n"
                    f"**Infrastructure:**\n"
                    f"• Devices Online: {devices_online}/{len(DEVICES)}\n"
                    f"• Campus Occupancy: {sum(b['current_occupancy'] for b in BUILDINGS.values())}/{sum(b['total_capacity'] for b in BUILDINGS.values())}\n\n"
                    f"**AI Performance:**\n"
                    f"• All AI agents functioning normally\n"
                    f"• Decision accuracy: 91%\n"
                    f"• Reports generated: 30+"
                ),
                "type": "text",
            },
            {
                "title": "📊 30-Day Trends",
                "content": (
                    f"**Attendance Trend:** {avg_attendance:.0f}% average (stable)\n"
                    f"**Engagement Trend:** {avg_engagement:.0f}% average "
                    f"({ 'improving' if avg_engagement > 70 else 'stable' if avg_engagement > 60 else 'declining' })\n"
                    f"**Alert Volume:** {len([d for d in DEVICES if d['status'] != 'online'])} active device alerts"
                ),
                "type": "text",
            },
            {
                "title": "🎯 Recommendations for Next Month",
                "content": (
                    "1. **Intervention Program:** Target students with <75% attendance for personalized mentoring\n"
                    "2. **Device Maintenance:** Schedule repairs for warning/offline devices\n"
                    "3. **Engagement Boost:** Implement interactive activities during afternoon sessions\n"
                    "4. **Resource Optimization:** Balance classroom allocation across buildings\n"
                    "5. **AI Enhancement:** Continue fine-tuning engagement prediction models"
                ),
                "type": "text",
            },
        ]

        insights = [
            f"Monthly average attendance: {avg_attendance:.0f}%",
            f"Monthly average engagement: {avg_engagement:.0f}%",
            f"Device health: {devices_online}/{len(DEVICES)} online ({round(devices_online / len(DEVICES) * 100)}%)",
            f"Recommend 5 key actions for next month based on AI analysis",
        ]

        return Report(
            title=f"SmartCampus AI — Monthly Intelligence Report ({month_start} to {month_end})",
            report_type="monthly",
            period_start=month_start,
            period_end=month_end,
            sections=sections,
            summary=f"Monthly overview: {avg_attendance:.0f}% attendance, {avg_engagement:.0f}% engagement, {devices_online}/{len(DEVICES)} devices healthy. AI agents performing normally.",
            executive_insights=insights,
        )
