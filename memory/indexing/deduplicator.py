from hashlib import sha256
from typing import Any

import numpy as np


class Deduplicator:
    def __init__(self, similarity_threshold: float = 0.92):
        self.threshold = similarity_threshold
        self._seen_fingerprints: set[str] = set()
        self._seen_embeddings: list[list[float]] = []
        self._seen_indices: list[int] = []

    def is_duplicate(self, article: dict, embedding: list[float]) -> bool:
        from sklearn.metrics.pairwise import cosine_similarity

        fp = self._fingerprint(article)
        if fp in self._seen_fingerprints:
            return True

        if self._seen_embeddings:
            sims = cosine_similarity([embedding], self._seen_embeddings)[0]
            if float(np.max(sims)) >= self.threshold:
                return True

        return False

    def deduplicate(
        self, articles: list[dict], embeddings: list[list[float]]
    ) -> tuple[list[dict], list[list[float]], list[int]]:
        from sklearn.metrics.pairwise import cosine_similarity

        unique_indices: list[int] = []
        seen_fps: set[str] = set()

        for i, (art, emb) in enumerate(zip(articles, embeddings)):
            fp = self._fingerprint(art)
            if fp in seen_fps:
                continue

            if unique_indices:
                existing_embs = [embeddings[j] for j in unique_indices]
                sims = cosine_similarity([emb], existing_embs)[0]
                if float(np.max(sims)) >= self.threshold:
                    continue

            unique_indices.append(i)
            seen_fps.add(fp)

        return (
            [articles[i] for i in unique_indices],
            [embeddings[i] for i in unique_indices],
            unique_indices,
        )

    def _fingerprint(self, article: dict) -> str:
        url = article.get("url") or ""
        title = (article.get("title") or "")[:200]
        raw = url + "::" + title
        return sha256(raw.encode()).hexdigest()

    def reset(self) -> None:
        self._seen_fingerprints.clear()
        self._seen_embeddings.clear()
        self._seen_indices.clear()
