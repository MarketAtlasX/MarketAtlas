"""Tests for the in-app alert notification lifecycle and scheduler health."""

from datetime import datetime

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User
from app.services.auth_service import create_access_token

BASE = "/api/v1/profile/watchlist"


async def _user(db_session: AsyncSession, email: str) -> str:
    user = User(email=email, hashed_password="x", display_name=email.split("@")[0])
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return create_access_token(user.id)


def _auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


def _crossing_quote():
    async def _get(ticker: str):
        return {
            "symbol": ticker.upper(),
            "price": 131.0,
            "change": 2.0,
            "change_percent": 1.5,
            "previous_close": 129.0,
            "currency": "USD",
            "source": "test-provider",
            "observed_at": datetime.utcnow().isoformat(),
        }

    return _get


async def _make_triggered_alert(client: AsyncClient, token: str, monkeypatch) -> dict:
    item = (
        await client.post(
            BASE,
            json={"ticker": "XOM", "asset_type": "stock"},
            headers=_auth(token),
        )
    ).json()
    await client.post(
        f"{BASE}/alerts",
        json={"watchlist_id": item["id"], "kind": "target_price", "threshold": 130},
        headers=_auth(token),
    )
    import app.services.watchlist_service as svc

    monkeypatch.setattr(svc, "get_stock_quote", _crossing_quote())
    await client.post(f"{BASE}/alerts/evaluate", headers=_auth(token))
    events = (await client.get(f"{BASE}/alerts/events", headers=_auth(token))).json()
    assert len(events) == 1
    return events[0]


@pytest.mark.asyncio
async def test_events_start_unread_and_can_be_read(
    client: AsyncClient, db_session: AsyncSession, monkeypatch
):
    token = await _user(db_session, "notify@test.com")
    event = await _make_triggered_alert(client, token, monkeypatch)
    assert event["is_read"] is False

    count = (await client.get(f"{BASE}/alerts/unread-count", headers=_auth(token))).json()
    assert count["count"] == 1

    read = await client.post(f"{BASE}/alerts/events/{event['id']}/read", headers=_auth(token))
    assert read.status_code == 200
    assert read.json()["is_read"] is True

    # Idempotent: reading again keeps it read.
    again = await client.post(f"{BASE}/alerts/events/{event['id']}/read", headers=_auth(token))
    assert again.status_code == 200
    assert (await client.get(f"{BASE}/alerts/unread-count", headers=_auth(token))).json()["count"] == 0


@pytest.mark.asyncio
async def test_read_all_and_unread_filter(client: AsyncClient, db_session: AsyncSession, monkeypatch):
    token = await _user(db_session, "readall@test.com")
    await _make_triggered_alert(client, token, monkeypatch)

    unread = (
        await client.get(f"{BASE}/alerts/events", params={"unread_only": True}, headers=_auth(token))
    ).json()
    assert len(unread) == 1

    marked = await client.post(f"{BASE}/alerts/events/read-all", headers=_auth(token))
    assert marked.status_code == 200
    assert marked.json()["marked"] == 1
    assert (
        await client.get(f"{BASE}/alerts/events", params={"unread_only": True}, headers=_auth(token))
    ).json() == []


@pytest.mark.asyncio
async def test_alert_events_are_user_isolated(client: AsyncClient, db_session: AsyncSession, monkeypatch):
    alice = await _user(db_session, "alice-notify@test.com")
    bob = await _user(db_session, "bob-notify@test.com")
    event = await _make_triggered_alert(client, alice, monkeypatch)

    assert (await client.get(f"{BASE}/alerts/events", headers=_auth(bob))).json() == []
    assert (await client.get(f"{BASE}/alerts/unread-count", headers=_auth(bob))).json()["count"] == 0
    # Bob cannot mark Alice's event read.
    assert (
        await client.post(f"{BASE}/alerts/events/{event['id']}/read", headers=_auth(bob))
    ).status_code == 404


@pytest.mark.asyncio
async def test_scheduler_health_endpoint(client: AsyncClient, db_session: AsyncSession):
    token = await _user(db_session, "health@test.com")
    assert (await client.get(f"{BASE}/alerts/scheduler")).status_code == 401

    body = (await client.get(f"{BASE}/alerts/scheduler", headers=_auth(token))).json()
    assert body["schedule_minutes"] >= 1
    assert body["lock_ttl_seconds"] >= 1
    assert body["is_running"] is False
