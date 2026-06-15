# ─── SmartCampus AI — Autonomous Drone System ──────
# Part 2: Drone fleet management for infrastructure
# inspection, emergency response, environmental monitoring.

from __future__ import annotations
from dataclasses import dataclass, field
from typing import Optional
from enum import Enum
from datetime import datetime
import random
import math


class DroneStatus(Enum):
    IDLE = "idle"
    CHARGING = "charging"
    FLYING = "flying"
    RETURNING = "returning"
    MAINTENANCE = "maintenance"
    OFFLINE = "offline"


class DroneMissionType(Enum):
    INSPECTION = "inspection"
    EMERGENCY = "emergency"
    ENVIRONMENTAL = "environmental"
    SURVEILLANCE = "surveillance"
    DELIVERY = "delivery"


@dataclass
class DroneTelemetry:
    altitude: float = 0.0  # meters
    speed: float = 0.0  # m/s
    heading: float = 0.0  # degrees
    gps_lat: float = 0.0
    gps_lon: float = 0.0
    battery: float = 100.0
    signal_strength: float = 100.0  # 0-100
    temperature: float = 25.0  # celsius
    wind_speed: float = 0.0  # m/s

    def to_dict(self) -> dict:
        return {
            "altitude": round(self.altitude, 1),
            "speed": round(self.speed, 1),
            "heading": round(self.heading, 1),
            "gps": {"lat": round(self.gps_lat, 6), "lon": round(self.gps_lon, 6)},
            "battery": round(self.battery, 1),
            "signal_strength": round(self.signal_strength, 1),
            "temperature": round(self.temperature, 1),
            "wind_speed": round(self.wind_speed, 1),
        }


@dataclass
class DroneFlight:
    id: str = ""
    drone_id: str = ""
    mission_type: DroneMissionType = DroneMissionType.INSPECTION
    start_time: str = ""
    end_time: str = ""
    duration_min: float = 0.0
    max_altitude: float = 0.0
    distance_km: float = 0.0
    status: str = "planned"  # planned, in_progress, completed, aborted
    purpose: str = ""
    findings: list[dict] = field(default_factory=list)

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "drone_id": self.drone_id,
            "mission_type": self.mission_type.value,
            "start_time": self.start_time,
            "end_time": self.end_time,
            "duration_min": round(self.duration_min, 1),
            "max_altitude": round(self.max_altitude, 1),
            "distance_km": round(self.distance_km, 2),
            "status": self.status,
            "purpose": self.purpose,
            "findings": self.findings[:3],
        }


@dataclass
class Drone:
    id: str
    name: str
    model: str
    status: DroneStatus = DroneStatus.IDLE
    telemetry: DroneTelemetry = field(default_factory=DroneTelemetry)
    current_flight: Optional[str] = None
    total_flights: int = 0
    total_flight_hours: float = 0.0
    firmware_version: str = "4.1.0"
    camera_resolution: str = "4K"
    max_range_km: float = 5.0
    max_altitude_m: float = 120.0

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "name": self.name,
            "model": self.model,
            "status": self.status.value,
            "telemetry": self.telemetry.to_dict(),
            "current_flight": self.current_flight,
            "total_flights": self.total_flights,
            "total_flight_hours": round(self.total_flight_hours, 1),
            "firmware_version": self.firmware_version,
            "camera_resolution": self.camera_resolution,
            "max_range_km": self.max_range_km,
            "max_altitude_m": self.max_altitude_m,
        }


DRONE_NAMES = [
    "HawkEye 1", "SkyWatcher 2", "EagleVision 3", "FalconEye 4",
    "AeroScout 5", "CloudSurfer 6", "SkyGuardian 7", "Stratos 8",
    "AeroSentry 9", "CampusEye 10",
]

DRONE_MODELS = ["DJI Mavic 3 Enterprise", "DJI Phantom 4 RTK", "Autel EVO II", "Skydio X2", "Parrot ANAFI USA"]


class DroneManager:
    """Manages the autonomous drone fleet."""

    def __init__(self):
        self.drones: dict[str, Drone] = {}
        self.flights: dict[str, DroneFlight] = {}
        self._flight_counter = 0
        self._initialize_fleet()

    def _initialize_fleet(self) -> None:
        """Initialize the drone fleet."""
        for i in range(20):
            drone_id = f"drone-{i + 1:02d}"
            drone = Drone(
                id=drone_id,
                name=DRONE_NAMES[i % len(DRONE_NAMES)],
                model=DRONE_MODELS[i % len(DRONE_MODELS)],
                status=DroneStatus(random.choices(
                    [DroneStatus.IDLE, DroneStatus.CHARGING, DroneStatus.FLYING, DroneStatus.MAINTENANCE],
                    weights=[0.5, 0.25, 0.2, 0.05],
                )[0]),
                telemetry=DroneTelemetry(
                    altitude=0 if i > 10 else random.uniform(20, 80),
                    battery=random.uniform(30, 100),
                    signal_strength=random.uniform(80, 100),
                    gps_lat=28.6139 + random.uniform(-0.01, 0.01),
                    gps_lon=77.2090 + random.uniform(-0.01, 0.01),
                ),
                total_flights=random.randint(10, 200),
                total_flight_hours=random.uniform(5, 100),
            )
            self.drones[drone_id] = drone

    def get_drone(self, drone_id: str) -> Optional[Drone]:
        return self.drones.get(drone_id)

    def get_available_drones(self) -> list[Drone]:
        return [d for d in self.drones.values() if d.status == DroneStatus.IDLE and d.telemetry.battery > 30]

    def get_fleet_summary(self) -> dict:
        return {
            "total": len(self.drones),
            "idle": sum(1 for d in self.drones.values() if d.status == DroneStatus.IDLE),
            "flying": sum(1 for d in self.drones.values() if d.status == DroneStatus.FLYING),
            "charging": sum(1 for d in self.drones.values() if d.status == DroneStatus.CHARGING),
            "maintenance": sum(1 for d in self.drones.values() if d.status == DroneStatus.MAINTENANCE),
            "avg_battery": round(sum(d.telemetry.battery for d in self.drones.values()) / max(len(self.drones), 1), 1),
        }

    def start_mission(self, mission_type: DroneMissionType, purpose: str) -> Optional[str]:
        """Start a drone mission."""
        available = self.get_available_drones()
        if not available:
            return None

        drone = random.choice(available)
        self._flight_counter += 1
        flight_id = f"flight-{self._flight_counter:04d}"

        flight = DroneFlight(
            id=flight_id,
            drone_id=drone.id,
            mission_type=mission_type,
            start_time=datetime.now().isoformat(),
            status="in_progress",
            purpose=purpose,
            duration_min=random.uniform(10, 45),
            max_altitude=random.uniform(30, 100),
            distance_km=random.uniform(0.5, 3.0),
            findings=self._generate_findings(mission_type),
        )
        self.flights[flight_id] = flight

        drone.status = DroneStatus.FLYING
        drone.current_flight = flight_id
        drone.total_flights += 1
        drone.telemetry.altitude = random.uniform(30, 80)
        drone.telemetry.battery -= random.uniform(10, 30)
        drone.telemetry.speed = random.uniform(5, 15)

        return flight_id

    def _generate_findings(self, mission_type: DroneMissionType) -> list[dict]:
        findings_templates = {
            DroneMissionType.INSPECTION: [
                {"type": "roof_damage", "severity": "minor", "description": "Minor crack detected on Building C roof"},
                {"type": "solar_panel", "severity": "good", "description": "Solar panels operating normally"},
                {"type": "structural", "severity": "good", "description": "No structural anomalies detected"},
            ],
            DroneMissionType.EMERGENCY: [
                {"type": "crowd_detected", "severity": "info", "description": "Crowd gathering near main entrance"},
                {"type": "access_route", "severity": "clear", "description": "Emergency routes clear"},
            ],
            DroneMissionType.ENVIRONMENTAL: [
                {"type": "air_quality", "severity": "good", "value": "AQI 42", "description": "Air quality within acceptable range"},
                {"type": "temperature", "severity": "normal", "value": "27°C", "description": "Campus temperature normal"},
                {"type": "noise", "severity": "elevated", "value": "65dB", "description": "Elevated noise near construction area"},
            ],
            DroneMissionType.SURVEILLANCE: [
                {"type": "perimeter", "severity": "secure", "description": "All perimeter zones secure"},
                {"type": "unauthorized", "severity": "none", "description": "No unauthorized access detected"},
            ],
            DroneMissionType.DELIVERY: [
                {"type": "delivery", "severity": "completed", "description": "Package delivered successfully"},
            ],
        }
        return findings_templates.get(mission_type, [{"type": "info", "description": "Mission completed"}])()

    def complete_mission(self, flight_id: str) -> bool:
        flight = self.flights.get(flight_id)
        if not flight:
            return False

        flight.status = "completed"
        flight.end_time = datetime.now().isoformat()

        drone = self.drones.get(flight.drone_id)
        if drone:
            drone.status = DroneStatus.IDLE
            drone.current_flight = None
            drone.total_flight_hours += flight.duration_min / 60
            drone.telemetry.altitude = 0
            drone.telemetry.speed = 0

        return True

    def return_to_base(self, drone_id: str) -> bool:
        drone = self.drones.get(drone_id)
        if not drone:
            return False
        drone.status = DroneStatus.RETURNING
        return True

    def simulate_inspection(self) -> dict:
        """Simulate an infrastructure inspection mission."""
        purposes = [
            "Building C roof inspection after heavy rain",
            "Solar panel array efficiency check",
            "Campus perimeter fence inspection",
            "Construction site progress monitoring",
            "Tree health assessment near parking lot",
        ]
        flight_id = self.start_mission(
            DroneMissionType.INSPECTION,
            random.choice(purposes),
        )
        if flight_id:
            self.complete_mission(flight_id)
        return {
            "flight_id": flight_id,
            "flight": self.flights.get(flight_id).to_dict() if flight_id and flight_id in self.flights else None,
        }
