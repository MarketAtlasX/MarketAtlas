"""Tests for the auth captcha gate: challenge issuance, single-use
verification, and captcha-enforced register/login endpoints."""

import pytest

from app.services import captcha_service
from app.services.captcha_service import (
    CAPTCHA_TTL_SECONDS,
    generate_captcha,
    verify_captcha,
)


@pytest.fixture(autouse=True)
def clean_fallback_store():
    captcha_service._fallback_store.clear()
    yield
    captcha_service._fallback_store.clear()


# ---------------------------------------------------------------------------
# Service level
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_generate_captcha_returns_svg_and_id():
    challenge = await generate_captcha()

    assert challenge.captcha_id
    assert challenge.kind in ("code", "sum")
    assert challenge.expires_in == CAPTCHA_TTL_SECONDS
    assert challenge.svg.startswith("<svg")
    assert "</svg>" in challenge.svg


@pytest.mark.asyncio
async def test_correct_answer_verifies_once_then_consumed():
    challenge = await generate_captcha()

    # The expected answer lives only server-side; fetch it from the store
    # the service writes to (tests run without Redis, so the in-process
    # fallback holds it).
    answer = captcha_service._fallback_store[challenge.captcha_id][0]

    assert await verify_captcha(challenge.captcha_id, answer) is True
    # Single-use: the same (correct) answer cannot be replayed.
    assert await verify_captcha(challenge.captcha_id, answer) is False


@pytest.mark.asyncio
async def test_wrong_answer_consumes_the_challenge():
    challenge = await generate_captcha()

    assert await verify_captcha(challenge.captcha_id, "definitely-wrong") is False
    # Even a later correct attempt fails — the challenge was consumed.
    stored_answer = captcha_service._fallback_store.get(challenge.captcha_id)
    assert stored_answer is None


@pytest.mark.asyncio
async def test_verify_rejects_missing_fields():
    assert await verify_captcha(None, "abc") is False
    assert await verify_captcha("some-id", None) is False
    assert await verify_captcha("some-id", "") is False


@pytest.mark.asyncio
async def test_answer_is_normalized_case_and_whitespace():
    challenge = await generate_captcha()
    stored_answer = captcha_service._fallback_store[challenge.captcha_id][0]

    assert await verify_captcha(challenge.captcha_id, f"  {stored_answer.upper()} ") is True


# ---------------------------------------------------------------------------
# Endpoint level
# ---------------------------------------------------------------------------

REGISTER_URL = "/api/v1/auth/register"
LOGIN_URL = "/api/v1/auth/login"
CAPTCHA_URL = "/api/v1/auth/captcha"
ME_URL = "/api/v1/auth/me"


@pytest.fixture
def known_captcha(monkeypatch):
    """Pin a captcha with a known answer, stored through the service itself."""

    async def fake_generate():
        from app.services.captcha_service import CaptchaChallenge

        await captcha_service._fallback_put("known-captcha-id", "answer42")
        return CaptchaChallenge(captcha_id="known-captcha-id", svg="<svg>challenge</svg>", kind="code")

    monkeypatch.setattr("app.routes.auth.generate_captcha", fake_generate)
    return {"captcha_id": "known-captcha-id", "captcha_answer": "answer42"}


async def _fetch_captcha(client):
    response = await client.get(CAPTCHA_URL)
    assert response.status_code == 200
    body = response.json()
    assert body["captcha_id"]
    assert "<svg" in body["svg"]
    return body


@pytest.mark.asyncio
async def test_captcha_endpoint_issues_a_challenge(client):
    body = await _fetch_captcha(client)
    assert body["kind"] in ("code", "sum")
    assert body["expires_in"] == CAPTCHA_TTL_SECONDS


@pytest.mark.asyncio
async def test_register_without_captcha_is_rejected(client):
    response = await client.post(
        REGISTER_URL,
        json={"email": "gate@example.com", "password": "super-secret-1", "display_name": "Gate"},
    )
    assert response.status_code == 400
    assert "captcha" in response.json()["detail"].lower()


@pytest.mark.asyncio
async def test_register_with_wrong_captcha_is_rejected(client):
    response = await client.post(
        REGISTER_URL,
        json={
            "email": "gate@example.com",
            "password": "super-secret-1",
            "display_name": "Gate",
            "captcha_id": "nonexistent",
            "captcha_answer": "wrong",
        },
    )
    assert response.status_code == 400


@pytest.mark.asyncio
async def test_register_login_and_me_with_valid_captcha(client, known_captcha):
    register = await client.post(
        REGISTER_URL,
        json={
            "email": "atlas.user@example.com",
            "password": "super-secret-1",
            "display_name": "Atlas User",
            **known_captcha,
        },
    )
    assert register.status_code == 201
    token = register.json()["access_token"]
    assert register.json()["user"]["email"] == "atlas.user@example.com"

    me = await client.get(ME_URL, headers={"Authorization": f"Bearer {token}"})
    assert me.status_code == 200
    assert me.json()["display_name"] == "Atlas User"

    # Re-fetch a captcha (the register one was consumed) and log in.
    login_captcha = await _fetch_captcha(client)
    stored = captcha_service._fallback_store[login_captcha["captcha_id"]][0]
    login = await client.post(
        LOGIN_URL,
        json={
            "email": "atlas.user@example.com",
            "password": "super-secret-1",
            "captcha_id": login_captcha["captcha_id"],
            "captcha_answer": stored,
        },
    )
    assert login.status_code == 200
    assert login.json()["access_token"]


@pytest.mark.asyncio
async def test_login_with_bad_password_fails_after_valid_captcha(client, known_captcha):
    await client.post(
        REGISTER_URL,
        json={
