from __future__ import annotations

import os

import httpx
import pybreaker
from fastapi import Request
from slowapi import Limiter
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from slowapi.util import get_remote_address
from starlette.responses import JSONResponse

from market_agents.contracts import AnalysisRequest, AnalysisResponse, ImpactResponse, MarketSnapshot, RecommendationResponse
from market_agents.observability import traced_path
from market_agents.services.common import create_service_app

SERVICE_NAME = "gateway-service"
MARKET_URL = os.environ.get("MARKET_SERVICE_URL", "http://127.0.0.1:8001")
IMPACT_URL = os.environ.get("IMPACT_SERVICE_URL", "http://127.0.0.1:8002")
RECOMMENDATION_URL = os.environ.get("RECOMMENDATION_SERVICE_URL", "http://127.0.0.1:8003")

limiter = Limiter(key_func=get_remote_address, default_limits=[os.environ.get("RATE_LIMIT", "60/minute")])
market_breaker = pybreaker.CircuitBreaker(fail_max=3, reset_timeout=30, name="market-data")
impact_breaker = pybreaker.CircuitBreaker(fail_max=3, reset_timeout=30, name="impact")
recommendation_breaker = pybreaker.CircuitBreaker(fail_max=3, reset_timeout=30, name="recommendation")

app = create_service_app(SERVICE_NAME, "MarketAtlas Gateway")
app.state.limiter = limiter
app.add_middleware(SlowAPIMiddleware)


@app.exception_handler(RateLimitExceeded)
def rate_limit_handler(request: Request, exc: RateLimitExceeded):
    return JSONResponse({"detail": "rate limit exceeded"}, status_code=429)


def _post_json(url: str, payload: dict, breaker: pybreaker.CircuitBreaker) -> dict:
    def send() -> dict:
        with httpx.Client(timeout=15.0) as client:
            response = client.post(url, json=payload)
        response.raise_for_status()
        return response.json()

    return breaker.call(send)


@app.post("/analyze", response_model=AnalysisResponse)
@limiter.limit(os.environ.get("ANALYZE_RATE_LIMIT", "30/minute"))
def analyze(request: Request, payload: AnalysisRequest):
    with traced_path(SERVICE_NAME, "gateway.analyze"):
        market = _post_json(
            f"{MARKET_URL}/snapshot",
            {"prices": payload.prices, "volumes": payload.volumes},
            market_breaker,
        )
        impact = _post_json(
            f"{IMPACT_URL}/impact",
            {"text": payload.text},
            impact_breaker,
        )
        recommendation = _post_json(
            f"{RECOMMENDATION_URL}/recommendation",
            {"impact": impact, "market": market},
            recommendation_breaker,
        )
        return AnalysisResponse(
            snapshot=MarketSnapshot(**market),
            impact=ImpactResponse(**impact),
            recommendation=RecommendationResponse(**recommendation),
        )
