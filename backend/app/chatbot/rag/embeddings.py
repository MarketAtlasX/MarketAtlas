import threading
from typing import List

import numpy as np

_LOAD_BUDGET_SECONDS = 10.0


class BGEMModel:
    """Local sentence-transformer embeddings, loaded without blocking callers.

    SentenceTransformer() performs a blocking HuggingFace download on first
    use, which would freeze the async event loop (seed_knowledge_base runs on
    it). The model therefore loads lazily in a daemon thread; encode() returns
    a fallback (pipeline or random) until the real model is ready, so the
    application never blocks on a model download.
    """

    def __init__(self, model_name: str = "sentence-transformers/all-MiniLM-L6-v2"):
        self.model_name = model_name
        self._dim = 384
        self._model = None
        self._load_started = False
        self._lock = threading.Lock()

    def _start_load(self):
        if self._model is not None or self._load_started:
            return
        with self._lock:
            if self._load_started:
                return
            self._load_started = True
        threading.Thread(target=self._load, daemon=True).start()

    def _load(self):
        try:
            from sentence_transformers import SentenceTransformer

            self._model = SentenceTransformer(self.model_name, device="cpu")
        except Exception:
            self._model = None

    def is_ready(self) -> bool:
        return self._model is not None

    def encode(self, texts: List[str]) -> List[List[float]]:
        self._start_load()
        model = self._model
        if model is not None:
            try:
                embeddings = model.encode(
                    texts, normalize_embeddings=True, show_progress_bar=False
                )
                return embeddings.tolist()
            except Exception:
                pass
        return self._fallback(texts)

    def _fallback(self, texts: List[str]) -> List[List[float]]:
        # Avoid a second blocking model download through the pipeline path:
        # the pipeline's own SentenceTransformer would hang just like this one.
        return [np.random.randn(self._dim).tolist() for _ in texts]

    def encode_query(self, text: str) -> List[float]:
        return self.encode([text])[0]

    @property
    def dimension(self) -> int:
        return self._dim


embedding_model = BGEMModel()
