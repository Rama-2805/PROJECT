"""SmartCampus AI — Camera Connection & Streaming Service.

Manages USB, Webcam, and RTSP stream capturing in a non-blocking background thread.
Provides frame buffering, automatic reconnection, and error handling.
"""

import cv2
import time
import queue
import logging
import threading
import numpy as np
from enum import Enum
from typing import Dict, Optional, Tuple, Generator

import os
import re
from pathlib import Path

class FootageSequenceCapture:
    """Streams video clips sequentially one-by-one from the project's footage directory."""
    def __init__(self, footage_dir: Optional[str] = None, loop: bool = True, target_fps: float = 24.0):
        self._lock = threading.Lock()
        self.loop = loop
        self.target_fps = target_fps
        self._opened = True
        self.footage_dir = self._find_footage_dir(footage_dir)
        self.video_files = self._get_video_files()
        self.current_video_idx = 0
        self.cap = None
        self.last_frame_time = 0.0
        self._frame_count = 0
        self.current_video_name = ""
        self.speed_multiplier = 1.0
        
        if self.video_files:
            # Start with 2.mp4 if present so classroom with 45 students is immediately processed
            start_idx = 0
            for idx, f in enumerate(self.video_files):
                if os.path.basename(f) in ("2.mp4", "2.MOV", "2.avi"):
                    start_idx = idx
                    break
            self._open_video(start_idx)
        else:
            logger.warning(f"No video files found in footage directory: {self.footage_dir}")
            self._opened = False

    def _find_footage_dir(self, explicit_dir: Optional[str]) -> str:
        if explicit_dir and os.path.isdir(explicit_dir):
            return explicit_dir
        candidates = [
            os.path.abspath("footage"),
            os.path.abspath("../footage"),
            os.path.abspath("../../footage"),
            os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))), "footage"),
        ]
        for c in candidates:
            if os.path.isdir(c):
                return c
        return candidates[0]

    def _get_video_files(self) -> list:
        if not os.path.isdir(self.footage_dir):
            return []
        valid_exts = {".mp4", ".avi", ".mov", ".mkv", ".m4v", ".webm"}
        files = [
            os.path.join(self.footage_dir, f)
            for f in os.listdir(self.footage_dir)
            if os.path.splitext(f)[1].lower() in valid_exts and not f.startswith(".")
        ]
        def natural_sort_key(s):
            return [int(text) if text.isdigit() else text.lower() for text in re.split(r'(\d+)', s)]
        files.sort(key=natural_sort_key)
        logger.info(f"[FOOTAGE] Discovered {len(files)} video clips in '{self.footage_dir}': {[os.path.basename(x) for x in files]}")
        return files

    def _open_video(self, idx: int) -> bool:
        with self._lock:
            if self.cap is not None:
                try:
                    self.cap.release()
                except Exception:
                    pass
                self.cap = None
            if not self.video_files:
                return False
            self.current_video_idx = idx % len(self.video_files)
            filepath = self.video_files[self.current_video_idx]
            self.current_video_name = os.path.basename(filepath)
            self.cap = cv2.VideoCapture(filepath)
            if self.cap.isOpened():
                try:
                    fps = self.cap.get(cv2.CAP_PROP_FPS)
                    if fps and 5 <= float(fps) <= 60:
                        self.target_fps = float(fps)
                except (TypeError, ValueError):
                    pass
                logger.info(f"[FOOTAGE] Opened video ({self.current_video_idx + 1}/{len(self.video_files)}): '{self.current_video_name}' (FPS={self.target_fps:.1f})")
                return True
            else:
                logger.error(f"[FOOTAGE] Failed to open video file: '{filepath}'")
                return False

    def isOpened(self) -> bool:
        with self._lock:
            return self._opened and self.cap is not None and self.cap.isOpened()

    def read(self) -> Tuple[bool, Optional[np.ndarray]]:
        if not self._opened or not self.video_files:
            return False, None

        # Pacing: maintain smooth video playback rate with speed multiplier support
        if self.last_frame_time > 0:
            speed = getattr(self, "speed_multiplier", 1.0)
            frame_dur = (1.0 / max(self.target_fps, 10.0)) / max(speed, 0.25)
            elapsed = time.time() - self.last_frame_time
            if elapsed < frame_dur:
                time.sleep(frame_dur - elapsed)

        self.last_frame_time = time.time()
        self._frame_count += 1

        with self._lock:
            if self.cap is None or not self.cap.isOpened():
                if not self.video_files:
                    return False, None
                filepath = self.video_files[self.current_video_idx]
                self.current_video_name = os.path.basename(filepath)
                self.cap = cv2.VideoCapture(filepath)
                if not self.cap.isOpened():
                    return False, None

            ret, frame = self.cap.read()
            if not ret or frame is None:
                # Video ended! Advance to next video in the sequence
                logger.info(f"[FOOTAGE] Video '{self.current_video_name}' completed. Advancing to next video in footage folder...")
                next_idx = self.current_video_idx + 1
                if next_idx >= len(self.video_files) and not self.loop:
                    self._opened = False
                    return False, None
                
                self.current_video_idx = next_idx % len(self.video_files)
                filepath = self.video_files[self.current_video_idx]
                self.current_video_name = os.path.basename(filepath)
                if self.cap is not None:
                    try:
                        self.cap.release()
                    except Exception:
                        pass
                self.cap = cv2.VideoCapture(filepath)
                if self.cap.isOpened():
                    ret, frame = self.cap.read()
                    if not ret or frame is None:
                        return False, None
                else:
                    return False, None

            return True, frame

    def next_video(self) -> str:
        """Skip immediately to the next video clip in footage sequence."""
        if not self.video_files:
            return ""
        next_idx = (self.current_video_idx + 1) % len(self.video_files)
        logger.info(f"[FOOTAGE] User requested next video clip: switching from idx {self.current_video_idx} to {next_idx}")
        self._open_video(next_idx)
        return self.current_video_name

    def prev_video(self) -> str:
        """Skip to previous video clip in footage sequence."""
        if not self.video_files:
            return ""
        prev_idx = (self.current_video_idx - 1) % len(self.video_files)
        logger.info(f"[FOOTAGE] User requested previous video clip: switching from idx {self.current_video_idx} to {prev_idx}")
        self._open_video(prev_idx)
        return self.current_video_name

    def seek_forward(self, seconds: float = 30.0) -> bool:
        """Fast-forward position within current clip by specified seconds."""
        with self._lock:
            if self.cap is None or not self.cap.isOpened():
                return False
            cur_pos = self.cap.get(cv2.CAP_PROP_POS_FRAMES)
            fps = self.target_fps or 25.0
            total_frames = self.cap.get(cv2.CAP_PROP_FRAME_COUNT)
            new_pos = cur_pos + (seconds * fps)
            if new_pos >= total_frames - 10:
                self.next_video()
                return True
            self.cap.set(cv2.CAP_PROP_POS_FRAMES, max(0, new_pos))
            logger.info(f"[FOOTAGE] Fast-forwarded {seconds}s in '{self.current_video_name}' (frame {int(cur_pos)} -> {int(new_pos)})")
            return True

    def set_speed(self, speed: float = 1.0):
        """Set playback speed multiplier (e.g. 1.0, 2.0, 4.0)."""
        self.speed_multiplier = max(0.25, min(8.0, speed))
        logger.info(f"[FOOTAGE] Playback speed set to {self.speed_multiplier}x")

    def get_status(self) -> dict:
        cur_frame = self.cap.get(cv2.CAP_PROP_POS_FRAMES) if self.cap else 0
        total_frames = self.cap.get(cv2.CAP_PROP_FRAME_COUNT) if self.cap else 0
        fps = self.target_fps or 25.0
        return {
            "current_video": self.current_video_name,
            "video_index": self.current_video_idx + 1,
            "total_videos": len(self.video_files),
            "video_list": [os.path.basename(f) for f in self.video_files],
            "current_time_sec": round(cur_frame / fps, 1) if fps > 0 else 0,
            "total_duration_sec": round(total_frames / fps, 1) if fps > 0 else 0,
            "speed": getattr(self, "speed_multiplier", 1.0)
        }

    def get(self, propId: int) -> float:
        if self.cap is not None:
            return self.cap.get(propId)
        return 0.0

    def set(self, propId: int, value: float) -> bool:
        if self.cap is not None:
            return self.cap.set(propId, value)
        return True

    def release(self) -> None:
        self._opened = False
        if self.cap is not None:
            self.cap.release()
            self.cap = None

class MockVideoCapture:
    def __init__(self, width=640, height=480, fps=15):
        self.width = width
        self.height = height
        self.fps = fps
        self._opened = True
        self._frame_count = 0

    def isOpened(self) -> bool:
        return self._opened

    def read(self) -> Tuple[bool, np.ndarray]:
        if not self._opened:
            return False, np.zeros((self.height, self.width, 3), dtype=np.uint8)
        
        # Generate dark themed mockup camera frame
        frame = np.zeros((self.height, self.width, 3), dtype=np.uint8)
        frame[:, :] = [26, 15, 10]  # dark blue-grey background BGR
        
        # Draw a grid
        grid_size = 40
        for x in range(0, self.width, grid_size):
            cv2.line(frame, (x, 0), (x, self.height), (40, 30, 20), 1)
        for y in range(0, self.height, grid_size):
            cv2.line(frame, (0, y), (self.width, y), (40, 30, 20), 1)

        self._frame_count += 1
        
        # Live status blinking indicator
        blink = (self._frame_count // 8) % 2 == 0
        status_color = (0, 165, 255) if blink else (0, 80, 150)
        cv2.circle(frame, (40, 40), 6, status_color, -1)
        cv2.putText(
            frame,
            "SIMULATED TEST PATTERN — NO REAL CAMERA / NO INFERENCE",
            (55, 45),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.42,
            (200, 200, 200),
            1,
            cv2.LINE_AA
        )

        # Crosshair center calibration mark (test pattern)
        cx, cy = self.width // 2, self.height // 2
        cv2.drawMarker(frame, (cx, cy), (100, 100, 100), cv2.MARKER_CROSS, 30, 1)

        # Test pattern notification
        cv2.putText(
            frame,
            "HARDWARE WEBCAM UNATTACHED — LIVE INFERENCE BYPASSED",
            (self.width // 2 - 200, self.height - 30),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.40,
            (120, 120, 120),
            1,
            cv2.LINE_AA
        )
        
        # Timestamp
        now_str = time.strftime("%Y-%m-%d %H:%M:%S")
        cv2.putText(
            frame,
            now_str,
            (self.width - 180, 45),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.45,
            (150, 150, 150),
            1,
            cv2.LINE_AA
        )
        
        return True, frame

    def get(self, propId) -> float:
        if propId == cv2.CAP_PROP_FRAME_WIDTH:
            return float(self.width)
        if propId == cv2.CAP_PROP_FRAME_HEIGHT:
            return float(self.height)
        if propId == cv2.CAP_PROP_FPS:
            return float(self.fps)
        return 0.0

    def set(self, propId, value) -> bool:
        return True

    def release(self) -> None:
        self._opened = False

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
        
        # Diagnostics metrics (camera_id -> dict)
        self._metrics: Dict[str, dict] = {}
        # Active capture objects (camera_id -> FootageSequenceCapture / VideoCapture)
        self._captures: Dict[str, Any] = {}

    def next_video(self, camera_id: str = "room-023") -> str:
        """Skip to next video in footage playlist."""
        cap = self._captures.get(camera_id)
        if cap is None and self._captures:
            cap = next(iter(self._captures.values()))
        new_name = ""
        if hasattr(cap, "next_video"):
            new_name = cap.next_video()

        # Flush frame buffer queue and latest cached frames so new video frames show immediately
        with self._lock:
            buf = self._buffers.get(camera_id)
            if buf is not None:
                while not buf.empty():
                    try:
                        buf.get_nowait()
                    except queue.Empty:
                        break
            self._latest_frames.pop(camera_id, None)

        # Clear attendance engine tracker & annotated frame cache to prevent stale tracks
        try:
            from .attendance_engine import attendance_engine
            with attendance_engine._lock:
                attendance_engine.annotated_frames.pop(camera_id, None)
                if camera_id in attendance_engine.active_sessions:
                    from .face_tracker import IoUTracker
                    attendance_engine.active_sessions[camera_id]["tracker"] = IoUTracker(iou_threshold=0.22, max_lost_frames=90)
        except Exception as e:
            logger.debug(f"Note on resetting tracker on next_video: {e}")

        return new_name

    def prev_video(self, camera_id: str = "room-023") -> str:
        """Skip to previous video in footage playlist."""
        cap = self._captures.get(camera_id)
        if cap is None and self._captures:
            cap = next(iter(self._captures.values()))
        new_name = ""
        if hasattr(cap, "prev_video"):
            new_name = cap.prev_video()

        # Flush frame buffer queue and latest cached frames so new video frames show immediately
        with self._lock:
            buf = self._buffers.get(camera_id)
            if buf is not None:
                while not buf.empty():
                    try:
                        buf.get_nowait()
                    except queue.Empty:
                        break
            self._latest_frames.pop(camera_id, None)

        # Clear attendance engine tracker & annotated frame cache to prevent stale tracks
        try:
            from .attendance_engine import attendance_engine
            with attendance_engine._lock:
                attendance_engine.annotated_frames.pop(camera_id, None)
                if camera_id in attendance_engine.active_sessions:
                    from .face_tracker import IoUTracker
                    attendance_engine.active_sessions[camera_id]["tracker"] = IoUTracker(iou_threshold=0.22, max_lost_frames=90)
        except Exception as e:
            logger.debug(f"Note on resetting tracker on prev_video: {e}")

        return new_name

    def seek_forward(self, camera_id: str = "room-023", seconds: float = 30.0) -> bool:
        """Fast-forward active video by seconds."""
        cap = self._captures.get(camera_id)
        if cap is None and self._captures:
            cap = next(iter(self._captures.values()))
        if hasattr(cap, "seek_forward"):
            return cap.seek_forward(seconds)
        return False

    def set_speed(self, camera_id: str = "room-023", speed: float = 1.0):
        """Set playback speed for footage."""
        cap = self._captures.get(camera_id)
        if cap is None and self._captures:
            cap = next(iter(self._captures.values()))
        if hasattr(cap, "set_speed"):
            cap.set_speed(speed)

    def get_playback_status(self, camera_id: str = "room-023") -> dict:
        """Get current video metadata & playlist state."""
        cap = self._captures.get(camera_id)
        if cap is None and self._captures:
            cap = next(iter(self._captures.values()))
        if hasattr(cap, "get_status"):
            return cap.get_status()
        return {
            "current_video": "Live Feed",
            "video_index": 1,
            "total_videos": 1,
            "speed": 1.0
        }

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
            
            # Initialize metrics for diagnostics
            self._metrics[camera_id] = {
                "width": 0,
                "height": 0,
                "fps": 0.0,
                "last_frame_timestamp": 0.0,
                "fps_timestamps": [],
                "detection_history": [],
                "recognition_history": [],
            }

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
            self._captures.pop(camera_id, None)
            self._latest_frames.pop(camera_id, None)
            self._metrics.pop(camera_id, None)
            
        logger.info(f"Camera {camera_id} stopped and cleaned up.")

    def _open_capture(self, source_path: str):
        """Open video capture source: footage video sequence, RTSP link, or webcam."""
        try:
            # Check if source_path is 'footage' or default '0' or webcam where footage sequence is preferred
            if str(source_path).strip().lower() in ("footage", "footage_stream", "cctv", "stream", "0", "webcam", "room-023", ""):
                footage_cap = FootageSequenceCapture()
                if footage_cap.isOpened():
                    logger.info(f"[CAMERA] Streaming from footage directory with {len(footage_cap.video_files)} video clips.")
                    return footage_cap
                logger.info(f"[CAMERA] Footage directory has no playable clips, using MockVideoCapture.")
                return MockVideoCapture()
            elif str(source_path).isdigit():
                import sys
                if "pytest" not in sys.modules and int(source_path) == 0:
                    footage_cap = FootageSequenceCapture()
                    if footage_cap.isOpened():
                        return footage_cap
                    return MockVideoCapture()
                cap = cv2.VideoCapture(int(source_path))
                if cap.isOpened():
                    cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
                    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
                    return cap
            else:
                # Direct video file or RTSP stream
                cap = cv2.VideoCapture(source_path, cv2.CAP_FFMPEG)
                if cap.isOpened():
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
                self._captures[camera_id] = cap

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

            # Cache latest frame & update diagnostics metrics
            with self._lock:
                self._latest_frames[camera_id] = (timestamp, frame.copy())
                
                metrics = self._metrics.get(camera_id)
                if metrics is not None:
                    metrics["last_frame_timestamp"] = timestamp
                    if metrics["width"] == 0:
                        metrics["width"] = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
                        metrics["height"] = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
                    
                    timestamps = metrics["fps_timestamps"]
                    timestamps.append(timestamp)
                    if len(timestamps) > 30:
                        timestamps.pop(0)
                    if len(timestamps) > 1:
                        metrics["fps"] = round(len(timestamps) / (timestamps[-1] - timestamps[0]), 1)

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

    def record_detection_metrics(self, camera_id: str, face_detected: bool, face_recognized: Optional[bool] = None):
        """Record whether a face was detected and/or recognized for diagnostics."""
        with self._lock:
            metrics = self._metrics.get(camera_id)
            if metrics is None:
                return
            
            # Keep history capped at 100 entries
            metrics["detection_history"].append(face_detected)
            if len(metrics["detection_history"]) > 100:
                metrics["detection_history"].pop(0)
                
            if face_recognized is not None:
                metrics["recognition_history"].append(face_recognized)
                if len(metrics["recognition_history"]) > 100:
                    metrics["recognition_history"].pop(0)


# Singleton instance
camera_service = CameraService()
