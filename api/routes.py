from datetime import datetime
from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException, Query

from .dependencies import get_memory_service
from .memory_service import MemoryService
from episodic_memory.models import Episode

router = APIRouter(prefix="/api/v1/memory", tags=["memory"])


@router.get("/health")
async def health():
    return {"status": "ok", "timestamp": datetime.utcnow().isoformat()}


# --- Episode CRUD ---

@router.post("/episodes", response_model=dict)
async def create_episode(
    articles: list[dict],
    cluster_id: Optional[str] = None,
    memory: MemoryService = Depends(get_memory_service),
):
    episode = await memory.create_episode(articles, cluster_id)
    return episode.model_dump()


@router.get("/episodes/{episode_id}", response_model=dict)
async def get_episode(
    episode_id: str,
    memory: MemoryService = Depends(get_memory_service),
):
    episode = await memory.get_episode(episode_id)
    if not episode:
        raise HTTPException(status_code=404, detail="Episode not found")
    return episode.model_dump()


@router.get("/episodes", response_model=list[dict])
async def list_episodes(
    limit: int = Query(default=20, le=100),
    offset: int = Query(default=0, ge=0),
    memory: MemoryService = Depends(get_memory_service),
):
    episodes = await memory.list_recent(limit=limit, offset=offset)
    return [e.model_dump() for e in episodes]


@router.put("/episodes/{episode_id}", response_model=dict)
async def update_episode(
    episode_id: str,
    articles: list[dict],
    memory: MemoryService = Depends(get_memory_service),
):
    episode = await memory.update_episode(episode_id, articles)
    if not episode:
        raise HTTPException(status_code=404, detail="Episode not found")
    return episode.model_dump()


@router.delete("/episodes/{episode_id}")
async def delete_episode(
    episode_id: str,
    memory: MemoryService = Depends(get_memory_service),
):
    deleted = await memory.delete_episode(episode_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Episode not found")
    return {"status": "deleted", "id": episode_id}


# --- Search ---

@router.get("/search", response_model=list[dict])
async def search_episodes(
    query: str = Query(..., min_length=1),
    top_k: int = Query(default=10, le=50),
    memory: MemoryService = Depends(get_memory_service),
):
    results = await memory.search(query=query, top_k=top_k)
    return [
        {"episode": ep.model_dump(), "score": score}
        for ep, score in results
    ]


@router.get("/search/hybrid", response_model=list[dict])
async def hybrid_search(
    query: str = Query(..., min_length=1),
    top_k: int = Query(default=10, le=50),
    memory: MemoryService = Depends(get_memory_service),
):
    results = await memory.hybrid_search(query=query, top_k=top_k)
    return [
        {"episode": ep.model_dump(), "score": score, "details": details}
        for ep, score, details in results
    ]


@router.get("/search/metadata", response_model=list[dict])
async def search_by_metadata(
    locations: Optional[str] = Query(default=None),
    sectors: Optional[str] = Query(default=None),
    entities: Optional[str] = Query(default=None),
    participants: Optional[str] = Query(default=None),
    tags: Optional[str] = Query(default=None),
    limit: int = Query(default=50, le=200),
    memory: MemoryService = Depends(get_memory_service),
):
    filters = {}
    if locations:
        filters["locations"] = locations.split(",")
    if sectors:
        filters["sectors"] = sectors.split(",")
    if entities:
        filters["entities"] = entities.split(",")
    if participants:
        filters["participants"] = participants.split(",")
    if tags:
        filters["tags"] = tags.split(",")

    results = await memory.search_by_metadata(**filters, limit=limit)
    return [ep.model_dump() for ep in results]


# --- Similarity ---

@router.get("/similar/{episode_id}", response_model=list[dict])
async def find_similar(
    episode_id: str,
    top_k: int = Query(default=5, le=20),
    memory: MemoryService = Depends(get_memory_service),
):
    results = await memory.find_similar(episode_id, top_k=top_k)
    return [
        {
            "episode": ep.dict_summary(),
            "score": score,
            "breakdown": breakdown,
        }
        for ep, score, breakdown in results
    ]


@router.get("/analogous/{episode_id}", response_model=list[dict])
async def find_analogous(
    episode_id: str,
    top_k: int = Query(default=5, le=20),
    memory: MemoryService = Depends(get_memory_service),
):
    results = await memory.find_analogous(episode_id, top_k=top_k)
    return results


# --- Outcomes ---

@router.post("/outcomes/{episode_id}", response_model=dict)
async def record_outcome(
    episode_id: str,
    category: str = Query(...),
    metric: str = Query(...),
    value: float = Query(...),
    unit: str = "",
    direction: str = "neutral",
    memory: MemoryService = Depends(get_memory_service),
):
    outcome = await memory.record_outcome(
        episode_id, category, metric, value, unit, direction
    )
    if not outcome:
        raise HTTPException(status_code=404, detail="Episode not found")
    return outcome.model_dump()


@router.get("/outcomes/{episode_id}", response_model=dict)
async def get_outcomes(
    episode_id: str,
    memory: MemoryService = Depends(get_memory_service),
):
    summary = await memory.get_outcomes(episode_id)
    if summary is None:
        raise HTTPException(status_code=404, detail="Episode not found")
    return summary


@router.post("/outcomes/analyze", response_model=dict)
async def analyze_outcomes(
    episode_ids: list[str],
    memory: MemoryService = Depends(get_memory_service),
):
    return await memory.analyze_outcomes(episode_ids)


# --- Lessons ---

@router.post("/lessons/{episode_id}/generate", response_model=list[str])
async def generate_lessons(
    episode_id: str,
    memory: MemoryService = Depends(get_memory_service),
):
    lessons = await memory.generate_lessons(episode_id)
    if lessons is None:
        raise HTTPException(status_code=404, detail="Episode not found")
    return lessons


@router.get("/lessons/{episode_id}", response_model=list[str])
async def get_lessons(
    episode_id: str,
    memory: MemoryService = Depends(get_memory_service),
):
    lessons = await memory.get_lessons(episode_id)
    if lessons is None:
        raise HTTPException(status_code=404, detail="Episode not found")
    return lessons


# --- Consolidation ---

@router.post("/consolidate", response_model=dict)
async def consolidate(
    episode_ids: list[str],
    memory: MemoryService = Depends(get_memory_service),
):
    meta = await memory.consolidate(episode_ids)
    if not meta:
        raise HTTPException(status_code=400, detail="No valid episodes found")
    return meta.model_dump()


@router.post("/consolidate/auto", response_model=list[dict])
async def auto_consolidate(
    limit: int = Query(default=100, le=500),
    memory: MemoryService = Depends(get_memory_service),
):
    metas = await memory.auto_consolidate(limit=limit)
    return [m.model_dump() for m in metas]


# --- Timeline ---

@router.get("/timeline/{episode_id}", response_model=dict)
async def get_timeline(
    episode_id: str,
    memory: MemoryService = Depends(get_memory_service),
):
    timeline = await memory.get_timeline(episode_id)
    if timeline is None:
        raise HTTPException(status_code=404, detail="Episode not found")
    return timeline


# --- Confidence ---

@router.get("/confidence/{episode_id}", response_model=dict)
async def estimate_confidence(
    episode_id: str,
    memory: MemoryService = Depends(get_memory_service),
):
    score = await memory.estimate_confidence(episode_id)
    if score is None:
        raise HTTPException(status_code=404, detail="Episode not found")
    return {"episode_id": episode_id, "confidence": score}


# --- Semantic Memory ---

@router.get("/facts", response_model=list[dict])
async def query_facts(
    subject: Optional[str] = None,
    predicate: Optional[str] = None,
    object: Optional[str] = None,
    memory: MemoryService = Depends(get_memory_service),
):
    facts = memory.query_facts(
        subject=subject, predicate=predicate, object=object
    )
    return [f.model_dump() for f in facts]


# --- Procedural Memory ---

@router.get("/procedures", response_model=list[dict])
async def get_procedures(
    category: Optional[str] = None,
    memory: MemoryService = Depends(get_memory_service),
):
    procedures = memory.get_procedures(category=category)
    return [p.model_dump() for p in procedures]


# --- Stats ---

@router.get("/stats", response_model=dict)
async def memory_stats(
    memory: MemoryService = Depends(get_memory_service),
):
    episodes = await memory.postgres.list_recent(limit=10000)
    return {
        "total_episodes": len(episodes),
        "total_embeddings": memory.qdrant.count() if hasattr(memory.qdrant, '_client') and memory.qdrant._client else 0,
        "total_facts": memory.semantic_store.count(),
        "total_procedures": memory.procedural_store.count(),
        "avg_confidence": (
            sum(e.confidence for e in episodes) / len(episodes)
            if episodes else 0
        ),
    }
