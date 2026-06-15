# ─── SmartCampus AI — Robotics API Endpoints ───────
# Part 12: REST APIs for robotics, drones, buildings,
# maintenance, security, labs, digital twin, and HRI.

from __future__ import annotations
from fastapi import APIRouter, HTTPException, Query
from typing import Optional

from .simulator import AutonomousSimulator

router = APIRouter(prefix="/campus/autonomous", tags=["Autonomous Campus"])

# Singleton simulator instance
simulator = AutonomousSimulator()


# ── Robots ──────────────────────────────────────────

@router.get("/robots")
async def list_robots(robot_type: Optional[str] = None, status: Optional[str] = None):
    robots = list(simulator.robot_manager.robots.values())
    if robot_type:
        robots = [r for r in robots if r.type.value == robot_type]
    if status:
        robots = [r for r in robots if r.status.value == status]
    return {"robots": [r.to_dict() for r in robots], "count": len(robots)}


@router.get("/robots/{robot_id}")
async def get_robot(robot_id: str):
    robot = simulator.robot_manager.get_robot(robot_id)
    if not robot:
        raise HTTPException(status_code=404, detail="Robot not found")
    return {"robot": robot.to_dict()}


@router.post("/robots/{robot_id}/mission")
async def assign_robot_mission(robot_id: str, mission_type: str = Query("guide"), description: str = "Mission"):
    from .robot_manager import RobotMission, Position
    import random
    mission = RobotMission(
        type=mission_type,
        target=Position(
            x=random.uniform(10, 80),
            y=random.uniform(15, 70),
            building=random.choice(["Engineering Block", "Science Block", "Library"]),
        ),
        description=description,
    )
    mission_id = simulator.robot_manager.assign_mission(mission)
    if not mission_id:
        raise HTTPException(status_code=503, detail="No robots available")
    return {"mission_id": mission_id, "status": "assigned"}


@router.post("/robots/{robot_id}/stop")
async def emergency_stop_robot(robot_id: str):
    result = simulator.robot_manager.emergency_stop(robot_id)
    if not result:
        raise HTTPException(status_code=404, detail="Robot not found")
    simulator.safety.emergency_stop(robot_id, "API emergency stop")
    return {"status": "stopped", "robot_id": robot_id}


@router.get("/robots/fleet/summary")
async def get_fleet_summary():
    return simulator.robot_manager.get_fleet_summary()


# ── Drones ──────────────────────────────────────────

@router.get("/drones")
async def list_drones(status: Optional[str] = None):
    drones = list(simulator.drone_manager.drones.values())
    if status:
        drones = [d for d in drones if d.status.value == status]
    return {"drones": [d.to_dict() for d in drones], "count": len(drones)}


@router.get("/drones/{drone_id}")
async def get_drone(drone_id: str):
    drone = simulator.drone_manager.get_drone(drone_id)
    if not drone:
        raise HTTPException(status_code=404, detail="Drone not found")
    return {"drone": drone.to_dict()}


@router.post("/drones/mission")
async def start_drone_mission(mission_type: str = "inspection", purpose: str = "Routine inspection"):
    from .drone_manager import DroneMissionType
    type_map = {
        "inspection": DroneMissionType.INSPECTION,
        "emergency": DroneMissionType.EMERGENCY,
        "environmental": DroneMissionType.ENVIRONMENTAL,
        "surveillance": DroneMissionType.SURVEILLANCE,
        "delivery": DroneMissionType.DELIVERY,
    }
    mtype = type_map.get(mission_type, DroneMissionType.INSPECTION)
    flight_id = simulator.drone_manager.start_mission(mtype, purpose)
    if not flight_id:
        raise HTTPException(status_code=503, detail="No drones available")
    return {"flight_id": flight_id, "status": "started"}


@router.get("/drones/fleet/summary")
async def get_drone_fleet_summary():
    return simulator.drone_manager.get_fleet_summary()


# ── Navigation ──────────────────────────────────────

@router.get("/navigation/map")
async def get_campus_map():
    from .navigation import NavigationSystem
    nav = NavigationSystem()
    return nav.get_map_data()


@router.post("/navigation/route")
async def plan_route(start_building: str, end_building: str):
    from .navigation import NavigationSystem
    from .robot_manager import Position
    nav = NavigationSystem()
    start = Position(x=0, y=0, building=start_building)
    end = Position(x=50, y=50, building=end_building)
    route = nav.find_path(start, end)
    return {"route": route.to_dict()}


# ── Buildings / Energy ──────────────────────────────

@router.get("/buildings")
async def list_buildings():
    return {"buildings": simulator.building_system.get_all_buildings_status()}


@router.get("/buildings/{building}")
async def get_building_status(building: str):
    return simulator.building_system.get_building_status(building)


@router.get("/energy/analytics")
async def get_energy_analytics():
    return simulator.building_system.generate_energy_report()


# ── Autonomous Labs ─────────────────────────────────

@router.get("/labs")
async def list_labs():
    """List all autonomous laboratories with status."""
    return {
        "labs": [l.to_dict() for l in simulator.labs_autonomous.labs.values()],
        "summary": simulator.labs_autonomous.get_summary(),
    }


@router.get("/labs/{lab_id}")
async def get_lab_details(lab_id: str):
    """Get details for a specific lab."""
    lab = simulator.labs_autonomous.get_lab_status(lab_id)
    if not lab:
        raise HTTPException(status_code=404, detail="Lab not found")
    equipment = simulator.labs_autonomous.get_lab_equipment(lab.name)
    return {"lab": lab.to_dict(), "equipment": [e.to_dict() for e in equipment]}


@router.get("/labs/equipment/{equip_id}")
async def get_equipment_details(equip_id: str):
    """Get details for specific lab equipment."""
    equip = simulator.labs_autonomous.get_equipment(equip_id)
    if not equip:
        raise HTTPException(status_code=404, detail="Equipment not found")
    return {"equipment": equip.to_dict()}


@router.post("/labs/book")
async def book_equipment(lab: str, equipment: str, user: str, purpose: str = "Research"):
    """Book lab equipment for use."""
    booking = simulator.labs_autonomous.book_equipment(lab, equipment, user, purpose)
    return {"booking": booking.to_dict(), "status": "confirmed"}


@router.get("/labs/safety")
async def get_lab_safety_alerts():
    """Get safety alerts from all labs."""
    return {"alerts": simulator.labs_autonomous.get_safety_alerts()}


# ── Robotics Digital Twin ───────────────────────────

@router.get("/twin/entities")
async def get_twin_entities():
    """Get all digital twin entities for the 3D campus scene."""
    from .digital_twin import RoboticsDigitalTwin
    twin = RoboticsDigitalTwin(simulator.robot_manager, simulator.drone_manager)
    return {"entities": twin.get_all_entities(), "overlay": twin.get_scene_overlay()}


@router.get("/twin/robots")
async def get_twin_robot_entities():
    """Get robot entities for the 3D scene."""
    from .digital_twin import RoboticsDigitalTwin
    twin = RoboticsDigitalTwin(simulator.robot_manager, simulator.drone_manager)
    return {"entities": [e.to_dict() for e in twin.get_robot_entities()]}


@router.get("/twin/drones")
async def get_twin_drone_entities():
    """Get drone entities for the 3D scene."""
    from .digital_twin import RoboticsDigitalTwin
    twin = RoboticsDigitalTwin(simulator.robot_manager, simulator.drone_manager)
    return {"entities": [e.to_dict() for e in twin.get_drone_entities()]}


@router.get("/twin/overlay")
async def get_twin_scene_overlay():
    """Get scene overlay data for the 3D campus twin."""
    from .digital_twin import RoboticsDigitalTwin
    twin = RoboticsDigitalTwin(simulator.robot_manager, simulator.drone_manager)
    return twin.get_scene_overlay()


# ── Human-Robot Interaction ─────────────────────────

@router.post("/hri/voice")
async def process_voice_command(text: str = Query(..., description="Voice command text")):
    """Process a natural language voice command for any robot."""
    return simulator.hri.handle_interaction(text, "voice")


@router.post("/hri/gesture")
async def process_gesture(gesture_type: str = Query(..., description="Gesture type: wave, point, swipe_up, swipe_down, pinch, grab")):
    """Process a detected gesture."""
    return simulator.hri.handle_interaction(gesture_type, "gesture")


@router.get("/hri/history")
async def get_interaction_history():
    """Get recent human-robot interaction history."""
    return {"history": simulator.hri.get_interaction_history()}


@router.get("/hri/summary")
async def get_hri_summary():
    """Get HRI system summary."""
    return simulator.hri.get_summary()


# ── Maintenance ─────────────────────────────────────

@router.get("/maintenance/predictions")
async def get_maintenance_predictions(high_risk_only: bool = False):
    if high_risk_only:
        assets = simulator.maintenance.get_high_risk_assets()
    else:
        assets = simulator.maintenance.get_all_predictions()
    return {"assets": [a.to_dict() for a in assets], "count": len(assets)}


@router.get("/maintenance/summary")
async def get_maintenance_summary():
    return simulator.maintenance.get_maintenance_summary()


# ── Security ────────────────────────────────────────

@router.get("/security/alerts")
async def get_security_alerts(active_only: bool = True):
    if active_only:
        alerts = simulator.security.get_active_alerts()
    else:
        alerts = list(simulator.security.alerts.values())
    return {"alerts": [a.to_dict() for a in alerts], "count": len(alerts)}


@router.post("/security/alerts/{alert_id}/resolve")
async def resolve_security_alert(alert_id: str, resolution: str = "Investigated and resolved"):
    result = simulator.security.resolve_alert(alert_id, resolution)
    if not result:
        raise HTTPException(status_code=404, detail="Alert not found")
    return {"status": "resolved"}


@router.get("/security/patrols")
async def get_patrol_routes():
    return {"patrols": simulator.security.get_patrol_status()}


# ── Safety ──────────────────────────────────────────

@router.get("/safety/events")
async def get_safety_events():
    return {"events": simulator.safety.get_recent_events()}


@router.get("/safety/summary")
async def get_safety_summary():
    return simulator.safety.get_safety_summary()


@router.post("/safety/emergency-stop")
async def emergency_stop(robot_id: str, reason: str = "Manual override"):
    event = simulator.safety.emergency_stop(robot_id, reason)
    simulator.robot_manager.emergency_stop(robot_id)
    return {"event": event.to_dict(), "status": "emergency_stop_activated"}


# ── Swarm / Coordination ────────────────────────────

@router.get("/swarm/tasks")
async def get_swarm_tasks():
    return {
        "tasks": [t.to_dict() for t in simulator.swarm.tasks.values()],
        "summary": simulator.swarm.get_coordination_summary(),
    }


@router.post("/swarm/simulate")
async def simulate_swarm_coordination(task_type: str = "cleaning"):
    if task_type == "cleaning":
        return simulator.simulate_coordinated_cleaning()
    elif task_type == "escort":
        return simulator.simulate_escort_visitor()
    return {"error": "Unknown task type"}


# ── Simulator ───────────────────────────────────────

@router.get("/simulator/status")
async def get_simulator_status():
    """Get full simulator status including all 18 parts."""
    return simulator.get_summary()


@router.post("/simulator/event")
async def generate_random_event():
    return simulator.simulate_random_event()


@router.post("/simulator/mission")
async def simulate_mission(mission_type: str = "guide"):
    return simulator.simulate_robot_mission(mission_type)


@router.post("/simulator/drone")
async def simulate_drone_mission():
    return simulator.simulate_drone_mission()


@router.post("/simulator/security")
async def simulate_security_event(event_type: str = "intrusion"):
    return simulator.simulate_security_event(event_type)


@router.post("/simulator/lab")
async def simulate_lab_event():
    """Simulate a lab-related event."""
    import random
    labs = list(simulator.labs_autonomous.labs.values())
    lab = random.choice(labs)
    return {"lab": lab.to_dict(), "safety": simulator.labs_autonomous.get_safety_alerts()[:3]}


@router.post("/simulator/hri")
async def simulate_hri_command():
    """Simulate a voice command to test HRI."""
    import random
    commands = [
        "Guide me to the library please",
        "What is your current status?",
        "Deliver this package to the Science Block",
        "Follow me to the Engineering Block",
        "Patrol the main campus area",
    ]
    cmd = random.choice(commands)
    result = simulator.hri.handle_interaction(cmd, "voice")
    return result
