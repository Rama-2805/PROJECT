"""SmartCampus AI — Face Clustering Service.

Automatically groups face embeddings from the same person
across thousands of frames using HDBSCAN clustering.
"""

import numpy as np
from typing import List, Dict, Optional, Tuple
from sklearn.preprocessing import StandardScaler
from ..config.settings import settings
from ..models.enrollment import FaceCluster, FaceEmbedding


class FaceClusteringService:
    """Clusters face embeddings to identify unique students."""

    def __init__(self):
        self.min_cluster_size = settings.min_cluster_size
        self.min_samples = settings.min_samples
        self.cluster_selection_epsilon = settings.cluster_selection_epsilon

    def cluster_embeddings(
        self, embeddings: List[FaceEmbedding]
    ) -> Tuple[Dict[int, List[FaceEmbedding]], List[FaceCluster]]:
        """Group face embeddings into clusters representing unique students.

        Args:
            embeddings: List of face embeddings from the video

        Returns:
            Tuple of (cluster_mapping, cluster_summaries)
        """
        if len(embeddings) < self.min_cluster_size:
            # Not enough samples to cluster — return as noise
            return {}, []

        # Extract embedding vectors
        vectors = np.array([emb.embedding for emb in embeddings])

        # Normalize embeddings for better clustering
        scaler = StandardScaler()
        vectors_scaled = scaler.fit_transform(vectors)

        try:
            import hdbscan

            clusterer = hdbscan.HDBSCAN(
                min_cluster_size=self.min_cluster_size,
                min_samples=self.min_samples,
                cluster_selection_epsilon=self.cluster_selection_epsilon,
                cluster_selection_method="eom",
                metric="euclidean",
                core_dist_n_jobs=1,
            )
            labels = clusterer.fit_predict(vectors_scaled)

        except ImportError:
            # Fallback to DBSCAN if HDBSCAN is not available
            from sklearn.cluster import DBSCAN

            clusterer = DBSCAN(
                eps=self.cluster_selection_epsilon,
                min_samples=self.min_samples,
                metric="cosine",
                n_jobs=-1,
            )
            labels = clusterer.fit_predict(vectors)

        # Group embeddings by cluster label
        clusters: Dict[int, List[FaceEmbedding]] = {}
        for label, emb in zip(labels, embeddings):
            if label == -1:
                continue  # Skip noise points
            if label not in clusters:
                clusters[label] = []
            clusters[label].append(emb)

        # Create cluster summaries
        cluster_summaries = []
        for label, cluster_embs in clusters.items():
            if len(cluster_embs) < self.min_cluster_size:
                continue

            quality_scores = [e.quality_score for e in cluster_embs]
            avg_quality = float(np.mean(quality_scores))

            # Find representative embedding (highest quality)
            best_idx = int(np.argmax(quality_scores))
            representative = cluster_embs[best_idx]

            cluster_summaries.append(
                FaceCluster(
                    cluster_id=f"CLUSTER_{label:03d}",
                    job_id="",
                    sample_count=len(cluster_embs),
                    quality_score=round(avg_quality, 3),
                    representative_face=representative.thumbnail_path,
                    thumbnail_paths=[e.thumbnail_path for e in cluster_embs if e.thumbnail_path],
                    status="UNASSIGNED",
                )
            )

        # Sort by quality score (descending)
        cluster_summaries.sort(key=lambda c: c.quality_score, reverse=True)

        return clusters, cluster_summaries

    def find_similar_clusters(
        self,
        clusters: Dict[int, List[FaceEmbedding]],
        threshold: float = 0.85,
    ) -> List[Tuple[int, int, float]]:
        """Find clusters that are similar enough to be merged.

        Returns:
            List of (cluster_a_id, cluster_b_id, similarity) tuples
        """
        similar_pairs = []
        cluster_ids = list(clusters.keys())

        for i in range(len(cluster_ids)):
            for j in range(i + 1, len(cluster_ids)):
                cid_a = cluster_ids[i]
                cid_b = cluster_ids[j]

                # Compare centroid embeddings
                centroid_a = np.mean(
                    [e.embedding for e in clusters[cid_a]], axis=0
                )
                centroid_b = np.mean(
                    [e.embedding for e in clusters[cid_b]], axis=0
                )

                norm_a = np.linalg.norm(centroid_a)
                norm_b = np.linalg.norm(centroid_b)

                if norm_a == 0 or norm_b == 0:
                    continue

                similarity = float(np.dot(centroid_a, centroid_b) / (norm_a * norm_b))
                similarity = max(0.0, (similarity + 1) / 2)

                if similarity >= threshold:
                    similar_pairs.append((cid_a, cid_b, similarity))

        return sorted(similar_pairs, key=lambda x: x[2], reverse=True)

    def compute_cluster_confidence(
        self, cluster: List[FaceEmbedding]
    ) -> float:
        """Compute confidence score for a cluster's identity.

        Confidence is based on:
        - Number of samples (more = better)
        - Quality score consistency (consistent = better)
        - Internal similarity (tight cluster = better)
        """
        if len(cluster) < 2:
            return 0.0

        quality_scores = [e.quality_score for e in cluster]
        avg_quality = np.mean(quality_scores)

        # Size score: 0 to 1, logarithmic scale
        size_score = min(1.0, np.log10(len(cluster)) / np.log10(100))

        # Consistency: lower std = more consistent
        quality_std = np.std(quality_scores) if len(quality_scores) > 1 else 0
        consistency_score = max(0.0, 1.0 - quality_std * 2)

        # Internal similarity
        vectors = np.array([e.embedding for e in cluster])
        centroid = np.mean(vectors, axis=0)
        similarities = []
        for vec in vectors:
            norm_product = np.linalg.norm(vec) * np.linalg.norm(centroid)
            if norm_product > 0:
                sim = np.dot(vec, centroid) / norm_product
                similarities.append(max(0.0, (sim + 1) / 2))

        avg_similarity = np.mean(similarities) if similarities else 0

        confidence = (
            size_score * 0.3
            + avg_quality * 0.3
            + consistency_score * 0.2
            + avg_similarity * 0.2
        )

        return round(float(confidence), 3)
