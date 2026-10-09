"""Live end-to-end smoke test for the watchlist intelligence flow.

Runs against a *running* backend over real HTTP with a real JWT
(``SMOKE_BASE_URL``, default http://localhost:8000). This exercises the HTTP
interface the browser uses — auth, CRUD, quotes, history, evidence, alerts,
notifications and user isolation — without a browser driver.

Unlike the pytest suite it talks to the app's configured database, so it
creates two throwaway users and deletes them (cascade) at the end.

Usage:
    cd backend && ../venv/bin/python scripts/smoke_watchlist.py
"""

from __future__ import annotations

import asyncio
import os
import sys
import uuid
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import httpx  # noqa: E402
from sqlalchemy import delete  # noqa: E402

from app.database import AsyncSessionLocal  # noqa: E402
from app.models.user import User  # noqa: E402
from app.services.auth_service import create_access_token  # noqa: E402

BASE_URL = os.getenv("SMOKE_BASE_URL", "http://localhost:8000")
WL = "/api/v1/profile/watchlist"

_results: list[tuple[str, bool, str]] = []


def check(name: str, ok: bool, detail: str = "") -> None:
    _results.append((name, ok, detail))
    print(f"{'PASS' if ok else 'FAIL'}  {name}  {detail}")


async def main() -> int:
    suffix = uuid.uuid4().hex[:8]
    email_one = f"smoke-{suffix}@example.com"
    email_two = f"smoke2-{suffix}@example.com"

    async with AsyncSessionLocal() as session:
        first = User(email=email_one, hashed_password="x", display_name="smoke")
        second = User(email=email_two, hashed_password="x", display_name="smoke2")
        session.add_all([first, second])
        await session.commit()
        await session.refresh(first)
        await session.refresh(second)
        token_one = create_access_token(first.id)
        token_two = create_access_token(second.id)

    h1 = {"Authorization": f"Bearer {token_one}"}
    h2 = {"Authorization": f"Bearer {token_two}"}

    try:
        async with httpx.AsyncClient(base_url=BASE_URL, timeout=90) as client:
            # 1. Authentication is required.
            resp = await client.get(WL)
            check("auth_required", resp.status_code == 401, str(resp.status_code))

            # Empty watchlist.
            resp = await client.get(f"{WL}/quotes", headers=h1)
            check("watchlist_empty", resp.status_code == 200 and resp.json() == [], str(resp.status_code))

            # 2. Add an asset.
            resp = await client.post(
                WL,
                json={"ticker": "XOM", "company_name": "Exxon Mobil", "asset_type": "stock", "target_price": 130},
                headers=h1,
            )
            check("add_asset", resp.status_code == 201, str(resp.status_code))
            item = resp.json() if resp.status_code == 201 else {}
            item_id = item.get("id", "")

            # Duplicate + invalid input are rejected.
            resp = await client.post(WL, json={"ticker": "xom", "asset_type": "stock"}, headers=h1)
            check("duplicate_rejected", resp.status_code == 400, str(resp.status_code))
            resp = await client.post(WL, json={"ticker": "bad ticker!", "asset_type": "stock"}, headers=h1)
            check("invalid_ticker_rejected", resp.status_code == 422, str(resp.status_code))

            # 3. Persistence + edit.
            resp = await client.patch(
                f"{WL}/{item_id}",
                json={"company_name": "Exxon Mobil Corp", "asset_type": "stock", "target_price": 135},
                headers=h1,
            )
            check("edit_asset", resp.status_code == 200 and resp.json()["target_price"] == 135, str(resp.status_code))

            # 4. Quotes + history (provider may be unavailable — must be explicit).
            resp = await client.get(f"{WL}/quotes", headers=h1)
            body = resp.json() if resp.status_code == 200 else []
            market = body[0]["market"] if body else {}
            labelled = market.get("status") in {"provider-backed", "cached", "unavailable"}
            check("quotes_labelled", resp.status_code == 200 and labelled, f"status={market.get('status')}")
            resp = await client.get(f"{WL}/{item_id}/history", headers=h1)
            check("history_envelope", resp.status_code == 200 and resp.json()["status"] in {"provider-backed", "unavailable"}, str(resp.status_code))

            # 6. Evidence panel data.
            resp = await client.get(f"{WL}/{item_id}/evidence", headers=h1)
            evidence = resp.json() if resp.status_code == 200 else {}
            check("evidence_causality", resp.status_code == 200 and evidence.get("causality") == "not_established", str(resp.status_code))

            # 9. User isolation: another user cannot read this asset's evidence.
            resp = await client.get(f"{WL}/{item_id}/evidence", headers=h2)
            check("evidence_isolated", resp.status_code == 404, str(resp.status_code))

            # 7. Create a rule + evaluate + notification lifecycle.
            resp = await client.post(
                f"{WL}/alerts",
                json={"watchlist_id": item_id, "kind": "target_price", "threshold": 130},
                headers=h1,
            )
            check("alert_rule_create", resp.status_code == 201, str(resp.status_code))
            resp = await client.post(f"{WL}/alerts/evaluate", headers=h1)
            check("alert_evaluate", resp.status_code == 200, str(resp.status_code))
            resp = await client.get(f"{WL}/alerts/events", headers=h1)
            check("alert_events_list", resp.status_code == 200, str(resp.status_code))
            if resp.status_code == 200 and resp.json():
                event_id = resp.json()[0]["id"]
                check("alert_event_unread", resp.json()[0]["is_read"] is False)
                resp = await client.post(f"{WL}/alerts/events/{event_id}/read", headers=h1)
                check("alert_mark_read", resp.status_code == 200 and resp.json()["is_read"] is True, str(resp.status_code))
            resp = await client.get(f"{WL}/alerts/unread-count", headers=h1)
            check("alert_unread_count", resp.status_code == 200, str(resp.status_code))
            resp = await client.get(f"{WL}/alerts/scheduler", headers=h1)
            check("scheduler_health", resp.status_code == 200, str(resp.status_code))

            # 8. ATLAS grounded context.
            resp = await client.get(f"{WL}/atlas-context", headers=h1)
            context = resp.json() if resp.status_code == 200 else {}
            check("atlas_context", resp.status_code == 200 and context.get("causality") == "not_established", str(resp.status_code))
            check("atlas_context_scoped", context.get("total_tracked") == 1, str(context.get("total_tracked")))

            # Remove + confirm persistence of deletion.
            resp = await client.delete(f"{WL}/{item_id}", headers=h1)
            check("remove_asset", resp.status_code == 204, str(resp.status_code))
            resp = await client.get(WL, headers=h1)
            check("removal_persisted", resp.status_code == 200 and resp.json() == [], str(resp.status_code))
    finally:
        async with AsyncSessionLocal() as session:
            await session.execute(delete(User).where(User.email.in_([email_one, email_two])))
            await session.commit()

    failed = [name for name, ok, _ in _results if not ok]
    print(f"\n{len(_results) - len(failed)}/{len(_results)} checks passed")
    if failed:
        print("Failed:", ", ".join(failed))
    return 1 if failed else 0


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
