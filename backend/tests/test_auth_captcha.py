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
