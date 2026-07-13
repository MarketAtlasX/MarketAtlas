"""FastAPI microservice for the recommendation agent.

Provides a `/decide` endpoint that accepts market and impact data
and returns a BUY/SELL/HOLD recommendation.
"""
from fastapi import FastAPI, Body
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
    snapshot = (payload or {}).get("snapshot")
    impact = (payload or {}).get("impact")
    decision = agent.decide(market=snapshot, impact=impact)
    return decision
