from typing import Optional


class QdrantStore:
    def __init__(
        self,
        url: Optional[str] = None,
        collection: Optional[str] = None,
        vector_size: int = 384,
    ):
        from config import settings

        self.url = url or settings.qdrant_url
        self.collection = collection or settings.qdrant_collection
        self.vector_size = vector_size
        self._client = None

    @property
    def client(self):
        if self._client is None:
            from qdrant_client import QdrantClient
            self._client = QdrantClient(url=self.url)
        return self._client

    def initialize(self):
        from qdrant_client.http.models import Distance, VectorParams

        collections = self.client.get_collections().collections
        existing = {c.name for c in collections}
        if self.collection not in existing:
            self.client.create_collection(
                collection_name=self.collection,
                vectors_config=VectorParams(
                    size=self.vector_size, distance=Distance.COSINE
                ),
            )

    def store_embedding(self, episode_id: str, embedding: list[float]) -> None:
        from qdrant_client.http.models import PointStruct

        point = PointStruct(
            id=self._hash_id(episode_id),
            vector=embedding,
            payload={"episode_id": episode_id},
        )
        self.client.upsert(collection_name=self.collection, points=[point])

    def store_embeddings_batch(self, episodes, embeddings: list[list[float]]) -> None:
        from qdrant_client.http.models import PointStruct

        points = [
            PointStruct(
                id=self._hash_id(ep.id),
                vector=emb,
                payload={
                    "episode_id": ep.id,
                    "title": ep.title[:100],
                    "sectors": ep.sectors,
                    "locations": ep.locations[:5],
                    "confidence": ep.confidence,
                },
            )
            for ep, emb in zip(episodes, embeddings)
        ]
        self.client.upsert(collection_name=self.collection, points=points)

    def search_similar(
        self,
        embedding: list[float],
        top_k: int = 10,
        score_threshold: float = 0.0,
    ) -> list[tuple[str, float]]:
        results = self.client.search(
            collection_name=self.collection,
            query_vector=embedding,
            limit=top_k,
            score_threshold=score_threshold,
        )
        return [(hit.payload["episode_id"], hit.score) for hit in results]

    def delete_embedding(self, episode_id: str) -> None:
        from qdrant_client.http import models

        self.client.delete(
            collection_name=self.collection,
            points_selector=models.PointIdsList(
                points=[self._hash_id(episode_id)]
            ),
        )

    def count(self) -> int:
        return self.client.count(collection_name=self.collection).count

    def _hash_id(self, episode_id: str) -> int:
        return abs(hash(episode_id)) % (2**63)
