"""SmartCampus AI — Attendance & Continuous Learning Engine.

Processes tracked faces, matches them against FAISS, applies attendance decision rules,
runs the continuous learning candidate queue, and manages unknown face alerts.
"""

import os
import cv2
import time
import logging
import uuid
import numpy as np
from datetime import datetime
from sqlalchemy.orm import Session
from ..config.settings import settings
from ..config.database import SessionLocal
from ..models.student import Student
from ..models.face_profile import FaceProfile
from ..models.embedding import Embedding
from ..models.unknown_face import UnknownFace
from ..models.attendance import Attendance
from ..models.candidate_image import CandidateImage
from .camera_service import camera_service
from .face_detector import face_detector
from .face_quality_service import face_quality_service
from .embedding_service import embedding_service
from .faiss_service import faiss_service
from .face_tracker import IoUTracker, TrackedFace
from .image_storage import image_storage
from .face_clustering import face_clustering_service
from ..api.websocket import websocket_manager

logger = logging.getLogger("smartcampus.attendance")


class AttendanceEngine:
    """Core decision engine matching tracked faces, saving learning candidates, and marking attendance."""

    def __init__(self):
        # Active attendance sessions: camera_id -> {"class_id": "CSE_6A", "tracker": IoUTracker, "running": bool}
        self.active_sessions = {}
        self._lock = threading.Lock()
        
        # Track cooldowns for WebSocket broadcasts of recognized students (student_usn -> last_broadcast_time)
        self.broadcast_cooldowns = {}
        # Track cooldowns for saving unknown face crops (cluster_id -> last_save_time)
        self.unknown_face_cooldowns = {}
        
        # Cache for the last processed/annotated frame to be used by the MJPEG stream
        self.annotated_frames = {}

    def start_attendance_session(self, camera_id: str, class_id: str, source_path: str = "0") -> bool:
        """Start a real-time attendance session on a camera feed."""
        # Override source_path with environment variable if configured
        if settings.rtsp_stream_url and source_path == "0":
            logger.info(f"Overriding camera source_path '0' with configured RTSP URL from settings: {settings.rtsp_stream_url}")
            source_path = settings.rtsp_stream_url

        with self._lock:
            if camera_id in self.active_sessions:
                logger.warning(f"Attendance session for camera {camera_id} is already running.")
                return True

            # Start camera capture with a small buffer size (e.g. 3) to minimize delay for live streaming
            success = camera_service.start_camera(camera_id, source_path, buffer_size=3)
            if not success:
                logger.error(f"Failed to start camera capture for session on {camera_id}")
                return False

            self.active_sessions[camera_id] = {
                "class_id": class_id,
                "tracker": IoUTracker(iou_threshold=0.35, max_lost_frames=12),
                "running": True,
                "thread": None
            }

        thread = threading.Thread(
            target=self._session_loop,
            args=(camera_id,),
            name=f"AttendancePipeline-{camera_id}",
            daemon=True
        )
        self.active_sessions[camera_id]["thread"] = thread
        thread.start()
        
        logger.info(f"Started attendance session for camera {camera_id} (class: {class_id})")
        return True

    def stop_attendance_session(self, camera_id: str) -> bool:
        """Stop capturing and terminate session loop.

        Args:
            camera_id: Camera identifier

        Returns:
            True if stopped successfully
        """
        with self._lock:
            session = self.active_sessions.get(camera_id)
            if not session:
                return False
            session["running"] = False

        camera_service.stop_camera(camera_id)
        
        thread = session.get("thread")
        if thread and thread.is_alive():
            thread.join(timeout=2.0)

        with self._lock:
            self.active_sessions.pop(camera_id, None)

        logger.info(f"Stopped attendance session for camera {camera_id}")
        return True

    def _session_loop(self, camera_id: str):
        """Internal frame consume loop executing face detection, tracking, and decisions."""
        try:
            tracker = self.active_sessions[camera_id]["tracker"]
            class_id = self.active_sessions[camera_id]["class_id"]

            last_process_time = 0.0
            target_interval = 1.0 / 15.0  # 15 FPS processing rate throttle

            for timestamp, frame in camera_service.read_frames(camera_id):
                # Check termination
                with self._lock:
                    if camera_id not in self.active_sessions or not self.active_sessions[camera_id]["running"]:
                        break

                current_time = time.time()
                if current_time - last_process_time < target_interval:
                    continue
                last_process_time = current_time

                # Create scoped database session for this frame iteration
                db = SessionLocal()
                try:
                    # Create annotated copy for live stream overlays
                    annotated = frame.copy()

                    # 1. Face Detection
                    detections = face_detector.detect_faces(frame)
                    face_detected = len(detections) > 0 if detections else False
                    
                    # 2. Face Tracking (IoU Tracker matches detections to persistent tracks)
                    active_tracks = tracker.update(detections)

                    # Send tracking update to WebSockets
                    tracking_info = []
                    for t in active_tracks:
                        tracking_info.append({
                            "track_id": t.track_id,
                            "bbox": t.bbox,
                            "first_seen": t.first_seen,
                            "duration": round(time.time() - t.first_seen, 1)
                        })
                    if tracking_info:
                        websocket_manager.broadcast_sync("FACE_DETECTED", {"camera_id": camera_id, "tracks": tracking_info})

                    # 3. Analyze each tracked face
                    any_recognized = False
                    for track in active_tracks:
                        # Extract crop image from frame
                        x1, y1, x2, y2 = track.bbox
                        crop = frame[y1:y2, x1:x2].copy()
                        if crop.size == 0:
                            continue

                        # Perform Face Recognition & Decision Logic
                        recognized = self._process_tracked_face(db, camera_id, class_id, track, crop)
                        if recognized:
                            any_recognized = True

                    # Update camera service diagnostics metrics
                    camera_service.record_detection_metrics(
                        camera_id=camera_id,
                        face_detected=face_detected,
                        face_recognized=any_recognized if face_detected else None
                    )

                    # Draw visual overlay on live view
                    for t in active_tracks:
                        tx1, ty1, tx2, ty2 = t.bbox
                        is_rec = hasattr(t, "student_usn") and t.student_usn is not None
                        color = (0, 255, 0) if is_rec else (0, 0, 255)  # Green = Recognized, Red = Unknown
                        
                        label = f"ID: {t.track_id}"
                        if is_rec:
                            label += f" ({t.student_usn})"
                            
                        cv2.rectangle(annotated, (tx1, ty1), (tx2, ty2), color, 2)
                        cv2.putText(annotated, label, (tx1, ty1 - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.6, color, 2)

                    with self._lock:
                        self.annotated_frames[camera_id] = annotated

                    db.commit()

                except Exception as loop_err:
                    logger.error(f"Error in attendance processing loop: {loop_err}")
                    try:
                        db.rollback()
                    except Exception:
                        pass
                finally:
                    db.close()

                time.sleep(0.01)  # Yield CPU

        except Exception as fatal_err:
            logger.error(f"Fatal error in attendance loop: {fatal_err}")

    def _process_tracked_face(self, db: Session, camera_id: str, class_id: str, track: TrackedFace, crop: np.ndarray):
        """Evaluates a tracked face and executes matching, attendance, or learning candidates."""
        # CHANGE 6: Minimum face size check for attendance recognition
        h, w = crop.shape[:2]
        logger.info(f"Processing face track {track.track_id} with crop dimensions: {w}x{h}")
        if w < 50 or h < 50:
            logger.info(f"Skipping track {track.track_id} because crop is too small: {w}x{h} < 50x50")
            return

        # Use pre-detected details if available, otherwise fallback to re-detection
        if hasattr(track, "raw_face") and track.raw_face is not None and hasattr(track, "crop") and track.crop is not None:
            det_crop = track.crop
            det_raw_face = track.raw_face
        else:
            from .face_detector import face_detector
            detections = face_detector.detect_faces(crop)
            if not detections:
                return
            det_crop = detections[0]["crop"]
            det_raw_face = detections[0]["raw_face"]
        
        # Analyze Face Quality
        quality = face_quality_service.analyze_quality(det_crop, det_raw_face)
        
        # Extract Embedding (prefer direct pre-computed embedding from raw face)
        if hasattr(det_raw_face, "embedding") and det_raw_face.embedding is not None:
            emb = det_raw_face.embedding.copy()
            norm = np.linalg.norm(emb)
            if norm > 0:
                emb = emb / norm
        else:
            emb = embedding_service.generate_embedding(det_crop)
            
        if emb is None:
            return

        # Query FAISS Index
        match = faiss_service.search_face(emb, threshold=0.0)  # query with zero threshold to inspect score
        
        confidence = 0.0
        matched_usn = None
        
        if match:
            matched_usn, confidence = match

        # CHANGE 5: Store last 10 confidence scores in track history
        if not hasattr(track, "confidence_history"):
            track.confidence_history = []
        track.confidence_history.append(confidence)
        if len(track.confidence_history) > 10:
            track.confidence_history.pop(0)

        avg_conf = np.mean(track.confidence_history) if track.confidence_history else 0.0

        # --- Business Decision Pipeline ---

        # Case A: Recognized Student (Change 4: threshold from settings.py)
        if confidence >= settings.recognition_confidence_threshold:
            track.student_usn = matched_usn
            track.recognition_confidence = confidence
            
            # Broadcast RECOGNIZED event (with cooldown to prevent spamming client)
            now = time.time()
            if now - self.broadcast_cooldowns.get(matched_usn, 0) > 10.0:
                student = db.query(Student).filter(Student.usn == matched_usn).first()
                if student:
                    websocket_manager.broadcast_sync("STUDENT_RECOGNIZED", {
                        "usn": student.usn,
                        "name": student.name,
                        "confidence": round(confidence, 3),
                        "camera_id": camera_id
                    })
                    self.broadcast_cooldowns[matched_usn] = now

            # CHANGE 5: Rule: Visibility >= 5 seconds AND average confidence of last 10 frames >= threshold
            track_duration = time.time() - track.first_seen
            if track_duration >= 5.0 and avg_conf >= settings.recognition_confidence_threshold:
                self._mark_student_attendance(db, matched_usn, class_id, avg_conf, camera_id)

            # Continuous learning check (Change 6: Keep 100x100 for candidates)
            w_crop, h_crop = quality["dimensions"]["width"], quality["dimensions"]["height"]
            lap_var = cv2.Laplacian(cv2.cvtColor(det_crop, cv2.COLOR_BGR2GRAY), cv2.CV_64F).var()
            
            if (confidence > 0.98 and 
                quality["score"] > 85.0 and 
                w_crop >= 100 and h_crop >= 100 and 
                lap_var >= 60.0):
                self._process_learning_candidate(db, matched_usn, det_crop, emb, quality["score"], confidence)

            return True

        # Save unrecognized face detections below recognition threshold
        self._save_unknown_face(
            db, 
            crop, 
            emb, 
            quality["score"], 
            camera_id, 
            class_id, 
            suggestion_usn=matched_usn if matched_usn else None, 
            suggestion_conf=confidence if matched_usn else 0.0
        )
        return False

    def _mark_student_attendance(self, db: Session, usn: str, class_id: str, confidence: float, camera_id: str = None):
        """Mark student attendance in the PostgreSQL/SQLite database if not already marked today."""
        student = db.query(Student).filter(Student.usn == usn).first()
        if not student:
            return

        today = datetime.now().strftime("%Y-%m-%d")
        
        # Check if already marked for this class/date within the last 30 minutes
        recent_att = (
            db.query(Attendance)
            .filter(Attendance.student_id == student.id)
            .filter(Attendance.class_id == class_id)
            .filter(Attendance.date == today)
            .all()
        )
        
        has_recent = False
        now_local = datetime.now()
        for att in recent_att:
            try:
                # Parse att.time as HH:MM:SS
                att_time = datetime.strptime(f"{today} {att.time}", "%Y-%m-%d %H:%M:%S")
                if abs((now_local - att_time).total_seconds()) < 1800:
                    has_recent = True
                    break
            except Exception:
                if att.created_at:
                    if abs((datetime.utcnow() - att.created_at).total_seconds()) < 1800:
                        has_recent = True
                        break
        
        if not has_recent:
            now_time = datetime.now().strftime("%H:%M:%S")
            att = Attendance(
                student_id=student.id,
                class_id=class_id,
                date=today,
                time=now_time,
                confidence=round(confidence, 3),
                status="PRESENT"
            )
            db.add(att)
            db.commit()
            db.refresh(att)

            # Broadcast ATTENDANCE_MARKED event
            payload = {
                "attendance_id": att.id,
                "usn": student.usn,
                "name": student.name,
                "class_id": class_id,
                "date": today,
                "time": now_time,
                "confidence": att.confidence
            }
            websocket_manager.broadcast_sync("ATTENDANCE_MARKED", payload)
            logger.info(f"Attendance marked locally for student {student.name} ({usn}) - Class: {class_id}")

            # Send post request to NestJS backend to ingest attendance
            try:
                import httpx
                url = f"{settings.backend_api_url.rstrip('/')}/api/attendance/ingest"
                headers = {
                    "Content-Type": "application/json",
                    "x-api-key": settings.encryption_key
                }
                payload_ingest = {
                    "sessionId": class_id,
                    "studentId": student.usn,
                    "studentName": student.name,
                    "confidence": float(round(confidence, 3)),
                    "cameraId": camera_id or "webcam",
                    "method": "FACE_RECOGNITION"
                }
                r = httpx.post(url, json=payload_ingest, headers=headers, timeout=5.0)
                if r.status_code not in (200, 201):
                    logger.error(f"Failed to ingest attendance to NestJS: Status {r.status_code}, Body {r.text}")
                else:
                    logger.info(f"Successfully ingested attendance to NestJS for student {student.name}")
            except Exception as e:
                logger.error(f"Error calling NestJS /api/attendance/ingest: {e}")

    def _process_learning_candidate(self, db: Session, usn: str, crop: np.ndarray, embedding: np.ndarray, quality_score: float, similarity_score: float):
        """Validates duplicate rules and logs high-quality learning samples in CandidateImage queue."""
        student = db.query(Student).filter(Student.usn == usn).first()
        if not student:
            return

        # Check for duplication: compare with existing candidates
        # Fetch student's candidate images
        candidates = db.query(CandidateImage).filter(CandidateImage.student_id == student.id).all()
        
        is_duplicate = False
        for cand in candidates:
            if not os.path.exists(cand.embedding_path):
                continue
            try:
                stored_emb = np.load(cand.embedding_path)
                similarity = float(np.dot(embedding, stored_emb))
                if similarity >= 0.98:  # strict similarity de-duplication
                    is_duplicate = True
                    break
            except Exception:
                pass

        if not is_duplicate:
            # Save image and embedding to storage/candidates/{usn}/
            filename_prefix = f"candidate_{int(time.time() * 1000)}"
            img_path, emb_path = image_storage.save_candidate_face(crop, embedding, usn, filename_prefix)

            cand_rec = CandidateImage(
                student_id=student.id,
                image_path=img_path,
                quality_score=quality_score,
                embedding_path=emb_path,
                similarity_score=similarity_score,
                status="PENDING"
            )
            db.add(cand_rec)
            db.commit()
            logger.info(f"New learning candidate captured for {student.name} ({usn}) - Quality: {quality_score}, Similarity: {similarity_score}")

    def _save_unknown_face(self, db: Session, crop: np.ndarray, embedding: np.ndarray, quality_score: float,
                          camera_id: str, class_id: str, suggestion_usn: str = None, suggestion_conf: float = 0.0):
        """Save unrecognized face crops and trigger teacher alerts."""
        # Run duplicate filter for unassigned unknown profiles
        matched_cluster = face_clustering_service.duplicate_unknown_filter(db, embedding)
        
        if matched_cluster:
            cluster_id = matched_cluster
            # We already have this unknown face tracked — avoid redundant DB insertions
            # Check if we should append. To prevent flooding, only append if we have < 30 images in cluster
            count = db.query(UnknownFace).filter(UnknownFace.cluster_id == cluster_id).count()
            if count >= 30:
                return
        else:
            cluster_id = f"unknown_{uuid.uuid4().hex[:8]}"

        filename_prefix = f"face_{cluster_id}_{int(time.time() * 1000)}"

        # CHANGE 7: Rate-limit unknown face captures: only save if >= 10s elapsed for this cluster
        now = time.time()
        if cluster_id in self.unknown_face_cooldowns:
            if now - self.unknown_face_cooldowns[cluster_id] < 10.0:
                return
        self.unknown_face_cooldowns[cluster_id] = now

        img_path, emb_path = image_storage.save_unknown_face(crop, embedding, filename_prefix)

        # Write to UnknownFace database table
        unknown_face = UnknownFace(
            cluster_id=cluster_id,
            image_path=img_path,
            quality_score=quality_score,
            embedding_path=emb_path,
            camera_id=camera_id,
            is_resolved=False
        )
        db.add(unknown_face)
        db.commit()
        db.refresh(unknown_face)

        # Trigger UNKNOWN_FACE WebSocket notification
        payload = {
            "id": unknown_face.id,
            "cluster_id": unknown_face.cluster_id,
            "image_path": unknown_face.image_path,
            "quality_score": unknown_face.quality_score,
            "classroom": class_id,
            "camera": camera_id,
            "timestamp": unknown_face.created_at.isoformat(),
            "possible_match": {
                "usn": suggestion_usn,
                "confidence": round(suggestion_conf, 3)
            } if suggestion_usn else None
        }
        
        websocket_manager.broadcast_sync("UNKNOWN_FACE", payload)
        logger.info(f"Alert: Unknown face detected at camera {camera_id} (assigned: {cluster_id})")


# Singleton instance
import threading
attendance_engine = AttendanceEngine()
