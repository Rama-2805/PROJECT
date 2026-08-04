import numpy as np

class DuplicateRemover:
    def __init__(self, phash_thresh=8, cosine_thresh=0.85):
        self.phash_thresh = phash_thresh
        self.cosine_thresh = cosine_thresh

    def is_duplicate_online(self, candidate: dict, existing_embeddings: list, existing_phashes: list) -> bool:
        if not existing_embeddings:
            return False

        cand_emb = candidate.get("embedding")
        if cand_emb is not None and len(existing_embeddings) > 0:
            cand_norm = cand_emb / (np.linalg.norm(cand_emb) + 1e-10)
            for emb in existing_embeddings:
                emb_norm = emb / (np.linalg.norm(emb) + 1e-10)
                sim = float(np.dot(cand_norm, emb_norm))
                if sim >= self.cosine_thresh:
                    return True
        return False
