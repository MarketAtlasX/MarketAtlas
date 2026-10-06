"""Tests for the profile, trades and watchlist endpoints (auth-guarded, user-isolated)."""

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User
from app.services.auth_service import create_access_token


async def _make_user(db_session: AsyncSession, email: str) -> str:
    """Create a user directly in the DB and return a JWT for them."""
    user = User(
        email=email,
        hashed_password="unused-in-tests",
        display_name=email.split("@")[0],
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return create_access_token(user.id)


def _auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


def _trade_payload(**overrides) -> dict:
    payload = {
        "ticker": "NVDA",
        "company_name": "NVIDIA Corp",
        "trade_type": "normal",
        "action": "buy",
        "quantity": 10.0,
        "price_per_share": 100.0,
        "total_amount": 1000.0,
    }
    payload.update(overrides)
    return payload


def _watch_payload(**overrides) -> dict:
    payload = {
        "ticker": "XOM",
        "company_name": "Exxon Mobil",
        "asset_type": "stock",
        "target_price": 130.0,
        "stop_loss": 95.0,
    }
    payload.update(overrides)
    return payload


# ---------------------------------------------------------------------------
# Profile
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_profile_requires_auth(client: AsyncClient):
    assert (await client.get("/api/v1/profile/me")).status_code == 401
    assert (await client.get("/api/v1/profile/summary")).status_code == 401


@pytest.mark.asyncio
async def test_get_and_update_profile(client: AsyncClient, db_session: AsyncSession):
    token = await _make_user(db_session, "profile@test.com")

    resp = await client.get("/api/v1/profile/me", headers=_auth(token))
    assert resp.status_code == 200
    data = resp.json()
    assert data["email"] == "profile@test.com"
    assert data["total_invested"] == 0.0
    assert data["total_earned"] == 0.0
    assert data["withdrawable_balance"] == 0.0

    # Rename is a JSON body, not a query parameter.
    resp = await client.patch(
        "/api/v1/profile/me", json={"display_name": "Operator One"}, headers=_auth(token)
    )
    assert resp.status_code == 200
    assert resp.json()["display_name"] == "Operator One"


# ---------------------------------------------------------------------------
# Trades + summary
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_summary_is_empty_for_new_user(client: AsyncClient, db_session: AsyncSession):
    token = await _make_user(db_session, "empty@test.com")
    resp = await client.get("/api/v1/profile/summary", headers=_auth(token))
    assert resp.status_code == 200
    body = resp.json()
    assert body == {
        "total_invested": 0.0,
        "total_earned": 0.0,
        "total_value": 0.0,
        "total_profit_loss": 0.0,
        "total_profit_loss_percent": 0.0,
        "realised_profit_loss": 0.0,
        "withdrawable_balance": 0.0,
        "open_trades_count": 0,
        "closed_trades_count": 0,
    }


@pytest.mark.asyncio
async def test_create_trade_and_list(client: AsyncClient, db_session: AsyncSession):
    token = await _make_user(db_session, "trader@test.com")

    resp = await client.post("/api/v1/profile/trades", json=_trade_payload(), headers=_auth(token))
    assert resp.status_code == 201
    trade = resp.json()
    assert trade["ticker"] == "NVDA"
    assert trade["status"] == "open"
    assert trade["trade_type"] == "normal"
    assert trade["current_value"] == 1000.0

    # Tickers are normalised to upper case on write.
    resp = await client.post(
        "/api/v1/profile/trades",
        json=_trade_payload(ticker="aapl", trade_type="intraday"),
        headers=_auth(token),
    )
    assert resp.status_code == 201
    assert resp.json()["ticker"] == "AAPL"

    listed = await client.get("/api/v1/profile/trades", headers=_auth(token))
    assert listed.status_code == 200
    assert len(listed.json()) == 2

    intraday = await client.get(
        "/api/v1/profile/trades", params={"trade_type": "intraday"}, headers=_auth(token)
    )
    assert [t["ticker"] for t in intraday.json()] == ["AAPL"]


@pytest.mark.asyncio
async def test_summary_tracks_invested_and_earned(client: AsyncClient, db_session: AsyncSession):
    token = await _make_user(db_session, "money@test.com")

    await client.post("/api/v1/profile/trades", json=_trade_payload(), headers=_auth(token))
    await client.post(
        "/api/v1/profile/trades",
        json=_trade_payload(ticker="NVDA", action="sell", quantity=5.0, total_amount=600.0),
        headers=_auth(token),
    )

    resp = await client.get("/api/v1/profile/summary", headers=_auth(token))
    body = resp.json()
    assert body["total_invested"] == 1000.0
    assert body["total_earned"] == 600.0
    assert body["total_value"] == 1000.0
    assert body["total_profit_loss"] == 0.0
    # The open sell is not a held position, so only the buy counts.
    assert body["open_trades_count"] == 1
    assert body["realised_profit_loss"] == 0.0


@pytest.mark.asyncio
async def test_close_trade_realises_profit(client: AsyncClient, db_session: AsyncSession):
    token = await _make_user(db_session, "closer@test.com")
    created = await client.post(
        "/api/v1/profile/trades", json=_trade_payload(), headers=_auth(token)
    )
    trade_id = created.json()["id"]

    resp = await client.patch(
        f"/api/v1/profile/trades/{trade_id}",
        json={"current_price": 110.0, "status": "closed"},
        headers=_auth(token),
    )
    assert resp.status_code == 200
    trade = resp.json()
    assert trade["status"] == "closed"
    assert trade["current_value"] == 1100.0
    assert trade["profit_loss"] == 100.0
    assert trade["profit_loss_percent"] == 10.0

    summary = (await client.get("/api/v1/profile/summary", headers=_auth(token))).json()
    assert summary["open_trades_count"] == 0
    assert summary["closed_trades_count"] == 1
    assert summary["total_value"] == 0.0
    assert summary["total_profit_loss"] == 0.0
    assert summary["realised_profit_loss"] == 100.0
    assert summary["withdrawable_balance"] == 100.0


@pytest.mark.asyncio
async def test_delete_trade(client: AsyncClient, db_session: AsyncSession):
    token = await _make_user(db_session, "deleter@test.com")
    created = await client.post(
        "/api/v1/profile/trades", json=_trade_payload(), headers=_auth(token)
    )
    trade_id = created.json()["id"]

    resp = await client.delete(f"/api/v1/profile/trades/{trade_id}", headers=_auth(token))
    assert resp.status_code == 204

    fetched = await client.get(f"/api/v1/profile/trades/{trade_id}", headers=_auth(token))
    assert fetched.status_code == 404
    summary = (await client.get("/api/v1/profile/summary", headers=_auth(token))).json()
    assert summary["total_invested"] == 0.0
    assert summary["open_trades_count"] == 0


@pytest.mark.asyncio
async def test_trades_are_user_isolated(client: AsyncClient, db_session: AsyncSession):
    alice = await _make_user(db_session, "alice-trades@test.com")
    bob = await _make_user(db_session, "bob-trades@test.com")

    created = await client.post(
        "/api/v1/profile/trades", json=_trade_payload(), headers=_auth(alice)
    )
    trade_id = created.json()["id"]

    assert (
        await client.get(f"/api/v1/profile/trades/{trade_id}", headers=_auth(bob))
    ).status_code == 404
    assert (
        await client.delete(f"/api/v1/profile/trades/{trade_id}", headers=_auth(bob))
    ).status_code == 404
    assert (await client.get("/api/v1/profile/trades", headers=_auth(bob))).json() == []


@pytest.mark.asyncio
async def test_trade_validation_rejects_bad_input(client: AsyncClient, db_session: AsyncSession):
    token = await _make_user(db_session, "invalid@test.com")
    resp = await client.post(
        "/api/v1/profile/trades", json=_trade_payload(quantity=0), headers=_auth(token)
    )
    assert resp.status_code == 422


# ---------------------------------------------------------------------------
# Watchlist
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_watchlist_add_list_and_remove(client: AsyncClient, db_session: AsyncSession):
    token = await _make_user(db_session, "watch@test.com")

    resp = await client.post(
        "/api/v1/profile/watchlist", json=_watch_payload(), headers=_auth(token)
    )
    assert resp.status_code == 201
    item = resp.json()
    assert item["ticker"] == "XOM"
    assert item["is_active"] is True
    assert item["target_price"] == 130.0

    listed = await client.get("/api/v1/profile/watchlist", headers=_auth(token))
    assert len(listed.json()) == 1

    # Duplicates for the same user are rejected.
    dup = await client.post(
        "/api/v1/profile/watchlist", json=_watch_payload(ticker="xom"), headers=_auth(token)
    )
    assert dup.status_code == 400

    removed = await client.delete(f"/api/v1/profile/watchlist/{item['id']}", headers=_auth(token))
    assert removed.status_code == 204
    assert (await client.get("/api/v1/profile/watchlist", headers=_auth(token))).json() == []


@pytest.mark.asyncio
async def test_watchlist_update_and_isolation(client: AsyncClient, db_session: AsyncSession):
    alice = await _make_user(db_session, "alice-watch@test.com")
    bob = await _make_user(db_session, "bob-watch@test.com")

    created = await client.post(
        "/api/v1/profile/watchlist", json=_watch_payload(), headers=_auth(alice)
    )
    item_id = created.json()["id"]

    resp = await client.patch(
        f"/api/v1/profile/watchlist/{item_id}",
        json={"target_price": 150.0, "is_active": False},
        headers=_auth(alice),
    )
    assert resp.status_code == 200
    assert resp.json()["target_price"] == 150.0
    assert resp.json()["is_active"] is False

    # Deactivated entries drop out of the default listing.
    assert (await client.get("/api/v1/profile/watchlist", headers=_auth(alice))).json() == []
    all_items = await client.get(
        "/api/v1/profile/watchlist", params={"active_only": False}, headers=_auth(alice)
    )
    assert len(all_items.json()) == 1

    assert (
        await client.patch(
            f"/api/v1/profile/watchlist/{item_id}",
            json={"target_price": 1.0},
            headers=_auth(bob),
        )
    ).status_code == 404
    assert (
        await client.delete(f"/api/v1/profile/watchlist/{item_id}", headers=_auth(bob))
    ).status_code == 404
