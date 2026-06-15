"""SmartCampus AI — Edge Agent Configuration."""
from pydantic_settings import BaseSettings
from typing import Optional


class EdgeAgentSettings(BaseSettings):
    """Configuration for a single edge device instance."""

    # Device identity
    device_id: str = "DEVICE_CSE_001"
    device_name: str = "CSE Lab Edge Node"
    device_type: str = "JETSON_NANO"  # JETSON_NANO, RASPBERRY_PI, CORAL_TPU, VIRTUAL
    classroom_id: str = "room-023"
    institution_id: str = "inst-001"
    location: str = "Building A, Floor 3, CSE Lab 301"

    # Firmware & AI version
    firmware_version: str = "2.1.0"
    ai_model_version: str = "SmartCampus-AI-v1.0"

    # Backend connection
    backend_url: str = "http://localhost:8000"
    mqtt_broker: str = "localhost"
    mqtt_port: int = 1883
    mqtt_username: Optional[str] = None
    mqtt_password: Optional[str] = None
    mqtt_tls_enabled: bool = False
    auth_token: Optional[str] = None

    # Processing configuration
    frame_interval: float = 0.5
    detection_threshold: float = 0.6
    recognition_interval: int = 30  # seconds between recognition cycles
    heartbeat_interval: int = 30
    behavior_analysis_interval: int = 60

    # Offline buffering
    offline_buffer_path: str = "data/offline_buffer.db"
    max_buffer_size: int = 10000

    # Camera config (simulated)
    camera_source: str = "simulated"
    camera_resolution: str = "1280x720"
    camera_fps: int = 30

    # Simulator mode
    simulate: bool = True
    simulate_devices: int = 0  # 0 = run as single device
    simulate_error_rate: float = 0.02  # 2% chance of random errors

    class Config:
        env_prefix = "EDGE_"
        env_file = ".env"


settings = EdgeAgentSettings()
