"""SmartCampus AI — Edge Agent Heartbeat Service.
Sends periodic health status to the backend via MQTT and REST.
"""
import asyncio
import logging
import random
from datetime import datetime, timezone
from typing import Optional, Callable, Awaitable

from app.config import EdgeAgentSettings
from app.device_manager import DeviceManager

logger = logging.getLogger(__name__)

HeartbeatCallback = Callable[[dict], Awaitable[None]]


class HeartbeatService:
    """Sends heartbeat every N seconds with device health metrics."""

    def __init__(
        self,
        settings: EdgeAgentSettings,
        device_manager: DeviceManager,
        on_heartbeat: Optional[HeartbeatCallback] = None,
    ):
        self.settings = settings
        self.device_manager = device_manager
        self.on_heartbeat = on_heartbeat
        self._running = False
        self._task: Optional[asyncio.Task] = None

    async def start(self):
        """Start the heartbeat loop."""
        self._running = True
        self._task = asyncio.create_task(self._heartbeat_loop())
        logger.info(f"[{self.settings.device_id}] Heartbeat service started (interval={self.settings.heartbeat_interval}s)")

    async def stop(self):
        """Stop the heartbeat loop."""
        self._running = False
        if self._task:
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass
        logger.info(f"[{self.settings.device_id}] Heartbeat service stopped")

    def generate_heartbeat(self) -> dict:
        """Generate a heartbeat message with simulated health metrics."""
        dm = self.device_manager

        # Simulate realistic health metrics with some variation
        dm.info.cpu_usage = round(random.uniform(15, 85), 1)
        dm.info.memory_usage = round(random.uniform(30, 90), 1)
        dm.info.temperature = round(random.uniform(38, 72), 1)
        dm.info.network_status = random.choice(["GOOD", "GOOD", "GOOD", "FAIR", "GOOD"])

        return {
            "deviceId": dm.info.device_id,
            "deviceName": dm.info.device_name,
            "status": dm.status.value,
            "cpu": dm.info.cpu_usage,
            "memory": dm.info.memory_usage,
            "temperature": dm.info.temperature,
            "network": dm.info.network_status,
            "uptime": dm.get_uptime(),
            "uptimeSeconds": dm.get_uptime_seconds(),
            "firmwareVersion": dm.info.firmware_version,
            "aiModel": dm.info.ai_model_version,
            "location": dm.info.location,
            "classroomId": dm.info.classroom_id,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }

    async def _heartbeat_loop(self):
        """Main heartbeat loop."""
        while self._running:
            try:
                heartbeat = self.generate_heartbeat()
                if self.on_heartbeat:
                    await self.on_heartbeat(heartbeat)
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"[{self.settings.device_id}] Heartbeat error: {e}")

            await asyncio.sleep(self.settings.heartbeat_interval)
