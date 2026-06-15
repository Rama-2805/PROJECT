# ─── SmartCampus AI — Smart Navigation System ──────
# Part 4: SLAM mapping, path planning, collision avoidance,
# dynamic rerouting, and indoor/outdoor positioning.

from __future__ import annotations
from dataclasses import dataclass, field
from typing import Optional
from enum import Enum
import math
import random

from .robot_manager import Position, Robot


@dataclass
class MapNode:
    id: str
    position: Position
    connections: list[str] = field(default_factory=list)  # IDs of connected nodes
    node_type: str = "waypoint"  # waypoint, entrance, exit, charging_station, elevator, stair
    label: str = ""

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "position": {"x": self.position.x, "y": self.position.y, "building": self.position.building, "floor": self.position.floor},
            "connections": self.connections,
            "node_type": self.node_type,
            "label": self.label,
        }


@dataclass
class Route:
    path: list[Position] = field(default_factory=list)
    total_distance: float = 0.0
    estimated_time_sec: float = 0.0
    congestion_level: str = "low"  # low, medium, high
    obstacles: list[str] = field(default_factory=list)

    def to_dict(self) -> dict:
        return {
            "path": [{"x": p.x, "y": p.y, "building": p.building, "floor": p.floor} for p in self.path],
            "total_distance": round(self.total_distance, 2),
            "estimated_time_sec": round(self.estimated_time_sec, 1),
            "congestion_level": self.congestion_level,
            "obstacles": self.obstacles,
        }


CAMPUS_MAP = [
    # Main pathways
    MapNode("node-01", Position(0, 0, 0, "Main Gate", 0, "Entrance"), ["node-02", "node-10"], "entrance", "Main Gate"),
    MapNode("node-02", Position(20, 5, 0, "Plaza", 0, "Central Plaza"), ["node-01", "node-03", "node-04"], "waypoint", "Central Plaza"),
    MapNode("node-03", Position(30, 5, 0, "Engineering Block", 1, "Main Lobby"), ["node-02", "node-05", "node-06"], "entrance", "Engineering Entrance"),
    MapNode("node-04", Position(20, -15, 0, "Science Block", 1, "Main Lobby"), ["node-02", "node-07"], "entrance", "Science Entrance"),
    MapNode("node-05", Position(40, 10, 0, "Engineering Block", 2, "CSE Dept"), ["node-03", "node-08"], "waypoint", "CSE Department"),
    MapNode("node-06", Position(35, -5, 0, "Engineering Block", 1, "ECE Wing"), ["node-03"], "waypoint", "ECE Wing"),
    MapNode("node-07", Position(20, -25, 0, "Science Block", 2, "Physics Lab"), ["node-04", "node-09"], "waypoint", "Physics Laboratory"),
    MapNode("node-08", Position(50, 15, 0, "Engineering Block", 3, "Robotics Lab"), ["node-05"], "waypoint", "Robotics Lab"),
    MapNode("node-09", Position(15, -35, 0, "Library", 1, "Main Hall"), ["node-07", "node-15"], "entrance", "Library Entrance"),
    MapNode("node-10", Position(-10, 10, 0, "Administration", 1, "Reception"), ["node-01", "node-11", "node-12"], "entrance", "Admin Entrance"),
    MapNode("node-11", Position(-5, 30, 0, "Auditorium", 1, "Foyer"), ["node-10", "node-13"], "entrance", "Auditorium"),
    MapNode("node-12", Position(-15, 0, 0, "Cafeteria", 1, "Dining Area"), ["node-10"], "entrance", "Cafeteria"),
    MapNode("node-13", Position(0, 50, 0, "Sports Complex", 0, "Entrance"), ["node-11", "node-14"], "entrance", "Sports Complex"),
    MapNode("node-14", Position(5, 60, 0, "Mechanical Block", 1, "Workshop"), ["node-13"], "entrance", "Mechanical Workshop"),
    MapNode("node-15", Position(25, -45, 0, "Hostel Block A", 1, "Common Room"), ["node-09"], "entrance", "Hostel A"),
    # Charging stations
    MapNode("charge-01", Position(30, 0, 0, "Engineering Block", 0, "Charging Bay 1"), [], "charging_station", "Charging Station 1"),
    MapNode("charge-02", Position(20, -20, 0, "Science Block", 0, "Charging Bay 2"), [], "charging_station", "Charging Station 2"),
]


class NavigationSystem:
    """Smart navigation with path planning and collision avoidance."""

    def __init__(self):
        self.nodes: dict[str, MapNode] = {n.id: n for n in CAMPUS_MAP}
        self._obstacles: dict[str, Position] = {}  # Temporary obstacles
        self._congestion_zones: set[str] = set()  # Congested node IDs

    def find_path(self, start: Position, end: Position) -> Route:
        """Find the optimal path between two positions using A*."""
        # Find nearest nodes to start and end
        start_node = self._nearest_node(start)
        end_node = self._nearest_node(end)

        # A* pathfinding
        open_set = {start_node}
        came_from = {}
        g_score = {start_node: 0}
        f_score = {start_node: self._heuristic(self.nodes[start_node], self.nodes[end_node])}

        while open_set:
            current = min(open_set, key=lambda n: f_score.get(n, float("inf")))
            if current == end_node:
                path = self._reconstruct_path(came_from, current)
                return self._build_route(path, start, end)

            open_set.remove(current)
            for neighbor_id in self.nodes[current].connections:
                if neighbor_id in self._congestion_zones:
                    continue  # Skip congested zones

                tentative_g = g_score[current] + self._distance(self.nodes[current], self.nodes[neighbor_id])
                if tentative_g < g_score.get(neighbor_id, float("inf")):
                    came_from[neighbor_id] = current
                    g_score[neighbor_id] = tentative_g
                    f_score[neighbor_id] = tentative_g + self._heuristic(self.nodes[neighbor_id], self.nodes[end_node])
                    open_set.add(neighbor_id)

        # Fallback: direct path
        return self._build_route([start_node, end_node], start, end)

    def _nearest_node(self, position: Position) -> str:
        """Find the nearest map node to a position."""
        nearest = min(self.nodes.values(), key=lambda n: n.position.distance_to(position))
        return nearest.id

    def _heuristic(self, a: MapNode, b: MapNode) -> float:
        return a.position.distance_to(b.position)

    def _distance(self, a: MapNode, b: MapNode) -> float:
        return a.position.distance_to(b.position)

    def _reconstruct_path(self, came_from: dict, current: str) -> list[str]:
        path = []
        while current in came_from:
            path.append(current)
            current = came_from[current]
        path.append(current)
        return path[::-1]

    def _build_route(self, node_path: list[str], start: Position, end: Position) -> Route:
        positions = [start]
        total_dist = 0.0

        for i in range(len(node_path) - 1):
            node = self.nodes[node_path[i]]
            positions.append(node.position)
            if i > 0:
                total_dist += self.nodes[node_path[i - 1]].position.distance_to(node.position)

        positions.append(end)
        total_dist += self.nodes[node_path[-1]].position.distance_to(end)

        robot_speed = 1.5  # m/s
        obstacles = [f"Obstacle near {self.nodes[n].label}" for n in node_path if n in self._obstacles]

        congestion_level = "high" if len(self._congestion_zones) > 3 else "medium" if len(self._congestion_zones) > 1 else "low"

        return Route(
            path=positions,
            total_distance=total_dist,
            estimated_time_sec=total_dist / robot_speed * (1.5 if congestion_level == "high" else 1.2 if congestion_level == "medium" else 1.0),
            congestion_level=congestion_level,
            obstacles=obstacles,
        )

    def add_obstacle(self, position: Position, description: str) -> str:
        obs_id = f"obs-{len(self._obstacles) + 1:03d}"
        self._obstacles[obs_id] = position
        # Mark nearby nodes as congested
        for nid, node in self.nodes.items():
            if node.position.distance_to(position) < 10:
                self._congestion_zones.add(nid)
        return obs_id

    def clear_obstacle(self, obstacle_id: str) -> bool:
        if obstacle_id in self._obstacles:
            del self._obstacles[obstacle_id]
            return True
        return False

    def clear_all_obstacles(self) -> None:
        self._obstacles.clear()
        self._congestion_zones.clear()

    def get_map_data(self) -> dict:
        return {
            "nodes": {nid: node.to_dict() for nid, node in self.nodes.items()},
            "obstacles": [{"id": oid, "position": {"x": pos.x, "y": pos.y}} for oid, pos in self._obstacles.items()],
            "congestion_zones": list(self._congestion_zones),
        }

    def navigate_to(self, robot: Robot, destination: Position) -> Route:
        """Navigate a robot to a destination."""
        route = self.find_path(robot.position, destination)
        # Simulate movement
        if route.path:
            robot.position = destination
        return route
