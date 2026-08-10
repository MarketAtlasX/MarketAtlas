import numpy as np
from typing import Optional

from config import settings
from episodic_memory.models import Episode


class EmbeddingGenerator:
    def __init__(self, model_name: Optional[str] = None):
        self.model_name = model_name or settings.embedding_model
        self._model = None
        self.dimension = settings.embedding_dim

    @property
    def model(self):
        if self._model is None:
            from sentence_transformers import SentenceTransformer
            self._model = SentenceTransformer(self.model_name)
        return self._model

    def encode_text(self, text: str) -> list[float]:
        emb = self.model.encode(text, normalize_embeddings=True)
        return emb.tolist()

    def encode_batch(self, texts: list[str]) -> list[list[float]]:
        embs = self.model.encode(texts, normalize_embeddings=True)
        return [e.tolist() for e in embs]

    def encode_episode(self, episode: Episode) -> list[float]:
        text = episode.to_embedding_text()
        return self.encode_text(text)

    def encode_episodes_batch(self, episodes: list[Episode]) -> list[list[float]]:
        texts = [ep.to_embedding_text() for ep in episodes]
        return self.encode_batch(texts)

    def encode_weighted(
        self,
        summary: str = "",
        entities: list[str] | None = None,
        sectors: list[str] | None = None,
        timeline: str = "",
        summary_weight: float = 0.4,
        entities_weight: float = 0.25,
        sectors_weight: float = 0.2,
        timeline_weight: float = 0.15,
    ) -> list[float]:
        dim = self.dimension
        combined = np.zeros(dim)

        if summary:
            combined += summary_weight * np.array(self.encode_text(summary))
        if entities:
            text = " ".join(entities)
            if text.strip():
                combined += entities_weight * np.array(self.encode_text(text))
        if sectors:
            text = " ".join(sectors)
            if text.strip():
                combined += sectors_weight * np.array(self.encode_text(text))
        if timeline:
            combined += timeline_weight * np.array(self.encode_text(timeline))

        norm = np.linalg.norm(combined)
        if norm > 0:
            combined = combined / norm

        return combined.tolist()
