from fastapi import FastAPI, Body
from typing import Optional
from recommendation.recommendation_agent import RecommendationAgent

app = FastAPI(title="recommendation-service")
agent = RecommendationAgent()


@app.post("/decide")
def decide(payload: Optional[dict] = Body(None)):
    """Accepts payload with `snapshot` and `impact` and returns a recommendation."""
    snapshot = (payload or {}).get("snapshot")
    impact = (payload or {}).get("impact")
    decision = agent.decide(market=snapshot, impact=impact)
    return decision
