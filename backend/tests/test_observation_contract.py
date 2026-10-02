import uuid

import pytest
from httpx import AsyncClient
from pydantic import ValidationError

from app.core.enums import LiveEventType
from app.models.live_event import EventAffectedAsset, EventImpact
from app.schemas.live_event import LiveEventCreate
from app.schemas.observation import EvidenceObservation
from app.services.live_event_service import LiveEventService


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


@pytest.mark.asyncio
async def test_observation_binds_affected_assets_to_provider_backed_and_unavailable_markets(
    client: AsyncClient,
    db_session,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """The canonical observation owns the event→affected-asset→market link.

    A provider-backed quote is surfaced as `provider-backed` with the provider's
    value; an affected asset the provider could not price stays explicitly
    `unavailable`. No synthetic value is substituted for either, and a
    non-ticker asset name never becomes a market symbol.
    """
    service = LiveEventService(db_session)
    event = await service.create(LiveEventCreate(
        title="Foundry disruption in Taiwan",
        event_type=LiveEventType.GEOPOLITICAL,
        severity=6.0,
        source="gdelt",
        country_code="TW",
    ))

    impact_id = str(uuid.uuid4())
    db_session.add(EventImpact(
        id=impact_id,
        event_id=event.id,
        entity_name="TSMC",
        entity_type="company",
        analysis_summary="Foundry output constrained.",
    ))
    db_session.add_all([
        EventAffectedAsset(id=str(uuid.uuid4()), impact_id=impact_id, asset_type="stock", ticker="TSM", name="Taiwan Semiconductor"),
        EventAffectedAsset(id=str(uuid.uuid4()), impact_id=impact_id, asset_type="stock", ticker="XOM", name="Exxon Mobil"),
        EventAffectedAsset(id=str(uuid.uuid4()), impact_id=impact_id, asset_type="commodity", name="Brent Crude"),
    ])
    await db_session.commit()

    async def fake_quote(ticker: str):
        if ticker == "TSM":
            return {
                "symbol": "TSM",
                "price": 182.4,
                "change": 8.4,
                "change_percent": 4.8,
                "currency": "USD",
                "source": "yfinance",
                "observed_at": "2026-10-01T12:00:00+00:00",
            }
        return None

    monkeypatch.setattr("app.routes.live_events.get_stock_quote", fake_quote)

    response = await client.get("/api/v1/live-events/observation?query=Foundry")
    assert response.status_code == 200
    payload = response.json()

    assert payload["status"] == "live"
    markets = {item["symbol"]: item for item in payload["market_observations"]}

    # Provider-backed: the exact provider value, nothing synthesized.
    assert markets["TSM"]["status"] == "provider-backed"
    assert markets["TSM"]["price"] == 182.4
    assert markets["TSM"]["change_percent"] == 4.8
    assert markets["TSM"]["provider"] == "yfinance"
    assert markets["TSM"]["freshness"] == "current"
    assert markets["TSM"]["timestamp"]

    # Unavailable: explicit, and no fabricated price.
    assert markets["XOM"]["status"] == "unavailable"
    assert markets["XOM"]["price"] is None

    # A non-ticker asset name is never turned into a market symbol.
    assert "Brent Crude" not in markets

    assert payload["provider_status"]["market_data"] == "live"
