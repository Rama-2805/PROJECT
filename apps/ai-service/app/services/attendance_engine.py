"""SmartCampus AI — Attendance & Continuous Learning Engine.

Processes tracked faces, matches them against FAISS, applies attendance decision rules,
runs the continuous learning candidate queue, and manages unknown face alerts.
"""

import os
import cv2
import time
import logging
import uuid
import queue
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
from ..behavior.models import BehaviorType, BehaviorEvent
from ..behavior.detector.pose_detector import PoseDetector, ObjectDetector
from ..behavior.alerts.alert_engine import alert_engine
from ..behavior.analytics.behavior_analytics import behavior_analytics

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
        
        # Cache for the last processed/annotated frames for Attendance and Behavioral streams
        self.annotated_frames = {}
        self.annotated_frames_attendance = {}
        self.annotated_frames_behavior = {}

        # Asynchronous Behavioral Worker State & Rolling History
        self.behavior_queue = queue.Queue(maxsize=3)
        self.student_behavior_history: Dict[str, List[Dict[str, Any]]] = {}  # usn -> list of observations
        self.student_behavior_states: Dict[str, Dict[str, Any]] = {}          # usn -> latest computed state
        self.behavior_alert_cooldowns: Dict[str, float] = {}                  # f"{usn}_{behavior_type}" -> timestamp
        self._behavior_worker_thread = None
        self._behavior_worker_running = False

    def start_attendance_session(self, camera_id: str, class_id: str, source_path: str = "0") -> bool:
        """Start a real-time attendance session on a camera feed."""
        self._start_behavior_worker()
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
            last_behavior_enqueue = 0.0
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

                    # 4. Asynchronous Non-Blocking Behavior Queue Enqueue (controlled ~1.0s sample rate)
                    if current_time - last_behavior_enqueue >= 1.0 and active_tracks:
                        last_behavior_enqueue = current_time
                        track_snapshots = []
                        for t in active_tracks:
                            track_snapshots.append({
                                "track_id": t.track_id,
                                "bbox": [float(v) for v in t.bbox],
                                "landmarks": t.landmarks.copy() if getattr(t, "landmarks", None) is not None else None,
                                "student_usn": getattr(t, "student_usn", None),
                                "student_name": getattr(t, "student_name", None),
                            })
                        try:
                            self.behavior_queue.put_nowait((camera_id, class_id, frame.copy(), track_snapshots, current_time))
                        except queue.Full:
                            pass  # Keep attendance latency at 0ms; drop sample if worker busy

                    # Draw visual HUD & bounding box overlay on live view
                    cap_obj = camera_service._captures.get(camera_id)
                    if cap_obj is None and camera_service._captures:
                        cap_obj = next(iter(camera_service._captures.values()), None)
                    if hasattr(cap_obj, "current_video_name") and cap_obj.current_video_name:
                        video_name = cap_obj.current_video_name
                    else:
                        cap_source = camera_service._sources.get(camera_id, "")
                        video_name = os.path.basename(cap_source) if cap_source else "CCTV STREAM"

                    annotated_att = self._draw_attendance_overlay(frame, active_tracks, video_name)
                    annotated_beh = self._draw_behavior_overlay(frame, active_tracks, video_name)

                    with self._lock:
                        self.annotated_frames_attendance[camera_id] = annotated_att
                        self.annotated_frames_behavior[camera_id] = annotated_beh
                        self.annotated_frames[camera_id] = annotated_att

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

    def _draw_attendance_overlay(self, frame: np.ndarray, active_tracks: List[TrackedFace], video_name: str = "") -> np.ndarray:
        """Render high-contrast Attendance-Only HUD and bounding box overlays on live frame.
        
        Strictly excludes any behavioral alert pills or phone/sleeping markers.
        """
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
        cv2.putText(annotated, "ATTENDANCE MONITORING", (30, hud_h // 2 + 4), cv2.FONT_HERSHEY_DUPLEX, 0.45, (240, 240, 240), 1, cv2.LINE_AA)

        # Video Name & Status Badge
        vid_title = f"FEED: {video_name}" if video_name else "CCTV STREAM"
        status_badge = "BIOMETRIC VERIFICATION: ACTIVE"
        cv2.putText(annotated, f"{vid_title}  |  {status_badge}", (220, hud_h // 2 + 4), cv2.FONT_HERSHEY_SIMPLEX, 0.38, (0, 215, 255), 1, cv2.LINE_AA)

        stats_label = f"PRESENT: {len(self.session_recognized_students)} ENROLLED  |  ACTIVE TRACKS: {len(active_tracks)}"
        cv2.putText(annotated, stats_label, (max(380, w - 370), hud_h // 2 + 4), cv2.FONT_HERSHEY_SIMPLEX, 0.40, (0, 255, 128), 1, cv2.LINE_AA)

        # 2. Draw tracks with emerald presence corner brackets
        for t in active_tracks:
            tx1, ty1, tx2, ty2 = [int(round(float(v))) for v in t.bbox]
            tx1, ty1 = max(0, tx1), max(0, ty1)
            tx2, ty2 = min(w, tx2), min(h, ty2)

            is_rec = hasattr(t, "student_usn") and t.student_usn is not None
            student_name = getattr(t, "student_name", t.student_usn if is_rec else "")
            conf = getattr(t, "recognition_confidence", 0.0)

            if is_rec:
                # Emerald brackets for confirmed attendance
                box_color = (60, 230, 100)
                bracket_len = max(6, min(16, (tx2 - tx1) // 3))

                cv2.line(annotated, (tx1, ty1), (tx1 + bracket_len, ty1), box_color, 2)
                cv2.line(annotated, (tx1, ty1), (tx1, ty1 + bracket_len), box_color, 2)
                cv2.line(annotated, (tx2, ty1), (tx2 - bracket_len, ty1), box_color, 2)
                cv2.line(annotated, (tx2, ty1), (tx2, ty1 + bracket_len), box_color, 2)
                cv2.line(annotated, (tx1, ty2), (tx1 + bracket_len, ty2), box_color, 2)
                cv2.line(annotated, (tx1, ty2), (tx1, ty2 - bracket_len), box_color, 2)
                cv2.line(annotated, (tx2, ty2), (tx2 - bracket_len, ty2), box_color, 2)
                cv2.line(annotated, (tx2, ty2), (tx2 - bracket_len, ty2), box_color, 2)

                # Attendance Badge (Top of bbox)
                badge_text = f"✓ PRESENT: {student_name}"
                sub_text = f"{t.student_usn} · {int(conf*100)}%"
                badge_y = max(hud_h + 24, ty1 - 6)
                badge_w = max(len(badge_text), len(sub_text)) * 7 + 10
                cv2.rectangle(annotated, (tx1 - 2, badge_y - 24), (tx1 + badge_w, badge_y), (15, 20, 15), -1)
                cv2.rectangle(annotated, (tx1 - 2, badge_y - 24), (tx1 + badge_w, badge_y), box_color, 1)
                cv2.putText(annotated, badge_text, (tx1 + 4, badge_y - 12), cv2.FONT_HERSHEY_SIMPLEX, 0.38, (255, 255, 255), 1, cv2.LINE_AA)
                cv2.putText(annotated, sub_text, (tx1 + 4, badge_y - 2), cv2.FONT_HERSHEY_SIMPLEX, 0.30, box_color, 1, cv2.LINE_AA)
            else:
                # Unassigned / Unknown Face: Sleek tech corner brackets without solid black clutter
                bw = tx2 - tx1
                bh = ty2 - ty1
                if bw >= 20 and bh >= 20:
                    bracket_color = (180, 140, 40)
                    b_len = max(4, min(10, bw // 4))
                    cv2.line(annotated, (tx1, ty1), (tx1 + b_len, ty1), bracket_color, 1)
                    cv2.line(annotated, (tx1, ty1), (tx1, ty1 + b_len), bracket_color, 1)
                    cv2.line(annotated, (tx2, ty1), (tx2 - b_len, ty1), bracket_color, 1)
                    cv2.line(annotated, (tx2, ty1), (tx2, ty1 + b_len), bracket_color, 1)
                    cv2.line(annotated, (tx1, ty2), (tx1 + b_len, ty2), bracket_color, 1)
                    cv2.line(annotated, (tx1, ty2), (tx1, ty2 - b_len), bracket_color, 1)
                    cv2.line(annotated, (tx2, ty2), (tx2 - b_len, ty2), bracket_color, 1)
                    cv2.line(annotated, (tx2, ty2), (tx2 - b_len, ty2), bracket_color, 1)

        return annotated

    def _draw_behavior_overlay(self, frame: np.ndarray, active_tracks: List[TrackedFace], video_name: str = "") -> np.ndarray:
        """Render high-contrast Behavioral-Only HUD and telemetry overlays on live frame.
        
        Strictly excludes attendance check-in badges or marking students present.
        """
        annotated = frame.copy()
        h, w = annotated.shape[:2]

        # 1. Top HUD Bar
        hud_h = 38
        cv2.rectangle(annotated, (0, 0), (w, hud_h), (15, 18, 25), -1)
        cv2.line(annotated, (0, hud_h), (w, hud_h), (40, 50, 70), 1)

        # Blinking live indicator
        now_sec = int(time.time() * 2)
        dot_color = (0, 200, 255) if now_sec % 2 == 0 else (0, 100, 255)
        cv2.circle(annotated, (18, hud_h // 2), 5, dot_color, -1)
        cv2.putText(annotated, "BEHAVIORAL MONITORING", (30, hud_h // 2 + 4), cv2.FONT_HERSHEY_DUPLEX, 0.45, (240, 240, 240), 1, cv2.LINE_AA)

        # Pipeline Status Badge
        vid_title = f"FEED: {video_name}" if video_name else "CCTV STREAM"
        status_badge = "HYBRID PIPELINE: ACTIVE"
        cv2.putText(annotated, f"{vid_title}  |  {status_badge}", (220, hud_h // 2 + 4), cv2.FONT_HERSHEY_SIMPLEX, 0.38, (255, 180, 0), 1, cv2.LINE_AA)

        stats_label = f"TRACKED PERSONS: {len(active_tracks)}  |  STAGE 1+2 TELEMETRY"
        cv2.putText(annotated, stats_label, (max(380, w - 370), hud_h // 2 + 4), cv2.FONT_HERSHEY_SIMPLEX, 0.40, (0, 215, 255), 1, cv2.LINE_AA)

        # 2. Draw Behavioral Telemetry Bounding Boxes & Badges
        for t in active_tracks:
            tx1, ty1, tx2, ty2 = [int(round(float(v))) for v in t.bbox]
            tx1, ty1 = max(0, tx1), max(0, ty1)
            tx2, ty2 = min(w, tx2), min(h, ty2)

            is_rec = hasattr(t, "student_usn") and t.student_usn is not None
            student_name = getattr(t, "student_name", t.student_usn if is_rec else "")
            
            # Look up behavioral state
            key = t.student_usn if is_rec else f"TRACK_{t.track_id}"
            beh = self.student_behavior_states.get(key)
            if not beh and is_rec:
                beh = self.student_behavior_states.get(t.student_usn)
            
            beh_state = beh.get("current_state", "NORMAL") if beh else "NORMAL"
            posture = beh.get("posture", "Upright") if beh else "Upright"
            gaze = beh.get("gaze", "Facing Front") if beh else "Facing Front"
            phone_dur = beh.get("accumulated_phone_duration", 0.0) if beh else 0.0
            sleep_dur = beh.get("accumulated_sleeping_duration", 0.0) if beh else 0.0

            # Color coding based on behavioral temporal state
            if beh_state == "ALERTED":
                if sleep_dur >= 10.0:
                    box_color = (0, 0, 255)       # Red
                    pill_text = f"💤 POSSIBLE SLEEPING ({sleep_dur:.1f}s)"
                else:
                    box_color = (0, 165, 255)     # Amber
                    pill_text = f"📱 PHONE USAGE ({phone_dur:.1f}s)"
            elif beh_state in ("POSSIBLE_PHONE_USAGE", "OBSERVING_PHONE"):
                box_color = (0, 190, 240)         # Amber/Orange
                pill_text = f"📱 OBSERVING PHONE ({phone_dur:.1f}s)"
            elif beh_state in ("POSSIBLE_SLEEPING", "OBSERVING_POSTURE"):
                box_color = (80, 80, 230)         # Soft Red
                pill_text = f"⏳ SLUMPED POSTURE ({sleep_dur:.1f}s)"
            elif beh_state == "INSUFFICIENT_VISUAL_EVIDENCE":
                box_color = (120, 120, 120)       # Gray
                pill_text = "⚪ INSUFFICIENT EVIDENCE"
            else:
                box_color = (200, 150, 40)        # Blue/Cyan
                pill_text = f"🟢 NORMAL ({posture})"

            # Render bounding box
            cv2.rectangle(annotated, (tx1, ty1), (tx2, ty2), box_color, 2)

            # Identification Header (Tracking ID / Student Name)
            header_text = f"TRACK #{t.track_id}: {student_name}" if is_rec else f"TRACK #{t.track_id} (Unidentified)"
            header_y = max(hud_h + 18, ty1 - 6)
            cv2.rectangle(annotated, (tx1 - 1, header_y - 18), (tx1 + len(header_text) * 7 + 6, header_y), (10, 15, 20), -1)
            cv2.rectangle(annotated, (tx1 - 1, header_y - 18), (tx1 + len(header_text) * 7 + 6, header_y), box_color, 1)
            cv2.putText(annotated, header_text, (tx1 + 3, header_y - 5), cv2.FONT_HERSHEY_SIMPLEX, 0.35, (255, 255, 255), 1, cv2.LINE_AA)

            # Behavioral Telemetry Pill Below Box
            telemetry_y = min(h - 10, ty2 + 18)
            cv2.rectangle(annotated, (tx1 - 1, telemetry_y - 16), (tx1 + len(pill_text) * 7 + 10, telemetry_y), (15, 15, 15), -1)
            cv2.rectangle(annotated, (tx1 - 1, telemetry_y - 16), (tx1 + len(pill_text) * 7 + 10, telemetry_y), box_color, 1)
            cv2.putText(annotated, pill_text, (tx1 + 4, telemetry_y - 4), cv2.FONT_HERSHEY_SIMPLEX, 0.34, box_color, 1, cv2.LINE_AA)

        return annotated

    def _draw_overlay(self, frame: np.ndarray, active_tracks: List[TrackedFace], video_name: str = "") -> np.ndarray:
        """Default overlay fallback (delegates to attendance overlay)."""
        return self._draw_attendance_overlay(frame, active_tracks, video_name)

    def _get_student_details(self, db: Session, usn: str) -> Tuple[Optional[str], str]:
        """Resolves student DB id and full name for a USN, checking in-memory cache and PostgreSQL."""
        if not hasattr(self, "_student_cache"):
            self._student_cache = {}
            
        clean_usn = usn.strip().upper()
        if clean_usn in self._student_cache:
            entry = self._student_cache[clean_usn]
            return entry.get("id"), entry.get("name", clean_usn)
            
        # Query PostgreSQL "Student" table if using postgresql dialect
        try:
            bind = db.get_bind()
            if bind.dialect.name == "postgresql":
                from sqlalchemy import text
                row = db.execute(
                    text('SELECT id, "fullName" FROM "Student" WHERE "studentId" = :u OR usn = :u LIMIT 1'),
                    {"u": clean_usn}
                ).fetchone()
                if row:
                    st_id, st_name = str(row[0]), str(row[1])
                    self._student_cache[clean_usn] = {"id": st_id, "name": st_name}
                    return st_id, st_name
        except Exception as e:
            logger.debug(f"Direct Student table query error: {e}")
            
        # Fallback to legacy students table if present
        try:
            student = db.query(Student).filter(Student.usn == clean_usn).first()
            if student:
                self._student_cache[clean_usn] = {"id": str(student.id), "name": student.name}
                return str(student.id), student.name
        except Exception:
            pass
            
        return None, clean_usn

    def _get_section_usns(self, db: Session, class_id: str) -> Optional[set]:
        """Resolves the set of uppercase student USNs belonging to the target class/section."""
        if not hasattr(self, "_section_usn_cache"):
            self._section_usn_cache = {}

        # Determine target section from class_id (e.g. "room-023", "CSE_6A", "Section A", "CSE_7A")
        target_sec = "A"
        clean_cid = (class_id or "").upper()
        if "SEC_B" in clean_cid or "SECTION_B" in clean_cid or "-B" in clean_cid or "024" in clean_cid:
            target_sec = "B"
        elif "SEC_A" in clean_cid or "SECTION_A" in clean_cid or "-A" in clean_cid or "023" in clean_cid or "7A" in clean_cid or "6A" in clean_cid:
            target_sec = "A"

        cache_key = f"SEC_{target_sec}"
        if cache_key in self._section_usn_cache:
            return self._section_usn_cache[cache_key]

        usns: set = set()
        # Query PostgreSQL Student table
        try:
            bind = db.get_bind()
            if bind.dialect.name == "postgresql":
                from sqlalchemy import text
                rows = db.execute(
                    text('SELECT "studentId", usn, "rollNumber" FROM "Student" WHERE section = :s OR "sectionId" = :s'),
                    {"s": target_sec}
                ).fetchall()
                for r in rows:
                    for val in r:
                        if val:
                            usns.add(str(val).strip().upper())
        except Exception as e:
            logger.debug(f"Error querying section students from postgres: {e}")

        # Fallback to legacy students table if present
        try:
            rows = db.query(Student.usn).filter(Student.section == target_sec).all()
            for r in rows:
                if r[0]:
                    usns.add(str(r[0]).strip().upper())
        except Exception:
            pass

        # If still empty (e.g. in test env), generate default Section A range
        if not usns and target_sec == "A":
            for i in range(1, 65):
                usns.add(f"1VI23CS{i:03d}")

        if usns:
            self._section_usn_cache[cache_key] = usns
            logger.info(f"Loaded {len(usns)} enrolled students for Section {target_sec} filter")
            return usns

        return None

    def _process_tracked_face(self, db: Session, camera_id: str, class_id: str, track: TrackedFace, crop: np.ndarray):
        """Evaluates a tracked face and executes matching, attendance, or learning candidates."""
        # If track has already been marked for attendance and candidate captured, skip redundant re-inference
        if getattr(track, "attendance_marked", False) and getattr(track, "candidate_processed", False):
            return True

        h, w = crop.shape[:2]
        if w < 22 or h < 22:
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
            emb = embedding_service.generate_embedding(crop, getattr(track, "landmarks", None))
            
        if emb is None:
            return False

        # Query FAISS Index with classroom threshold and section whitelist
        rec_thresh = max(0.60, float(getattr(settings, "recognition_confidence_threshold", 0.60)))
        allowed_usns = self._get_section_usns(db, class_id)
            
        match = faiss_service.search_face(emb, threshold=rec_thresh, allowed_usns=allowed_usns)
        
        confidence = 0.0
        matched_usn = None
        
        if match:
            cand_usn, cand_conf = match
            if cand_usn:
                matched_usn = cand_usn
                confidence = cand_conf

        # Self-improving online prototype matching: compare with running student prototypes
        if hasattr(self, "_student_prototypes") and self._student_prototypes and emb is not None:
            norm_allowed = {u.strip().upper() for u in allowed_usns} if allowed_usns else None
            for p_usn, p_vec in self._student_prototypes.items():
                if norm_allowed and p_usn.strip().upper() not in norm_allowed:
                    continue
                proto_sim = float(np.dot(emb, p_vec))
                if proto_sim > confidence and proto_sim >= rec_thresh:
                    matched_usn = p_usn
                    confidence = proto_sim

        if not hasattr(track, "confidence_history"):
            track.confidence_history = []
        track.confidence_history.append(confidence)
        if len(track.confidence_history) > 10:
            track.confidence_history.pop(0)

        avg_conf = np.mean(track.confidence_history) if track.confidence_history else 0.0

        # --- Business Decision Pipeline ---
        if matched_usn and confidence >= rec_thresh:
            st_id, student_name = self._get_student_details(db, matched_usn)
            
            track.student_usn = matched_usn
            track.student_name = student_name
            track.recognition_confidence = confidence

            # --- Online Self-Improving Prototype Adaptation ---
            # When student is verified with strong confidence, update their running embedding prototype
            if confidence >= 0.80 and emb is not None:
                if not hasattr(self, "_student_prototypes"):
                    self._student_prototypes = {}
                if matched_usn not in self._student_prototypes:
                    self._student_prototypes[matched_usn] = emb.copy()
                else:
                    prev_proto = self._student_prototypes[matched_usn]
                    updated_proto = 0.88 * prev_proto + 0.12 * emb
                    norm_p = float(np.linalg.norm(updated_proto))
                    if norm_p > 1e-6:
                        self._student_prototypes[matched_usn] = updated_proto / norm_p
            
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

            # Rule: Visibility >= 5.0s AND average confidence >= threshold
            track_duration = time.time() - getattr(track, "first_seen", time.time())
            if track_duration >= 5.0 and avg_conf >= rec_thresh:
                self._mark_student_attendance(db, matched_usn, class_id, avg_conf, camera_id)
                track.attendance_marked = True

            # Continuous learning check
            quality_score = float(getattr(track, "quality_score", 0.0))
            if quality_score == 0.0 and hasattr(track, "quality") and isinstance(track.quality, dict):
                quality_score = float(track.quality.get("score", 0.0))
            if quality_score == 0.0:
                try:
                    q_res = face_quality_service.analyze_quality(crop, det_raw_face)
                    if isinstance(q_res, dict):
                        quality_score = float(q_res.get("score", 0.0))
                except Exception:
                    pass

            lap_var = 0.0
            try:
                import cv2
                lap_var = cv2.Laplacian(cv2.cvtColor(crop, cv2.COLOR_BGR2GRAY), cv2.CV_64F).var()
            except Exception:
                lap_var = 100.0

            if (confidence > 0.98 and
                quality_score > 85.0 and
                w >= 100 and h >= 100 and
                lap_var >= 60.0):
                self._process_learning_candidate(db, matched_usn, crop, emb, quality_score, confidence)
                track.candidate_processed = True

            return True

        # Save unrecognized face detections below recognition threshold
        quality_val = float(getattr(track, "quality_score", 0.85))
        self._save_unknown_face(
            db, 
            crop, 
            emb, 
            quality_val, 
            camera_id, 
            class_id, 
            suggestion_usn=matched_usn if matched_usn else None, 
            suggestion_conf=confidence if matched_usn else 0.0
        )
        return False

    def _mark_student_attendance(self, db: Session, usn: str, class_id: str, confidence: float, camera_id: str = None):
        """Mark student attendance in the PostgreSQL/SQLite database if not already marked today."""
        st_id, st_name = self._get_student_details(db, usn)
        if not st_id:
            return

        today = datetime.now().strftime("%Y-%m-%d")
        now_dt = datetime.now()

        # 1. Upsert into PostgreSQL AttendanceRecord (if dialect is postgresql)
        try:
            bind = db.get_bind()
            if bind.dialect.name == "postgresql":
                from sqlalchemy import text
                session_id = getattr(self, "current_session_id", None) or class_id or "default_session"
                rec_id = f"att_{int(time.time() * 1000)}_{usn}"
                db.execute(
                    text('''
                        INSERT INTO "AttendanceRecord" 
                        ("id", "sessionId", "studentId", "studentName", "confidence", "cameraId", "method", "isVerified", "markedAt", "statusEnum")
                        VALUES (:id, :sessionId, :studentId, :studentName, :confidence, :cameraId, 'FACE_RECOGNITION', true, :markedAt, 'PRESENT')
                        ON CONFLICT ("sessionId", "studentId") DO UPDATE 
                        SET "confidence" = EXCLUDED."confidence", "markedAt" = EXCLUDED."markedAt"
                    '''),
                    {
                        "id": rec_id,
                        "sessionId": session_id,
                        "studentId": st_id,
                        "studentName": st_name,
                        "confidence": float(confidence),
                        "cameraId": camera_id or "webcam",
                        "markedAt": now_dt
                    }
                )
                db.commit()
        except Exception as p_err:
            logger.debug(f"AttendanceRecord insert notice: {p_err}")
            try:
                db.rollback()
            except Exception:
                pass

        # 2. Also record in legacy Attendance table if present
        try:
            legacy_student = db.query(Student).filter(Student.usn == usn).first()
            if legacy_student:
                recent_att = (
                    db.query(Attendance)
                    .filter(Attendance.student_id == legacy_student.id)
                    .filter(Attendance.class_id == class_id)
                    .filter(Attendance.date == today)
                    .first()
                )
                if not recent_att:
                    now_time = datetime.now().strftime("%H:%M:%S")
                    att = Attendance(
                        student_id=legacy_student.id,
                        class_id=class_id,
                        date=today,
                        time=now_time,
                        confidence=round(confidence, 3),
                        status="PRESENT"
                    )
                    db.add(att)
                    db.commit()
        except Exception as l_err:
            logger.debug(f"Legacy attendance record error: {l_err}")

        # 3. Call NestJS backend /api/attendance/ingest
        try:
            import httpx
            session_id = getattr(self, "current_session_id", None) or class_id or "default_session"
            url = f"{settings.backend_api_url.rstrip('/')}/api/attendance/ingest"
            headers = {
                "Content-Type": "application/json",
                "x-api-key": settings.encryption_key
            }
            payload_ingest = {
                "sessionId": session_id,
                "studentId": usn,
                "studentName": st_name,
                "confidence": float(round(confidence, 3)),
                "cameraId": camera_id or "webcam",
                "method": "FACE_RECOGNITION"
            }
            r = httpx.post(url, json=payload_ingest, headers=headers, timeout=3.0)
            if r.status_code in (200, 201):
                logger.info(f"Successfully ingested attendance to NestJS for student {st_name} ({usn})")
        except Exception as e:
            logger.debug(f"Notice calling NestJS /api/attendance/ingest: {e}")

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

                        # Track orientation samples from genuine facial landmarks
                        lms = det.get("landmarks")
                        if lms is not None and len(lms) >= 5:
                            try:
                                pitch, yaw, roll = face_quality_service.estimate_pose_from_landmarks(lms)
                                if "poses_by_usn" not in locals():
                                    poses_by_usn = {}
                                if usn not in poses_by_usn:
                                    poses_by_usn[usn] = []
                                poses_by_usn[usn].append((pitch, yaw, roll))
                            except Exception:
                                pass
                    else:
                        unknown_faces += 1

            frame_idx += 1

        cap.release()

        confirmed_records = []
        if "poses_by_usn" not in locals():
            poses_by_usn = {}

        for usn, confs in observations.items():
            if len(confs) >= required_confirmations:
                avg_conf = float(np.mean(confs))
                poses = poses_by_usn.get(usn, [])
                if len(poses) >= 3:
                    attentive_samples = sum(1 for p, y, r in poses if abs(y) <= 25 and -15 <= p <= 20)
                    attention_score = round(attentive_samples / len(poses) * 100.0, 1)
                    head_down_ratio = sum(1 for p, y, r in poses if p < -20.0) / len(poses)
                    beh_status = "SLEEPING" if head_down_ratio >= 0.70 else "ALERT"
                else:
                    attention_score = None
                    beh_status = "INSUFFICIENT_DATA"

                confirmed_records.append({
                    "usn": usn,
                    "status": "PRESENT",
                    "confidence": round(avg_conf, 3),
                    "observation_count": len(confs),
                    "first_seen_sec": round(first_seen_times[usn], 1),
                    "confirmed_at": datetime.now().isoformat(),
                    "attention_score": attention_score,
                    "behavior_status": beh_status,
                    "orientation_samples": len(poses),
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

    def _start_behavior_worker(self):
        """Starts the daemon worker thread for background behavioral analysis."""
        if self._behavior_worker_thread is None or not self._behavior_worker_thread.is_alive():
            self._behavior_worker_running = True
            self._behavior_worker_thread = threading.Thread(
                target=self._behavior_worker_loop,
                name="BehaviorWorker",
                daemon=True
            )
            self._behavior_worker_thread.start()
            logger.info("Started background behavioral analysis worker thread")

    def _behavior_worker_loop(self):
        """Asynchronous background worker executing two-stage hybrid behavioral analysis."""
        from ..behavior.detector.hybrid_behavior_pipeline import hybrid_behavior_pipeline
        from ..behavior.tracker.behavior_tracker import behavior_tracker_service

        logger.info("Two-Stage Hybrid Behavioral Worker Loop started.")

        while self._behavior_worker_running:
            try:
                item = self.behavior_queue.get(timeout=1.0)
            except queue.Empty:
                continue

            try:
                camera_id, class_id, frame, tracks_snapshot, timestamp = item

                # 1. Execute Two-Stage Hybrid Behavioral Pipeline
                generated_alerts = hybrid_behavior_pipeline.process_frame(
                    frame=frame,
                    active_tracks=tracks_snapshot,
                    timestamp=timestamp
                )

                # 2. Update real-time state telemetry for all active tracked persons
                for person in behavior_tracker_service.get_all_tracks():
                    p_dict = person.to_dict()
                    p_dict["camera_id"] = camera_id
                    p_dict["class_id"] = class_id
                    
                    # Store by primary key (USN or Track ID)
                    key = person.student_id if (person.is_verified_identity and person.student_id) else f"TRACK_{person.track_id}"
                    self.student_behavior_states[key] = p_dict
                    if person.student_id:
                        self.student_behavior_states[person.student_id] = p_dict

                # 3. Dispatch confirmed alerts with deduplication lifecycle
                for alert in generated_alerts:
                    b_type = (
                        BehaviorType.PHONE_USAGE if alert["event_type"] == "PHONE_USAGE"
                        else BehaviorType.SLEEPING
                    )
                    self._trigger_confirmed_behavior_alert(
                        student_usn=alert.get("student_id") or f"TRK-{alert['track_id']}",
                        student_name=alert.get("student_name") or f"Student (Track {alert['track_id']})",
                        class_id=class_id,
                        camera_id=camera_id,
                        behavior_type=b_type,
                        confidence=alert.get("confidence", 0.85),
                        duration=alert.get("duration", 0.0),
                        title=alert.get("title", ""),
                        description=alert.get("description", "")
                    )

            except Exception as item_err:
                logger.error(f"Error in hybrid behavior worker: {item_err}")

    def _trigger_confirmed_behavior_alert(
        self,
        student_usn: str,
        student_name: str,
        class_id: str,
        camera_id: str,
        behavior_type: BehaviorType,
        confidence: float,
        duration: float = 0.0,
        title: str = "",
        description: str = ""
    ):
        """Emit behavioral alert and persist to NestJS backend with cooldown deduplication."""
        cooldown_key = f"{student_usn}_{behavior_type.value}"
        now = time.time()
        last_alert_time = self.behavior_alert_cooldowns.get(cooldown_key, 0.0)
        if now - last_alert_time < 60.0:  # 60s cooldown prevents duplicate alerts
            return
        self.behavior_alert_cooldowns[cooldown_key] = now

        # 1. Record in local AI analytics
        event = BehaviorEvent(
            student_id=student_usn,
            behavior_type=behavior_type,
            confidence=confidence,
            start_time=now,
            duration=duration,
            classroom_id=class_id,
            camera_id=camera_id,
            metadata={"studentName": student_name, "studentUsn": student_usn, "title": title}
        )
        behavior_analytics.record_behavior(event)
        alert_engine.process_behavior(event)

        # 2. Broadcast via WebSocket to teacher and live portals
        websocket_manager.broadcast_sync("BEHAVIOR_ALERT", {
            "student_id": student_usn,
            "student_name": student_name,
            "behavior_type": behavior_type.value,
            "confidence": confidence,
            "duration": round(duration, 1),
            "title": title or ("Mobile Phone Usage Detected" if behavior_type == BehaviorType.PHONE_USAGE else "Possible sleeping posture"),
            "description": description,
            "class_id": class_id,
            "camera_id": camera_id,
            "time": datetime.now().strftime("%I:%M:%S %p"),
        })

        # 3. Post to NestJS API /api/behavior/ingest
        try:
            import httpx
            url = f"{settings.backend_api_url.rstrip('/')}/api/behavior/ingest"
            headers = {
                "Content-Type": "application/json",
                "x-api-key": settings.encryption_key
            }
            payload = {
                "studentId": student_usn if not student_usn.startswith("TRK-") else None,
                "sessionId": class_id,
                "behaviorType": behavior_type.value,
                "confidence": confidence,
                "duration": duration,
                "classroomId": class_id,
                "metadata": {
                    "studentName": student_name,
                    "studentUsn": student_usn,
                    "cameraId": camera_id,
                    "title": title,
                    "description": description
                }
            }
            resp = httpx.post(url, json=payload, headers=headers, timeout=4.0)
            if resp.status_code in (200, 201):
                logger.info(f"Persisted behavior alert {behavior_type.value} for {student_name} ({student_usn}) to NestJS")
            else:
                logger.warning(f"NestJS behavior ingest returned status {resp.status_code}: {resp.text}")
        except Exception as e:
            logger.error(f"Error posting behavior event to NestJS: {e}")

    def get_live_behavior_metrics(self, camera_id: Optional[str] = None) -> Dict[str, Any]:
        """Retrieve live backend-derived behavioral telemetry for active classroom session."""
        with self._lock:
            active_cams = list(self.active_sessions.keys())

        results = {}
        for key, state in self.student_behavior_states.items():
            if camera_id and state.get("camera_id") != camera_id:
                continue
            results[key] = state

        return {
            "active_sessions": active_cams,
            "students": results,
            "total_analyzed": len(results),
            "timestamp": time.time(),
        }


# Singleton instance
attendance_engine = AttendanceEngine()
