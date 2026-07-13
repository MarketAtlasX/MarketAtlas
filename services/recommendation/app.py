"""FastAPI microservice for the recommendation agent.

Provides a `/decide` endpoint that accepts market and impact data
and returns a BUY/SELL/HOLD recommendation.
"""
from fastapi import FastAPI, Body, HTTPException
from typing import Optional
from recommendation.recommendation_agent import RecommendationAgent

app = FastAPI(title="recommendation-service")
agent = RecommendationAgent()


@app.post("/decide")
def decide(payload: Optional[dict] = Body(None)):
    """Accepts payload with `snapshot` and `impact` and returns a recommendation.

    Expected payload shape:
        {"snapshot": {...}, "impact": {...}}
    Returns a dict with `action` (BUY/SELL/HOLD) and `reason`.
    """
    if payload is None:
        raise HTTPException(status_code=422, detail="Request body is required")
    snapshot = payload.get("snapshot")
    impact = payload.get("impact")
    if snapshot is None or impact is None:
        raise HTTPException(status_code=422, detail="Both 'snapshot' and 'impact' fields are required")
    try:
        decision = agent.decide(market=snapshot, impact=impact)
        return decision
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"decision failed: {exc}")
