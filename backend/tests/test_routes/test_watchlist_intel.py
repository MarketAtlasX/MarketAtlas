"""Tests for the watchlist intelligence endpoints.

External market-data providers are monkeypatched so the tests are deterministic
and never depend on Alpha Vantage / yfinance.
"""

from datetime import datetime

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.entity import Entity
from app.models.event import Event
from app.models.event_entity import EventEntity
from app.models.live_event import LiveEvent
from app.models.user import User
from app.services.auth_service import create_access_token

WATCH_BASE = "/api/v1/profile/watchlist"


async def _make_user(db_session: AsyncSession, email: str) -> tuple[int, str]:
    user = User(email=email, hashed_password="unused", display_name=email.split("@")[0])
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user.id, create_access_token(user.id)


def _auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


async def _add(client: AsyncClient, token: str, **overrides) -> dict:
    payload = {
        "ticker": "XOM",
        "company_name": "Exxon Mobil",
        "asset_type": "stock",
        "target_price": 130.0,
        "stop_loss": 95.0,
    }
    payload.update(overrides)
    resp = await client.post(WATCH_BASE, json=payload, headers=_auth(token))
    assert resp.status_code == 201, resp.text
    return resp.json()


def _fake_quote(price: float, change: float, change_percent: float, previous_close: float):
    async def _quote(ticker: str):
        return {
            "symbol": ticker.upper(),
            "price": price,
            "change": change,
            "change_percent": change_percent,
            "previous_close": previous_close,
            "currency": "USD",
            "volume": 1000,
            "source": "test-provider",
            "observed_at": datetime.utcnow().isoformat(),
        }

    return _quote


# ---------------------------------------------------------------------------
# Validation
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_watchlist_rejects_invalid_ticker_and_asset_type(client: AsyncClient, db_session: AsyncSession):
    _, token = await _make_user(db_session, "invalid-watch@test.com")
    assert (await client.post(WATCH_BASE, json={"ticker": "bad ticker!"}, headers=_auth(token))).status_code == 422
    assert (await client.post(WATCH_BASE, json={"ticker": "XOM", "asset_type": "nft"}, headers=_auth(token))).status_code == 422
    assert (await client.post(WATCH_BASE, json={"ticker": "XOM", "target_price": -5}, headers=_auth(token))).status_code == 422


@pytest.mark.asyncio
async def test_watchlist_reactivates_instead_of_duplicating(client: AsyncClient, db_session: AsyncSession):
    _, token = await _make_user(db_session, "reactivate@test.com")
    item = await _add(client, token, ticker="XOM")

    deactivated = await client.patch(
        f"{WATCH_BASE}/{item['id']}", json={"is_active": False}, headers=_auth(token)
    )
    assert deactivated.status_code == 200

    again = await _add(client, token, ticker="xom", target_price=140.0)
    assert again["id"] == item["id"]
    assert again["is_active"] is True
    assert again["target_price"] == 140.0

    all_items = (
        await client.get(WATCH_BASE, params={"active_only": False}, headers=_auth(token))
    ).json()
    assert len(all_items) == 1


# ---------------------------------------------------------------------------
# Quotes / history
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_watchlist_quotes_provider_backed_and_unavailable(
    client: AsyncClient, db_session: AsyncSession, monkeypatch
):
    _, token = await _make_user(db_session, "quotes@test.com")
    await _add(client, token, ticker="XOM")

    import app.services.watchlist_service as svc

    async def _quote(ticker: str):
        if ticker.upper() == "XOM":
            return {
                "symbol": "XOM",
                "price": 120.5,
                "change": 2.5,
                "change_percent": 2.11,
                "previous_close": 118.0,
                "currency": "USD",
                "source": "test-provider",
                "observed_at": datetime.utcnow().isoformat(),
            }
        return None

    monkeypatch.setattr(svc, "get_stock_quote", _quote)

    resp = await client.get(f"{WATCH_BASE}/quotes", headers=_auth(token))
    assert resp.status_code == 200
    body = resp.json()
    assert len(body) == 1
    market = body[0]["market"]
    assert market["status"] == "provider-backed"
    assert market["price"] == 120.5
    assert market["provider"] == "test-provider"

    # Removing the quote yields an explicit unavailable envelope, never a price.
    await _add(client, token, ticker="AAPL", company_name="Apple")
    monkeypatch.setattr(svc, "get_stock_quote", lambda ticker: _none())
    resp = await client.get(f"{WATCH_BASE}/quotes", headers=_auth(token))
    unavailable = [row for row in resp.json() if row["ticker"] == "AAPL"][0]
    assert unavailable["market"]["status"] == "unavailable"
    assert unavailable["market"]["price"] is None


async def _none():
    return None


@pytest.mark.asyncio
async def test_watchlist_history(client: AsyncClient, db_session: AsyncSession, monkeypatch):
    _, token = await _make_user(db_session, "history@test.com")
    item = await _add(client, token, ticker="XOM")

    import app.services.watchlist_service as svc

    async def _history(ticker: str, interval: str = "daily", outputsize: str = "compact"):
        return [
            {"date": "2026-10-03", "close": 118.0, "provider": "test"},
            {"date": "2026-10-02", "close": 117.0, "provider": "test"},
        ]

    monkeypatch.setattr(svc, "get_price_history", _history)
    resp = await client.get(f"{WATCH_BASE}/{item['id']}/history", headers=_auth(token))
    assert resp.status_code == 200
    body = resp.json()
    assert body["status"] == "provider-backed"
    # Oldest-first for a sparkline.
    assert [p["close"] for p in body["points"]] == [117.0, 118.0]


# ---------------------------------------------------------------------------
# Evidence association
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_watchlist_evidence_recorded_link(client: AsyncClient, db_session: AsyncSession, monkeypatch):
    user_id, token = await _make_user(db_session, "evidence@test.com")
    item = await _add(client, token, ticker="XOM")

    entity = Entity(name="Exxon Mobil Corp", entity_type="company", ticker_symbols="XOM", country_code="US", latitude=29.7, longitude=-95.3)
    db_session.add(entity)
    await db_session.commit()
    await db_session.refresh(entity)

    event = Event(
        title="US sanctions reshape oil flows",
        description="New sanctions alter crude shipping routes.",
        event_type="sanction",
        severity="high",
        status="reported",
        event_date=datetime.utcnow(),
        source="Test Wire",
        source_url="https://example.com/oil",
    )
    db_session.add(event)
    await db_session.commit()
    await db_session.refresh(event)
    db_session.add(EventEntity(event_id=event.id, entity_id=entity.id))
    await db_session.commit()

    import app.services.watchlist_service as svc

    monkeypatch.setattr(svc, "get_stock_quote", _fake_quote(120.0, 1.0, 0.8, 119.0))

    resp = await client.get(f"{WATCH_BASE}/{item['id']}/evidence", headers=_auth(token))
    assert resp.status_code == 200
    body = resp.json()
    assert body["causality"] == "not_established"
    assert body["association_reliability"] == "recorded"
    assert "recorded_entity_link" in body["association_methods"]
    assert body["entity"]["name"] == "Exxon Mobil Corp"
    assert body["geography"]["source"] == "entity"
    assert len(body["events"]) == 1
    assert body["events"][0]["association"] == "recorded_entity_link"


@pytest.mark.asyncio
async def test_watchlist_evidence_candidate_keyword_match(client: AsyncClient, db_session: AsyncSession, monkeypatch):
    _, token = await _make_user(db_session, "candidate@test.com")
    item = await _add(client, token, ticker="ZQX")

    live = LiveEvent(
        title="ZQX supply disruption reported",
        description="Ports halt ZQX shipments.",
        event_type="geopolitical",
        severity=8.0,
        status="breaking",
        lat=1.2,
        lng=103.8,
        country_code="SG",
        region="Southeast Asia",
    )
    db_session.add(live)
    await db_session.commit()

    import app.services.watchlist_service as svc

    monkeypatch.setattr(svc, "get_stock_quote", _fake_quote(10.0, 0.1, 1.0, 9.9))
    resp = await client.get(f"{WATCH_BASE}/{item['id']}/evidence", headers=_auth(token))
    body = resp.json()
    assert body["association_reliability"] == "candidate"
    assert body["entity"] is None
    assert len(body["live_events"]) == 1
    assert body["geography"]["source"] == "live_event"
    assert any("Correlation is not causation" in note for note in body["uncertainty"])


@pytest.mark.asyncio
async def test_watchlist_evidence_none(client: AsyncClient, db_session: AsyncSession, monkeypatch):
    _, token = await _make_user(db_session, "noevidence@test.com")
    item = await _add(client, token, ticker="QQZZ")

    import app.services.watchlist_service as svc

    monkeypatch.setattr(svc, "get_stock_quote", _fake_quote(10.0, 0.0, 0.0, 10.0))
    resp = await client.get(f"{WATCH_BASE}/{item['id']}/evidence", headers=_auth(token))
    body = resp.json()
    assert body["association_reliability"] == "none"
    assert body["events"] == []
    assert body["live_events"] == []


# ---------------------------------------------------------------------------
# Alerts
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_alert_rule_validation_and_isolation(client: AsyncClient, db_session: AsyncSession):
    alice_id, alice = await _make_user(db_session, "alice-alerts@test.com")
    _, bob = await _make_user(db_session, "bob-alerts@test.com")
    item = await _add(client, alice, ticker="XOM")

    # threshold required for target_price
    bad = await client.post(f"{WATCH_BASE}/alerts", json={"watchlist_id": item["id"], "kind": "target_price"}, headers=_auth(alice))
    assert bad.status_code == 422
    # percent_move requires percent_threshold
    bad2 = await client.post(f"{WATCH_BASE}/alerts", json={"watchlist_id": item["id"], "kind": "percent_move"}, headers=_auth(alice))
    assert bad2.status_code == 422
    # cannot create a rule for another user's item
    assert (
        await client.post(
            f"{WATCH_BASE}/alerts",
            json={"watchlist_id": item["id"], "kind": "target_price", "threshold": 130},
            headers=_auth(bob),
        )
    ).status_code == 404

    created = await client.post(
        f"{WATCH_BASE}/alerts",
        json={"watchlist_id": item["id"], "kind": "target_price", "threshold": 130},
        headers=_auth(alice),
    )
    assert created.status_code == 201
    rule = created.json()
    assert rule["ticker"] == "XOM"

    listed = (await client.get(f"{WATCH_BASE}/alerts", headers=_auth(alice))).json()
    assert len(listed) == 1
    # Bob never sees Alice's rule.
    assert (await client.get(f"{WATCH_BASE}/alerts", headers=_auth(bob))).json() == []


@pytest.mark.asyncio
async def test_alert_evaluation_crossing_is_deduplicated(
    client: AsyncClient, db_session: AsyncSession, monkeypatch
):
    _, token = await _make_user(db_session, "eval@test.com")
    item = await _add(client, token, ticker="XOM")
    await client.post(
        f"{WATCH_BASE}/alerts",
        json={"watchlist_id": item["id"], "kind": "target_price", "threshold": 130, "cooldown_seconds": 900},
        headers=_auth(token),
    )

    import app.services.watchlist_service as svc

    # Previous close below the target, now above -> a genuine upward crossing.
    monkeypatch.setattr(svc, "get_stock_quote", _fake_quote(131.0, 2.0, 1.5, 129.0))

    first = (await client.post(f"{WATCH_BASE}/alerts/evaluate", headers=_auth(token))).json()
    assert len(first["triggered"]) == 1
    assert first["triggered"][0]["observed_price"] == 131.0
    assert "crossed" in first["triggered"][0]["message"]

    # A second evaluation while still above the threshold must not re-fire.
    second = (await client.post(f"{WATCH_BASE}/alerts/evaluate", headers=_auth(token))).json()
    assert second["triggered"] == []

    events = (await client.get(f"{WATCH_BASE}/alerts/events", headers=_auth(token))).json()
    assert len(events) == 1


@pytest.mark.asyncio
async def test_alert_evaluation_skips_unavailable_quotes(
    client: AsyncClient, db_session: AsyncSession, monkeypatch
):
    _, token = await _make_user(db_session, "stale@test.com")
    item = await _add(client, token, ticker="XOM")
    await client.post(
        f"{WATCH_BASE}/alerts",
        json={"watchlist_id": item["id"], "kind": "stop_loss", "threshold": 100},
        headers=_auth(token),
    )

    import app.services.watchlist_service as svc

    monkeypatch.setattr(svc, "get_stock_quote", lambda ticker: _none())
    resp = (await client.post(f"{WATCH_BASE}/alerts/evaluate", headers=_auth(token))).json()
    assert resp["triggered"] == []
    assert any("no_provider_quote" in entry for entry in resp["not_evaluable"])


@pytest.mark.asyncio
async def test_atlas_context_is_user_scoped_and_labelled(
    client: AsyncClient, db_session: AsyncSession, monkeypatch
):
    _, alice = await _make_user(db_session, "atlas-a@test.com")
    _, bob = await _make_user(db_session, "atlas-b@test.com")
    await _add(client, alice, ticker="XOM")

    import app.services.watchlist_service as svc

    monkeypatch.setattr(svc, "get_stock_quote", _fake_quote(120.0, 2.0, 1.7, 118.0))

    resp = await client.get(f"{WATCH_BASE}/atlas-context", headers=_auth(alice))
    assert resp.status_code == 200
    body = resp.json()
    assert body["total_tracked"] == 1
    assert body["causality"] == "not_established"
    assert body["assets"][0]["ticker"] == "XOM"
    assert body["assets"][0]["market"]["status"] == "provider-backed"

    # Bob's context never includes Alice's asset.
    bob_body = (await client.get(f"{WATCH_BASE}/atlas-context", headers=_auth(bob))).json()
    assert bob_body["total_tracked"] == 0
    assert bob_body["assets"] == []
