from typing import Optional

from episodic_memory.models import Episode
from episodic_memory.storage import PostgresStore, QdrantStore, Neo4jStore
from embeddings import EmbeddingGenerator
from similarity.weighted import WeightedSimilarity


class AnalogSearch:
    def __init__(
        self,
        postgres: PostgresStore,
        qdrant: QdrantStore,
        neo4j: Neo4jStore,
        embedding_generator: EmbeddingGenerator,
        weighted_similarity: WeightedSimilarity,
    ):
        self.postgres = postgres
        self.qdrant = qdrant
        self.neo4j = neo4j
        self.embedding_generator = embedding_generator
        self.weighted_similarity = weighted_similarity

    async def find_analogous(
        self,
        query_episode: Episode,
        top_k: int = 5,
        require_same_sector: bool = False,
        require_same_region: bool = False,
    ) -> list[dict]:
        embedding = (
            query_episode.embeddings
            or self.embedding_generator.encode_episode(query_episode)
        )

        vector_results = self.qdrant.search_similar(
            embedding=embedding, top_k=top_k * 3
        )

        analogies: list[dict] = []
        for episode_id, vec_score in vector_results:
            if episode_id == query_episode.id:
                continue

            candidate = await self.postgres.get_episode(episode_id)
            if not candidate:
                continue

            if require_same_sector:
                if not set(query_episode.sectors) & set(candidate.sectors):
                    continue
            if require_same_region:
                if not set(query_episode.locations) & set(candidate.locations):
                    continue

            breakdown = self.weighted_similarity.breakdown(query_episode, candidate)
            w_score = self.weighted_similarity.compute(query_episode, candidate)
            combined = 0.25 * vec_score + 0.75 * w_score

            analogies.append({
                "episode": candidate.dict_summary(),
                "similarity_score": combined,
                "vector_score": vec_score,
                "weighted_score": w_score,
                "breakdown": breakdown,
                "shared_sectors": list(
                    set(query_episode.sectors) & set(candidate.sectors)
                ),
                "shared_participants": [
                    p.name
                    for p in query_episode.participants
                    if p.name in {pp.name for pp in candidate.participants}
                ],
            })

        analogies.sort(key=lambda x: x["similarity_score"], reverse=True)
        return analogies[:top_k]

    async def find_by_query(
        self,
        query: str,
        locations: list[str] | None = None,
        sectors: list[str] | None = None,
        participants: list[str] | None = None,
        top_k: int = 5,
    ) -> list[dict]:
        query_embedding = self.embedding_generator.encode_text(query)

        vector_results = self.qdrant.search_similar(
            embedding=query_embedding, top_k=top_k * 3
        )

        results: list[dict] = []
        for episode_id, vec_score in vector_results:
            episode = await self.postgres.get_episode(episode_id)
            if not episode:
                continue

            if locations and not any(l in episode.locations for l in locations):
                continue
            if sectors and not any(s in episode.sectors for s in sectors):
                continue
            if participants:
                ep_names = {p.name for p in episode.participants}
                if not any(p in ep_names for p in participants):
                    continue

            results.append({
                "episode": episode.dict_summary(),
                "score": vec_score,
            })

        results.sort(key=lambda x: x["score"], reverse=True)
        return results[:top_k]
