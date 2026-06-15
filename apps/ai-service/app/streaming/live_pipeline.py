"""SmartCampus AI — Live Streaming Pipeline.

Connects camera capture → face detection → embedding → recognition → attendance
into a single real-time processing pipeline with WebSocket broadcast.
"""

import time
import threading
import numpy as np
from typing import Optional, List
from ..config.settings import settings
from ..models.enrollment import DetectedFace
from ..camera.camera_manager import camera_manager, CameraFrame
from ..services.face_detector import FaceDetector
from ..services.face_embedder import FaceEmbedder
from ..recognition.face_recognizer import face_recognizer, RecognitionResult
from ..attendance.attendance_engine import attendance_engine, AttendanceRecord, AttendanceEvent


class LivePipeline:
    """Real-time processing pipeline for classroom monitoring.

    Pipeline: Camera Frame → Face Detection → Embedding → Recognition → Attendance
    """

    def __init__(self):
        self.detector = FaceDetector()
        self.embedder = FaceEmbedder()
        self.running: bool = False
        self._pipeline_lock = threading.Lock()
        self._frame_skip = 2  # Process every Nth frame
        self._frame_counters: dict[str, int] = {}
        self._event_callbacks: list = []

        # Latency tracking
        self._processing_times: list = []
        self._max_processing_times = 100

        # Unknown face detection storage
        self._unknown_face_buffer: dict[str, list] = {}

    def start_pipeline(self, camera_id: str, session_id: str) -> bool:
        """Start the live processing pipeline for a camera."""
        if self.running and camera_id in self._frame_counters:
            return True

        self._frame_counters[camera_id] = 0
        self._unknown_face_buffer[camera_id] = []

        # Register frame callback
        camera_manager.on_frame(camera_id, lambda frame: self._process_frame(frame, session_id))
        return True

    def stop_pipeline(self, camera_id: str) -> None:
        """Stop processing for a camera."""
        self._frame_counters.pop(camera_id, None)
        self._unknown_face_buffer.pop(camera_id, None)

    def on_event(self, callback) -> None:
        """Register a callback for pipeline events."""
        self._event_callbacks.append(callback)

    def _process_frame(self, camera_frame: CameraFrame, session_id: str) -> None:
        """Process a single frame through the full pipeline."""
        start_time = time.time()

        # Frame skipping for performance
        counter = self._frame_counters.get(camera_frame.camera_id, 0)
        self._frame_counters[camera_frame.camera_id] = counter + 1
        if counter % self._frame_skip != 0:
            return

        frame = camera_frame.frame

        try:
            # Step 1: Detect faces
            detections = self.detector.detect(frame)

            if not detections:
                return

            # Step 2: Get face crops
            face_crops = self.detector.get_face_crops(frame, detections)

            # Step 3: Generate embeddings
            for det, crop in face_crops:
                quality = self.detector.compute_quality_score(crop)
                if quality < 0.3:
                    continue

                embedding = self.embedder.generate_embedding(crop)

                if embedding is None:
                    # Unknown face detected
                    attendance_engine.process_unknown_face(
                        frame_crop=None,
                        classroom_id=camera_frame.camera_id,
                        camera_id=camera_frame.camera_id,
                    )
                    continue

                # Step 4: Recognize face
                result = face_recognizer.recognize_face(
                    embedding=embedding,
                    bounding_box=det.bounding_box,
                    camera_id=camera_frame.camera_id,
                    timestamp=camera_frame.timestamp,
                )

                if result is None:
                    continue

                # Step 5: Process attendance
                classroom_id = camera_frame.camera_id  # Using camera_id as classroom_id for demo
                record = attendance_engine.process_recognition(
                    result, session_id, classroom_id
                )

                if record:
                    # Fire pipeline event
                    self._fire_pipeline_event({
                        "type": "ATTENDANCE_MARKED",
                        "student_id": record.student_id,
                        "student_name": record.student_name,
                        "confidence": record.confidence,
                        "timestamp": record.timestamp,
                        "classroom_id": classroom_id,
                        "camera_id": camera_frame.camera_id,
                    })

            # Track processing time
            elapsed = time.time() - start_time
            self._processing_times.append(elapsed)
            if len(self._processing_times) > self._max_processing_times:
                self._processing_times.pop(0)

        except Exception as e:
            print(f"[LivePipeline] Frame processing error: {e}")

    def _fire_pipeline_event(self, event: dict) -> None:
        """Notify all pipeline event listeners."""
        for callback in self._event_callbacks:
            try:
                callback(event)
            except Exception as e:
                print(f"[LivePipeline] Event callback error: {e}")

    def get_latency_stats(self) -> dict:
        """Get processing latency statistics."""
        if not self._processing_times:
            return {"avg_ms": 0, "max_ms": 0, "min_ms": 0}

        times_ms = [t * 1000 for t in self._processing_times]
        return {
            "avg_ms": round(np.mean(times_ms), 1),
            "max_ms": round(max(times_ms), 1),
            "min_ms": round(min(times_ms), 1),
            "samples": len(times_ms),
        }

    def get_pipeline_status(self) -> dict:
        """Get overall pipeline status."""
        return {
            "running": self.running,
            "active_cameras": len(self._frame_counters),
            "latency": self.get_latency_stats(),
            "face_database": face_recognizer.get_database_stats(),
        }


# Global pipeline instance
live_pipeline = LivePipeline()
