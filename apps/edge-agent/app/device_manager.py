"""SmartCampus AI — Edge Device Manager.
Handles device identity, registration, boot sequence, and lifecycle.
"""
import asyncio
import logging
from dataclasses import dataclass, field
from enum import Enum
from datetime import datetime, timezone
from typing import Optional

import httpx

from app.config import EdgeAgentSettings

logger = logging.getLogger(__name__)


class DeviceStatus(Enum):
    BOOTING = "BOOTING"
    ONLINE = "ONLINE"
    OFFLINE = "OFFLINE"
    PROCESSING = "PROCESSING"
    ERROR = "ERROR"
    UPDATING = "UPDATING"


@dataclass
class DeviceInfo:
    """Complete device metadata sent during registration."""
    device_id: str
    device_name: str
    device_type: str
    classroom_id: str
    institution_id: str
    location: str
    firmware_version: str
    ai_model_version: str
    cpu_usage: float = 0.0
    memory_usage: float = 0.0
    temperature: float = 0.0
    network_status: str = "GOOD"
    status: str = "OFFLINE"
    last_online: Optional[str] = None
    uptime_seconds: float = 0.0


class DeviceManager:
    """Manages device identity, registration, and lifecycle."""

    def __init__(self, settings: EdgeAgentSettings):
        self.settings = settings
        self.status = DeviceStatus.BOOTING
        self.info = DeviceInfo(
            device_id=settings.device_id,
            device_name=settings.device_name,
            device_type=settings.device_type,
            classroom_id=settings.classroom_id,
            institution_id=settings.institution_id,
            location=settings.location,
            firmware_version=settings.firmware_version,
            ai_model_version=settings.ai_model_version,
        )
        self._start_time = datetime.now(timezone.utc)
        self._boot_steps: list[dict] = []
        self._http_client: Optional[httpx.AsyncClient] = None

    async def boot(self) -> bool:
        """Execute the full boot sequence."""
        logger.info(f"[{self.info.device_id}] Starting boot sequence...")

        self.status = DeviceStatus.BOOTING

        steps = [
            ("Loading device configuration", self._load_config),
            ("Checking camera availability", self._check_camera),
            ("Loading AI models", self._load_ai_models),
            ("Authenticating with backend", self._authenticate),
            ("Registering device", self._register_device),
            ("Connecting MQTT", self._connect_mqtt),
            ("Starting heartbeat service", self._start_heartbeat),
            ("Starting video processing pipeline", self._start_pipeline),
        ]

        success = True
        for step_name, step_fn in steps:
            logger.info(f"[{self.info.device_id}] {step_name}...")
            step_ok = False
            try:
                step_ok = await step_fn()
            except Exception as e:
                logger.error(f"[{self.info.device_id}] {step_name} FAILED: {e}")
                step_ok = False

            self._boot_steps.append({"step": step_name, "success": step_ok})
            if not step_ok:
                success = False
                logger.warning(f"[{self.info.device_id}] {step_name} failed — continuing")

        if success:
            self.status = DeviceStatus.ONLINE
            logger.info(f"[{self.info.device_id}] Boot complete — ONLINE")
        else:
            self.status = DeviceStatus.ONLINE  # Partial success still goes online
            logger.warning(f"[{self.info.device_id}] Boot completed with warnings")

        self.info.last_online = datetime.now(timezone.utc).isoformat()
        return success

    async def _load_config(self) -> bool:
        """Step 1: Load and validate configuration."""
        # Configuration is already loaded via settings
        return True

    async def _check_camera(self) -> bool:
        """Step 2: Verify camera is accessible."""
        if self.settings.simulate:
            logger.info(f"[{self.info.device_id}] Camera check: SIMULATED MODE — OK")
            return True
        # In real mode, try to open camera
        try:
            import cv2
            cap = cv2.VideoCapture(self.settings.camera_source)
            ok = cap.isOpened()
            cap.release()
            if ok:
                logger.info(f"[{self.info.device_id}] Camera check: OK")
            else:
                logger.warning(f"[{self.info.device_id}] Camera check: FAILED")
            return ok
        except Exception as e:
            logger.error(f"[{self.info.device_id}] Camera error: {e}")
            return False

    async def _load_ai_models(self) -> bool:
        """Step 3: Simulate AI model loading."""
        logger.info(f"[{self.info.device_id}] Loading AI model: {self.settings.ai_model_version}")
        await asyncio.sleep(0.5)  # Simulate load time
        return True

    async def _authenticate(self) -> bool:
        """Step 4: Authenticate with backend."""
        if self.settings.simulate and not self.settings.auth_token:
            logger.info(f"[{self.info.device_id}] Auth: SIMULATED MODE — using default token")
            self.settings.auth_token = "simulated-token-edge-agent"
            return True

        try:
            async with httpx.AsyncClient(timeout=10) as client:
                resp = await client.post(
                    f"{self.settings.backend_url}/iot/auth",
                    json={"deviceId": self.info.device_id, "deviceType": self.info.device_type},
                )
                if resp.status_code == 200:
                    data = resp.json()
                    self.settings.auth_token = data.get("token")
                    logger.info(f"[{self.info.device_id}] Auth: OK")
                    return True
                logger.warning(f"[{self.info.device_id}] Auth: FAILED (status={resp.status_code})")
                return False
        except Exception as e:
            logger.warning(f"[{self.info.device_id}] Auth: connection failed ({e}) — continuing in degraded mode")
            return False

    async def _register_device(self) -> bool:
        """Step 5: Register/ping device on backend."""
        if self.settings.simulate:
            logger.info(f"[{self.info.device_id}] Registration: SIMULATED MODE — OK")
            return True

        try:
            async with httpx.AsyncClient(timeout=10) as client:
                resp = await client.post(
                    f"{self.settings.backend_url}/iot/devices/register",
                    json={
                        "deviceId": self.info.device_id,
                        "deviceName": self.info.device_name,
                        "deviceType": self.info.device_type,
                        "classroomId": self.info.classroom_id,
                        "institutionId": self.info.institution_id,
                        "location": self.info.location,
                        "firmwareVersion": self.info.firmware_version,
                        "modelVersion": self.info.ai_model_version,
                    },
                    headers={"Authorization": f"Bearer {self.settings.auth_token}"},
                )
                ok = resp.status_code in (200, 201)
                if ok:
                    logger.info(f"[{self.info.device_id}] Registration: OK")
                else:
                    logger.warning(f"[{self.info.device_id}] Registration: FAILED (status={resp.status_code})")
                return ok
        except Exception as e:
            logger.warning(f"[{self.info.device_id}] Registration: connection failed ({e})")
            return False

    async def _connect_mqtt(self) -> bool:
        """Step 6: MQTT connection — stub, handled by MQTT manager."""
        logger.info(f"[{self.info.device_id}] MQTT: configured for broker {self.settings.mqtt_broker}:{self.settings.mqtt_port}")
        return True

    async def _start_heartbeat(self) -> bool:
        """Step 7: Heartbeat service — stub, handled by heartbeat service."""
        logger.info(f"[{self.info.device_id}] Heartbeat service: configured (interval={self.settings.heartbeat_interval}s)")
        return True

    async def _start_pipeline(self) -> bool:
        """Step 8: Video processing pipeline — stub, handled by pipeline."""
        logger.info(f"[{self.info.device_id}] AI Pipeline: configured (frame_interval={self.settings.frame_interval}s)")
        return True

    def get_uptime(self) -> str:
        """Get human-readable uptime."""
        delta = datetime.now(timezone.utc) - self._start_time
        hours, rem = divmod(int(delta.total_seconds()), 3600)
        minutes, seconds = divmod(rem, 60)
        return f"{hours}h {minutes}m"

    def get_uptime_seconds(self) -> float:
        """Get uptime in seconds."""
        delta = datetime.now(timezone.utc) - self._start_time
        return delta.total_seconds()

    def to_dict(self) -> dict:
        """Serialize device info to dict."""
        return {
            "deviceId": self.info.device_id,
            "deviceName": self.info.device_name,
            "deviceType": self.info.device_type,
            "classroomId": self.info.classroom_id,
            "institutionId": self.info.institution_id,
            "location": self.info.location,
            "firmwareVersion": self.info.firmware_version,
            "modelVersion": self.info.ai_model_version,
            "status": self.status.value,
            "cpu": self.info.cpu_usage,
            "memory": self.info.memory_usage,
            "temperature": self.info.temperature,
            "network": self.info.network_status,
            "uptime": self.get_uptime(),
            "uptimeSeconds": self.get_uptime_seconds(),
            "lastOnline": self.info.last_online,
            "bootSteps": self._boot_steps,
        }
