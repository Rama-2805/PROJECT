"""SmartCampus AI — Edge Agent AI Processing Pipeline.
Simulates local AI execution: face recognition, behavior analysis, event generation.
In production, this would run InsightFace/MediaPipe on the edge device.
"""
import asyncio
import logging
import random
from datetime import datetime, timezone
from typing import Optional, Callable, Awaitable

from app.config import EdgeAgentSettings
from app.device_manager import DeviceManager

logger = logging.getLogger(__name__)

PipelineCallback = Callable[[str, dict], Awaitable[None]]

# Simulated student database for a classroom
SIMULATED_STUDENTS = [
    {"id": "CSE2026001", "name": "Arjun Sharma", "confidence_range": (0.85, 0.99)},
    {"id": "CSE2026002", "name": "Priya Patel", "confidence_range": (0.88, 0.99)},
    {"id": "CSE2026003", "name": "Rohan Verma", "confidence_range": (0.80, 0.97)},
    {"id": "CSE2026004", "name": "Ananya Gupta", "confidence_range": (0.86, 0.98)},
    {"id": "CSE2026005", "name": "Vikram Singh", "confidence_range": (0.82, 0.96)},
    {"id": "CSE2026006", "name": "Sneha Reddy", "confidence_range": (0.90, 0.99)},
    {"id": "CSE2026007", "name": "Karan Nair", "confidence_range": (0.78, 0.95)},
    {"id": "CSE2026008", "name": "Isha Desai", "confidence_range": (0.87, 0.98)},
    {"id": "CSE2026009", "name": "Rahul Mehta", "confidence_range": (0.84, 0.97)},
    {"id": "CSE2026010", "name": "Neha Joshi", "confidence_range": (0.83, 0.96)},
    {"id": "CSE2026011", "name": "Amit Kumar", "confidence_range": (0.79, 0.94)},
    {"id": "CSE2026012", "name": "Pooja Iyer", "confidence_range": (0.91, 0.99)},
    {"id": "CSE2026013", "name": "Siddharth Saxena", "confidence_range": (0.85, 0.97)},
    {"id": "CSE2026014", "name": "Shreya Agarwal", "confidence_range": (0.86, 0.98)},
    {"id": "CSE2026015", "name": "Manish Bose", "confidence_range": (0.80, 0.95)},
]

BEHAVIOR_TYPES = ["ATTENTIVE", "DISTRACTED", "PHONE_USAGE", "SLEEPING", "ABSENT_FROM_SEAT"]
BEHAVIOR_WEIGHTS = [0.65, 0.15, 0.08, 0.07, 0.05]  # Weighted random selection


class AIPipeline:
    """Simulates edge AI processing: face recognition + behavior analysis."""

    def __init__(
        self,
        settings: EdgeAgentSettings,
        device_manager: DeviceManager,
        on_event: Optional[PipelineCallback] = None,
    ):
        self.settings = settings
        self.device_manager = device_manager
        self.on_event = on_event
        self._running = False
        self._task: Optional[asyncio.Task] = None
        self._session_active = False
        self._recognized_set: set[str] = set()
        self._frame_count = 0

    async def start(self):
        """Start the AI processing pipeline."""
        self._running = True
        self._task = asyncio.create_task(self._pipeline_loop())
        logger.info(f"[{self.settings.device_id}] AI Pipeline started")

    async def stop(self):
        """Stop the AI pipeline."""
        self._running = False
        if self._task:
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass
        logger.info(f"[{self.settings.device_id}] AI Pipeline stopped")

    def start_session(self):
        """Start an attendance session."""
        self._session_active = True
        self._recognized_set.clear()
        logger.info(f"[{self.settings.device_id}] Attendance session started")

    def end_session(self):
        """End the current attendance session."""
        self._session_active = False
        logger.info(f"[{self.settings.device_id}] Attendance session ended ({len(self._recognized_set)} students recognized)")

    def _random_behavior(self) -> str:
        """Pick a weighted random behavior type."""
        r = random.random()
        cumulative = 0
        for btype, weight in zip(BEHAVIOR_TYPES, BEHAVIOR_WEIGHTS):
            cumulative += weight
            if r <= cumulative:
                return btype
        return "ATTENTIVE"

    async def _pipeline_loop(self):
        """Main pipeline loop — simulates frame processing."""
        while self._running:
            try:
                self._frame_count += 1

                # Simulate face detection — detect random number of students (8-15)
                num_detected = random.randint(8, 15)
                detected_students = random.sample(SIMULATED_STUDENTS, min(num_detected, len(SIMULATED_STUDENTS)))

                for student in detected_students:
                    confidence = round(
                        random.uniform(student["confidence_range"][0], student["confidence_range"][1]),
                        3,
                    )

                    # Generate attendance event if session active and not already recognized
                    if self._session_active and student["id"] not in self._recognized_set:
                        if confidence >= self.settings.detection_threshold:
                            self._recognized_set.add(student["id"])
                            attendance_event = {
                                "studentId": student["id"],
                                "studentName": student["name"],
                                "confidence": confidence,
                                "deviceId": self.settings.device_id,
                                "classroomId": self.settings.classroom_id,
                                "timestamp": datetime.now(timezone.utc).isoformat(),
                            }
                            if self.on_event:
                                await self.on_event("smartcampus/device/{}/attendance".format(self.settings.device_id), attendance_event)

                    # Generate behavior events periodically (every ~5 frames)
                    if self._frame_count % 5 == 0 and random.random() < 0.3:
                        behavior = self._random_behavior()
                        behavior_event = {
                            "studentId": student["id"],
                            "studentName": student["name"],
                            "behaviorType": behavior,
                            "confidence": confidence,
                            "deviceId": self.settings.device_id,
                            "classroomId": self.settings.classroom_id,
                            "timestamp": datetime.now(timezone.utc).isoformat(),
                        }
                        if self.on_event:
                            await self.on_event("smartcampus/device/{}/behavior".format(self.settings.device_id), behavior_event)

                # Simulate AI processing delay — adjust to simulate FPS
                await asyncio.sleep(self.settings.frame_interval)

            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"[{self.settings.device_id}] Pipeline error: {e}")
                await asyncio.sleep(1)
