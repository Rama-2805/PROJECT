import os
import sys
import cv2
import numpy as np

# Add apps/ai-service to path
sys.path.append("/Users/rama/Major project/PROJECT/apps/ai-service")

from app.services.face_detector import face_detector
from app.services.face_quality_service import face_quality_service
from app.config.settings import settings

print("Settings min quality score:", settings.min_quality_score)
cap = cv2.VideoCapture("/Users/rama/Major project/PROJECT/video1.MOV")
if not cap.isOpened():
    print("Failed to open video")
    sys.exit(1)

fps = cap.get(cv2.CAP_PROP_FPS)
width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
print(f"Video: {width}x{height} @ {fps} fps")

frame_idx = 0
faces_analyzed = 0

while True:
    ret, frame = cap.read()
    if not ret:
        break
    
    frame_idx += 1
    # Sample every 60 frames
    if frame_idx % 60 != 0:
        continue
        
    # Resize if > 1920
    if width > 1920:
        scale = 1920.0 / width
        frame_resized = cv2.resize(frame, None, fx=scale, fy=scale, interpolation=cv2.INTER_AREA)
        inv_scale = width / 1920.0
    else:
        frame_resized = frame
        inv_scale = 1.0

    detections = face_detector.detect_faces(frame_resized)
    if detections:
        print(f"\n--- Frame {frame_idx}: Found {len(detections)} faces ---")
        for idx, det in enumerate(detections):
            faces_analyzed += 1
            bbox = det["bbox"]
            raw_face = det["raw_face"]
            
            # Map bbox to original 4K resolution
            x1 = int(bbox[0] * inv_scale)
            y1 = int(bbox[1] * inv_scale)
            x2 = int(bbox[2] * inv_scale)
            y2 = int(bbox[3] * inv_scale)
            
            x1 = max(0, min(x1, width))
            y1 = max(0, min(y1, height))
            x2 = max(0, min(x2, width))
            y2 = max(0, min(y2, height))
            
            crop_original = frame[y1:y2, x1:x2].copy()
            h, w = crop_original.shape[:2]
            
            # Analyze quality
            quality = face_quality_service.analyze_quality(crop_original, raw_face)
            
            print(f"  Face {idx + 1}:")
            print(f"    Dimensions: {w}x{h}")
            print(f"    Individual Scores: Size={quality.get('size_score'):.1f}, Blur={quality.get('blur_score'):.1f}, Brightness={quality.get('brightness_score'):.1f}, Pose={quality.get('pose_score'):.1f}")
            print(f"    Overall Quality Score: {quality.get('score')} (Min required: {settings.min_quality_score})")
            print(f"    Is acceptable: {quality.get('is_acceptable')}")
            
    if faces_analyzed >= 5:
        break

cap.release()
print("\nDone.")
