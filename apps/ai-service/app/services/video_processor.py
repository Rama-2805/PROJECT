"""SmartCampus AI — Video Processing Service.

Handles frame extraction, blur detection, and frame optimization
for the enrollment pipeline.
"""

import cv2
import numpy as np
from pathlib import Path
from typing import Generator, Tuple, List
from ..config.settings import settings


class VideoProcessor:
    """Extracts and processes frames from classroom videos."""

    def __init__(self):
        self.target_size = settings.target_frame_size
        self.blur_threshold = settings.blur_threshold
        self.interval = settings.frame_extraction_interval

    def open_video(self, video_path: str) -> cv2.VideoCapture:
        """Open a video file and return capture object."""
        cap = cv2.VideoCapture(video_path)
        if not cap.isOpened():
            raise ValueError(f"Could not open video file: {video_path}")
        return cap

    def get_video_info(self, cap: cv2.VideoCapture) -> dict:
        """Extract metadata from video."""
        fps = cap.get(cv2.CAP_PROP_FPS)
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        duration = total_frames / fps if fps > 0 else 0

        return {
            "fps": fps,
            "total_frames": total_frames,
            "width": width,
            "height": height,
            "duration": duration,
        }

    def extract_frames(
        self, video_path: str, start_frame: int = 0, max_frames: int = 0
    ) -> Generator[Tuple[int, np.ndarray], None, None]:
        """Extract frames at configured interval.

        Yields:
            Tuple of (frame_index, frame_image)
        """
        cap = self.open_video(video_path)
        fps = cap.get(cv2.CAP_PROP_FPS)
        frame_skip = max(1, int(fps * self.interval))

        frame_index = 0
        frames_extracted = 0

        try:
            while True:
                ret, frame = cap.read()
                if not ret:
                    break

                if frame_index < start_frame:
                    frame_index += 1
                    continue

                if frame_index % frame_skip == 0:
                    processed = self.optimize_frame(frame)
                    yield frame_index, processed
                    frames_extracted += 1

                    if max_frames > 0 and frames_extracted >= max_frames:
                        break

                frame_index += 1
        finally:
            cap.release()

    def extract_frames_batch(
        self, video_path: str, max_frames: int = 0
    ) -> List[Tuple[int, np.ndarray]]:
        """Extract all frames at once and return as list."""
        return list(self.extract_frames(video_path, max_frames=max_frames))

    def is_blurry(self, frame: np.ndarray) -> bool:
        """Check if frame is blurry using Laplacian variance."""
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        laplacian_var = cv2.Laplacian(gray, cv2.CV_64F).var()
        return laplacian_var < self.blur_threshold

    def remove_blurry_frames(
        self, frames: List[Tuple[int, np.ndarray]]
    ) -> List[Tuple[int, np.ndarray]]:
        """Filter out blurry frames."""
        return [(idx, f) for idx, f in frames if not self.is_blurry(f)]

    def optimize_frame(self, frame: np.ndarray) -> np.ndarray:
        """Resize and optimize frame for face detection."""
        h, w = frame.shape[:2]
        target_w, target_h = self.target_size

        if w > target_w or h > target_h:
            scale = min(target_w / w, target_h / h)
            new_w = int(w * scale)
            new_h = int(h * scale)
            frame = cv2.resize(frame, (new_w, new_h), interpolation=cv2.INTER_AREA)

        return frame

    def save_face_crop(
        self, frame: np.ndarray, bbox: Tuple[int, int, int, int],
        output_dir: str, filename: str
    ) -> str:
        """Extract and save a face crop from a frame."""
        x1, y1, x2, y2 = bbox
        face_crop = frame[y1:y2, x1:x2]

        if face_crop.size == 0:
            raise ValueError("Empty face crop")

        output_path = Path(output_dir) / filename
        output_path.parent.mkdir(parents=True, exist_ok=True)
        cv2.imwrite(str(output_path), face_crop)

        return str(output_path)

    def detect_duplicate_frames(
        self, frames: List[Tuple[int, np.ndarray]], threshold: float = 0.95
    ) -> List[Tuple[int, np.ndarray]]:
        """Remove near-duplicate frames based on histogram correlation."""
        if not frames:
            return []

        unique_frames = [frames[0]]
        prev_hist = None

        for idx, frame in frames:
            gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
            hist = cv2.calcHist([gray], [0], None, [256], [0, 256])
            hist = cv2.normalize(hist, hist).flatten()

            if prev_hist is not None:
                correlation = cv2.compareHist(prev_hist, hist, cv2.HISTCMP_CORREL)
                if correlation < threshold:
                    unique_frames.append((idx, frame))
                    prev_hist = hist
            else:
                prev_hist = hist

        return unique_frames

    def get_optimal_frames(
        self, video_path: str, max_frames: int = 500
    ) -> List[Tuple[int, np.ndarray]]:
        """Extract, deduplicate, and filter blurry frames."""
        frames = self.extract_frames_batch(video_path, max_frames=max_frames)
        frames = self.remove_blurry_frames(frames)
        frames = self.detect_duplicate_frames(frames)
        return frames
