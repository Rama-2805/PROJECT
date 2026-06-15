# ─── SmartCampus AI — Autonomous Workflows ──────────
# Part 10: Scheduled AI agent workflows that run
# daily, weekly, and on-demand to automate campus operations.

from __future__ import annotations
from dataclasses import dataclass, field
from typing import Any, Optional, Callable
from datetime import datetime, timedelta
import asyncio
import logging
import time

from ..agent_core import (
    AgentRegistry, MemorySystem, CommunicationProtocol,
    AgentMessage, BaseAgent,
)
from ..agents.student_agent import StudentAgent
from ..agents.teacher_agent import TeacherAgent
from ..agents.admin_agent import AdminGovernorAgent
from ..agents.device_agent import DeviceEngineerAgent
from ..report_generator import ReportGenerator


@dataclass
class WorkflowTask:
    id: str
    name: str
    schedule: str  # daily, weekly, monthly, on_demand
    agent_id: str
    action: str
    priority: int = 0
    last_run: Optional[str] = None
    next_run: Optional[str] = None
    enabled: bool = True

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "name": self.name,
            "schedule": self.schedule,
            "agent_id": self.agent_id,
            "action": self.action,
            "priority": self.priority,
            "last_run": self.last_run,
            "next_run": self.next_run,
            "enabled": self.enabled,
        }


class WorkflowEngine:
    """Orchestrates autonomous AI agent workflows."""

    def __init__(self, registry: AgentRegistry, memory: MemorySystem, comms: CommunicationProtocol):
        self.registry = registry
        self.memory = memory
        self.comms = comms
        self.tasks: list[WorkflowTask] = []
        self._setup_default_tasks()
        self.report_generator = ReportGenerator()
        self._running = False

    def _setup_default_tasks(self) -> None:
        """Register default autonomous workflows."""
        default_tasks = [
            WorkflowTask(
                id="wf-001", name="Daily Attendance Risk Report", schedule="daily",
                agent_id="agent-student", action="generate_risk_report", priority=1,
            ),
            WorkflowTask(
                id="wf-002", name="Device Health Check", schedule="daily",
                agent_id="agent-device", action="check_device_health", priority=2,
            ),
            WorkflowTask(
                id="wf-003", name="Morning Classroom Briefing", schedule="daily",
                agent_id="agent-teacher", action="pre_class_briefing", priority=3,
            ),
            WorkflowTask(
                id="wf-004", name="Weekly Department Performance", schedule="weekly",
                agent_id="agent-admin", action="department_performance", priority=1,
            ),
            WorkflowTask(
                id="wf-005", name="Executive Summary Report", schedule="weekly",
                agent_id="agent-admin", action="executive_report", priority=2,
            ),
            WorkflowTask(
                id="wf-006", name="Device Failure Prediction", schedule="daily",
                agent_id="agent-device", action="predict_failures", priority=3,
            ),
            WorkflowTask(
                id="wf-007", name="Monthly University Intelligence", schedule="monthly",
                agent_id="agent-admin", action="monthly_intelligence", priority=1,
            ),
            WorkflowTask(
                id="wf-008", name="Student Engagement Analysis", schedule="weekly",
                agent_id="agent-student", action="engagement_analysis", priority=2,
            ),
            WorkflowTask(
                id="wf-009", name="Resource Optimization Scan", schedule="weekly",
                agent_id="agent-admin", action="resource_scan", priority=3,
            ),
            WorkflowTask(
                id="wf-010", name="Firmware Update Check", schedule="weekly",
                agent_id="agent-device", action="firmware_check", priority=4,
            ),
        ]
        self.tasks = default_tasks

    def add_task(self, task: WorkflowTask) -> None:
        self.tasks.append(task)

    def remove_task(self, task_id: str) -> bool:
        for i, t in enumerate(self.tasks):
            if t.id == task_id:
                self.tasks.pop(i)
                return True
        return False

    def get_tasks_by_schedule(self, schedule: str) -> list[WorkflowTask]:
        return [t for t in self.tasks if t.schedule == schedule and t.enabled]

    async def execute_task(self, task: WorkflowTask) -> dict:
        """Execute a single workflow task."""
        logging.info(f"Executing workflow: {task.name}")

        agent_record = self.registry.get(task.agent_id)
        if not agent_record:
            return {"task_id": task.id, "status": "failed", "error": f"Agent {task.agent_id} not found"}

        # Simulate agent processing
        await asyncio.sleep(0.5)

        # Generate report if applicable
        if "report" in task.action.lower():
            if task.schedule == "daily":
                report = self.report_generator.generate_daily_report()
            elif task.schedule == "weekly":
                report = self.report_generator.generate_weekly_report()
            elif task.schedule == "monthly":
                report = self.report_generator.generate_monthly_report()
            else:
                report = self.report_generator.generate_daily_report()

            # Store in memory
            self.memory.add_agent_memory(
                task.agent_id,
                report.summary,
                source=task.name,
            )

            # Notify via comms
            self.comms.send(AgentMessage(
                sender_id=task.agent_id,
                receiver_id="agent-admin",
                intent="report_generated",
                payload={"task_id": task.id, "report_type": task.schedule, "summary": report.summary},
            ))

        # Update task status
        task.last_run = datetime.now().isoformat()
        task.next_run = self._calculate_next_run(task.schedule)

        return {
            "task_id": task.id,
            "name": task.name,
            "status": "completed",
            "last_run": task.last_run,
            "next_run": task.next_run,
        }

    async def execute_scheduled_tasks(self, schedule: str) -> list[dict]:
        """Execute all tasks for a given schedule type."""
        tasks = self.get_tasks_by_schedule(schedule)
        results = []
        for task in tasks:
            result = await self.execute_task(task)
            results.append(result)
        return results

    async def execute_all_tasks(self) -> list[dict]:
        """Execute all enabled tasks."""
        results = []
        for task in self.tasks:
            if task.enabled:
                result = await self.execute_task(task)
                results.append(result)
        return results

    def _calculate_next_run(self, schedule: str) -> str:
        now = datetime.now()
        if schedule == "daily":
            next_time = now + timedelta(days=1)
        elif schedule == "weekly":
            next_time = now + timedelta(weeks=1)
        elif schedule == "monthly":
            next_time = now + timedelta(days=30)
        else:
            next_time = now + timedelta(hours=1)
        return next_time.replace(hour=6, minute=0, second=0).isoformat()

    # ── Background Runner ──────────────────────────

    async def run_background(self, interval_seconds: int = 3600) -> None:
        """Run the workflow engine in the background."""
        self._running = True
        while self._running:
            now = datetime.now()
            hour = now.hour

            if hour == 6:  # 6 AM daily tasks
                await self.execute_scheduled_tasks("daily")
            elif hour == 8 and now.weekday() == 0:  # 8 AM Monday weekly
                await self.execute_scheduled_tasks("weekly")
            elif now.day == 1 and hour == 7:  # 1st of month at 7 AM
                await self.execute_scheduled_tasks("monthly")

            await asyncio.sleep(interval_seconds)

    def stop_background(self) -> None:
        self._running = False
