"""Tests for API rate limiting configurations."""
from app.utils.rate_limits import (
    DEFAULT_RATE_LIMITS,
    get_rate_limit,
    RateLimitConfig,
)


def test_default_rate_limits():
    assert "quotes" in DEFAULT_RATE_LIMITS
    assert "predict" in DEFAULT_RATE_LIMITS
    assert DEFAULT_RATE_LIMITS["predict"].requests_per_minute <= DEFAULT_RATE_LIMITS["quotes"].requests_per_minute


def test_get_rate_limit():
    rl = get_rate_limit("quotes")
    assert isinstance(rl, RateLimitConfig)
    assert rl.requests_per_minute > 0

    fallback = get_rate_limit("unknown_endpoint")
    assert fallback.requests_per_minute == 60
