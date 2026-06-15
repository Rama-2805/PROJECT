# ─── SmartCampus AI — Robotics Digital Twin ─────────
# Part 10: Extends the existing 3D campus twin with live
# robot positions, drone locations, battery status,
# active missions, and sensor data overlays.

from __future__ import annotations
from dataclasses import dataclass, field
from typing import Optional
from datetime import datetime
import random
import math

from .robot_manager import RobotManager, Robot, RobotStatus, Position
from .drone_manager import DroneManager, Drone, DroneStatus


@dataclass
class TwinEntity:
    entity_id: str
    entity_type: str  # robot, drone, building_sensor, security_zone
    display_name: str
    position_3d: dict  # {x, y, z}
    rotation: dict = field(default_factory=lambda: {"x": 0, "y": 0, "z": 0})
    scale: dict = field(default_factory=lambda: {"x": 1, "y": 1, "z": 1})
    status_color: str = "#22D3EE"  # cyan default
    pulse_animation: bool = False
    label: str = ""
    data: dict = field(default_factory=dict)

    def to_dict(self) -> dict:
        return {
            "entity_id": self.entity_id,
            "entity_type": self.entity_type,
            "display_name": self.display_name,
            "position_3d": self.position_3d,
            "rotation": self.rotation,
            "scale": self.scale,
            "status_color": self.status_color,
            "pulse_animation": self.pulse_animation,
            "label": self.label,
            "data": self.data,
        }


COLOR_MAP = {
    "online": "#22D3EE",  # cyan
    "idle": "#22D3EE",
    "on_mission": "#FBBF24",  # yellow
    "flying": "#60A5FA",  # blue
    "charging": "#34D399",  # emerald
    "warning": "#FBBF24",  # yellow
    "error": "#F87171",  # red
    "offline": "#6B7280",  # gray
    "critical": "#EF4444",  # red
    "good": "#34D399",  # emerald
}


class RoboticsDigitalTwin:
    """Provides 3D twin data for the existing CampusScene to consume."""

    def __init__(self, robot_manager: RobotManager, drone_manager: DroneManager):
        self.robot_manager = robot_manager
        self.drone_manager = drone_manager
        self._building_positions = {
            "Engineering Block": {"x": 30, "y": 0, "z": 5},
            "Science Block": {"x": 20, "y": 0, "z": -15},
            "Library": {"x": 15, "y": 0, "z": -35},
            "Administration": {"x": -10, "y": 0, "z": 10},
            "Auditorium": {"x": -5, "y": 0, "z": 30},
            "Cafeteria": {"x": -15, "y": 0, "z": 0},
            "Sports Complex": {"x": 0, "y": 0, "z": 50},
            "Hostel Block A": {"x": 25, "y": 0, "z": -45},
            "Hostel Block B": {"x": 35, "y": 0, "z": -50},
            "Mechanical Block": {"x": 5, "y": 0, "z": 60},
            "ECE Block": {"x": 40, "y": 0, "z": -10},
        }

    def get_robot_entities(self) -> list[TwinEntity]:
        entities = []
        for robot in self.robot_manager.robots.values():
            pos = self._robot_to_3d(robot)
            status = robot.status.value
            entities.append(TwinEntity(
                entity_id=robot.id,
                entity_type="robot",
                display_name=robot.name,
                position_3d=pos,
                status_color=COLOR_MAP.get(status, "#22D3EE"),
                pulse_animation=robot.status == RobotStatus.ON_MISSION,
                label=f"{robot.name} | {robot.type.value.upper()} | Battery: {robot.battery_level:.0f}%",
                data={
                    "battery": round(robot.battery_level, 1),
                    "status": status,
                    "health": robot.health_status,
                    "type": robot.type.value,
                    "missions": robot.total_missions,
                },
            ))
        return entities

    def get_drone_entities(self) -> list[TwinEntity]:
        entities = []
        for drone in self.drone_manager.drones.values():
            base_pos = self._building_positions.get(
                ["Engineering Block", "Science Block", "Library", "Administration",
                 "Auditorium", "Sports Complex", "Cafeteria"][hash(drone.id) % 7],
                {"x": 0, "y": 0, "z": 0},
            )
            pos = {
                "x": base_pos["x"] + random.uniform(-5, 5),
                "y": drone.telemetry.altitude if drone.status == DroneStatus.FLYING else 2,
                "z": base_pos["z"] + random.uniform(-5, 5),
            }
            status = drone.status.value
            entities.append(TwinEntity(
                entity_id=drone.id,
                entity_type="drone",
                display_name=drone.name,
                position_3d=pos,
                status_color=COLOR_MAP.get(status, "#22D3EE"),
                pulse_animation=drone.status == DroneStatus.FLYING,
                label=f"{drone.name} | Alt: {drone.telemetry.altitude:.0f}m | Bat: {drone.telemetry.battery:.0f}%",
                data={
                    "battery": round(drone.telemetry.battery, 1),
                    "altitude": round(drone.telemetry.altitude, 1),
                    "status": status,
                    "flights": drone.total_flights,
                    "model": drone.model,
                },
            ))
        return entities

    def get_all_entities(self) -> list[dict]:
        """Get all twin entities for the 3D scene."""
        entities = []
        entities.extend(self.get_robot_entities())
        entities.extend(self.get_drone_entities())
        return [e.to_dict() for e in entities]

    def get_scene_overlay(self) -> dict:
        """Get overlay data for the 3D scene (heatmap zones, paths, etc.)."""
        return {
            "active_paths": self._get_active_paths(),
            "charging_stations": self._get_charging_stations(),
            "alert_zones": self._get_alert_zones(),
            "fleet_markers": {
                "robot_count": len(self.robot_manager.robots),
                "drone_count": len(self.drone_manager.drones),
                "active_missions": sum(1 for r in self.robot_manager.robots.values() if r.status == RobotStatus.ON_MISSION),
                "drones_flying": sum(1 for d in self.drone_manager.drones.values() if d.status == DroneStatus.FLYING),
            },
        }

    def _robot_to_3d(self, robot: Robot) -> dict:
        base = self._building_positions.get(robot.position.building, {"x": 0, "y": 0, "z": 0})
        return {
            "x": base["x"] + robot.position.x / 10,
            "y": 0.5 + robot.position.floor * 3,
            "z": base["z"] + robot.position.y / 10,
        }

    def _get_active_paths(self) -> list[dict]:
        """Get paths for robots currently on missions."""
        paths = []
        for robot in self.robot_manager.robots.values():
            if robot.status == RobotStatus.ON_MISSION:
                base = self._building_positions.get(robot.position.building, {"x": 0, "y": 0, "z": 0})
                paths.append({
                    "robot_id": robot.id,
                    "start": {"x": base["x"], "z": base["z"]},
                    "end": {"x": base["x"] + random.uniform(10, 20), "z": base["z"] + random.uniform(-10, 10)},
                    "color": COLOR_MAP.get("on_mission"),
                })
        return paths

    def _get_charging_stations(self) -> list[dict]:
        return [
            {"x": 30, "z": 0, "name": "Engineering Charging Bay", "available": 3},
            {"x": 20, "z": -20, "name": "Science Charging Bay", "available": 2},
            {"x": -10, "z": 10, "name": "Admin Charging Bay", "available": 4},
        ]

    def _get_alert_zones(self) -> list[dict]:
        zones = []
        for robot in self.robot_manager.robots.values():
            if robot.health_status == "critical":
                base = self._building_positions.get(robot.position.building, {"x": 0, "y": 0, "z": 0})
                zones.append({
                    "position": {"x": base["x"], "z": base["z"]},
                    "radius": 5,
                    "color": COLOR_MAP.get("critical"),
                    "label": f"⚠️ {robot.name} requires maintenance",
                })
        return zones
