"""SmartCampus AI — Behavioral Analytics Service.

Generates long-term insights, trends, and reports from behavior data.
"""

import time
import numpy as np
from typing import List, Dict, Optional
from collections import defaultdict
from ..models import BehaviorType, BehaviorEvent, EngagementRecord, AlertSeverity


class BehaviorAnalytics:
    """Computes behavioral analytics and trends over time."""

    def __init__(self):
        self._behavior_log: List[BehaviorEvent] = []
        self._engagement_log: List[EngagementRecord] = []
        self._max_log_size = 10000

    def record_behavior(self, event: BehaviorEvent):
        """Record a behavior event for analytics."""
        self._behavior_log.append(event)
        if len(self._behavior_log) > self._max_log_size:
            self._behavior_log.pop(0)

    def record_engagement(self, record: EngagementRecord):
        """Record an engagement score for analytics."""
        self._engagement_log.append(record)
        if len(self._engagement_log) > self._max_log_size:
            self._engagement_log.pop(0)

    def get_engagement_trend(self, minutes: int = 30) -> List[dict]:
        """Get engagement score trend over time."""
        if not self._engagement_log:
            return []

        cutoff = time.time() - minutes * 60
        recent = [r for r in self._engagement_log if r.timestamp > cutoff]

        # Group into buckets
        buckets = defaultdict(list)
        for rec in recent:
            bucket_key = int(rec.timestamp / 60)  # Per-minute buckets
            buckets[bucket_key].append(rec.score)

        trend = []
        for bucket in sorted(buckets.keys()):
            avg = np.mean(buckets[bucket])
            trend.append({
                "time": bucket * 60,
                "score": round(float(avg), 1),
            })

        return trend

    def get_behavior_distribution(self, minutes: int = 60) -> Dict[str, int]:
        """Get distribution of behavior types over time."""
        cutoff = time.time() - minutes * 60
        recent = [e for e in self._behavior_log if e.start_time > cutoff]

        distribution: Dict[str, int] = {}
        for bt in BehaviorType:
            distribution[bt.value] = 0

        for event in recent:
            distribution[event.behavior_type.value] = distribution.get(
                event.behavior_type.value, 0
            ) + 1

        return distribution

    def get_engagement_summary(self) -> dict:
        """Get summary engagement statistics."""
        if not self._engagement_log:
            return {"average": 0, "min": 0, "max": 0, "current": 0}

        recent = self._engagement_log[-100:]
        scores = [r.score for r in recent]
        return {
            "average": round(np.mean(scores), 1),
            "min": round(min(scores), 1),
            "max": round(max(scores), 1),
            "current": round(scores[-1], 1) if scores else 0,
        }

    def get_high_risk_students(self, threshold: float = 40.0) -> List[str]:
        """Get students with consistently low engagement."""
        if not self._engagement_log:
            return []

        # Group by student
        student_scores = defaultdict(list)
        for rec in self._engagement_log:
            student_scores[rec.student_id].append(rec.score)

        at_risk = []
        for student_id, scores in student_scores.items():
            avg = np.mean(scores[-20:]) if len(scores) >= 20 else np.mean(scores)
            if avg < threshold:
                at_risk.append(student_id)

        return at_risk

    def get_classroom_comparison(self) -> dict:
        """Get classroom-level engagement comparison data."""
        summary = self.get_engagement_summary()
        distribution = self.get_behavior_distribution()
        at_risk = self.get_high_risk_students()

        return {
            "engagement_summary": summary,
            "behavior_distribution": distribution,
            "high_risk_count": len(at_risk),
            "total_behavior_events": len(self._behavior_log),
            "total_engagement_records": len(self._engagement_log),
        }


# Global analytics instance
behavior_analytics = BehaviorAnalytics()
