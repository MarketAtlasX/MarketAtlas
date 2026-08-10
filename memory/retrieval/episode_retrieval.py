from typing import Optional

from episodic_memory.models import Episode
from episodic_memory.storage import PostgresStore, QdrantStore
from embeddings import EmbeddingGenerator


class EpisodeRetrieval:
    def __init__(
        self,
        postgres: PostgresStore,
        qdrant: QdrantStore,
        embedding_generator: EmbeddingGenerator,
    ):
        self.postgres = postgres
        self.qdrant = qdrant
        self.embedding_generator = embedding_generator

    async def search(
        self,
        query: str,
        top_k: int = 10,
        score_threshold: float = 0.0,
        metadata_filters: Optional[dict] = None,
    ) -> list[tuple[Episode, float]]:
        query_embedding = self.embedding_generator.encode_text(query)
        results = self.qdrant.search_similar(
            embedding=query_embedding,
            top_k=top_k,
            score_threshold=score_threshold,
        )

        episodes = []
        for episode_id, score in results:
            episode = await self.postgres.get_episode(episode_id)
            if episode and self._passes_filters(episode, metadata_filters):
                episodes.append((episode, score))

        return episodes

    async def search_by_embedding(
        self,
        embedding: list[float],
        top_k: int = 10,
        score_threshold: float = 0.0,
    ) -> list[tuple[Episode, float]]:
        results = self.qdrant.search_similar(
            embedding=embedding,
            top_k=top_k,
            score_threshold=score_threshold,
        )

        episodes = []
        for episode_id, score in results:
            episode = await self.postgres.get_episode(episode_id)
            if episode:
                episodes.append((episode, score))

        return episodes

    async def search_by_metadata(
        self,
        locations: list[str] | None = None,
        sectors: list[str] | None = None,
        entities: list[str] | None = None,
        participants: list[str] | None = None,
        tags: list[str] | None = None,
        min_confidence: float = 0.0,
        limit: int = 50,
    ) -> list[Episode]:
        episodes = await self.postgres.search_by_metadata(
            locations=locations,
            sectors=sectors,
            entities=entities,
            participants=participants,
            tags=tags,
            min_confidence=min_confidence,
            limit=limit,
        )
        return episodes

    async def find_analogous(
        self,
        episode: Episode,
        top_k: int = 5,
    ) -> list[tuple[Episode, float]]:
        embedding = episode.embeddings or self.embedding_generator.encode_episode(episode)
        results = await self.search_by_embedding(
            embedding=embedding,
            top_k=top_k + 1,
            score_threshold=0.0,
        )
        return [(ep, score) for ep, score in results if ep.id != episode.id][:top_k]

    def _passes_filters(
        self, episode: Episode, filters: Optional[dict]
    ) -> bool:
        if not filters:
            return True
        for key, value in filters.items():
            if key == "locations":
                if not any(loc in episode.locations for loc in value):
                    return False
            elif key == "sectors":
                if not any(s in episode.sectors for s in value):
                    return False
            elif key == "entities":
                if not any(e in episode.entities for e in value):
                    return False
            elif key == "participants":
                participant_names = {p.name for p in episode.participants}
                if not any(p in participant_names for p in value):
                    return False
            elif key == "min_confidence":
                if episode.confidence < value:
                    return False
            elif key == "commodities":
                if not any(c in episode.commodities for c in value):
                    return False
        return True
