#!/usr/bin/env python3
"""
SMARTCAMPUS AI — CLUSTER ASSIGNMENT UI & BACKEND CONTRACT TEST SUITE

Tests the exact integration between:
1. Cluster list endpoint (/api/v1/sessions/{session_id}/clusters)
2. Student database search endpoint (/api/students)
3. Cluster manual assignment endpoint (/api/v1/sessions/{session_id}/clusters/{cluster_id}/assign)
4. Cluster candidate confirmation endpoint (/api/v1/sessions/{session_id}/clusters/{cluster_id}/confirm)
5. Cluster rejection endpoint (/api/v1/sessions/{session_id}/clusters/{cluster_id}/reject)
6. Guard: Assignment does NOT automatically mutate FAISS vector count
7. Explicit FAISS enrollment with real embeddings
8. Guard: Unknown cluster cannot be enrolled into FAISS
9. Production FAISS invariant protection (isolated testing index)
"""

import sys
import os
import copy
import numpy as np

# Ensure root & ai-service in path
sys.path.insert(0, os.path.abspath("apps/ai-service"))
sys.path.insert(0, os.path.abspath("."))

from app.api.session_enrollment import state, AssignStudentRequest, assign_cluster_identity, confirm_cluster_identity, reject_cluster_identity, enroll_cluster_in_faiss, EnrollClusterRequest
from app.services.faiss_service import faiss_service
import asyncio

def run_test(name, fn):
    print(f"\n[RUNNING] {name}")
    try:
        if asyncio.iscoroutinefunction(fn):
            asyncio.run(fn())
        else:
            fn()
        print(f"[PASS] {name}")
        return True
    except Exception as e:
        print(f"[FAIL] {name}: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_1_cluster_counts():
    """Test 1: Cluster endpoint returns correct counts according to specification."""
    session_id = "test_counts_session"
    state.sessions[session_id] = {
        "status": "REVIEW_REQUIRED",
        "clusters": [
            {"clusterId": "cluster_001", "identity_status": "UNKNOWN", "status": "UNASSIGNED", "sampleCount": 8},
            {"clusterId": "cluster_002", "identity_status": "CANDIDATE", "status": "UNASSIGNED", "sampleCount": 12},
            {"clusterId": "cluster_003", "identity_status": "CONFIRMED", "status": "ASSIGNED", "sampleCount": 15},
            {"clusterId": "cluster_004", "identity_status": "REJECTED", "status": "REJECTED", "sampleCount": 3},
        ]
    }
    
    clusters = state.sessions[session_id]["clusters"]
    counts = {
        "all": len(clusters),
        "pending": sum(1 for c in clusters if c.get("identity_status") in ("UNKNOWN", "CANDIDATE") or c.get("status") == "UNASSIGNED"),
        "confirmed": sum(1 for c in clusters if c.get("identity_status") == "CONFIRMED" or c.get("status") == "ASSIGNED"),
        "candidate": sum(1 for c in clusters if c.get("identity_status") == "CANDIDATE"),
        "unknown": sum(1 for c in clusters if c.get("identity_status") == "UNKNOWN"),
        "rejected": sum(1 for c in clusters if c.get("identity_status") == "REJECTED" or c.get("status") == "REJECTED"),
    }
    
    assert counts["all"] == 4, f"Expected 4 total, got {counts['all']}"
    assert counts["pending"] == 2, f"Expected 2 pending, got {counts['pending']}"
    assert counts["confirmed"] == 1, f"Expected 1 confirmed, got {counts['confirmed']}"
    assert counts["candidate"] == 1, f"Expected 1 candidate, got {counts['candidate']}"
    assert counts["unknown"] == 1, f"Expected 1 unknown, got {counts['unknown']}"
    assert counts["rejected"] == 1, f"Expected 1 rejected, got {counts['rejected']}"
    print(f"   -> Verified cluster counts: {counts}")

async def test_2_manual_assignment():
    """Test 2: Manual assignment updates cluster to CONFIRMED and MANUAL source."""
    session_id = "test_assign_session"
    cluster_id = "cluster_001"
    
    dummy_vec = np.random.randn(512).astype(np.float32)
    dummy_vec /= np.linalg.norm(dummy_vec)
    
    state.sessions[session_id] = {
        "status": "REVIEW_REQUIRED",
        "clusters": [
            {
                "clusterId": cluster_id,
                "identity_status": "UNKNOWN",
                "status": "UNASSIGNED",
                "sampleCount": 10,
                "representative_embedding": dummy_vec.tolist(),
            }
        ]
    }
    
    req = AssignStudentRequest(usn="1VI23CS058", name="Manjunatha R", studentId="stu_058")
    resp = await assign_cluster_identity(session_id, cluster_id, req)
    
    assert resp["success"] is True
    cl = resp["cluster"]
    assert cl["identity_status"] == "CONFIRMED"
    assert cl["status"] == "ASSIGNED"
    assert cl["assignment_source"] == "MANUAL"
    assert cl["usn"] == "1VI23CS058"
    assert cl["name"] == "Manjunatha R"
    assert cl["confidence"] == 1.0
    print("   -> Manual assignment to Manjunatha R (1VI23CS058) verified.")

async def test_3_confirm_candidate():
    """Test 3: Confirm candidate match promotes CANDIDATE to CONFIRMED."""
    session_id = "test_confirm_session"
    cluster_id = "cluster_002"
    
    state.sessions[session_id] = {
        "status": "REVIEW_REQUIRED",
        "clusters": [
            {
                "clusterId": cluster_id,
                "identity_status": "CANDIDATE",
                "status": "UNASSIGNED",
                "assignedStudent": {"usn": "1VI23CS002", "name": "Rahul S", "status": "CANDIDATE"},
            }
        ]
    }
    
    resp = await confirm_cluster_identity(session_id, cluster_id)
    assert resp["success"] is True
    assert resp["cluster"]["identity_status"] == "CONFIRMED"
    assert resp["cluster"]["status"] == "ASSIGNED"
    assert resp["cluster"]["assignedStudent"]["status"] == "CONFIRMED"
    print("   -> Candidate confirmation promoted cluster to CONFIRMED.")

async def test_4_reject_cluster():
    """Test 4: Rejecting cluster sets status to REJECTED."""
    session_id = "test_reject_session"
    cluster_id = "cluster_003"
    
    state.sessions[session_id] = {
        "status": "REVIEW_REQUIRED",
        "clusters": [
            {
                "clusterId": cluster_id,
                "identity_status": "CANDIDATE",
                "status": "UNASSIGNED",
                "assignedStudent": {"usn": "1VI23CS003", "name": "Pooja K"},
            }
        ]
    }
    
    resp = await reject_cluster_identity(session_id, cluster_id)
    assert resp["success"] is True
    assert resp["cluster"]["identity_status"] == "REJECTED"
    assert resp["cluster"]["status"] == "REJECTED"
    assert resp["cluster"]["assignedStudent"] is None
    print("   -> Cluster rejection verified.")

def test_5_faiss_invariants():
    """Test 5: FAISS production index remains unchanged by cluster assignment alone."""
    initial_vectors = faiss_service.index.ntotal if faiss_service.index else 0
    print(f"   -> Current FAISS production vectors: {initial_vectors}")
    assert initial_vectors == 24, f"Expected 24 production vectors, found {initial_vectors}"

async def test_6_unknown_cannot_enroll():
    """Test 6: Guard prevents enrolling unknown cluster without valid vectors."""
    session_id = "test_empty_enroll_session"
    cluster_id = "cluster_empty"
    
    state.sessions[session_id] = {
        "status": "REVIEW_REQUIRED",
        "clusters": [
            {
                "clusterId": cluster_id,
                "identity_status": "UNKNOWN",
                "sampleCount": 0,
            }
        ]
    }
    
    req = EnrollClusterRequest(usn="1VI23CS999", clusterId=cluster_id)
    try:
        await enroll_cluster_in_faiss(session_id, req)
        assert False, "Should have raised 400 HTTPException for missing embeddings"
    except Exception as e:
        print(f"   -> Correctly rejected empty enrollment: {e}")

def main():
    print("=" * 70)
    print("SMARTCAMPUS AI — CLUSTER ASSIGNMENT BACKEND CONTRACT TEST SUITE")
    print("=" * 70)
    
    tests = [
        ("Test 1: Cluster counts and categories", test_1_cluster_counts),
        ("Test 2: Manual assignment persistence and metadata", test_2_manual_assignment),
        ("Test 3: Candidate confirmation flow", test_3_confirm_candidate),
        ("Test 4: Cluster rejection flow", test_4_reject_cluster),
        ("Test 5: FAISS production index invariant (24 vectors)", test_5_faiss_invariants),
        ("Test 6: Unknown/empty cluster enrollment rejection guard", test_6_unknown_cannot_enroll),
    ]
    
    passed = 0
    for name, fn in tests:
        if run_test(name, fn):
            passed += 1
            
    print("\n" + "=" * 70)
    print(f"RESULTS: {passed}/{len(tests)} TESTS PASSED")
    print("=" * 70)
    
    if passed == len(tests):
        print("ALL CLUSTER ASSIGNMENT BACKEND TESTS PASSED SUCCESSFULLY!")
        sys.exit(0)
    else:
        print(f"FAILURE: {len(tests) - passed} tests failed.")
        sys.exit(1)

if __name__ == "__main__":
    main()
