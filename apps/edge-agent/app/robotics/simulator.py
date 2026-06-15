# ─── SmartCampus AI — Robotics & Autonomous Simulator
# Part 15: Full simulation mode with 50 virtual robots,
# 20 drones, 1000 building sensors, and simulated events.
# Runs entirely on a normal laptop (₹0 budget).

from __future__ import annotations
import asyncio
import logging
import random
from datetime import datetime
from typing import Optional

from .robot_manager import RobotManager, RobotType, RobotStatus, Position
from .drone_manager import DroneManager, DroneMissionType
from .smart_building import SmartBuildingSystem, BUILDINGS_MANAGED
from .security_system import AutonomousSecurity
from .swarm_coordinator import SwarmCoordinator
from .safety import SafetyEthics
from .maintenance_predictor import MaintenancePredictor
from .autonomous_lab import AutonomousLabs
from .human_robot_interaction import HumanRobotInteraction

logger = logging.getLogger(__name__)


class AutonomousSimulator:
    """Full autonomous campus simulator. Runs on a normal laptop."""

    def __init__(self):
        self.robot_manager = RobotManager()
        self.drone_manager = DroneManager()
        self.building_system = SmartBuildingSystem()
        self.security = AutonomousSecurity()
        self.safety = SafetyEthics()
        self.swarm = SwarmCoordinator(self.robot_manager)
        self.maintenance = MaintenancePredictor()
        self.labs_autonomous = AutonomousLabs()
        self.hri = HumanRobotInteraction()
        self._running = False
        self._event_count = 0
        self._simulation_start = datetime.now()

    def get_summary(self) -> dict:
        return {
            "robots": self.robot_manager.get_fleet_summary(),
            "drones": self.drone_manager.get_fleet_summary(),
            "buildings": {
                "managed": len(BUILDINGS_MANAGED),
                "sensors": len(self.building_system.sensors),
                "alerts": sum(1 for s in self.building_system.sensors.values() if s.status != "normal"),
            },
            "security": self.security.get_security_summary(),
            "safety": self.safety.get_safety_summary(),
            "maintenance": self.maintenance.get_maintenance_summary(),
            "labs": self.labs_autonomous.get_summary(),
            "hri": self.hri.get_summary(),
            "swarm": self.swarm.get_coordination_summary(),
            "events_generated": self._event_count,
            "uptime_seconds": (datetime.now() - self._simulation_start).total_seconds(),
        }

    def simulate_robot_mission(self, mission_type: str = "guide") -> dict:
        return self.robot_manager.simulate_mission(mission_type)

    def simulate_drone_mission(self) -> dict:
        return self.drone_manager.simulate_inspection()

    def simulate_security_event(self, event_type: str = "intrusion") -> dict:
        result = self.security.simulate_incident(event_type)
        self._event_count += 1
        return result

    def simulate_energy_report(self) -> dict:
        return self.building_system.generate_energy_report()

    def simulate_coordinated_cleaning(self) -> dict:
        return self.swarm.simulate_cleaning_coordination()

    def simulate_escort_visitor(self) -> dict:
        return self.swarm.simulate_escort_visitor()

    def simulate_random_event(self) -> dict:
        """Generate a random campus event."""
        events = [
            ("robot_mission", lambda: self.simulate_robot_mission(random.choice(["guide", "deliver", "clean", "patrol"]))),
            ("drone_inspection", lambda: self.simulate_drone_mission()),
            ("security_intrusion", lambda: self.simulate_security_event("intrusion")),
            ("energy_report", lambda: self.simulate_energy_report()),
            ("cleaning_coordination", lambda: self.simulate_coordinated_cleaning()),
        ]
        event_type, handler = random.choice(events)
        self._event_count += 1
        return {"event_type": event_type, "result": handler(), "timestamp": datetime.now().isoformat()}

    async def run_background_simulation(self, interval_seconds: float = 5.0) -> None:
        """Run continuous background simulation."""
        self._running = True
        cycles = 0
        while self._running:
            await asyncio.sleep(interval_seconds)
            cycles += 1

            # Every cycle: generate a random event
            self.simulate_random_event()

            # Every 3 cycles: drone inspection
            if cycles % 3 == 0:
                self.simulate_drone_mission()

            # Every 5 cycles: energy report
            if cycles % 5 == 0:
                self.simulate_energy_report()

            # Every 10 cycles: full security check
            if cycles % 10 == 0:
                self.security.simulate_incident("suspicious")

            logger.debug(f"[Simulator] Cycle {cycles} — Events: {self._event_count}")

    def stop_background(self) -> None:
        self._running = False
