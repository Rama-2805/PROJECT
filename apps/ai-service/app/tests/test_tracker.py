"""SmartCampus AI — IoU Face Tracker Unit Tests."""

import pytest
from app.services.face_tracker import IoUTracker


def test_tracker_iou_matching():
    """Test that tracker correctly matches overlapping bounding boxes and maintains track ID."""
    tracker = IoUTracker(iou_threshold=0.30, max_lost_frames=5)

    # Frame 1: Detection 1
    det1 = [{"bbox": [10, 10, 100, 100], "confidence": 0.90}]
    tracks_f1 = tracker.update(det1)
    
    assert len(tracks_f1) == 1
    t1_id = tracks_f1[0].track_id
    assert tracks_f1[0].frame_count == 1

    # Frame 2: Slightly shifted detection 1 (high overlap)
    det2 = [{"bbox": [12, 12, 102, 102], "confidence": 0.92}]
    tracks_f2 = tracker.update(det2)
    
    assert len(tracks_f2) == 1
    assert tracks_f2[0].track_id == t1_id
    assert tracks_f2[0].frame_count == 2


def test_tracker_non_matching_and_cleanup():
    """Test tracker behavior for non-overlapping boxes and frame timeout removals."""
    tracker = IoUTracker(iou_threshold=0.30, max_lost_frames=2)

    # Frame 1: Initial detection
    tracker.update([{"bbox": [10, 10, 50, 50], "confidence": 0.90}])
    assert len(tracker.tracks) == 1
    t1_id = list(tracker.tracks.keys())[0]

    # Frame 2: Unrelated detection in different location (no overlap)
    tracker.update([{"bbox": [200, 200, 250, 250], "confidence": 0.88}])
    assert len(tracker.tracks) == 2  # Old track is marked lost but kept, new track created
    
    # Frame 3: Empty detection
    tracker.update([])
    # Track 1 has now been lost for 2 consecutive frames -> should be removed (cleaned up)
    assert t1_id not in tracker.tracks
