from typing import Optional

from episodic_memory.models import Episode
from episodic_memory.storage import PostgresStore, QdrantStore, Neo4jStore
from embeddings import EmbeddingGenerator
from similarity.weighted import WeightedSimilarity


class HybridRetriever:
    def __init__(
        self,
        postgres: PostgresStore,
        qdrant: QdrantStore,
        neo4j: Neo4jStore,
        embedding_generator: EmbeddingGenerator,
        similarity: WeightedSimilarity,
    ):
        self.postgres = postgres
        self.qdrant = qdrant
        self.neo4j = neo4j
        self.embedding_generator = embedding_generator
        self.similarity = similarity

    async def search(
        self,
        query: str,
        top_k: int = 10,
        entity_expand: bool = True,
    ) -> list[tuple[Episode, float, dict]]:
        query_embedding = self.embedding_generator.encode_text(query)

        vector_results = self.qdrant.search_similar(
            embedding=query_embedding, top_k=top_k
        )

        candidates: list[tuple[Episode, float, dict]] = []
        for episode_id, vec_score in vector_results:
            episode = await self.postgres.get_episode(episode_id)
            if not episode:
                continue

            details = {"vector_score": vec_score, "graph_score": 0.0, "final": vec_score}

            if entity_expand:
                related = await self.neo4j.get_related_episodes(episode_id, max_depth=1)
                graph_score = min(1.0, len(related) / 10.0)
                details["graph_score"] = graph_score
                details["final"] = 0.7 * vec_score + 0.3 * graph_score

            candidates.append((episode, details["final"], details))

        candidates.sort(key=lambda x: x[1], reverse=True)
        return candidates[:top_k]

    async def search_by_episode(
        self,
        query_episode: Episode,
        top_k: int = 5,
    ) -> list[tuple[Episode, float, dict]]:
        query_embedding = (
            query_episode.embeddings
            or self.embedding_generator.encode_episode(query_episode)
        )

        vector_results = self.qdrant.search_similar(
            embedding=query_embedding, top_k=top_k * 3
        )

        scored: list[tuple[Episode, float]] = []
        for episode_id, vec_score in vector_results:
            if episode_id == query_episode.id:
                continue
            episode = await self.postgres.get_episode(episode_id)
            if not episode:
                continue

            weighted = self.similarity.compute(query_episode, episode)
            combined = 0.4 * vec_score + 0.6 * weighted
            scored.append((episode, combined))

        scored.sort(key=lambda x: x[1], reverse=True)
        return [(ep, score, {"final": score}) for ep, score in scored[:top_k]]
