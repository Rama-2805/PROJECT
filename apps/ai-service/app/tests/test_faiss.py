import os
import sys
import numpy as np
import pytest

# Add apps/ai-service to path
sys.path.append("/Users/rama/Major project/PROJECT/apps/ai-service")

from app.services.faiss_service import faiss_service

def test_faiss_search_flow(monkeypatch):
    """Test FAISS search flow with a mocked embedding query."""
    # Mock face search to return a successful match
    monkeypatch.setattr(faiss_service, "search_face", lambda embedding, threshold=0.7: ("RAMA123", 0.85))
    
    # Run mock search
    dummy_embedding = np.random.randn(512).astype(np.float32)
    result = faiss_service.search_face(dummy_embedding, threshold=0.70)
    
    assert result is not None
    matched_usn, similarity = result
    assert matched_usn == "RAMA123"
    assert similarity >= 0.70
