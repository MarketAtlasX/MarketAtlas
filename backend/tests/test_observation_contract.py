import pytest
from httpx import AsyncClient
from pydantic import ValidationError

from app.schemas.observation import EvidenceObservation


def test_observation_preserves_provenance_and_provider_status() -> None:
    observation = EvidenceObservation.model_validate({
        "status": "live",
        "query": "Taiwan",
        "freshness": "current",
        "entities": ["TSMC"],
        "countries": ["TW"],
        "assets": ["TSMC"],
        "market_observations": [{
            "status": "provider-backed",
            "symbol": "TSMC",
            "price": 180.5,
            "provider": "yfinance",
            "freshness": "current",
        }],
        "provenance": {
            "provider": "GDELT",
            "observed_at": "2026-10-01T00:00:00Z",
            "confidence": 0.81,
            "references": ["event:123"],
        },
        "provider_status": {"events": "live", "market_data": "live"},
    })

    assert observation.status == "live"
    assert observation.provenance.provider == "GDELT"
    assert observation.market_observations[0].status == "provider-backed"
    assert observation.provider_status["market_data"] == "live"


def test_observation_can_explicitly_represent_unavailable_data() -> None:
    observation = EvidenceObservation(
        status="unavailable",
        provider_status={"events": "unavailable", "market_data": "unavailable"},
        uncertainty=["No provider-backed record matched the query."],
    )

    assert observation.event is None
    assert observation.confidence is None
    assert observation.limitations == []


def test_observation_rejects_legacy_status_values() -> None:
    with pytest.raises(ValidationError):
        EvidenceObservation(status="historical")


@pytest.mark.asyncio
async def test_observation_endpoint_reports_unavailable_without_fabrication(client: AsyncClient) -> None:
    response = await client.get("/api/v1/live-events/observation?query=does-not-exist")

    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] == "unavailable"
    assert payload["event"] is None
    assert payload["confidence"] is None
    assert payload["provider_status"]["events"] == "unavailable"
