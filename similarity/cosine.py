import numpy as np


class CosineSimilarity:
    def compute(self, vec_a: list[float], vec_b: list[float]) -> float:
        from sklearn.metrics.pairwise import cosine_similarity as sklearn_cosine

        a = np.array(vec_a).reshape(1, -1)
        b = np.array(vec_b).reshape(1, -1)
        return float(sklearn_cosine(a, b)[0][0])

    def compute_batch(
        self, query: list[float], candidates: list[list[float]]
    ) -> list[float]:
        from sklearn.metrics.pairwise import cosine_similarity as sklearn_cosine

        q = np.array(query).reshape(1, -1)
        c = np.array(candidates)
        scores = sklearn_cosine(q, c)[0]
        return scores.tolist()

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
