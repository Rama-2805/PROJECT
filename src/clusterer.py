import numpy as np
try:
    import hdbscan
    HAS_HDBSCAN = True
except ImportError:
    HAS_HDBSCAN = False
    from sklearn.cluster import DBSCAN

class IdentityClusterer:
    def __init__(self, min_cluster_size=8, min_samples=3, metric="cosine"):
        self.min_cluster_size = min_cluster_size
        self.min_samples = min_samples
        self.metric = metric

    def cluster_embeddings(self, embeddings: np.ndarray) -> np.ndarray:
        if len(embeddings) == 0:
            return np.array([])

        if HAS_HDBSCAN:
            clusterer = hdbscan.HDBSCAN(
                min_cluster_size=self.min_cluster_size,
                min_samples=self.min_samples,
                metric="euclidean"
            )
            return clusterer.fit_predict(embeddings)
        else:
            db = DBSCAN(eps=0.38, min_samples=self.min_samples, metric="cosine")
            return db.fit_predict(embeddings)
