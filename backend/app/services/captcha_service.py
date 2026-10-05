"""Server-issued CAPTCHA challenges for the auth endpoints.

Generates a distorted SVG challenge (either a character code or an arithmetic
sum), stores the expected answer server-side keyed by a one-time captcha id,
and verifies submitted answers. The answer never travels to the browser, so a
client cannot bypass the challenge by reading it out of the page.

Storage mirrors the repo's graceful-degradation pattern: challenges live in
Redis (5-minute TTL) when it is reachable, and fall back to an in-process
store (bounded, with expiry sweeps) when it is not — so auth keeps working in
a single-process deployment without Redis.
"""

import random
import secrets
import time
import uuid
from dataclasses import dataclass

from app.cache import cache

CAPTCHA_TTL_SECONDS = 300

_KEY_PREFIX = "captcha:"

# Characters without visually ambiguous pairs (no 0/O, 1/I/l, 5/S, 8/B …).
_CODE_ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789"
_CODE_LENGTH = 5

# Text fill colours that stay legible on the dark auth page.
_CHAR_COLORS = ("#7fd8c9", "#8fb8e8", "#c9b3e8", "#8ed0a8", "#e8c98f")
_NOISE_COLORS = ("rgba(97, 199, 182, 0.35)", "rgba(95, 125, 153, 0.4)")


@dataclass(frozen=True)
class CaptchaChallenge:
    """A captcha issued to a client. The answer is never included."""

    captcha_id: str
    svg: str
    kind: str  # 'code' | 'sum'
    expires_in: int = CAPTCHA_TTL_SECONDS


# ---------------------------------------------------------------------------
# Storage — Redis first, in-process fallback when Redis is unavailable.
# ---------------------------------------------------------------------------

# Maps captcha_id -> (expected_answer, expiry_timestamp). Bounded by the sweep
# in _fallback_take, which runs on every verification.
_fallback_store: dict[str, tuple[str, float]] = {}
_FALLBACK_MAX_KEYS = 10_000


async def _fallback_put(captcha_id: str, answer: str) -> None:
