# ─── SmartCampus AI — Campus Robotics Platform ─────
# Part 1, 3: Intelligent robots for campus operations:
# Student Assistant, Delivery, and Cleaning robots.
# Part 9: Multi-Robot Coordination / Swarm Intelligence.

from __future__ import annotations
from dataclasses import dataclass, field
from typing import Optional, Callable
from enum import Enum
from datetime import datetime, timedelta
import random
import asyncio
import json


class RobotType(Enum):
    ASSISTANT = "assistant"
    DELIVERY = "delivery"
    CLEANING = "cleaning"
    SECURITY = "security"


class RobotStatus(Enum):
    IDLE = "idle"
    CHARGING = "charging"
    ON_MISSION = "on_mission"
    RETURNING = "returning"
    MAINTENANCE = "maintenance"
    ERROR = "error"
    OFFLINE = "offline"


@dataclass
class Position:
    x: float
    y: float
    z: float = 0.0
    building: str = ""
    floor: int = 1
    room: str = ""

    def distance_to(self, other: Position) -> float:
        return ((self.x - other.x) ** 2 + (self.y - other.y) ** 2 + (self.z - other.z) ** 2) ** 0.5


@dataclass
class RobotMission:
    id: str = ""
    type: str = ""  # guide, deliver, clean, patrol, inspect
    target: Position = field(default_factory=Position)
    description: str = ""
    priority: int = 1  # 1-5
    status: str = "pending"  # pending, in_progress, completed, failed, cancelled
    assigned_robot: str = ""
    created_at: str = field(default_factory=lambda: datetime.now().isoformat())
    completed_at: str = ""
    estimated_duration_min: int = 10

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "type": self.type,
            "target": {"building": self.target.building, "floor": self.target.floor, "room": self.target.room},
            "description": self.description,
            "priority": self.priority,
            "status": self.status,
            "assigned_robot": self.assigned_robot,
            "created_at": self.created_at,
            "completed_at": self.completed_at,
            "estimated_duration_min": self.estimated_duration_min,
        }


@dataclass
class Robot:
    id: str
    name: str
    type: RobotType
    status: RobotStatus = RobotStatus.IDLE
    position: Position = field(default_factory=Position)
    battery_level: float = 100.0  # 0-100
    health_status: str = "good"  # good, warning, critical
    current_mission: Optional[str] = None
    firmware_version: str = "3.2.1"
    uptime_hours: float = 0.0
    total_missions: int = 0
    total_distance_km: float = 0.0
    errors: list[dict] = field(default_factory=list)

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "name": self.name,
            "type": self.type.value,
            "status": self.status.value,
            "position": {"x": self.position.x, "y": self.position.y, "building": self.position.building, "floor": self.position.floor},
            "battery_level": round(self.battery_level, 1),
            "health_status": self.health_status,
            "current_mission": self.current_mission,
            "firmware_version": self.firmware_version,
            "uptime_hours": round(self.uptime_hours, 1),
            "total_missions": self.total_missions,
            "total_distance_km": round(self.total_distance_km, 2),
            "errors": self.errors[-5:],
        }


ROBOT_NAMES = {
    RobotType.ASSISTANT: ["Campus Guide Alpha", "InfoBot Beta", "NavHelper Gamma", "GuidePro Delta", "AssistBot Epsilon"],
    RobotType.DELIVERY: ["DeliverBot Prime", "Courier X1", "Package Runner", "FastTrack Mover", "Logistics Omega"],
    RobotType.CLEANING: ["CleanSweep 1", "ScrubMate 2", "DustBuster 3", "MopBot 4", "SanitizePro 5"],
    RobotType.SECURITY: ["Sentinel 1", "Guardian 2", "PatrolBot 3", "Watchtower 4", "Defender 5"],
}

ROBOT_LOCATIONS = [
    Position(10, 20, 0, "Engineering Block", 1, "Lobby"),
    Position(15, 35, 0, "Engineering Block", 2, "CSE Dept"),
    Position(30, 50, 0, "Science Block", 1, "Physics Lab"),
    Position(45, 25, 0, "Library", 1, "Main Hall"),
    Position(60, 40, 0, "Administration", 1, "Reception"),
    Position(55, 15, 0, "Auditorium", 1, "Foyer"),
    Position(25, 60, 0, "Cafeteria", 1, "Dining Area"),
    Position(70, 30, 0, "Sports Complex", 0, "Entrance"),
    Position(80, 55, 0, "Mechanical Block", 1, "Workshop"),
    Position(40, 70, 0, "Hostel Block A", 1, "Common Room"),
]


class RobotManager:
    """Manages the campus robotics fleet."""

    def __init__(self):
        self.robots: dict[str, Robot] = {}
        self.missions: dict[str, RobotMission] = {}
        self._mission_counter = 0
        self._initialize_fleet()

    def _initialize_fleet(self) -> None:
        """Initialize the robotics fleet with simulated robots."""
        # Generate 50 robots (13 per type except security which gets 11)
        robot_type_counts = {
            RobotType.ASSISTANT: 13,
            RobotType.DELIVERY: 13,
            RobotType.CLEANING: 13,
            RobotType.SECURITY: 11,
        }
        robot_idx = 0
        for robot_type, count in robot_type_counts.items():
            for i in range(count):
                robot_id = f"{robot_type.value}-{robot_idx + 1:03d}"
                name_suffix = (i // 5) + 1
                name = f"{ROBOT_NAMES[robot_type][i % len(ROBOT_NAMES[robot_type])]} Mk{name_suffix}"
                loc = ROBOT_LOCATIONS[(robot_idx * 3) % len(ROBOT_LOCATIONS)]
                robot = Robot(
                    id=robot_id,
                    name=name,
                    type=robot_type,
                    status=random.choices(
                        [RobotStatus.IDLE, RobotStatus.CHARGING, RobotStatus.ON_MISSION, RobotStatus.MAINTENANCE],
                        weights=[0.5, 0.25, 0.18, 0.07],
                    )[0],
                    position=Position(
                        x=loc.x + random.uniform(-10, 10),
                        y=loc.y + random.uniform(-10, 10),
                        building=loc.building,
                        floor=max(0, loc.floor + random.randint(-1, 1)),
                    ),
                    battery_level=random.uniform(15, 100),
                    health_status=random.choices(["good", "good", "good", "warning", "critical"], weights=[0.65, 0.15, 0.1, 0.08, 0.02])[0],
                    uptime_hours=random.uniform(5, 1000),
                    total_missions=random.randint(0, 500),
                    total_distance_km=random.uniform(0, 100),
                )
                self.robots[robot_id] = robot
                robot_idx += 1

    def get_robot(self, robot_id: str) -> Optional[Robot]:
        return self.robots.get(robot_id)

    def get_robots_by_type(self, robot_type: RobotType) -> list[Robot]:
        return [r for r in self.robots.values() if r.type == robot_type]

    def get_robots_by_status(self, status: RobotStatus) -> list[Robot]:
        return [r for r in self.robots.values() if r.status == status]

    def get_available_robots(self) -> list[Robot]:
        return [r for r in self.robots.values() if r.status in (RobotStatus.IDLE, RobotStatus.CHARGING) and r.battery_level > 20]

    def get_fleet_summary(self) -> dict:
        return {
            "total": len(self.robots),
            "online": sum(1 for r in self.robots.values() if r.status != RobotStatus.OFFLINE),
            "idle": sum(1 for r in self.robots.values() if r.status == RobotStatus.IDLE),
            "on_mission": sum(1 for r in self.robots.values() if r.status == RobotStatus.ON_MISSION),
            "charging": sum(1 for r in self.robots.values() if r.status == RobotStatus.CHARGING),
            "maintenance": sum(1 for r in self.robots.values() if r.status == RobotStatus.MAINTENANCE),
            "error": sum(1 for r in self.robots.values() if r.status == RobotStatus.ERROR),
            "avg_battery": round(sum(r.battery_level for r in self.robots.values()) / max(len(self.robots), 1), 1),
        }

    def assign_mission(self, mission: RobotMission) -> Optional[str]:
        """Assign a mission to the best available robot."""
        available = self.get_available_robots()
        if not available:
            return None

        # Score robots by suitability
        scored = []
        for robot in available:
            score = 0
            # Prefer same type
            if mission.type == "guide" and robot.type == RobotType.ASSISTANT:
                score += 50
            elif mission.type == "deliver" and robot.type == RobotType.DELIVERY:
                score += 50
            elif mission.type == "clean" and robot.type == RobotType.CLEANING:
                score += 50
            elif mission.type in ("patrol", "inspect") and robot.type == RobotType.SECURITY:
                score += 50

            # Prefer higher battery
            score += robot.battery_level * 0.3

            # Prefer closer robots
            dist = robot.position.distance_to(mission.target)
            score -= dist * 0.1

            scored.append((score, robot))

        scored.sort(key=lambda x: x[0], reverse=True)
        best_robot = scored[0][1]

        # Assign mission
        self._mission_counter += 1
        mission.id = f"mission-{self._mission_counter:04d}"
        mission.assigned_robot = best_robot.id
        mission.status = "in_progress"
        self.missions[mission.id] = mission

        best_robot.status = RobotStatus.ON_MISSION
        best_robot.current_mission = mission.id
        best_robot.total_missions += 1

        return mission.id

    def complete_mission(self, mission_id: str) -> bool:
        mission = self.missions.get(mission_id)
        if not mission:
            return False

        mission.status = "completed"
        mission.completed_at = datetime.now().isoformat()

        robot = self.robots.get(mission.assigned_robot)
        if robot:
            robot.status = RobotStatus.IDLE
            robot.current_mission = None
            # Simulate battery drain
            robot.battery_level = max(0, robot.battery_level - random.uniform(5, 15))

        return True

    def update_battery(self, robot_id: str, level: float) -> bool:
        robot = self.robots.get(robot_id)
        if not robot:
            return False
        robot.battery_level = max(0, min(100, level))
        if robot.battery_level < 15 and robot.status == RobotStatus.IDLE:
            robot.status = RobotStatus.CHARGING
        return True

    def send_to_charge(self, robot_id: str) -> bool:
        robot = self.robots.get(robot_id)
        if not robot:
            return False
        robot.status = RobotStatus.CHARGING
        robot.current_mission = None
        return True

    def emergency_stop(self, robot_id: str) -> bool:
        robot = self.robots.get(robot_id)
        if not robot:
            return False
        robot.status = RobotStatus.ERROR
        return True

    def simulate_mission(self, mission_type: str = "guide") -> dict:
        """Simulate a robot mission for demo mode."""
        target_buildings = ["Engineering Block", "Science Block", "Library", "Administration", "Cafeteria"]
        target = Position(
            x=random.uniform(10, 80),
            y=random.uniform(15, 70),
            building=random.choice(target_buildings),
            floor=random.randint(1, 3),
            room=f"{random.choice(['Lab', 'Room', 'Hall'])}-{random.randint(101, 405)}",
        )

        descriptions = {
            "guide": f"Guide visitor to {target.room} in {target.building}",
            "deliver": f"Deliver documents to {target.building}, {target.room}",
            "clean": f"Clean {target.building} floor {target.floor}",
            "patrol": f"Patrol {target.building} perimeter",
        }

        mission = RobotMission(
            type=mission_type,
            target=target,
            description=descriptions.get(mission_type, f"Mission to {target.building}"),
            priority=random.randint(1, 3),
            estimated_duration_min=random.randint(5, 30),
        )

        mission_id = self.assign_mission(mission)
        return {"mission_id": mission_id, "mission": mission.to_dict()} if mission_id else {"error": "No robots available"}
