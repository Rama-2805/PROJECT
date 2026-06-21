"""SmartCampus AI — Camera Test Router."""

import logging
import time
import cv2
from typing import Optional
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from ..config.settings import settings
from ..services.camera_service import camera_service, CameraState
from ..services.face_detector import face_detector

logger = logging.getLogger("smartcampus.camera_api")

router = APIRouter(prefix=f"{settings.api_prefix}/camera", tags=["Camera"])


class CameraTestRequest(BaseModel):
    source: str = "0"


@router.post("/test")
async def test_camera(req: Optional[CameraTestRequest] = None):
    """Temporary boot camera stream to test feed connectivity and face detection."""
    source = req.source if req else "0"
    camera_id = "test_camera_stream"
    
    # 1. Stop if already running
    camera_service.stop_camera(camera_id)
    
    # 2. Start camera
    success = camera_service.start_camera(camera_id, source)
    if not success:
        raise HTTPException(status_code=400, detail="Failed to start camera connection.")
    
    # 3. Capture frame(s)
    frame = None
    t1 = None
    start_time = time.time()
    while time.time() - start_time < 5.0:
        latest = camera_service.get_latest_frame(camera_id)
        if latest is not None:
            t1, frame = latest
            break
        time.sleep(0.1)
        
    if frame is None:
        camera_service.stop_camera(camera_id)
        raise HTTPException(status_code=400, detail="Timeout: Could not read frame from camera stream.")
        
    # Wait for another frame to estimate FPS
    fps = 30.0
    start_time = time.time()
    while time.time() - start_time < 1.0:
        latest2 = camera_service.get_latest_frame(camera_id)
        if latest2 is not None and latest2[0] > t1:
            t2, frame2 = latest2
            diff = t2 - t1
            if diff > 0:
                fps = round(1.0 / diff, 1)
            break
        time.sleep(0.02)
        
    # 4. Perform Face Detection
    faces_detected = 0
    try:
        detections = face_detector.detect_faces(frame)
        faces_detected = len(detections) if detections else 0
    except Exception as e:
        logger.error(f"Error during test camera face detection: {e}")
        
    # 5. Shut down camera
    camera_service.stop_camera(camera_id)
    
    h, w = frame.shape[:2]
    resolution = f"{w}x{h}"
    
    return {
        "camera_status": "ONLINE",
        "faces_detected": faces_detected,
        "resolution": resolution,
        "fps": fps
    }


@router.get("/status")
def get_camera_status(camera_id: str = "webcam"):
    """Get real-time diagnostics: online status, resolution, FPS, and AI detection/recognition rates."""
    state = camera_service.get_camera_state(camera_id)
    is_online = (state == CameraState.ONLINE)
    
    with camera_service._lock:
        metrics = camera_service._metrics.get(camera_id)
        
    if not metrics:
        return {
            "camera_online": is_online,
            "resolution": "0x0",
            "fps": 0.0,
            "detection_rate": 0.0,
            "recognition_rate": 0.0,
            "last_frame_timestamp": 0.0
        }
        
    # Calculate detection rate (proportion of frames with face detected)
    det_history = metrics["detection_history"]
    det_rate = sum(1 for d in det_history if d) / len(det_history) if det_history else 0.0
    
    # Calculate recognition rate (proportion of detected frames where face was recognized)
    rec_history = metrics["recognition_history"]
    rec_rate = sum(1 for r in rec_history if r) / len(rec_history) if rec_history else 0.0
    
    resolution = f"{metrics['width']}x{metrics['height']}"
    
    return {
        "camera_online": is_online,
        "resolution": resolution,
        "fps": metrics["fps"],
        "detection_rate": round(det_rate, 2),
        "recognition_rate": round(rec_rate, 2),
        "last_frame_timestamp": metrics["last_frame_timestamp"]
    }


def generate_mjpeg_stream(camera_id: str):
    """Generator for live MJPEG stream with detection/tracking overlays."""
    logger.info(f"Started MJPEG stream generator for camera {camera_id}")
    while True:
        # Fetch annotated frame from attendance engine
        from ..services.attendance_engine import attendance_engine
        frame = None
        with attendance_engine._lock:
            frame = attendance_engine.annotated_frames.get(camera_id)
            
        # Fallback to raw frame from camera service if no session is running
        if frame is None:
            latest = camera_service.get_latest_frame(camera_id)
            if latest is not None:
                _, frame = latest
                
        if frame is not None:
            # Encode frame to JPEG
            ret, jpeg = cv2.imencode('.jpg', frame)
            if ret:
                yield (b'--frame\r\n'
                       b'Content-Type: image/jpeg\r\n\r\n' + jpeg.tobytes() + b'\r\n')
        
        time.sleep(0.066)  # ~15 FPS update rate

@router.get("/stream")
def get_camera_stream(camera_id: str = "webcam"):
    """MJPEG stream endpoint for live monitoring."""
    state = camera_service.get_camera_state(camera_id)
    if state == CameraState.OFFLINE:
        # Try starting camera automatically if offline
        camera_service.start_camera(camera_id, "0")
        
    return StreamingResponse(
        generate_mjpeg_stream(camera_id),
        media_type="multipart/x-mixed-replace; boundary=frame"
    )
