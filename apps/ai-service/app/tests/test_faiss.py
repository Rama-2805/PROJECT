import os
import sys
import time
import numpy as np

# Add apps/ai-service to path
sys.path.append("/Users/rama/Major project/PROJECT/apps/ai-service")

from app.services.faiss_service import faiss_service
from app.services.image_storage import image_storage

print("Total vectors in FAISS:", faiss_service.index.ntotal)
print("Metadata mapping:", faiss_service.metadata)

# Load Rama's embedding
usn = "RAMA123"
embedding_path = image_storage.embeddings_dir / f"{usn}.npy"
if not embedding_path.exists():
    print(f"Embedding file not found at: {embedding_path}")
    sys.exit(1)

embedding = np.load(embedding_path)
print("Loaded embedding shape:", embedding.shape)

# Run FAISS search
start_time = time.perf_counter()
result = faiss_service.search_face(embedding, threshold=0.70)
duration_ms = (time.perf_counter() - start_time) * 1000.0

if result:
    matched_usn, similarity = result
    print(f"\nFAISS Search SUCCESS:")
    print(f"  Matched USN: {matched_usn} (Expected: {usn})")
    print(f"  Similarity Score: {similarity:.4f}")
    print(f"  Search Latency: {duration_ms:.3f} ms")
else:
    print("\nFAISS Search FAILED: No match found.")

print("\nDone.")
