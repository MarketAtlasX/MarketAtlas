from collections import defaultdict
from datetime import datetime, timedelta
from typing import Any

import numpy as np


class EventClusterer:
    def __init__(
        self,
        eps: float = 0.35,
        min_samples: int = 2,
        time_window_hours: int = 72,
        text_weight: float = 0.7,
        time_weight: float = 0.3,
    ):
        self.eps = eps
        self.min_samples = min_samples
        self.time_window = timedelta(hours=time_window_hours)
        self.text_weight = text_weight
        self.time_weight = time_weight

    def cluster(
        self, articles: list[dict], embeddings: list[list[float]]
    ) -> dict[int, list[int]]:
        from sklearn.metrics.pairwise import cosine_similarity
        from sklearn.cluster import DBSCAN

        if len(articles) < self.min_samples:
            return {0: list(range(len(articles)))}

        sim_matrix = cosine_similarity(embeddings)

        base_times = self._normalize_timestamps(articles)
        time_sim = 1.0 - np.abs(np.subtract.outer(base_times, base_times))

        combined = self.text_weight * sim_matrix + self.time_weight * time_sim
        distance = 1.0 - combined
        distance = np.clip(distance, 0.0, 1.0)

        clustering = DBSCAN(
            eps=self.eps, min_samples=self.min_samples, metric="precomputed"
        ).fit(distance)

        clusters: dict[int, list[int]] = defaultdict(list)
        for i, label in enumerate(clustering.labels_):
            clusters[int(label)].append(i)

        return clusters

    def _normalize_timestamps(self, articles: list[dict]) -> np.ndarray:
        timestamps = []
        for art in articles:
            ts = art.get("published_at") or art.get("timestamp") or datetime.utcnow()
            if isinstance(ts, str):
                ts = datetime.fromisoformat(ts.replace("Z", "+00:00"))
            timestamps.append(ts.timestamp())
        arr = np.array(timestamps)
        if arr.max() == arr.min():
            return np.zeros_like(arr)
        return (arr - arr.min()) / (arr.max() - arr.min())

    def get_representative_article(
        self, articles: list[dict], indices: list[int], embeddings: list[list[float]]
    ) -> int:
        from sklearn.metrics.pairwise import cosine_similarity

        if len(indices) == 1:
            return indices[0]
        cluster_embs = [embeddings[i] for i in indices]
        centroid = np.mean(cluster_embs, axis=0)
        sims = cosine_similarity([centroid], cluster_embs)[0]
        return indices[int(np.argmax(sims))]
