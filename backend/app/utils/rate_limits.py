"""Rate limiting configuration for MarketAtlas API endpoints."""
from __future__ import annotations

from dataclasses import dataclass
from typing import Dict


@dataclass(frozen=True)
class RateLimitConfig:
    """Configuration for a rate-limited endpoint."""
    requests_per_minute: int
    burst_size: int
    cooldown_seconds: float = 1.0


RATE_LIMITS: Dict[str, RateLimitConfig] = {
    'prediction': RateLimitConfig(requests_per_minute=10, burst_size=3, cooldown_seconds=2.0),
    'market_data': RateLimitConfig(requests_per_minute=60, burst_size=15, cooldown_seconds=0.5),
    'causal_graph': RateLimitConfig(requests_per_minute=20, burst_size=5, cooldown_seconds=1.5),
    'analysis': RateLimitConfig(requests_per_minute=15, burst_size=4, cooldown_seconds=1.0),
    'health': RateLimitConfig(requests_per_minute=120, burst_size=30, cooldown_seconds=0.1),
}


def get_rate_limit(endpoint_category: str) -> RateLimitConfig:
    """Get rate limit config for an endpoint category."""
    return RATE_LIMITS.get(endpoint_category, RateLimitConfig(requests_per_minute=30, burst_size=10))
