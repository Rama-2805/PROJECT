"""Clean FAISS Test/Mock Identities Script.
Extracts real student vectors (1VI23CS001, 1VI23CS002, 1VI23CS003, 1VI23CS004, 1VI23CS005),
removes all mock/test vectors, and saves a clean FAISS index and metadata.json to disk.
"""

import os
import sys
import json
import numpy as np
import faiss

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "apps", "ai-service"))

from app.services.faiss_service import faiss_service

def clean_faiss_index():
    print("=" * 80)
    print("FAISS INDEX CLEANUP — REMOVING MOCK/TEST CONTAMINATION")
    print("=" * 80)

    index_path = "vectors/face_index.faiss"
    metadata_path = "vectors/metadata.json"

    if not os.path.exists(index_path) or not os.path.exists(metadata_path):
        print("ERROR: FAISS index or metadata file missing!")
        return

    with open(metadata_path, "r") as f:
        meta = json.load(f)

    index = faiss.read_index(index_path)
    total_vectors = index.ntotal
    print(f"Loaded existing FAISS index with {total_vectors} vectors and {len(meta)} metadata entries.")

    real_vectors = []
    real_metadata = {}
    cleaned_count = 0
    removed_count = 0

    # Real student prefixes / USN patterns
    real_usns = {"1VI23CS001", "1VI23CS002", "1VI23CS003", "1VI23CS004", "1VI23CS005"}

    for idx_str, usn in meta.items():
        idx = int(idx_str)
        # Check if real student identity
        is_real = usn in real_usns or (usn.startswith("1VI") and len(usn) == 10 and "TEST" not in usn and "MOCK" not in usn)
        
        if is_real:
            # Reconstruct exact embedding vector from FAISS
            vec = np.zeros((1, 512), dtype=np.float32)
            index.reconstruct(idx, vec[0])
            
            # Normalize to ensure L2 norm = 1.000
            norm = np.linalg.norm(vec[0])
            if norm > 0:
                vec[0] /= norm

            new_idx_str = str(len(real_vectors))
            real_vectors.append(vec[0])
            real_metadata[new_idx_str] = usn
            cleaned_count += 1
        else:
            removed_count += 1

    # Rebuild new clean FAISS IndexFlatIP
    new_index = faiss.IndexFlatIP(512)
    if real_vectors:
        matrix = np.array(real_vectors, dtype=np.float32)
        new_index.add(matrix)

    # Save to disk
    faiss.write_index(new_index, index_path)
    with open(metadata_path, "w") as f:
        json.dump(real_metadata, f, indent=2)

    print(f"\nSuccessfully cleaned FAISS index:")
    print(f"  - Real Vectors Retained: {new_index.ntotal} vectors across {len(set(real_metadata.values()))} unique real USNs")
    print(f"  - Mock Vectors Removed:  {removed_count} vectors")
    print(f"  - Persisted Clean Files: {index_path} & {metadata_path}")
    print("=" * 80)

if __name__ == "__main__":
    clean_faiss_index()
