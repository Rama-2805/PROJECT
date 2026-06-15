"""SmartCampus AI — Edge Agent Simulator.
Main entry point that boots simulated edge devices and runs the full AI pipeline.
Supports --simulate N to run N virtual devices simultaneously.
"""
import argparse
import asyncio
import logging
import random
import signal
import sys
from datetime import datetime, timezone
from typing import Optional

from app.config import EdgeAgentSettings, settings as default_settings
from app.device_manager import DeviceManager
from app.heartbeat_service import HeartbeatService
from app.mqtt_client import MqttClient
from app.offline_buffer import OfflineBuffer
from app.ai_pipeline import AIPipeline

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    datefmt="%Y-%m-%dT%H:%M:%S",
)
logger = logging.getLogger("simulator")

# Color codes for console output
class Colors:
    HEADER = "\033[95m"
    OKBLUE = "\033[94m"
    OKCYAN = "\033[96m"
    OKGREEN = "\033[92m"
    WARNING = "\033[93m"
    FAIL = "\033[91m"
    ENDC = "\033[0m"
    BOLD = "\033[1m"


DEVICE_TYPES = ["JETSON_NANO", "RASPBERRY_PI_5", "CORAL_TPU", "VIRTUAL"]
DEVICE_NAMES = [
    "CSE Lab Edge Node", "ECE Lab Edge Node", "ME Workshop Edge Node",
    "Physics Lab Edge Node", "Chemistry Lab Edge Node", "Library Edge Node",
    "Admin Block Edge Node", "Auditorium Edge Node", "Sports Complex Edge Node",
    "Hostel Block A Edge Node",
]
CLASSROOM_IDS = [
    "room-001", "room-002", "room-003", "room-004", "room-005",
    "room-006", "room-007", "room-008", "room-009", "room-010",
]
LOCATIONS = [
    "Building A, Floor 1, CSE Lab 101", "Building A, Floor 2, CSE Lab 201",
    "Building B, Floor 1, ECE Lab 101", "Building B, Floor 2, ECE Lab 201",
    "Building C, Floor 1, ME Workshop", "Building D, Floor 1, Physics Lab",
    "Building D, Floor 2, Chemistry Lab", "Building E, Floor 1, Library",
    "Admin Block, Floor 1", "Building F, Floor 1, Auditorium",
]


class DeviceInstance:
    """Represents a single edge device instance in the simulator."""

    def __init__(self, device_index: int, settings: EdgeAgentSettings):
        self.settings = settings
        self.index = device_index
        self.manager = DeviceManager(settings)
        self.mqtt = MqttClient(settings)
        self.buffer = OfflineBuffer(settings)
        self.pipeline = AIPipeline(settings, self.manager, on_event=self._on_pipeline_event)
        self.heartbeat = HeartbeatService(settings, self.manager, on_heartbeat=self._on_heartbeat)

        # Wire up buffer retry
        self.buffer.set_retry_callback(self._retry_buffered_event)

        # Simulate random disconnections
        self._simulate_failures = False

    async def _on_pipeline_event(self, topic: str, payload: dict):
        """Handle events from the AI pipeline."""
        if not self.mqtt.is_connected():
            self.buffer.buffer_event(topic, payload, payload.get("behaviorType", "attendance"))
        else:
            await self.mqtt.publish(topic, payload)

    async def _on_heartbeat(self, heartbeat: dict):
        """Handle heartbeat events."""
        if not self.mqtt.is_connected():
            self.buffer.buffer_event(
                self.mqtt.get_topic("heartbeat"),
                heartbeat,
                "heartbeat",
            )
        else:
            await self.mqtt.publish(self.mqtt.get_topic("heartbeat"), heartbeat)

    async def _retry_buffered_event(self, topic: str, payload: dict):
        """Retry sending a buffered event."""
        await self.mqtt.publish(topic, payload)

    async def start(self):
        """Start the device instance."""
        logger.info(f"{Colors.HEADER}╔════════════════════════════════════════════╗{Colors.ENDC}")
        logger.info(f"{Colors.HEADER}║  Starting Device: {self.settings.device_id:<22} ║{Colors.ENDC}")
        logger.info(f"{Colors.HEADER}╚════════════════════════════════════════════╝{Colors.ENDC}")

        # Boot sequence
        boot_ok = await self.manager.boot()

        # Connect MQTT
        mqtt_ok = await self.mqtt.connect()
        if mqtt_ok:
            await self.mqtt.subscribe_command_topic()

        # Start services
        await self.heartbeat.start()
        await self.pipeline.start()
        await self.buffer.start_retry_loop(interval=10)

        status = "✓" if boot_ok else "⚠"
        logger.info(f"{Colors.OKGREEN}Device {self.settings.device_id} [{status}] — Status: {self.manager.status.value}{Colors.ENDC}")
        return boot_ok

    async def stop(self):
        """Stop the device instance gracefully."""
        await self.heartbeat.stop()
        await self.pipeline.stop()
        await self.buffer.stop_retry_loop()
        await self.mqtt.disconnect()
        logger.info(f"[{self.settings.device_id}] Stopped")

    def simulate_disconnect(self):
        """Simulate MQTT disconnection (for testing offline mode)."""
        self.mqtt._connected = False
        logger.warning(f"[{self.settings.device_id}] SIMULATED DISCONNECT")

    def simulate_reconnect(self):
        """Simulate MQTT reconnection."""
        self.mqtt._connected = True
        self.manager.status = type(self.manager.status).ONLINE
        logger.info(f"[{self.settings.device_id}] SIMULATED RECONNECT")


class Simulator:
    """Manages multiple simulated edge devices."""

    def __init__(self, num_devices: int = 1, base_settings: Optional[EdgeAgentSettings] = None):
        self.num_devices = num_devices
        self.base_settings = base_settings or default_settings
        self.devices: list[DeviceInstance] = []
        self._running = False

    def _create_device_settings(self, index: int) -> EdgeAgentSettings:
        """Create settings for a specific device."""
        device_num = index + 1
        type_idx = (index) % len(DEVICE_TYPES)
        name_idx = index % len(DEVICE_NAMES)
        room_idx = index % len(CLASSROOM_IDS)
        loc_idx = index % len(LOCATIONS)

        return EdgeAgentSettings(
            device_id=f"DEVICE_{['CSE','ECE','ME','PHY','CHEM','LIB','ADMIN','AUDI','SPORTS','HOSTEL'][room_idx]}_{device_num:03d}",
            device_name=DEVICE_NAMES[name_idx],
            device_type=DEVICE_TYPES[type_idx],
            classroom_id=CLASSROOM_IDS[room_idx],
            institution_id=self.base_settings.institution_id,
            location=LOCATIONS[loc_idx],
            simulate=True,
            simulate_error_rate=self.base_settings.simulate_error_rate,
            mqtt_broker=self.base_settings.mqtt_broker,
            mqtt_port=self.base_settings.mqtt_port,
        )

    async def start_all(self):
        """Boot all simulated devices."""
        logger.info(f"{Colors.BOLD}{Colors.OKCYAN}════════════════════════════════════════════{Colors.ENDC}")
        logger.info(f"{Colors.BOLD}{Colors.OKCYAN}   SmartCampus AI — Edge Agent Simulator     {Colors.ENDC}")
        logger.info(f"{Colors.BOLD}{Colors.OKCYAN}   Simulating {self.num_devices} edge device(s)...        {Colors.ENDC}")
        logger.info(f"{Colors.BOLD}{Colors.OKCYAN}════════════════════════════════════════════{Colors.ENDC}")

        start_time = datetime.now(timezone.utc)

        # Create and start device instances
        for i in range(self.num_devices):
            settings = self._create_device_settings(i)
            device = DeviceInstance(i, settings)
            self.devices.append(device)
            await device.start()

        elapsed = (datetime.now(timezone.utc) - start_time).total_seconds()
        online = sum(1 for d in self.devices if d.manager.status.value == "ONLINE")

        logger.info(f"{Colors.OKGREEN}════════════════════════════════════════════{Colors.ENDC}")
        logger.info(f"{Colors.OKGREEN}  Boot completed in {elapsed:.1f}s{Colors.ENDC}")
        logger.info(f"{Colors.OKGREEN}  Devices online: {online}/{self.num_devices}{Colors.ENDC}")
        logger.info(f"{Colors.OKGREEN}════════════════════════════════════════════{Colors.ENDC}")

        self._running = True

    async def stop_all(self):
        """Gracefully stop all devices."""
        self._running = False
        for device in self.devices:
            await device.stop()
        logger.info(f"[SIMULATOR] All devices stopped")

    async def periodic_summary(self):
        """Print periodic summary of device status."""
        while self._running:
            await asyncio.sleep(60)
            online = sum(1 for d in self.devices if d.manager.status.value == "ONLINE")
            buffers = sum(d.buffer.count() for d in self.devices)
            logger.info(f"[SUMMARY] Online: {online}/{len(self.devices)} | Buffered: {buffers}")


def parse_args():
    """Parse command-line arguments."""
    parser = argparse.ArgumentParser(
        description="SmartCampus AI — Edge Agent Simulator",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python -m app.simulator --simulate 10         # Run 10 simulated devices
  python -m app.simulator --device-id DEVICE_001  # Run a single named device
  python -m app.simulator --simulate 5 --error-rate 0.1  # 10% error rate
        """,
    )

    parser.add_argument(
        "--simulate", "-s",
        type=int,
        default=0,
        help="Number of simulated devices to run (default: 0 = run single device)",
    )
    parser.add_argument(
        "--device-id", "-d",
        type=str,
        default=None,
        help="Device ID for single device mode",
    )
    parser.add_argument(
        "--error-rate", "-e",
        type=float,
        default=None,
        help="Probability of random errors (0.0-1.0)",
    )
    parser.add_argument(
        "--mqtt-broker", "-m",
        type=str,
        default=None,
        help="MQTT broker address",
    )
    parser.add_argument(
        "--verbose", "-v",
        action="store_true",
        help="Enable debug logging",
    )

    return parser.parse_args()


async def main_async():
    """Async main entry point."""
    args = parse_args()

    if args.verbose:
        logging.getLogger().setLevel(logging.DEBUG)

    num_devices = args.simulate if args.simulate > 0 else 1

    # Override settings from CLI
    if args.device_id:
        default_settings.device_id = args.device_id
    if args.error_rate is not None:
        default_settings.simulate_error_rate = args.error_rate
    if args.mqtt_broker:
        default_settings.mqtt_broker = args.mqtt_broker

    simulator = Simulator(num_devices=num_devices, base_settings=default_settings)

    # Handle graceful shutdown
    stop_event = asyncio.Event()

    def _signal_handler():
        logger.info("\n[SHUTDOWN] Received stop signal — shutting down gracefully...")
        stop_event.set()

    loop = asyncio.get_event_loop()
    for sig in (signal.SIGINT, signal.SIGTERM):
        try:
            loop.add_signal_handler(sig, _signal_handler)
        except NotImplementedError:
            # Windows doesn't support add_signal_handler
            pass

    await simulator.start_all()

    # Run periodic summary in background
    summary_task = asyncio.create_task(simulator.periodic_summary())

    # Wait for shutdown signal
    await stop_event.wait()

    summary_task.cancel()
    await simulator.stop_all()
    logger.info("SmartCampus AI Edge Agent Simulator — Shutdown complete")


def main():
    """Synchronous entry point."""
    try:
        asyncio.run(main_async())
    except KeyboardInterrupt:
        logger.info("\n[SHUTDOWN] Interrupted by user")
    return 0


if __name__ == "__main__":
    sys.exit(main())
