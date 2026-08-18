"""FAISS Index Identity Audit Script.
Inspects vectors/metadata.json and vectors/face_index.faiss to categorize all enrolled identities.
"""

import os
import sys
import json
from collections import Counter

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "apps", "ai-service"))

from app.services.faiss_service import faiss_service

def audit_faiss_identities():
    metadata_path = "vectors/metadata.json"
    index_path = "vectors/face_index.faiss"

    if not os.path.exists(metadata_path):
        print(f"ERROR: {metadata_path} not found!")
        return

    with open(metadata_path, "r") as f:
        meta = json.load(f)

    # Count vectors per identity (usn/student_id)
    vector_counts = Counter(meta.values())
    total_vectors = len(meta)
    total_identities = len(vector_counts)

    print("=" * 80)
    print("FAISS INDEX IDENTITY AUDIT")
    print("=" * 80)
    print(f"Total Vectors in FAISS Index: {total_vectors}")
    print(f"Total Unique Student IDs:    {total_identities}\n")

    print(f"{'STUDENT ID / USN':<30} | {'VECTORS':<8} | {'TYPE':<12} | {'ACTION':<25}")
    print("-" * 80)

    real_identities = []
    mock_identities = []

    for usn, count in sorted(vector_counts.items()):
        # Categorize
        if usn in ["1VI23CS001", "1VI23CS002", "1VI23CS003", "1VI23CS004"]:
            id_type = "REAL"
            action = "KEEP (Real Student)"
            real_identities.append(usn)
        elif usn.startswith("MOCK_USN_") or usn.startswith("STUDENT_") or usn.startswith("USN_TEST") or "TEST" in usn:
            id_type = "TEST / MOCK"
            action = "REMOVE (Test Contamination)"
            mock_identities.append(usn)
        else:
            # Check if looks like valid USN (e.g. 1VI...)
            if len(usn) == 10 and usn[:3].isalnum():
                id_type = "REAL?"
                action = "VERIFY / KEEP"
                real_identities.append(usn)
            else:
                id_type = "UNKNOWN/TEST"
                action = "REVIEW"
                mock_identities.append(usn)

        print(f"{usn:<30} | {count:<8} | {id_type:<12} | {action:<25}")

    print("=" * 80)
    print(f"Real Enrolled Students Identified:  {len(real_identities)} ({sum(vector_counts[u] for u in real_identities)} vectors)")
    print(f"Test / Mock Identities Identified: {len(mock_identities)} ({sum(vector_counts[u] for u in mock_identities)} vectors)")
    print("=" * 80)

if __name__ == "__main__":
    audit_faiss_identities()
