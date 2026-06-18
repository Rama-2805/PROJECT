"""SmartCampus AI — Face Clustering and Duplicate Filter Unit Tests."""

import os
import pytest
import numpy as np
from unittest.mock import MagicMock
from app.models.unknown_face import UnknownFace
from app.services.face_clustering import face_clustering_service


def test_duplicate_unknown_filter(db_session, monkeypatch):
    """Test matching and grouping duplicate unknown faces based on embedding similarity."""
    # Seed mock database with an unknown face
    face_record = UnknownFace(
        cluster_id="unknown_abcd",
        image_path="dummy_img.jpg",
        quality_score=85.0,
        embedding_path="dummy_emb.npy"
    )
    db_session.add(face_record)
    db_session.commit()

    # Mock loading embedding vector from disk
    # Return a 512D unit vector
    stored_vector = np.zeros(512)
    stored_vector[0] = 1.0
    monkeypatch.setattr(os.path, "exists", lambda path: True)
    monkeypatch.setattr(np, "load", lambda path: stored_vector)

    # Query vector matching the stored vector (cosine similarity = 1.0)
    query_vector = np.zeros(512)
    query_vector[0] = 1.0

    matched_cluster = face_clustering_service.duplicate_unknown_filter(db_session, query_vector)
    assert matched_cluster == "unknown_abcd"

    # Query vector not matching (cosine similarity = 0.0)
    non_matching_query = np.zeros(512)
    non_matching_query[1] = 1.0
    
    matched_cluster = face_clustering_service.duplicate_unknown_filter(db_session, non_matching_query)
    assert matched_cluster is None


def test_run_auto_clustering(db_session, monkeypatch):
    """Test grouping unassigned unknown faces using DBSCAN."""
    # Create 3 unassigned unknown faces (met threshold for DBSCAN min_samples=3)
    face_records = [
        UnknownFace(image_path="f1.jpg", quality_score=80.0, embedding_path="f1.npy"),
        UnknownFace(image_path="f2.jpg", quality_score=82.0, embedding_path="f2.npy"),
        UnknownFace(image_path="f3.jpg", quality_score=85.0, embedding_path="f3.npy")
    ]
    for r in face_records:
        db_session.add(r)
    db_session.commit()

    # All embeddings are near-identical
    v = np.zeros(512)
    v[0] = 1.0

    monkeypatch.setattr(os.path, "exists", lambda path: True)
    monkeypatch.setattr(np, "load", lambda path: v)
    
    # Mock best image selection to avoid pose analysis in this test
    monkeypatch.setattr(face_clustering_service, "select_best_cluster_images", lambda db, cid: None)

    res = face_clustering_service.run_auto_clustering(db_session)
    assert res["clusters_created"] == 1
    
    # Verify records in database have been updated with the cluster label
    for face in db_session.query(UnknownFace).all():
        assert face.cluster_id == "cluster_0"
