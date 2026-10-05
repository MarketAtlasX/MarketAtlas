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
