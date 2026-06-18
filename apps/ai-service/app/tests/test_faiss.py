"""SmartCampus AI — FAISS Service Unit Tests."""

import os
import json
import pytest
import numpy as np
from unittest.mock import MagicMock
from app.services.faiss_service import faiss_service


@pytest.fixture(autouse=True)
def clean_faiss_files():
    """Ensure test FAISS files are cleaned up before and after each test."""
    paths = [faiss_service.index_path, faiss_service.metadata_path]
    for p in paths:
        if p.exists():
            os.remove(p)
    # Load fresh empty index
    faiss_service.load_index()
    yield
    for p in paths:
        if p.exists():
            try:
                os.remove(p)
            except Exception:
                pass


def test_faiss_add_and_search():
    """Test adding a student's embedding to the index and retrieving it via search."""
    usn = "1VI23CS001"
    
    # 512D unit vector (L2 normalized)
    emb = np.zeros(512, dtype=np.float32)
    emb[0] = 1.0

    # Assert search on empty index returns None
    match = faiss_service.search_face(emb, threshold=0.70)
    assert match is None

    # Add student
    faiss_service.add_student(usn, emb)
    assert faiss_service.index.ntotal == 1
    assert "0" in faiss_service.metadata
    assert faiss_service.metadata["0"] == usn

    # Query with exact match (cosine similarity = 1.0)
    match = faiss_service.search_face(emb, threshold=0.70)
    assert match is not None
    matched_usn, similarity = match
    assert matched_usn == usn
    assert similarity == 1.0

    # Query with non-match (cosine similarity = 0.0)
    query_not_matching = np.zeros(512, dtype=np.float32)
    query_not_matching[1] = 1.0
    match = faiss_service.search_face(query_not_matching, threshold=0.70)
    assert match is None


def test_faiss_rebuild():
    """Test rebuilding index from scratch with multiple records."""
    records = [
        ("1VI23CS001", np.eye(512)[0]),
        ("1VI23CS002", np.eye(512)[1]),
    ]
    
    faiss_service.rebuild_index(records)
    assert faiss_service.index.ntotal == 2
    assert faiss_service.metadata["0"] == "1VI23CS001"
    assert faiss_service.metadata["1"] == "1VI23CS002"
    
    # Search student 2
    query = np.eye(512)[1]
    match = faiss_service.search_face(query, threshold=0.80)
    assert match is not None
    assert match[0] == "1VI23CS002"
