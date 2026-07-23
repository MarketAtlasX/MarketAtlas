from __future__ import annotations

import logging
from typing import Any, List, Optional

import httpx

from rag.retrievers.base import BaseRetriever, RetrievalResult, RetrieverType

logger = logging.getLogger(__name__)

MEMORY_BASE_URL = "http://localhost:8010"


class MemoryRetriever(BaseRetriever):
    def __init__(self, base_url: str = MEMORY_BASE_URL) -> None:
        super().__init__(name="memory_retriever", retriever_type=RetrieverType.MEMORY)
        self.base_url = base_url.rstrip("/")

    async def retrieve(
        self,
        query: str,
        limit: int = 5,
        **kwargs: Any,
    ) -> List[RetrievalResult]:
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.get(
                    f"{self.base_url}/api/v1/memory/search",
                    params={"query": query, "limit": limit},
                )
                resp.raise_for_status()
                results = resp.json()
        except (httpx.TimeoutException, httpx.HTTPStatusError, httpx.RequestError) as e:
            logger.warning("Memory service unreachable: %s", e)
            return []

        if not isinstance(results, list):
            return []

        return [
            RetrievalResult(
                content=ep.get("summary", ""),
                score=ep.get("similarity_score", 0.0),
                source="memory",
                retriever_type=RetrieverType.MEMORY,
                metadata={
                    "episode_id": ep.get("id", ""),
                    "title": ep.get("title", ""),
                    "locations": ", ".join(ep.get("locations", [])),
                    "sectors": ", ".join(ep.get("sectors", [])),
                    "confidence": ep.get("confidence", 0.0),
                    "timestamp": ep.get("created_at", ""),
                },
                id=ep.get("id", ""),
            )
            for ep in results
        ]
