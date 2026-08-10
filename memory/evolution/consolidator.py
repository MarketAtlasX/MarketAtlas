from collections import defaultdict
from datetime import datetime, timedelta
from typing import Any, Optional

from episodic_memory.models import Episode
from similarity.weighted import WeightedSimilarity
from .merger import EpisodeMerger


class Consolidator:
    def __init__(
        self,
        similarity_threshold: float = 0.65,
        time_window_days: int = 90,
    ):
        self.threshold = similarity_threshold
        self.time_window = timedelta(days=time_window_days)
        self.similarity = WeightedSimilarity()
        self.merger = EpisodeMerger()

    def consolidate(
        self, episodes: list[Episode]
    ) -> list[Episode]:
        if len(episodes) < 2:
            return episodes

        clusters = self._find_clusters(episodes)
        consolidated: list[Episode] = []

        processed = set()
        for cluster in clusters:
            if len(cluster) == 1:
                idx = cluster[0]
                if idx not in processed:
                    consolidated.append(episodes[idx])
                    processed.add(idx)
            else:
                cluster_eps = [episodes[i] for i in cluster]
                meta = self.merger.merge(cluster_eps)
                consolidated.append(meta)
                for i in cluster:
                    processed.add(i)

        for i, ep in enumerate(episodes):
            if i not in processed:
                consolidated.append(ep)

        return consolidated

    def _find_clusters(
        self, episodes: list[Episode]
    ) -> list[list[int]]:
        n = len(episodes)
        remaining = set(range(n))
        clusters = []

        while remaining:
            seed = min(remaining)
            cluster = [seed]
            remaining.remove(seed)

            for i in list(remaining):
                if self._should_merge(episodes[seed], episodes[i]):
                    cluster.append(i)
                    remaining.remove(i)

            clusters.append(cluster)

        return clusters

    def _should_merge(
        self, a: Episode, b: Episode
    ) -> bool:
        if not self._within_time_window(a, b):
            return False

        similarity = self.similarity.compute(a, b)
        return similarity >= self.threshold

    def _within_time_window(self, a: Episode, b: Episode) -> bool:
        a_date = a.timeline.earliest() or a.created_at
        b_date = b.timeline.earliest() or b.created_at
        return abs((a_date - b_date).days) <= self.time_window.days
