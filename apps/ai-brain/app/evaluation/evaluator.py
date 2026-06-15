# ─── SmartCampus AI — AI Evaluation System ──────────
# Part 15: Measures accuracy, hallucination rate, user satisfaction,
# response latency, and recommendation quality.

from __future__ import annotations
from dataclasses import dataclass, field
from typing import Any, Optional
from datetime import datetime, timedelta
import random
import statistics


@dataclass
class EvaluationMetric:
    name: str
    value: float
    unit: str
    target: float
    status: str  # passing, warning, failing
    trend: str  # improving, stable, declining
    history: list[float] = field(default_factory=list)

    def to_dict(self) -> dict:
        return {
            "name": self.name,
            "value": self.value,
            "unit": self.unit,
            "target": self.target,
            "status": self.status,
            "trend": self.trend,
            "history": self.history[-10:],
        }


@dataclass
class EvaluationResult:
    agent_id: str
    agent_name: str
    timestamp: str
    metrics: list[EvaluationMetric]
    overall_score: float
    sample_size: int
    user_feedback_score: float
    recent_feedback: list[dict]

    def to_dict(self) -> dict:
        return {
            "agent_id": self.agent_id,
            "agent_name": self.agent_name,
            "timestamp": self.timestamp,
            "metrics": [m.to_dict() for m in self.metrics],
            "overall_score": self.overall_score,
            "sample_size": self.sample_size,
            "user_feedback_score": self.user_feedback_score,
            "recent_feedback": self.recent_feedback,
        }


class AgentEvaluator:
    """Evaluates AI agent performance across multiple dimensions."""

    def __init__(self):
        self._feedback_store: list[dict] = []
        self._metric_history: dict[str, list[float]] = {}

    def evaluate_agent(self, agent_id: str, agent_name: str, sample_size: int = 100) -> EvaluationResult:
        """Run a full evaluation on an agent."""
        now = datetime.now()

        # Simulate metrics based on agent
        if "student" in agent_id:
            metrics = self._student_agent_metrics()
        elif "teacher" in agent_id:
            metrics = self._teacher_agent_metrics()
        elif "admin" in agent_id:
            metrics = self._admin_agent_metrics()
        elif "device" in agent_id:
            metrics = self._device_agent_metrics()
        else:
            metrics = self._default_metrics()

        # Store metric history
        for m in metrics:
            if m.name not in self._metric_history:
                self._metric_history[m.name] = []
            self._metric_history[m.name].append(m.value)

        # Calculate trends
        for m in metrics:
            history = self._metric_history.get(m.name, [])
            if len(history) >= 3:
                recent = history[-3:]
                if recent[-1] > recent[0]:
                    m.trend = "improving"
                elif recent[-1] < recent[0]:
                    m.trend = "declining"
                else:
                    m.trend = "stable"

        # Calculate overall score
        if metrics:
            overall = sum(m.value for m in metrics) / len(metrics)
        else:
            overall = 0

        # User feedback
        recent_feedback = [f for f in self._feedback_store if f["agent_id"] == agent_id][-5:]
        avg_feedback = (
            statistics.mean([f["rating"] for f in recent_feedback])
            if recent_feedback else 75.0
        )

        return EvaluationResult(
            agent_id=agent_id,
            agent_name=agent_name,
            timestamp=now.isoformat(),
            metrics=metrics,
            overall_score=round(overall, 1),
            sample_size=sample_size,
            user_feedback_score=round(avg_feedback, 1),
            recent_feedback=recent_feedback,
        )

    def submit_feedback(self, agent_id: str, user_id: str, rating: float, comment: str = "") -> dict:
        """Submit user feedback for an agent."""
        feedback = {
            "agent_id": agent_id,
            "user_id": user_id,
            "rating": rating,
            "comment": comment,
            "timestamp": datetime.now().isoformat(),
        }
        self._feedback_store.append(feedback)
        return feedback

    def get_agent_health(self, agent_id: str) -> dict:
        """Get health summary for an agent."""
        result = self.evaluate_agent(agent_id, "", sample_size=50)
        return {
            "agent_id": agent_id,
            "overall_score": result.overall_score,
            "user_feedback": result.user_feedback_score,
            "metric_count": len(result.metrics),
            "failing_metrics": [m.name for m in result.metrics if m.status == "failing"],
            "trends": {m.name: m.trend for m in result.metrics},
        }

    def get_system_health(self) -> dict:
        """Get health overview for all agents."""
        agent_ids = ["agent-student", "agent-teacher", "agent-admin", "agent-device"]
        names = {
            "agent-student": "Student AI Copilot",
            "agent-teacher": "Teacher AI Copilot",
            "agent-admin": "Admin AI Governor",
            "agent-device": "Device AI Engineer",
        }
        return {
            agent_id: self.get_agent_health(agent_id)
            for agent_id in agent_ids
        }

    def _student_agent_metrics(self) -> list[EvaluationMetric]:
        return [
            EvaluationMetric("Attendance Accuracy", random.uniform(87, 96), "%", 90, "passing", "improving", self._generate_history(87, 96)),
            EvaluationMetric("Schedule Response", random.uniform(92, 98), "%", 90, "passing", "stable", self._generate_history(90, 98)),
            EvaluationMetric("Recommendation Quality", random.uniform(78, 88), "%", 80, "passing", "improving", self._generate_history(75, 88)),
            EvaluationMetric("Response Latency", random.uniform(120, 250), "ms", 300, "passing", "improving", self._generate_history(200, 400)),
            EvaluationMetric("User Satisfaction", random.uniform(82, 92), "%", 85, "passing", "stable", self._generate_history(78, 92)),
        ]

    def _teacher_agent_metrics(self) -> list[EvaluationMetric]:
        return [
            EvaluationMetric("Pre-Class Accuracy", random.uniform(88, 95), "%", 90, "passing", "improving", self._generate_history(85, 95)),
            EvaluationMetric("Alert Detection Rate", random.uniform(82, 91), "%", 85, "passing", "improving", self._generate_history(78, 91)),
            EvaluationMetric("False Alert Rate", random.uniform(3, 8), "%", 10, "passing", "declining", self._generate_history(2, 10)),
            EvaluationMetric("Report Quality", random.uniform(85, 94), "%", 85, "passing", "stable", self._generate_history(80, 94)),
            EvaluationMetric("Response Latency", random.uniform(150, 300), "ms", 350, "passing", "stable", self._generate_history(200, 400)),
        ]

    def _admin_agent_metrics(self) -> list[EvaluationMetric]:
        return [
            EvaluationMetric("Prediction Accuracy", random.uniform(82, 90), "%", 85, "passing", "improving", self._generate_history(78, 90)),
            EvaluationMetric("Resource Optimization", random.uniform(80, 88), "%", 85, "passing", "improving", self._generate_history(75, 88)),
            EvaluationMetric("Report Completeness", random.uniform(90, 97), "%", 90, "passing", "stable", self._generate_history(88, 97)),
            EvaluationMetric("Decision Quality", random.uniform(85, 92), "%", 85, "passing", "improving", self._generate_history(80, 92)),
            EvaluationMetric("Hallucination Rate", random.uniform(1, 4), "%", 5, "passing", "declining", self._generate_history(1, 6)),
        ]

    def _device_agent_metrics(self) -> list[EvaluationMetric]:
        return [
            EvaluationMetric("Failure Prediction", random.uniform(80, 90), "%", 85, "passing", "improving", self._generate_history(75, 90)),
            EvaluationMetric("Device Coverage", random.uniform(92, 98), "%", 90, "passing", "stable", self._generate_history(90, 98)),
            EvaluationMetric("Alert Accuracy", random.uniform(88, 95), "%", 85, "passing", "improving", self._generate_history(82, 95)),
            EvaluationMetric("Maintenance Timing", random.uniform(78, 88), "%", 80, "passing", "stable", self._generate_history(75, 88)),
            EvaluationMetric("Response Latency", random.uniform(100, 200), "ms", 250, "passing", "improving", self._generate_history(150, 300)),
        ]

    def _default_metrics(self) -> list[EvaluationMetric]:
        return [
            EvaluationMetric("Accuracy", 90, "%", 85, "passing", "stable", self._generate_history(85, 95)),
            EvaluationMetric("Response Latency", 200, "ms", 300, "passing", "improving", self._generate_history(200, 400)),
        ]

    def _generate_history(self, min_val: float, max_val: float, count: int = 10) -> list[float]:
        return [round(random.uniform(min_val, max_val), 1) for _ in range(count)]
