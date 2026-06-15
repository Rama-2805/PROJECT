"""SmartCampus AI — Camera Management Engine.

Manages live video streams from laptop webcams, USB cameras,
and RTSP IP cameras with auto-reconnect and health monitoring.
"""

import cv2
import time
import threading
import numpy as np
from enum import Enum
from typing import Optional, Callable, List
from dataclasses import dataclass, field
from ..config.settings import settings


class CameraState(str, Enum):
    OFFLINE = "OFFLINE"
    CONNECTING = "CONNECTING"
    ONLINE = "ONLINE"
    ERROR = "ERROR"
    RECONNECTING = "RECONNECTING"


class CameraSource(str, Enum):
    WEBCAM = "WEBCAM"
    USB = "USB"
    RTSP = "RTSP"
    VIDEO_FILE = "VIDEO_FILE"


@dataclass
class CameraConfig:
    camera_id: str
    classroom_id: str
    source: CameraSource = CameraSource.WEBCAM
    source_path: str = "0"  # 0 for webcam, URL for RTSP, file path for video
    resolution: tuple = (640, 480)
    fps: int = 15
    location: str = ""
    institution_id: str = ""


@dataclass
class CameraFrame:
    frame: np.ndarray
    camera_id: str
    timestamp: float
    frame_index: int


class CameraManager:
    """Manages camera streams with health monitoring and auto-reconnect."""

    def __init__(self):
        self._cameras: dict[str, CameraConfig] = {}
        self._captures: dict[str, cv2.VideoCapture] = {}
        self._states: dict[str, CameraState] = {}
        self._frame_counts: dict[str, int] = {}
        self._threads: dict[str, threading.Thread] = {}
        self._running: dict[str, bool] = {}
        self._frame_callbacks: dict[str, list[Callable]] = {}
        self._health_timers: dict[str, float] = {}
        self._lock = threading.Lock()

    def register_camera(self, config: CameraConfig) -> None:
        """Register a camera for management."""
        with self._lock:
            self._cameras[config.camera_id] = config
            self._states[config.camera_id] = CameraState.OFFLINE
            self._frame_counts[config.camera_id] = 0
            self._running[config.camera_id] = False
            self._frame_callbacks[config.camera_id] = []

    def unregister_camera(self, camera_id: str) -> None:
        """Remove a camera from management."""
        self.stop_camera(camera_id)
        with self._lock:
            self._cameras.pop(camera_id, None)
            self._captures.pop(camera_id, None)
            self._states.pop(camera_id, None)
            self._frame_counts.pop(camera_id, None)
            self._running.pop(camera_id, None)
            self._frame_callbacks.pop(camera_id, None)
            self._health_timers.pop(camera_id, None)

    def on_frame(self, camera_id: str, callback: Callable[[CameraFrame], None]) -> None:
        """Register a callback for new frames from a camera."""
        if camera_id in self._frame_callbacks:
            self._frame_callbacks[camera_id].append(callback)

    def start_camera(self, camera_id: str) -> bool:
        """Start capturing from a camera stream."""
        config = self._cameras.get(camera_id)
        if not config:
            return False

        with self._lock:
            if self._states.get(camera_id) == CameraState.ONLINE:
                return True

            self._states[camera_id] = CameraState.CONNECTING

        thread = threading.Thread(
            target=self._capture_loop,
            args=(camera_id,),
            daemon=True,
        )
        self._running[camera_id] = True
        thread.start()
        self._threads[camera_id] = thread
        return True

    def stop_camera(self, camera_id: str) -> None:
        """Stop capturing from a camera."""
        self._running[camera_id] = False

        cap = self._captures.get(camera_id)
        if cap and cap.isOpened():
            cap.release()

        with self._lock:
            self._states[camera_id] = CameraState.OFFLINE
            self._captures.pop(camera_id, None)

    def _open_capture(self, config: CameraConfig) -> Optional[cv2.VideoCapture]:
        """Open a video capture based on source type."""
        try:
            if config.source in (CameraSource.WEBCAM, CameraSource.USB):
                source_id = int(config.source_path) if config.source_path.isdigit() else 0
                cap = cv2.VideoCapture(source_id)
            elif config.source == CameraSource.RTSP:
                cap = cv2.VideoCapture(config.source_path, cv2.CAP_FFMPEG)
            else:
                cap = cv2.VideoCapture(config.source_path)

            if cap.isOpened():
                cap.set(cv2.CAP_PROP_FRAME_WIDTH, config.resolution[0])
                cap.set(cv2.CAP_PROP_FRAME_HEIGHT, config.resolution[1])
                cap.set(cv2.CAP_PROP_FPS, config.fps)
                return cap

            cap.release()
        except Exception as e:
            print(f"[CameraManager] Failed to open camera {config.camera_id}: {e}")

        return None

    def _capture_loop(self, camera_id: str) -> None:
        """Main capture loop running in a background thread."""
        config = self._cameras.get(camera_id)
        if not config:
            return

        cap = self._open_capture(config)
        if not cap:
            with self._lock:
                self._states[camera_id] = CameraState.ERROR
            return

        with self._lock:
            self._captures[camera_id] = cap
            self._states[camera_id] = CameraState.ONLINE
            self._health_timers[camera_id] = time.time()

        frame_interval = 1.0 / max(config.fps, 1)
        consecutive_failures = 0

        while self._running.get(camera_id, False):
            start_time = time.time()

            ret, frame = cap.read()
            if ret:
                consecutive_failures = 0
                with self._lock:
                    self._frame_counts[camera_id] += 1
                    self._health_timers[camera_id] = time.time()

                camera_frame = CameraFrame(
                    frame=frame.copy(),
                    camera_id=camera_id,
                    timestamp=time.time(),
                    frame_index=self._frame_counts[camera_id],
                )

                # Notify callbacks
                callbacks = self._frame_callbacks.get(camera_id, [])
                for callback in callbacks:
                    try:
                        callback(camera_frame)
                    except Exception as e:
                        print(f"[CameraManager] Callback error: {e}")
            else:
                consecutive_failures += 1
                if consecutive_failures >= 30:
                    # Camera disconnected — attempt reconnect
                    with self._lock:
                        self._states[camera_id] = CameraState.RECONNECTING
                    cap.release()
                    time.sleep(2)
                    cap = self._open_capture(config)
                    if cap:
                        with self._lock:
                            self._captures[camera_id] = cap
                            self._states[camera_id] = CameraState.ONLINE
                        consecutive_failures = 0
                    else:
                        with self._lock:
                            self._states[camera_id] = CameraState.ERROR
                        break

            # Maintain target FPS
            elapsed = time.time() - start_time
            sleep_time = frame_interval - elapsed
            if sleep_time > 0:
                time.sleep(sleep_time)

        cap.release()
        with self._lock:
            self._states[camera_id] = CameraState.OFFLINE

    def get_state(self, camera_id: str) -> CameraState:
        """Get current state of a camera."""
        return self._states.get(camera_id, CameraState.OFFLINE)

    def get_frame_count(self, camera_id: str) -> int:
        """Get total frames captured from a camera."""
        return self._frame_counts.get(camera_id, 0)

    def get_health(self, camera_id: str) -> dict:
        """Get health metrics for a camera."""
        config = self._cameras.get(camera_id)
        state = self._states.get(camera_id, CameraState.OFFLINE)
        last_frame = self._health_timers.get(camera_id, 0)
        time_since_last_frame = time.time() - last_frame

        return {
            "camera_id": camera_id,
            "state": state.value,
            "frame_count": self._frame_counts.get(camera_id, 0),
            "last_frame_ago": round(time_since_last_frame, 2),
            "is_healthy": state == CameraState.ONLINE and time_since_last_frame < 10,
            "classroom_id": config.classroom_id if config else "",
        }

    def list_cameras(self) -> List[dict]:
        """List all registered cameras with their states."""
        return [self.get_health(cid) for cid in self._cameras]


# Global camera manager instance
camera_manager = CameraManager()
