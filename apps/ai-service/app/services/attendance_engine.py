"""SmartCampus AI — Attendance & Continuous Learning Engine.

Processes tracked faces, matches them against FAISS, applies attendance decision rules,
runs the continuous learning candidate queue, and manages unknown face alerts.
"""

import os
import cv2
import time
import logging
import uuid
import threading
import numpy as np
from datetime import datetime
from typing import List, Dict, Any, Optional, Tuple
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
        # Recognized students set for quick session tallying: usn -> {name, confidence, time}
        self.session_recognized_students = {}
        
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
                "tracker": IoUTracker(iou_threshold=0.22, max_lost_frames=90),
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
                    h_f, w_f = frame.shape[:2]
                    for track in active_tracks:
                        # Extract crop image from frame safely with integer bounds
                        bx1, by1, bx2, by2 = [int(round(float(v))) for v in track.bbox]
                        bx1 = max(0, min(bx1, w_f - 1))
                        by1 = max(0, min(by1, h_f - 1))
                        bx2 = max(bx1 + 1, min(bx2, w_f))
                        by2 = max(by1 + 1, min(by2, h_f))
                        crop = frame[by1:by2, bx1:bx2].copy()
                        if crop.size == 0 or crop.shape[0] < 8 or crop.shape[1] < 8:
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

                    # Draw visual HUD & bounding box overlay on live view
                    cap_source = camera_service._sources.get(camera_id, "")
                    video_name = os.path.basename(cap_source) if cap_source else ""
                    annotated = self._draw_overlay(frame, active_tracks, video_name)

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

    def _draw_overlay(self, frame: np.ndarray, active_tracks: List[TrackedFace], video_name: str = "") -> np.ndarray:
        """Render high-contrast HUD and bounding box overlays on live frame."""
        annotated = frame.copy()
        h, w = annotated.shape[:2]

        # 1. Top HUD Bar
        hud_h = 38
        cv2.rectangle(annotated, (0, 0), (w, hud_h), (20, 15, 12), -1)
        cv2.line(annotated, (0, hud_h), (w, hud_h), (60, 50, 45), 1)

        # Blinking live indicator
        now_sec = int(time.time() * 2)
        dot_color = (0, 0, 255) if now_sec % 2 == 0 else (0, 100, 255)
        cv2.circle(annotated, (18, hud_h // 2), 5, dot_color, -1)
        cv2.putText(annotated, "LIVE MONITORING", (30, hud_h // 2 + 4), cv2.FONT_HERSHEY_DUPLEX, 0.45, (240, 240, 240), 1, cv2.LINE_AA)

        # Video Name
        vid_title = f"FEED: {video_name}" if video_name else "CCTV STREAM"
        cv2.putText(annotated, vid_title, (190, hud_h // 2 + 4), cv2.FONT_HERSHEY_SIMPLEX, 0.42, (0, 215, 255), 1, cv2.LINE_AA)

        rec_count = sum(1 for t in active_tracks if getattr(t, "student_usn", None))
        stats_label = f"TRACKS: {len(active_tracks)}  |  PRESENT: {len(self.session_recognized_students)}"
        cv2.putText(annotated, stats_label, (max(350, w - 240), hud_h // 2 + 4), cv2.FONT_HERSHEY_SIMPLEX, 0.42, (0, 255, 128), 1, cv2.LINE_AA)

        # 2. Draw tracks with modern corner brackets and labels
        for t in active_tracks:
            tx1, ty1, tx2, ty2 = [int(round(float(v))) for v in t.bbox]
            tx1, ty1 = max(0, tx1), max(0, ty1)
            tx2, ty2 = min(w, tx2), min(h, ty2)

            is_rec = hasattr(t, "student_usn") and t.student_usn is not None
            student_name = getattr(t, "student_name", t.student_usn if is_rec else "")
            conf = getattr(t, "recognition_confidence", 0.0)

            if is_rec:
                # Recognized Student: Emerald Green
                box_color = (60, 230, 100)
                bracket_len = max(6, min(16, (tx2 - tx1) // 3))

                # Corner brackets
                cv2.line(annotated, (tx1, ty1), (tx1 + bracket_len, ty1), box_color, 2)
                cv2.line(annotated, (tx1, ty1), (tx1, ty1 + bracket_len), box_color, 2)
                cv2.line(annotated, (tx2, ty1), (tx2 - bracket_len, ty1), box_color, 2)
                cv2.line(annotated, (tx2, ty1), (tx2, ty1 + bracket_len), box_color, 2)
                cv2.line(annotated, (tx1, ty2), (tx1 + bracket_len, ty2), box_color, 2)
                cv2.line(annotated, (tx1, ty2), (tx1, ty2 - bracket_len), box_color, 2)
                cv2.line(annotated, (tx2, ty2), (tx2 - bracket_len, ty2), box_color, 2)
                cv2.line(annotated, (tx2, ty2), (tx2, ty2 - bracket_len), box_color, 2)

                # Badge
                badge_text = f"✓ {student_name}"
                sub_text = f"{t.student_usn} · {int(conf*100)}%"

                badge_y = max(hud_h + 24, ty1 - 6)
                badge_w = max(len(badge_text), len(sub_text)) * 8 + 12
                cv2.rectangle(annotated, (tx1 - 2, badge_y - 24), (tx1 + badge_w, badge_y), (15, 20, 15), -1)
                cv2.rectangle(annotated, (tx1 - 2, badge_y - 24), (tx1 + badge_w, badge_y), box_color, 1)
                cv2.putText(annotated, badge_text, (tx1 + 4, badge_y - 12), cv2.FONT_HERSHEY_SIMPLEX, 0.4, (255, 255, 255), 1, cv2.LINE_AA)
                cv2.putText(annotated, sub_text, (tx1 + 4, badge_y - 2), cv2.FONT_HERSHEY_SIMPLEX, 0.32, box_color, 1, cv2.LINE_AA)

            else:
                # Unassigned / Unknown Face: Amber/Cyan
                box_color = (220, 160, 40)
                cv2.rectangle(annotated, (tx1, ty1), (tx2, ty2), box_color, 1)
                lbl = f"ID:{t.track_id}"
                cv2.rectangle(annotated, (tx1, ty1 - 14), (tx1 + len(lbl)*7 + 6, ty1), (20, 20, 20), -1)
                cv2.putText(annotated, lbl, (tx1 + 2, ty1 - 3), cv2.FONT_HERSHEY_SIMPLEX, 0.35, (200, 200, 200), 1, cv2.LINE_AA)

        return annotated

    def _process_tracked_face(self, db: Session, camera_id: str, class_id: str, track: TrackedFace, crop: np.ndarray):
        """Evaluates a tracked face and executes matching, attendance, or learning candidates."""
        # If track is already successfully recognized, skip redundant expensive re-inference
        if getattr(track, "student_usn", None):
            return True

        h, w = crop.shape[:2]
        if w < 16 or h < 16:
            return False

        # Use pre-detected raw face embedding if available
        det_raw_face = getattr(track, "raw_face", None)
        emb = None
        if det_raw_face is not None and hasattr(det_raw_face, "embedding") and det_raw_face.embedding is not None:
            emb = det_raw_face.embedding.copy()
            norm = np.linalg.norm(emb)
            if norm > 0:
                emb = emb / norm

        if emb is None:
            emb = embedding_service.generate_embedding(crop)
            
        if emb is None:
            return False

        # Query FAISS Index with CCTV threshold (0.15 for high-angle distant CCTV faces)
        rec_thresh = getattr(settings, "recognition_confidence_threshold", 0.15)
        if rec_thresh > 0.35:
            rec_thresh = 0.15
            
        match = faiss_service.search_face(emb, threshold=rec_thresh)
        
        confidence = 0.0
        matched_usn = None
        
        if match:
            matched_usn, confidence = match

        if not hasattr(track, "confidence_history"):
            track.confidence_history = []
        track.confidence_history.append(confidence)
        if len(track.confidence_history) > 10:
            track.confidence_history.pop(0)

        avg_conf = np.mean(track.confidence_history) if track.confidence_history else 0.0

        # --- Business Decision Pipeline ---
        if matched_usn and confidence >= rec_thresh:
            student = db.query(Student).filter(Student.usn == matched_usn).first()
            student_name = student.name if student else matched_usn
            
            track.student_usn = matched_usn
            track.student_name = student_name
            track.recognition_confidence = confidence
            
            self.session_recognized_students[matched_usn] = {
                "name": student_name,
                "confidence": float(confidence),
                "time": datetime.now().strftime("%I:%M:%S %p")
            }

            # Broadcast ATTENDANCE_MARKED and STUDENT_RECOGNIZED events
            now = time.time()
            if now - self.broadcast_cooldowns.get(matched_usn, 0) > 8.0:
                self.broadcast_cooldowns[matched_usn] = now
                event_data = {
                    "attendance_id": f"att_{int(time.time()*1000)}_{matched_usn}",
                    "usn": matched_usn,
                    "studentId": matched_usn,
                    "name": student_name,
                    "studentName": student_name,
                    "class_id": class_id,
                    "time": datetime.now().strftime("%I:%M:%S %p"),
                    "confidence": round(float(confidence), 3),
                    "camera_id": camera_id
                }
                websocket_manager.broadcast_sync("ATTENDANCE_MARKED", event_data)
                websocket_manager.broadcast_sync("STUDENT_RECOGNIZED", event_data)

            # Mark student attendance in DB
            self._mark_student_attendance(db, matched_usn, class_id, avg_conf, camera_id)
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

    def process_video_attendance(
        self,
        video_path: str,
        class_id: str = "CSE_7A",
        confidence_threshold: float = 0.58,
        required_confirmations: int = 3,
        max_frames: Optional[int] = None,
    ) -> dict:
        """Process a classroom video file for attendance recognition against FAISS."""
        if not os.path.exists(video_path):
            raise FileNotFoundError(f"Video file not found: {video_path}")

        cap = cv2.VideoCapture(video_path)
        if not cap.isOpened():
            raise RuntimeError(f"Could not open video file: {video_path}")

        width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        fps = cap.get(cv2.CAP_PROP_FPS) or 25.0
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        duration_sec = round(total_frames / max(0.1, fps), 2)
        frame_skip = max(1, round(fps / getattr(settings, "target_processing_fps", 1.5)))

        logger.info(f"[VIDEO-ATTENDANCE] Processing '{video_path}' ({width}x{height} @ {fps:.1f} FPS, {total_frames} frames, {duration_sec}s)")

        faces_detected = 0
        faces_matched = 0
        unknown_faces = 0
        duplicate_prevented = 0

        observations = {}
        first_seen_times = {}

        frame_idx = 0
        while True:
            # Fast-forward skipped non-AI frames in 0.05ms using cap.grab()
            skipped = False
            for _ in range(frame_skip - 1):
                if not cap.grab():
                    skipped = True
                    break
                frame_idx += 1

            if skipped:
                break

            ret, frame = cap.read()
            if not ret:
                break
            frame_idx += 1

            if max_frames is not None and frame_idx >= max_frames:
                break

            timestamp_sec = frame_idx / fps if fps > 0 else 0.0

            detections = face_detector.detect_faces(frame)
            if detections:
                faces_detected += len(detections)

                for det in detections:
                    crop = det["crop"]
                    h, w = crop.shape[:2]
                    if w < 20 or h < 20:
                        continue

                    raw_face = det.get("raw_face")
                    if raw_face is not None and hasattr(raw_face, "embedding") and raw_face.embedding is not None:
                        emb = raw_face.embedding.copy()
                        norm = np.linalg.norm(emb)
                        if norm > 0:
                            emb = emb / norm
                    else:
                        emb = embedding_service.generate_embedding(crop)

                    if emb is None:
                        continue

                    match = faiss_service.search_face(emb, threshold=confidence_threshold)
                    if match:
                        usn, conf = match
                        faces_matched += 1
                        if usn not in observations:
                            observations[usn] = []
                            first_seen_times[usn] = timestamp_sec
                        else:
                            duplicate_prevented += 1

                        observations[usn].append(conf)
                    else:
                        unknown_faces += 1

            frame_idx += 1

        cap.release()

        confirmed_records = []
        for usn, confs in observations.items():
            if len(confs) >= required_confirmations:
                avg_conf = float(np.mean(confs))
                confirmed_records.append({
                    "usn": usn,
                    "status": "PRESENT",
                    "confidence": round(avg_conf, 3),
                    "observation_count": len(confs),
                    "first_seen_sec": round(first_seen_times[usn], 1),
                    "confirmed_at": datetime.now().isoformat(),
                })

        return {
            "video_path": video_path,
            "class_id": class_id,
            "video_metadata": {
                "resolution": f"{width}x{height}",
                "width": width,
                "height": height,
                "fps": round(fps, 1),
                "total_frames": total_frames,
                "duration_sec": duration_sec,
            },
            "total_frames": total_frames,
            "faces_detected": faces_detected,
            "faces_matched": faces_matched,
            "unknown_faces": unknown_faces,
            "attendance_confirmations": len(confirmed_records),
            "duplicate_events_prevented": duplicate_prevented,
            "confirmed_attendance": confirmed_records,
        }


# Singleton instance
import threading
attendance_engine = AttendanceEngine()
