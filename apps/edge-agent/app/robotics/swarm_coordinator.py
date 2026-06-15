# ─── SmartCampus AI — Multi-Robot Coordination ─────
# Part 9: Swarm intelligence for task allocation,
# inter-robot communication, collision prevention, load balancing.

from __future__ import annotations
from dataclasses import dataclass, field
from typing import Optional, Callable
from enum import Enum
from datetime import datetime
import random
import asyncio

from .robot_manager import RobotManager, Robot, RobotMission, RobotType, RobotStatus


@dataclass
class CoordinationTask:
    id: str
    description: str
    required_robots: int = 1
    preferred_type: Optional[RobotType] = None
    assigned_robots: list[str] = field(default_factory=list)
    status: str = "pending"  # pending, assigned, in_progress, completed
    priority: int = 1
    created_at: str = field(default_factory=lambda: datetime.now().isoformat())

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "description": self.description,
            "required_robots": self.required_robots,
            "preferred_type": self.preferred_type.value if self.preferred_type else None,
            "assigned_robots": self.assigned_robots,
            "status": self.status,
            "priority": self.priority,
        }


class SwarmCoordinator:
    """Coordinates multiple robots for complex tasks."""

    def __init__(self, robot_manager: RobotManager):
        self.robot_manager = robot_manager
        self.tasks: dict[str, CoordinationTask] = {}
        self._task_counter = 0

    def create_task(self, description: str, required_robots: int = 1, preferred_type: Optional[RobotType] = None) -> str:
        """Create a new coordination task."""
        self._task_counter += 1
        task_id = f"coord-{self._task_counter:04d}"
        task = CoordinationTask(
            id=task_id,
            description=description,
            required_robots=required_robots,
            preferred_type=preferred_type,
            priority=random.randint(1, 5),
        )
        self.tasks[task_id] = task
        return task_id

    def assign_task(self, task_id: str) -> bool:
        """Assign robots to a task using swarm intelligence."""
        task = self.tasks.get(task_id)
        if not task or task.status != "pending":
            return False

        available = self.robot_manager.get_available_robots()
        if task.preferred_type:
            preferred = [r for r in available if r.type == task.preferred_type]
            if len(preferred) >= task.required_robots:
                selected = random.sample(preferred, task.required_robots)
            else:
                selected = preferred + random.sample(available, task.required_robots - len(preferred))
        else:
            selected = random.sample(available, min(task.required_robots, len(available)))

        if len(selected) < task.required_robots:
            return False

        for robot in selected:
            robot.status = RobotStatus.ON_MISSION
            task.assigned_robots.append(robot.id)

        task.status = "assigned"
        return True

    def complete_task(self, task_id: str) -> bool:
        """Mark a coordination task as completed and free robots."""
        task = self.tasks.get(task_id)
        if not task:
            return False

        task.status = "completed"
        for robot_id in task.assigned_robots:
            robot = self.robot_manager.get_robot(robot_id)
            if robot:
                robot.status = RobotStatus.IDLE
                robot.total_missions += 1

        return True

    def simulate_cleaning_coordination(self) -> dict:
        """Simulate a coordinated cleaning operation (swarm example)."""
        buildings = ["Engineering Block", "Science Block", "Library", "Auditorium", "Cafeteria"]
        building = random.choice(buildings)

        task_id = self.create_task(
            description=f"Coordinate cleaning of {building} — all floors",
            required_robots=random.randint(2, 4),
            preferred_type=RobotType.CLEANING,
        )

        assigned = self.assign_task(task_id)
        if assigned:
            self.complete_task(task_id)

        return {
            "task_id": task_id,
            "building": building,
            "assigned": assigned,
            "task": self.tasks.get(task_id).to_dict() if task_id in self.tasks else None,
        }

    def simulate_escort_visitor(self) -> dict:
        """Simulate a visitor escort using assistant robot coordination."""
        task_id = self.create_task(
            description="Escort VIP visitor from Main Gate to Administration Building",
            required_robots=1,
            preferred_type=RobotType.ASSISTANT,
        )
        assigned = self.assign_task(task_id)
        return {
            "task_id": task_id,
            "type": "escort",
            "assigned": assigned,
            "task": self.tasks.get(task_id).to_dict() if task_id in self.tasks else None,
        }

    def get_coordination_summary(self) -> dict:
        return {
            "total_tasks": len(self.tasks),
            "pending": sum(1 for t in self.tasks.values() if t.status == "pending"),
            "assigned": sum(1 for t in self.tasks.values() if t.status == "assigned"),
            "completed": sum(1 for t in self.tasks.values() if t.status == "completed"),
            "active": sum(1 for t in self.tasks.values() if t.status in ("pending", "assigned")),
        }
