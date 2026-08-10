from typing import Optional

from episodic_memory.models import Episode
from episodic_memory.storage import PostgresStore, QdrantStore
from embeddings import EmbeddingGenerator
from similarity.weighted import WeightedSimilarity


class SimilarityRetriever:
    def __init__(
        self,
        postgres: PostgresStore,
        qdrant: QdrantStore,
        embedding_generator: EmbeddingGenerator,
        weighted_similarity: WeightedSimilarity,
    ):
        self.postgres = postgres
        self.qdrant = qdrant
        self.embedding_generator = embedding_generator
        self.weighted_similarity = weighted_similarity

    async def find_similar(
        self,
        episode: Episode,
        top_k: int = 5,
        use_weighted: bool = True,
    ) -> list[tuple[Episode, float, Optional[dict]]]:
        embedding = (
            episode.embeddings
            or self.embedding_generator.encode_episode(episode)
        )

        vector_results = self.qdrant.search_similar(
            embedding=embedding, top_k=top_k * 2
        )

        results: list[tuple[Episode, float, Optional[dict]]] = []
        for episode_id, vec_score in vector_results:
            if episode_id == episode.id:
                continue
            candidate = await self.postgres.get_episode(episode_id)
            if not candidate:
                continue

            if use_weighted:
                breakdown = self.weighted_similarity.breakdown(episode, candidate)
                w_score = self.weighted_similarity.compute(episode, candidate)
                combined = 0.3 * vec_score + 0.7 * w_score
                results.append((candidate, combined, breakdown))
            else:
                results.append((candidate, vec_score, None))

        results.sort(key=lambda x: x[1], reverse=True)
        return results[:top_k]
