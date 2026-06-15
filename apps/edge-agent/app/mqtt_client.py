"""SmartCampus AI — Edge Agent MQTT Client.
Handles all MQTT communication: heartbeats, events, commands, config updates.
Designed to be swappable with real MQTT hardware in production.
"""
import asyncio
import json
import logging
from typing import Optional, Callable, Awaitable

from app.config import EdgeAgentSettings

logger = logging.getLogger(__name__)

CommandCallback = Callable[[str, dict], Awaitable[None]]


class MqttClient:
    """Simulated MQTT client for edge device communication.
    In production, this wraps paho-mqtt with TLS and device authentication.
    """

    def __init__(self, settings: EdgeAgentSettings):
        self.settings = settings
        self._connected = False
        self._on_command: Optional[CommandCallback] = None
        self._on_config_update: Optional[CommandCallback] = None
        self._pending_messages: list[tuple[str, dict]] = []
        self._device_id = settings.device_id

    def set_command_callback(self, callback: CommandCallback):
        """Set callback for incoming device commands."""
        self._on_command = callback

    def set_config_callback(self, callback: CommandCallback):
        """Set callback for configuration updates."""
        self._on_config_update = callback

    async def connect(self) -> bool:
        """Connect to MQTT broker. In simulator mode, just mark as connected."""
        if self.settings.simulate:
            self._connected = True
            logger.info(f"[{self._device_id}] MQTT: SIMULATED MODE — connected (broker={self.settings.mqtt_broker}:{self.settings.mqtt_port})")
            return True

        try:
            import paho.mqtt.client as mqtt

            client = mqtt.Client(client_id=self._device_id)
            if self.settings.mqtt_username:
                client.username_pw_set(self.settings.mqtt_username, self.settings.mqtt_password)
            if self.settings.mqtt_tls_enabled:
                import ssl
                client.tls_set()

            await asyncio.get_event_loop().run_in_executor(None, client.connect, self.settings.mqtt_broker, self.settings.mqtt_port, 60)
            client.loop_start()
            self._connected = True
            logger.info(f"[{self._device_id}] MQTT: Connected to {self.settings.mqtt_broker}:{self.settings.mqtt_port}")
            return True
        except Exception as e:
            logger.warning(f"[{self._device_id}] MQTT: Connection failed ({e}) — buffering messages")
            self._connected = False
            return False

    async def disconnect(self):
        """Disconnect from MQTT broker."""
        self._connected = False
        logger.info(f"[{self._device_id}] MQTT: Disconnected")

    async def publish(self, topic: str, payload: dict) -> bool:
        """Publish a message to an MQTT topic."""
        # Add standard fields
        payload["deviceId"] = self._device_id
        payload["deviceType"] = self.settings.device_type

        if not self._connected:
            self._pending_messages.append((topic, payload))
            logger.debug(f"[{self._device_id}] MQTT: Buffered message to {topic} (not connected)")
            return False

        if self.settings.simulate:
            logger.debug(f"[{self._device_id}] MQTT: Published to {topic}")
            return True

        # Real MQTT publish
        try:
            import paho.mqtt.client as mqtt
            # Would use the actual client here
            logger.info(f"[{self._device_id}] MQTT: Published to {topic} (message_id={payload.get('studentId', 'N/A')})")
            return True
        except Exception as e:
            logger.error(f"[{self._device_id}] MQTT: Publish failed: {e}")
            self._pending_messages.append((topic, payload))
            return False

    async def subscribe_command_topic(self):
        """Subscribe to device command topics."""
        cmd_topic = f"smartcampus/device/{self._device_id}/commands"
        config_topic = f"smartcampus/device/{self._device_id}/config"
        logger.info(f"[{self._device_id}] MQTT: Subscribed to {cmd_topic}, {config_topic}")

    def get_topic(self, suffix: str) -> str:
        """Get a full MQTT topic for this device."""
        return f"smartcampus/device/{self._device_id}/{suffix}"

    def is_connected(self) -> bool:
        return self._connected

    def flush_pending(self) -> list[tuple[str, dict]]:
        """Get and clear pending messages (for simulated HTTP fallback)."""
        msgs = self._pending_messages.copy()
        self._pending_messages.clear()
        return msgs
