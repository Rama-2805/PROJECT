"""SmartCampus AI — Camera Connection & Streaming Service.

Manages USB, Webcam, and RTSP stream capturing in a non-blocking background thread.
Provides frame buffering, automatic reconnection, and error handling.
"""

import cv2
import time
import queue
import logging
import threading
from enum import Enum
from typing import Dict, Optional, Tuple, Generator

logger = logging.getLogger("smartcampus.camera")


class CameraState(str, Enum):
    OFFLINE = "OFFLINE"
    CONNECTING = "CONNECTING"
    ONLINE = "ONLINE"
    ERROR = "ERROR"
    RECONNECTING = "RECONNECTING"


class CameraService:
    """Manages active camera stream threads, providing frame buffering and auto-reconnect."""

    def __init__(self):
        self._threads: Dict[str, threading.Thread] = {}
        self._running: Dict[str, bool] = {}
        self._states: Dict[str, CameraState] = {}
        
        # Frame buffers: store thread-safe Queues with max size to prevent memory bloat
        self._buffers: Dict[str, queue.Queue] = {}
        self._sources: Dict[str, str] = {}
        
        # Latest frame caches for instant access
        self._latest_frames: Dict[str, Tuple[float, any]] = {}
        self._lock = threading.Lock()

    def start_camera(self, camera_id: str, source_path: str, buffer_size: int = 10) -> bool:
        """Start a background capture thread for the given camera source.

        Args:
            camera_id: Unique camera identifier
            source_path: Integer string for local webcam (e.g. "0") or RTSP URL
            buffer_size: Maximum frames to buffer in the queue

        Returns:
            True if thread starts successfully, False otherwise
        """
        with self._lock:
            if camera_id in self._running and self._running[camera_id]:
                logger.warning(f"Camera {camera_id} is already running.")
                return True

            self._running[camera_id] = True
            self._states[camera_id] = CameraState.CONNECTING
            self._buffers[camera_id] = queue.Queue(maxsize=buffer_size)
            self._sources[camera_id] = source_path

        thread = threading.Thread(
            target=self._capture_loop,
            args=(camera_id, source_path),
            name=f"CameraThread-{camera_id}",
            daemon=True,
        )
        self._threads[camera_id] = thread
        thread.start()
        logger.info(f"Started capture thread for camera {camera_id} (source: {source_path})")
        return True

    def stop_camera(self, camera_id: str) -> None:
        """Stop capture and join thread.

        Args:
            camera_id: Unique camera identifier
        """
        with self._lock:
            if camera_id not in self._running:
                return
            self._running[camera_id] = False

        thread = self._threads.get(camera_id)
        if thread and thread.is_alive():
            thread.join(timeout=2.0)

        with self._lock:
            self._threads.pop(camera_id, None)
            self._states[camera_id] = CameraState.OFFLINE
            self._buffers.pop(camera_id, None)
            self._sources.pop(camera_id, None)
            self._latest_frames.pop(camera_id, None)
            
        logger.info(f"Camera {camera_id} stopped and cleaned up.")

    def _open_capture(self, source_path: str) -> Optional[cv2.VideoCapture]:
        """Open cv2.VideoCapture based on source format (webcam index or RTSP link)."""
        try:
            # Check if source_path is webcam index
            if source_path.isdigit():
                cap = cv2.VideoCapture(int(source_path))
            else:
                # Add CAP_FFMPEG for RTSP streams specifically to prevent timeouts
                cap = cv2.VideoCapture(source_path, cv2.CAP_FFMPEG)
                
            if cap.isOpened():
                # Optimize capture properties
                cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
                cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
                return cap
            else:
                cap.release()
        except Exception as e:
            logger.error(f"Error opening video capture source {source_path}: {e}")
        return None

    def _capture_loop(self, camera_id: str, source_path: str):
        """Internal capture and reconnection loop running in background thread."""
        consecutive_failures = 0
        cap = self._open_capture(source_path)

        if cap is None:
            logger.error(f"Initial connection failed for camera {camera_id}")
            with self._lock:
                self._states[camera_id] = CameraState.ERROR
        else:
            with self._lock:
                self._states[camera_id] = CameraState.ONLINE

        while True:
            # Check if stopped
            with self._lock:
                if not self._running.get(camera_id, False):
                    break

            if cap is None or not cap.isOpened():
                # Reconnection sequence
                with self._lock:
                    self._states[camera_id] = CameraState.RECONNECTING
                logger.info(f"Reconnecting to camera {camera_id}...")
                
                if cap:
                    cap.release()
                
                time.sleep(3.0)  # Wait before retry
                cap = self._open_capture(source_path)
                if cap is None:
                    consecutive_failures += 1
                    if consecutive_failures > 20:
                        logger.error(f"Max reconnection attempts exceeded for camera {camera_id}")
                        with self._lock:
                            self._states[camera_id] = CameraState.ERROR
                        break
                    continue
                else:
                    consecutive_failures = 0
                    with self._lock:
                        self._states[camera_id] = CameraState.ONLINE
                    logger.info(f"Camera {camera_id} reconnected successfully.")

            # Read frame
            ret, frame = cap.read()
            if not ret:
                logger.warning(f"Failed to read frame from camera {camera_id}")
                consecutive_failures += 1
                if consecutive_failures >= 5:
                    # Trigger reconnection
                    if cap:
                        cap.release()
                        cap = None
                time.sleep(0.1)
                continue

            consecutive_failures = 0
            timestamp = time.time()

            # Push to buffer queue
            buf = self._buffers.get(camera_id)
            if buf is not None:
                # If buffer is full, remove oldest frame (FIFO behavior)
                if buf.full():
                    try:
                        buf.get_nowait()
                    except queue.Empty:
                        pass
                try:
                    buf.put_nowait((timestamp, frame.copy()))
                except queue.Full:
                    pass

            # Cache latest frame
            with self._lock:
                self._latest_frames[camera_id] = (timestamp, frame.copy())

            # Slight delay to throttle FPS if needed (e.g. targeting ~20 FPS max)
            time.sleep(0.03)

        if cap:
            cap.release()

    def get_latest_frame(self, camera_id: str) -> Optional[Tuple[float, any]]:
        """Get the most recent frame captured by the camera thread.

        Args:
            camera_id: Camera identifier

        Returns:
            Tuple of (timestamp, BGR frame image) or None
        """
        with self._lock:
            return self._latest_frames.get(camera_id)

    def read_frames(self, camera_id: str) -> Generator[Tuple[float, any], None, None]:
        """Generator yielding frames from the camera's buffer queue.

        Args:
            camera_id: Camera identifier

        Yields:
            Tuple of (timestamp, BGR frame image)
        """
        buf = self._buffers.get(camera_id)
        if buf is None:
            logger.error(f"Cannot read frames: camera {camera_id} is not running.")
            return

        while True:
            # Check if running
            with self._lock:
                if not self._running.get(camera_id, False):
                    break
            
            try:
                # Block for a short period waiting for frames
                yield buf.get(timeout=1.0)
            except queue.Empty:
                continue

    def get_camera_state(self, camera_id: str) -> CameraState:
        """Get current operational state of a camera."""
        with self._lock:
            return self._states.get(camera_id, CameraState.OFFLINE)


# Singleton instance
camera_service = CameraService()
