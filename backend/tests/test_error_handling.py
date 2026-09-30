"""Tests for centralized error handling and typed exceptions."""
from app.utils.error_handling import (
    MarketAtlasError,
    ResourceNotFoundError,
    ValidationError,
    RateLimitExceededError,
    UpstreamServiceError,
    format_error_response,
)


def test_error_classes():
    err = ResourceNotFoundError("Symbol not found", details={"symbol": "XYZ"})
    assert err.status_code == 404
    assert err.error_code == "RESOURCE_NOT_FOUND"
    assert err.details == {"symbol": "XYZ"}


def test_format_error_response():
    err = ValidationError("Bad ticker format", details={"field": "ticker"})
    envelope = format_error_response(err)
    assert envelope["error"]["code"] == "VALIDATION_ERROR"
    assert envelope["error"]["message"] == "Bad ticker format"
    assert "timestamp" in envelope["error"]
