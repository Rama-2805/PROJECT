# ─── SmartCampus AI — AI Maintenance Prediction ────
# Part 8: Predictive maintenance for cameras, robots, drones,
# electrical systems, and laboratory equipment.

from __future__ import annotations
from dataclasses import dataclass, field
from typing import Optional
from datetime import datetime, timedelta
import random
import math


@dataclass
class AssetHealth:
    asset_id: str
    asset_type: str  # camera, robot, drone, electrical, lab_equipment
    asset_name: str
    location: str
    failure_probability: float = 0.0  # 0-100
    remaining_useful_life_days: float = 0.0
    maintenance_status: str = "good"  # good, fair, poor, critical
    last_maintenance: str = ""
    predicted_failure: str = ""
    risk_factors: list[dict] = field(default_factory=list)
    recommended_action: str = ""

    def to_dict(self) -> dict:
        return {
            "asset_id": self.asset_id,
            "asset_type": self.asset_type,
            "asset_name": self.asset_name,
            "location": self.location,
            "failure_probability": round(self.failure_probability, 1),
            "remaining_useful_life_days": round(self.remaining_useful_life_days, 1),
            "maintenance_status": self.maintenance_status,
            "last_maintenance": self.last_maintenance,
            "predicted_failure": self.predicted_failure,
            "risk_factors": self.risk_factors,
            "recommended_action": self.recommended_action,
        }


ASSETS = [
    # Cameras
    {"id": "cam-001", "type": "camera", "name": "CSE Corridor Camera", "loc": "Engineering Block, Floor 2"},
    {"id": "cam-002", "type": "camera", "name": "Library Entrance Camera", "loc": "Library, Main Entrance"},
    {"id": "cam-003", "type": "camera", "name": "Parking Lot Camera", "loc": "Main Parking"},
    # Robots
    {"id": "robot-001", "type": "robot", "name": "DeliverBot Prime", "loc": "Loading Dock"},
    {"id": "robot-002", "type": "robot", "name": "Campus Guide Alpha", "loc": "Main Plaza"},
    # Drones
    {"id": "drone-005", "type": "drone", "name": "HawkEye 1", "loc": "Charging Station A"},
    {"id": "drone-008", "type": "drone", "name": "SkyWatcher 2", "loc": "Charging Station B"},
    # Electrical
    {"id": "elec-001", "type": "electrical", "name": "Main Switchboard A", "loc": "Engineering Block Basement"},
    {"id": "elec-002", "type": "electrical", "name": "Solar Panel Array", "loc": "Admin Building Roof"},
    # Lab equipment
    {"id": "lab-001", "type": "lab_equipment", "name": "Electron Microscope", "loc": "Physics Lab 101"},
    {"id": "lab-002", "type": "lab_equipment", "name": "3D Printer Array", "loc": "Robotics Lab 301"},
]


class MaintenancePredictor:
    """Predicts maintenance needs across all campus assets."""

    def __init__(self):
        self.assets: dict[str, AssetHealth] = {}
        self._initialize_assets()

    def _initialize_assets(self) -> None:
        for asset in ASSETS:
            days_since_maintenance = random.randint(1, 180)
            failure_prob = self._calculate_failure_probability(asset["type"], days_since_maintenance)

            remaining_days = max(0, 365 - days_since_maintenance)
            remaining_days = remaining_days * (1 - failure_prob / 100)

            status = "critical" if failure_prob > 80 else "poor" if failure_prob > 55 else "fair" if failure_prob > 25 else "good"

            health = AssetHealth(
                asset_id=asset["id"],
                asset_type=asset["type"],
                asset_name=asset["name"],
                location=asset["loc"],
                failure_probability=failure_prob,
                remaining_useful_life_days=remaining_days,
                maintenance_status=status,
                last_maintenance=(datetime.now() - timedelta(days=days_since_maintenance)).strftime("%Y-%m-%d"),
                predicted_failure=(datetime.now() + timedelta(days=int(remaining_days))).strftime("%Y-%m-%d"),
                risk_factors=self._generate_risk_factors(asset["type"], failure_prob),
                recommended_action=self._generate_recommendation(status, asset["type"]),
            )
            self.assets[asset["id"]] = health

    def _calculate_failure_probability(self, asset_type: str, days_since_maintenance: int) -> float:
        base_probs = {
            "camera": 0.02, "robot": 0.03, "drone": 0.04,
            "electrical": 0.015, "lab_equipment": 0.025,
        }
        base = base_probs.get(asset_type, 0.02)
        probability = min(95, (days_since_maintenance * base) + random.uniform(-5, 5))
        return max(1, probability)

    def _generate_risk_factors(self, asset_type: str, probability: float) -> list[dict]:
        factors = []
        if probability > 50:
            factors.append({"name": "Overdue Maintenance", "severity": "high", "impact": "Accelerated wear"})
        if probability > 70:
            factors.append({"name": "Temperature Stress", "severity": "high", "impact": "Component degradation"})
        if asset_type == "robot" and probability > 30:
            factors.append({"name": "Battery Cycles", "severity": "medium", "impact": "Reduced capacity"})
        if asset_type == "drone" and probability > 40:
            factors.append({"name": "Motor Hours", "severity": "medium", "impact": "Bearing wear"})
        return factors

    def _generate_recommendation(self, status: str, asset_type: str) -> str:
        recs = {
            "critical": f"URGENT: Immediate {asset_type} replacement or major repair required",
            "poor": f"Schedule {asset_type} maintenance within 7 days",
            "fair": f"Plan {asset_type} preventive maintenance within 30 days",
            "good": f"Continue routine {asset_type} maintenance schedule",
        }
        return recs.get(status, "Continue monitoring")

    def get_all_predictions(self) -> list[AssetHealth]:
        return list(self.assets.values())

    def get_high_risk_assets(self, threshold: float = 60.0) -> list[AssetHealth]:
        return [a for a in self.assets.values() if a.failure_probability >= threshold]

    def get_maintenance_summary(self) -> dict:
        return {
            "total_assets": len(self.assets),
            "critical": sum(1 for a in self.assets.values() if a.maintenance_status == "critical"),
            "poor": sum(1 for a in self.assets.values() if a.maintenance_status == "poor"),
            "fair": sum(1 for a in self.assets.values() if a.maintenance_status == "fair"),
            "good": sum(1 for a in self.assets.values() if a.maintenance_status == "good"),
            "avg_failure_prob": round(sum(a.failure_probability for a in self.assets.values()) / max(len(self.assets), 1), 1),
        }

    def predict_lifetime(self, asset_id: str) -> Optional[dict]:
        asset = self.assets.get(asset_id)
        if not asset:
            return None
        return {
            "asset_id": asset.asset_id,
            "asset_name": asset.asset_name,
            "current_age_days": self._calculate_age(asset),
            "remaining_life_days": asset.remaining_useful_life_days,
            "total_lifetime_days": self._calculate_age(asset) + asset.remaining_useful_life_days,
            "confidence": max(50, 95 - asset.failure_probability / 2),
            "recommendation": asset.recommended_action,
        }

    def _calculate_age(self, asset: AssetHealth) -> int:
        if asset.last_maintenance:
            delta = datetime.now() - datetime.strptime(asset.last_maintenance, "%Y-%m-%d")
            return delta.days
        return random.randint(30, 365)
