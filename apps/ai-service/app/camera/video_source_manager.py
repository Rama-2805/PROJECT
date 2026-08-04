"""SmartCampus AI — Video Source Abstraction Manager.

Supports 5 video source types:
1. RECORDED_MP4 (Pre-recorded CCTV video file)
2. USB_CAMERA (Local USB hardware webcam or Mock simulator fallback)
3. RTSP_CCTV (RTSP network CCTV stream)
4. IP_CAMERA (HTTP / MJPEG IP camera stream)
5. CLOUD_CAMERA (Cloud video stream)
"""

import os
import cv2
import logging
import numpy as np
from enum import Enum
from typing import Optional, Tuple, Union

from .camera_manager import MockVideoCapture

logger = logging.getLogger("VideoSourceManager")

class VideoSourceType(str, Enum):
    RECORDED_MP4 = "RECORDED_MP4"
    USB_CAMERA = "USB_CAMERA"
    RTSP_CCTV = "RTSP_CCTV"
    IP_CAMERA = "IP_CAMERA"
    CLOUD_CAMERA = "CLOUD_CAMERA"

class VideoSourceStream:
    """Unified video stream wrapper supporting all video sources."""

    def __init__(self, source_type: Union[VideoSourceType, str], source_uri: str, loop_video: bool = True):
        self.source_type = VideoSourceType(source_type)
        self.source_uri = str(source_uri)
        self.loop_video = loop_video
        self.cap: Optional[Union[cv2.VideoCapture, MockVideoCapture]] = None
        self._is_opened = False
        self._initialize_stream()

    def _initialize_stream(self):
        """Opens video stream based on source type."""
        logger.info(f"Initializing video stream: type={self.source_type.value}, uri={self.source_uri}")

        if self.source_type == VideoSourceType.RECORDED_MP4:
            if not os.path.exists(self.source_uri):
                logger.warning(f"Recorded video path '{self.source_uri}' not found. Falling back to Mock Simulator.")
                self.cap = MockVideoCapture()
            else:
                self.cap = cv2.VideoCapture(self.source_uri)

        elif self.source_type == VideoSourceType.USB_CAMERA:
            try:
                cam_index = int(self.source_uri)
                cap = cv2.VideoCapture(cam_index)
                if cap.isOpened():
                    ret, _ = cap.read()
                    if ret:
                        self.cap = cap
                    else:
                        cap.release()
                        logger.info("USB camera opened but failed to read frame. Falling back to Mock Simulator.")
                        self.cap = MockVideoCapture()
                else:
                    logger.info("USB camera index could not be opened. Falling back to Mock Simulator.")
                    self.cap = MockVideoCapture()
            except ValueError:
                self.cap = MockVideoCapture()

        elif self.source_type in [VideoSourceType.RTSP_CCTV, VideoSourceType.IP_CAMERA, VideoSourceType.CLOUD_CAMERA]:
            self.cap = cv2.VideoCapture(self.source_uri)

        self._is_opened = self.cap.isOpened() if self.cap else False

    def is_opened(self) -> bool:
        return self.cap.isOpened() if self.cap else False

    def read_frame(self) -> Tuple[bool, Optional[np.ndarray]]:
        if not self.cap or not self.cap.isOpened():
            return False, None

        ret, frame = self.cap.read()

        # Handle video end for recorded files (looping support)
        if not ret and self.source_type == VideoSourceType.RECORDED_MP4 and self.loop_video:
            if isinstance(self.cap, cv2.VideoCapture):
                self.cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
                ret, frame = self.cap.read()

        return ret, frame

    def get_fps(self) -> float:
        if isinstance(self.cap, cv2.VideoCapture):
            fps = self.cap.get(cv2.CAP_PROP_FPS)
            return fps if fps > 0 else 30.0
        return 30.0

    def release(self):
        if self.cap:
            if isinstance(self.cap, cv2.VideoCapture):
                self.cap.release()
            self._is_opened = False
            logger.info(f"Released stream: {self.source_uri}")
