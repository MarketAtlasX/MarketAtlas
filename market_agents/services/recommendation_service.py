from __future__ import annotations

from market_agents.contracts import RecommendationRequest, RecommendationResponse
from market_agents.observability import traced_path
from market_agents.recommendation.recommendation_agent import RecommendationAgent
from market_agents.services.common import create_service_app

SERVICE_NAME = "recommendation-service"
app = create_service_app(SERVICE_NAME, "MarketAtlas Recommendation Service")


@app.post("/recommendation", response_model=RecommendationResponse)
def recommend(request: RecommendationRequest):
    with traced_path(SERVICE_NAME, "recommendation.decide"):
        decision = RecommendationAgent().decide(request.impact, request.market)
        return RecommendationResponse(**decision)
