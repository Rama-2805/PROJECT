"""SmartCampus AI — Camera Test Router."""

import logging
import time
from typing import Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from ..config.settings import settings
from ..services.camera_service import camera_service
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
