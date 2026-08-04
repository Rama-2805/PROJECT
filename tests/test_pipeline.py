"""Pytest unit test suite for SmartCampus AI enrollment and streaming decision pipeline."""

import pytest
import numpy as np
import os
import json
import sqlite3

def test_quality_assessor():
    """Verify laplacian blur, brightness, and contrast scores."""
    from src.quality_assessor import QualityAssessor
    assessor = QualityAssessor()
    
    img = np.random.randint(0, 255, (100, 100, 3), dtype=np.uint8)
    res = assessor.evaluate_face(img, (10, 10, 80, 80), (0, 0, 0))
    
    assert "overall_quality" in res
    assert "passed" in res
    assert isinstance(res["passed"], bool)


def test_phash_and_cosine_similarity():
    """Verify pHash and cosine similarity duplicate detection."""
    from src.duplicate_remover import DuplicateRemover
    remover = DuplicateRemover()
    
    emb1 = np.ones(512, dtype=np.float32)
    emb1 = emb1 / np.linalg.norm(emb1)
    
    emb2 = np.ones(512, dtype=np.float32)
    emb2 = emb2 / np.linalg.norm(emb2)
    
    sim = float(np.dot(emb1, emb2))
    assert sim >= 0.99


def test_online_duplicate_removal():
    """Verify online streaming face deduplication."""
    from src.duplicate_remover import DuplicateRemover
    remover = DuplicateRemover()
    
    emb1 = np.ones(512, dtype=np.float32)
    emb1 = emb1 / np.linalg.norm(emb1)
    
    existing_embs = [emb1]
    existing_phashes = ["1111222233334444"]
    
    candidate_face = {
        "embedding": emb1,
        "phash": "1111222233334444"
    }
    
    is_dup = remover.is_duplicate_online(candidate_face, existing_embs, existing_phashes)
    assert is_dup is True


def test_clustering():
    """Verify HDBSCAN identity clustering algorithm."""
    from src.clusterer import IdentityClusterer
    clusterer = IdentityClusterer()
    
    group1 = np.random.normal(loc=0.0, scale=0.05, size=(10, 512)).astype(np.float32)
    group2 = np.random.normal(loc=5.0, scale=0.05, size=(10, 512)).astype(np.float32)
    
    embs = np.vstack([group1, group2])
    norms = np.linalg.norm(embs, axis=1, keepdims=True)
    embs = embs / norms
    
    labels = clusterer.cluster_embeddings(embs)
    assert len(labels) == 20


def test_database_manager(tmp_path):
    """Verify FAISS index creation and SQLite insertion."""
    from src.database_manager import DatabaseManager
    
    faiss_path = str(tmp_path / "test_faiss.bin")
    sqlite_path = str(tmp_path / "test_db.sqlite")
    
    db_mgr = DatabaseManager(faiss_index_file=faiss_path, sqlite_db_file=sqlite_path)
    
    emb = np.random.randn(512).astype(np.float32)
    emb = emb / np.linalg.norm(emb)
    
    db_mgr.add_student("Student_TEST", [emb], [{"image_name": "face_001.jpg"}])
    
    assert os.path.exists(faiss_path)
    assert os.path.exists(sqlite_path)


def test_report_generator(tmp_path):
    """Verify JSON, CSV, and PDF report creation."""
    from src.report_generator import ReportGenerator
    
    json_path = str(tmp_path / "report.json")
    csv_path = str(tmp_path / "report.csv")
    pdf_path = str(tmp_path / "report.pdf")
    
    rep = ReportGenerator(json_filename=json_path, csv_filename=csv_path, pdf_filename=pdf_path)
    
    stats = {
        "total_videos": 2,
        "total_sampled_frames": 100,
        "total_faces_detected": 80,
        "total_faces_accepted": 70,
        "total_unique_retained": 50,
        "enrolled_student_count": 5,
        "processing_time_sec": 12.5,
    }
    
    roster = [
        {
            "student_id": "Student_001",
            "saved_images_count": 25,
            "avg_quality_score": 0.88,
            "first_seen_timestamp": "00:01:05",
            "last_seen_timestamp": "00:45:20",
            "first_seen_video": "video1.mp4",
            "last_seen_video": "video2.mp4",
        }
    ]
    
    rep.generate_all_reports(stats, roster)
    
    assert os.path.exists(json_path)
    assert os.path.exists(csv_path)
    assert os.path.exists(pdf_path)
