# ─── SmartCampus AI — Autonomous Laboratories ──────
# Part 7: AI-managed research labs with equipment monitoring,
# automatic scheduling, safety detection, and maintenance.

from __future__ import annotations
from dataclasses import dataclass, field
from typing import Optional
from datetime import datetime, timedelta
import random


@dataclass
class LabEquipment:
    id: str
    name: str
    lab: str
    equipment_type: str
    status: str  # operational, idle, maintenance, error
    usage_hours: float = 0.0
    temperature: float = 25.0
    last_calibration: str = ""
    next_calibration: str = ""
    health_score: float = 100.0
    current_user: str = ""

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "name": self.name,
            "lab": self.lab,
            "equipment_type": self.equipment_type,
            "status": self.status,
            "usage_hours": round(self.usage_hours, 1),
            "temperature": round(self.temperature, 1),
            "last_calibration": self.last_calibration,
            "next_calibration": self.next_calibration,
            "health_score": round(self.health_score, 1),
            "current_user": self.current_user,
        }


@dataclass
class LabBooking:
    id: str
    lab: str
    equipment: str
    user: str
    start_time: str
    end_time: str
    purpose: str
    status: str  # confirmed, in_progress, completed, cancelled

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "lab": self.lab,
            "equipment": self.equipment,
            "user": self.user,
            "start_time": self.start_time,
            "end_time": self.end_time,
            "purpose": self.purpose,
            "status": self.status,
        }


@dataclass
class Lab:
    id: str
    name: str
    building: str
    floor: int
    equipment_count: int
    safety_status: str  # safe, warning, critical
    occupancy: int
    max_capacity: int
    temperature: float
    co2_level: float

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "name": self.name,
            "building": self.building,
            "floor": self.floor,
            "equipment_count": self.equipment_count,
            "safety_status": self.safety_status,
            "occupancy": self.occupancy,
            "max_capacity": self.max_capacity,
            "temperature": round(self.temperature, 1),
            "co2_level": round(self.co2_level, 1),
        }


LABS_DATA = [
    # CSE Labs
    {"id": "lab-cse-001", "name": "AI & Machine Learning Lab", "building": "Engineering Block", "floor": 2, "capacity": 30},
    {"id": "lab-cse-002", "name": "Robotics & Automation Lab", "building": "Engineering Block", "floor": 3, "capacity": 20},
    {"id": "lab-cse-003", "name": "Network Systems Lab", "building": "Engineering Block", "floor": 2, "capacity": 25},
    {"id": "lab-cse-004", "name": "Computer Vision Lab", "building": "Engineering Block", "floor": 4, "capacity": 15},
    # ECE Labs
    {"id": "lab-ece-001", "name": "Embedded Systems Lab", "building": "ECE Block", "floor": 1, "capacity": 25},
    {"id": "lab-ece-002", "name": "VLSI Design Lab", "building": "ECE Block", "floor": 2, "capacity": 20},
    {"id": "lab-ece-003", "name": "IoT & Sensor Lab", "building": "ECE Block", "floor": 2, "capacity": 30},
    # Science Labs
    {"id": "lab-phy-001", "name": "Physics Research Lab", "building": "Science Block", "floor": 1, "capacity": 15},
    {"id": "lab-chem-001", "name": "Chemistry Analytical Lab", "building": "Science Block", "floor": 2, "capacity": 20},
    {"id": "lab-bio-001", "name": "Biotechnology Lab", "building": "Science Block", "floor": 3, "capacity": 15},
    {"id": "lab-bio-002", "name": "Molecular Biology Lab", "building": "Science Block", "floor": 3, "capacity": 12},
    # Mechanical
    {"id": "lab-mech-001", "name": "CAD/CAM Lab", "building": "Mechanical Block", "floor": 1, "capacity": 25},
    {"id": "lab-mech-002", "name": "Materials Testing Lab", "building": "Mechanical Block", "floor": 2, "capacity": 15},
]


class AutonomousLabs:
    """AI-managed research laboratory system."""

    def __init__(self):
        self.labs: dict[str, Lab] = {}
        self.equipment: dict[str, LabEquipment] = {}
        self.bookings: dict[str, LabBooking] = {}
        self._equipment_counter = 0
        self._booking_counter = 0
        self._initialize_labs()

    def _initialize_labs(self) -> None:
        now = datetime.now()
        for lab_data in LABS_DATA:
            lab = Lab(
                id=lab_data["id"],
                name=lab_data["name"],
                building=lab_data["building"],
                floor=lab_data["floor"],
                equipment_count=random.randint(5, 15),
                safety_status=random.choices(["safe", "safe", "safe", "warning", "safe"], weights=[0.6, 0.2, 0.1, 0.08, 0.02])[0],
                occupancy=random.randint(0, lab_data["capacity"]),
                max_capacity=lab_data["capacity"],
                temperature=random.uniform(22, 27),
                co2_level=random.uniform(450, 850),
            )
            self.labs[lab.id] = lab

            # Add equipment for each lab
            equip_types = {
                "AI & Machine Learning Lab": ["GPU Server", "Workstation Cluster", "Data Storage Array", "Training Server"],
                "Robotics & Automation Lab": ["Robot Arm", "Motion Capture System", "3D Printer", "Laser Cutter"],
                "Network Systems Lab": ["Network Analyzer", "Server Rack", "Spectrum Analyzer", "Switch Array"],
                "Computer Vision Lab": ["GPU Workstation", "Camera Array", "Depth Sensor", "Display Wall"],
                "Embedded Systems Lab": ["Oscilloscope", "Logic Analyzer", "FPGA Board", "Signal Generator"],
                "VLSI Design Lab": ["EDA Server", "Testing Probe", "Microscope Station", "Clean Bench"],
                "IoT & Sensor Lab": ["Sensor Array", "Gateway Node", "RF Analyzer", "Protocol Analyzer"],
                "Physics Research Lab": ["Laser System", "Vacuum Chamber", "Spectrometer", "Cryostat"],
                "Chemistry Analytical Lab": ["Spectrophotometer", "Chromatograph", "Centrifuge", "Fume Hood"],
                "Biotechnology Lab": ["PCR Machine", "Sequencer", "Microscope", "Incubator"],
                "Molecular Biology Lab": ["Electrophoresis Unit", "Centrifuge", "Thermocycler", "Bioanalyzer"],
                "CAD/CAM Lab": ["CAD Workstation", "CNC Machine", "3D Scanner", "Plotter"],
                "Materials Testing Lab": ["Universal Tester", "Hardness Tester", "Microscope", "Furnace"],
            }

            for equip_name in equip_types.get(lab.name, ["Generic Equipment"]):
                self._equipment_counter += 1
                equip_id = f"equip-{self._equipment_counter:04d}"
                cal_date = now - timedelta(days=random.randint(30, 180))
                equipment = LabEquipment(
                    id=equip_id,
                    name=equip_name,
                    lab=lab.name,
                    equipment_type=equip_name.split()[-1] if len(equip_name.split()) > 1 else "tool",
                    status=random.choices(["operational", "idle", "maintenance", "error"], weights=[0.5, 0.3, 0.15, 0.05])[0],
                    usage_hours=random.uniform(10, 500),
                    temperature=random.uniform(22, 35),
                    last_calibration=cal_date.strftime("%Y-%m-%d"),
                    next_calibration=(cal_date + timedelta(days=90)).strftime("%Y-%m-%d"),
                    health_score=random.uniform(70, 100),
                )
                self.equipment[equip_id] = equipment

    def get_lab_status(self, lab_id: str) -> Optional[Lab]:
        return self.labs.get(lab_id)

    def get_equipment(self, equip_id: str) -> Optional[LabEquipment]:
        return self.equipment.get(equip_id)

    def get_lab_equipment(self, lab_name: str) -> list[LabEquipment]:
        return [e for e in self.equipment.values() if e.lab == lab_name]

    def book_equipment(self, lab: str, equipment: str, user: str, purpose: str, duration_hours: int = 2) -> LabBooking:
        self._booking_counter += 1
        now = datetime.now()
        booking = LabBooking(
            id=f"booking-{self._booking_counter:04d}",
            lab=lab,
            equipment=equipment,
            user=user,
            start_time=now.strftime("%Y-%m-%d %H:%M"),
            end_time=(now + timedelta(hours=duration_hours)).strftime("%Y-%m-%d %H:%M"),
            purpose=purpose,
            status="confirmed",
        )
        self.bookings[booking.id] = booking
        return booking

    def get_safety_alerts(self) -> list[dict]:
        alerts = []
        for lab in self.labs.values():
            if lab.safety_status != "safe":
                alerts.append({
                    "lab": lab.name,
                    "issue": f"Safety status: {lab.safety_status}",
                    "temperature": lab.temperature,
                    "co2_level": lab.co2_level,
                    "occupancy": f"{lab.occupancy}/{lab.max_capacity}",
                })
        for equip in self.equipment.values():
            if equip.status == "error":
                alerts.append({
                    "equipment": equip.name,
                    "lab": equip.lab,
                    "issue": f"Equipment error — health score: {equip.health_score:.0f}%",
                    "temperature": equip.temperature,
                })
        return alerts[:10]

    def get_summary(self) -> dict:
        return {
            "total_labs": len(self.labs),
            "total_equipment": len(self.equipment),
            "safe": sum(1 for l in self.labs.values() if l.safety_status == "safe"),
            "warning": sum(1 for l in self.labs.values() if l.safety_status == "warning"),
            "operational_equipment": sum(1 for e in self.equipment.values() if e.status in ("operational", "idle")),
            "equipment_in_maintenance": sum(1 for e in self.equipment.values() if e.status == "maintenance"),
            "equipment_in_error": sum(1 for e in self.equipment.values() if e.status == "error"),
            "total_bookings": len(self.bookings),
        }
