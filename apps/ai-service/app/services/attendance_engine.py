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

    def start_attendance_session(self, camera_id: str, class_id: str, source_path: str = "0") -> bool:
        """Start capturing from the camera and run the face tracking and attendance pipeline.

        Args:
            camera_id: Camera identifier
            class_id: The class/lecture identifier
            source_path: USB index or RTSP link

        Returns:
            True if session started successfully
        """
        with self._lock:
            if camera_id in self.active_sessions:
                logger.warning(f"Attendance session for camera {camera_id} is already running.")
                return True

            # Start camera capture
            success = camera_service.start_camera(camera_id, source_path)
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
        db = SessionLocal()
        try:
            tracker = self.active_sessions[camera_id]["tracker"]
            class_id = self.active_sessions[camera_id]["class_id"]

            frame_counter = 0
            for timestamp, frame in camera_service.read_frames(camera_id):
                # Check termination
                with self._lock:
                    if camera_id not in self.active_sessions or not self.active_sessions[camera_id]["running"]:
                        break

                frame_counter += 1
                # CHANGE 14: Process every second frame to reduce CPU usage
                if frame_counter % 2 != 0:
                    continue

                try:
                    # 1. Face Detection
                    detections = face_detector.detect_faces(frame)
                    
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
                    for track in active_tracks:
                        # Extract crop image from frame
                        x1, y1, x2, y2 = track.bbox
                        crop = frame[y1:y2, x1:x2].copy()
                        if crop.size == 0:
                            continue

                        # Perform Face Recognition & Decision Logic
                        self._process_tracked_face(db, camera_id, class_id, track, crop)

                except Exception as loop_err:
                    logger.error(f"Error in attendance processing loop: {loop_err}")

                time.sleep(0.05)  # Yield CPU

        except Exception as fatal_err:
            logger.error(f"Fatal error in attendance loop: {fatal_err}")
        finally:
            db.close()

    def _process_tracked_face(self, db: Session, camera_id: str, class_id: str, track: TrackedFace, crop: np.ndarray):
        """Evaluates a tracked face and executes matching, attendance, or learning candidates."""
        # CHANGE 6: Minimum face size check for attendance recognition
        h, w = crop.shape[:2]
        if w < 80 or h < 80:
            return

        # Find raw detection details
        from .face_detector import face_detector
        detections = face_detector.detect_faces(crop)
        if not detections:
            return

        det = detections[0]
        
        # Analyze Face Quality
        quality = face_quality_service.analyze_quality(det["crop"], det["raw_face"])
        
        # Extract Embedding
        emb = embedding_service.generate_embedding(det["crop"])
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
                self._mark_student_attendance(db, matched_usn, class_id, avg_conf)

            # Continuous learning check (Change 6: Keep 100x100 for candidates)
            w_crop, h_crop = quality["dimensions"]["width"], quality["dimensions"]["height"]
            lap_var = cv2.Laplacian(cv2.cvtColor(det["crop"], cv2.COLOR_BGR2GRAY), cv2.CV_64F).var()
            
            if (confidence > 0.98 and 
                quality["score"] > 85.0 and 
                w_crop >= 100 and h_crop >= 100 and 
                lap_var >= 60.0):
                self._process_learning_candidate(db, matched_usn, det["crop"], emb, quality["score"])

        # Case B: Needs Verification (0.80 - settings.recognition_confidence_threshold)
        elif 0.80 <= confidence < settings.recognition_confidence_threshold:
            logger.info(f"Student recognized with warning matching {matched_usn} (confidence: {confidence:.3f})")

        # Case C: Suggested Match (0.65 - 0.80) -> AI suggested matched for review
        elif 0.65 <= confidence < 0.80:
            # Save as unknown face but tag possible suggestions
            self._save_unknown_face(db, crop, emb, quality["score"], camera_id, class_id, suggestion_usn=matched_usn, suggestion_conf=confidence)

        # Case D: Unknown Face (< 0.65)
        else:
            self._save_unknown_face(db, crop, emb, quality["score"], camera_id, class_id)

    def _mark_student_attendance(self, db: Session, usn: str, class_id: str, confidence: float):
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
            logger.info(f"Attendance marked for student {student.name} ({usn}) - Class: {class_id}")

    def _process_learning_candidate(self, db: Session, usn: str, crop: np.ndarray, embedding: np.ndarray, quality_score: float):
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
                embedding_path=emb_path
            )
            db.add(cand_rec)
            db.commit()
            logger.info(f"New learning candidate captured for {student.name} ({usn}) - Quality: {quality_score}")

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
        # We can store the suggestions in details or custom columns if desired,
        # but to keep Step 14 clean, we write suggestion info to log and handle AI suggestion on search
        unknown_face = UnknownFace(
            cluster_id=cluster_id,
            image_path=img_path,
            quality_score=quality_score,
            embedding_path=emb_path
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
