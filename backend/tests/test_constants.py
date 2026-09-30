"""Tests for application constants and configuration limits."""
from app.constants import (
    API_VERSION,
    CACHE_TTL_QUOTES,
    CACHE_TTL_HISTORY,
    DEFAULT_PAGE_SIZE,
    MAX_PAGE_SIZE,
)


def test_constants_values():
    assert API_VERSION == "v1"
    assert CACHE_TTL_QUOTES > 0
    assert CACHE_TTL_HISTORY >= CACHE_TTL_QUOTES
    assert DEFAULT_PAGE_SIZE <= MAX_PAGE_SIZE
    assert MAX_PAGE_SIZE == 100
