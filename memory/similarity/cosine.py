import numpy as np


class CosineSimilarity:
    def compute(self, vec_a: list[float], vec_b: list[float]) -> float:
        a = np.asarray(vec_a, dtype=float)
        b = np.asarray(vec_b, dtype=float)

        if a.shape != b.shape:
            raise ValueError("Vectors must have the same shape")

        norm_a = np.linalg.norm(a)
        norm_b = np.linalg.norm(b)

        if norm_a == 0.0 and norm_b == 0.0:
            return 1.0
        if norm_a == 0.0 or norm_b == 0.0:
            return 0.0

        return float(np.dot(a, b) / (norm_a * norm_b))

    def compute_batch(
        self, query: list[float], candidates: list[list[float]]
    ) -> list[float]:
        if not candidates:
            return []

        q = np.asarray(query, dtype=float)
        c = np.asarray(candidates, dtype=float)

        if q.ndim != 1 or c.ndim != 2:
            raise ValueError("query must be 1D and candidates must be 2D")

        scores = []
        q_norm = np.linalg.norm(q)
        for candidate in c:
            cand_norm = np.linalg.norm(candidate)
            if q_norm == 0.0 and cand_norm == 0.0:
                scores.append(1.0)
            elif q_norm == 0.0 or cand_norm == 0.0:
                scores.append(0.0)
            else:
                scores.append(float(np.dot(q, candidate) / (q_norm * cand_norm)))
        return scores

    def rank(
        self,
        query: list[float],
        candidates: list[list[float]],
        ids: list[str],
    ) -> list[tuple[str, float]]:
        scores = self.compute_batch(query, candidates)
        paired = list(zip(ids, scores))
        paired.sort(key=lambda x: x[1], reverse=True)
        return paired
