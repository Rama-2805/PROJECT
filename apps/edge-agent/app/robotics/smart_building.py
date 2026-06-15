# ─── SmartCampus AI — Smart Building Intelligence ───
# Part 6: Autonomous building management for lighting,
# HVAC, electricity, water, and energy optimization.

from __future__ import annotations
from dataclasses import dataclass, field
from typing import Optional
from datetime import datetime, timedelta
import random


@dataclass
class BuildingSensor:
    sensor_id: str
    building: str
    sensor_type: str  # temperature, humidity, light, power, water, co2
    value: float
    unit: str
    status: str  # normal, warning, critical
    location: str
    last_reading: str = field(default_factory=lambda: datetime.now().isoformat())

    def to_dict(self) -> dict:
        return {
            "sensor_id": self.sensor_id,
            "building": self.building,
            "sensor_type": self.sensor_type,
            "value": self.value,
            "unit": self.unit,
            "status": self.status,
            "location": self.location,
            "last_reading": self.last_reading,
        }


@dataclass
class EnergyRecord:
    building: str
    timestamp: str
    power_consumption_kw: float
    solar_generation_kw: float
    grid_consumption_kw: float
    co2_saved_kg: float
    efficiency_score: float  # 0-100

    def to_dict(self) -> dict:
        return {
            "building": self.building,
            "timestamp": self.timestamp,
            "power_consumption_kw": round(self.power_consumption_kw, 1),
            "solar_generation_kw": round(self.solar_generation_kw, 1),
            "grid_consumption_kw": round(self.grid_consumption_kw, 1),
            "co2_saved_kg": round(self.co2_saved_kg, 2),
            "efficiency_score": round(self.efficiency_score, 1),
        }


BUILDINGS_MANAGED = [
    "Engineering Block", "Science Block", "Library", "Administration",
    "Auditorium", "Cafeteria", "Sports Complex", "Hostel Block A",
]


class SmartBuildingSystem:
    """Autonomous building management system."""

    def __init__(self):
        self.sensors: dict[str, BuildingSensor] = {}
        self.energy_records: list[EnergyRecord] = []
        self._initialize_sensors()

    def _initialize_sensors(self) -> None:
        sensor_types = [
            ("temperature", random.uniform(20, 30), "°C", 10),
            ("humidity", random.uniform(30, 70), "%", 8),
            ("light", random.uniform(100, 800), "lux", 10),
            ("power", random.uniform(0.5, 15), "kW", 6),
            ("water", random.uniform(0, 50), "L/min", 4),
            ("co2", random.uniform(400, 1000), "ppm", 8),
            ("motion", random.uniform(0, 1), "detected", 8),
            ("pressure", random.uniform(980, 1020), "hPa", 4),
            ("vibration", random.uniform(0, 5), "mm/s", 6),
            ("airflow", random.uniform(0.1, 2.0), "m/s", 4),
            ("door", random.uniform(0, 1), "open/closed", 6),
            ("window", random.uniform(0, 1), "open/closed", 4),
        ]
        # Also add distributed room-based sensors for each floor
        floors = {
            "Engineering Block": 5, "Science Block": 4, "Library": 3,
            "Administration": 3, "Auditorium": 2, "Cafeteria": 1,
            "Sports Complex": 2, "Hostel Block A": 5, "Hostel Block B": 5,
            "Mechanical Block": 3, "ECE Block": 4,
        }
        BUILDINGS_MANAGED.extend(["Hostel Block B", "Mechanical Block", "ECE Block"])

        sensor_id = 0
        for building, num_floors in floors.items():
            for floor in range(num_floors):
                # Add floor-level environmental sensors
                for sensor_type, base_value, unit, count in sensor_types:
                    rooms_per_floor = count
                    for room_idx in range(rooms_per_floor):
                        sensor_id += 1
                        value = base_value + random.uniform(-base_value * 0.15, base_value * 0.15)
                        value = max(0, value)
                        status = "normal"
                        if (sensor_type == "temperature" and value > 28) or \
                           (sensor_type == "co2" and value > 800) or \
                           (sensor_type == "power" and value > 12) or \
                           (sensor_type == "water" and value > 30) or \
                           (sensor_type == "vibration" and value > 3):
                            status = "warning"
                        if (sensor_type == "temperature" and value > 32) or \
                           (sensor_type == "co2" and value > 950) or \
                           (sensor_type == "power" and value > 14) or \
                           (sensor_type == "water" and value > 45):
                            status = "critical"

                        self.sensors[f"sensor-{sensor_id:04d}"] = BuildingSensor(
                            sensor_id=f"sensor-{sensor_id:04d}",
                            building=building,
                            sensor_type=sensor_type,
                            value=round(value, 1),
                            unit=unit,
                            status=status,
                            location=f"{building} - Floor {floor + 1} - {sensor_type.title()} #{room_idx + 1}",
                        )
                        if sensor_id >= 1100:
                            break
                    if sensor_id >= 1100:
                        break
                if sensor_id >= 1100:
                    break
            if sensor_id >= 1100:
                break

    def get_building_status(self, building: str) -> dict:
        """Get comprehensive status for a building."""
        b_sensors = [s for s in self.sensors.values() if s.building == building]
        return {
            "building": building,
            "total_sensors": len(b_sensors),
            "normal": sum(1 for s in b_sensors if s.status == "normal"),
            "warning": sum(1 for s in b_sensors if s.status == "warning"),
            "critical": sum(1 for s in b_sensors if s.status == "critical"),
            "avg_temperature": round(sum(s.value for s in b_sensors if s.sensor_type == "temperature") / max(sum(1 for s in b_sensors if s.sensor_type == "temperature"), 1), 1),
            "avg_power": round(sum(s.value for s in b_sensors if s.sensor_type == "power") / max(sum(1 for s in b_sensors if s.sensor_type == "power"), 1), 1),
            "alerts": [s.to_dict() for s in b_sensors if s.status != "normal"][:5],
        }

    def get_all_buildings_status(self) -> dict:
        return {b: self.get_building_status(b) for b in BUILDINGS_MANAGED}

    def generate_energy_report(self) -> dict:
        """Generate energy efficiency report."""
        total_power = sum(s.value for s in self.sensors.values() if s.sensor_type == "power")
        solar_generation = total_power * random.uniform(0.15, 0.35)
        grid_consumption = total_power - solar_generation
        co2_saved = solar_generation * 0.5  # kg CO2 per kW
        efficiency = min(100, (solar_generation / max(total_power, 0.1)) * 100 + random.uniform(50, 70))

        # Create daily record
        record = EnergyRecord(
            building="All Buildings",
            timestamp=datetime.now().isoformat(),
            power_consumption_kw=total_power,
            solar_generation_kw=solar_generation,
            grid_consumption_kw=max(0, grid_consumption),
            co2_saved_kg=co2_saved,
            efficiency_score=efficiency,
        )
        self.energy_records.append(record)

        # Detect anomalies
        anomalies = []
        for b in BUILDINGS_MANAGED:
            status = self.get_building_status(b)
            if status["avg_power"] > 10:
                anomalies.append({
                    "building": b,
                    "issue": f"Power consumption {status['avg_power']}kW — 25% above average",
                    "recommendation": "Audit HVAC and lighting schedules",
                })
            for s in self.sensors.values():
                if s.building == b and s.sensor_type == "water" and s.value > 30:
                    anomalies.append({
                        "building": b,
                        "issue": f"Water flow rate {s.value}L/min — possible leak detected",
                        "recommendation": "Inspect plumbing in " + s.location,
                    })

        return {
            "total_power_kw": round(total_power, 1),
            "solar_generation_kw": round(solar_generation, 1),
            "grid_consumption_kw": round(max(0, grid_consumption), 1),
            "co2_saved_kg": round(co2_saved, 2),
            "efficiency_score": round(efficiency, 1),
            "anomalies": anomalies[:5],
            "recommendations": [
                "Adjust HVAC schedule in underoccupied buildings",
                "Optimize lighting based on natural daylight sensors",
                "Schedule high-power equipment during solar peak hours",
            ],
        }

    def optimize_lighting(self, building: str, occupancy: int) -> str:
        """Optimize lighting based on occupancy."""
        if occupancy == 0:
            return f"{building}: Lighting reduced to 10% (unoccupied)"
        elif occupancy < 30:
            return f"{building}: Lighting set to 60% (low occupancy)"
        else:
            return f"{building}: Lighting at 100% (full occupancy)"

    def optimize_hvac(self, building: str, temperature: float, occupancy: int) -> str:
        """Optimize HVAC based on temperature and occupancy."""
        if temperature > 28 and occupancy > 0:
            return f"{building}: Increasing AC cooling by 2°C (high temperature + occupancy)"
        elif temperature < 20:
            return f"{building}: Activating heating (low temperature)"
        elif occupancy == 0:
            return f"{building}: HVAC in energy-saving mode (unoccupied)"
        return f"{building}: HVAC operating normally at {temperature}°C"
