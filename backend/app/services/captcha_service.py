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
    if len(_fallback_store) >= _FALLBACK_MAX_KEYS:
        now = time.monotonic()
        for key in [k for k, (_, exp) in _fallback_store.items() if exp <= now]:
            _fallback_store.pop(key, None)
        # Still full (all live entries): drop the oldest half.
        if len(_fallback_store) >= _FALLBACK_MAX_KEYS:
            for key in list(_fallback_store)[: _FALLBACK_MAX_KEYS // 2]:
                _fallback_store.pop(key, None)
    _fallback_store[captcha_id] = (answer, time.monotonic() + CAPTCHA_TTL_SECONDS)


async def _fallback_take(captcha_id: str) -> str | None:
    entry = _fallback_store.pop(captcha_id, None)
    if entry is None:
        return None
    answer, expiry = entry
    if expiry <= time.monotonic():
        return None
    return answer


async def _store_answer(captcha_id: str, answer: str) -> None:
    stored = await cache.set(f"{_KEY_PREFIX}{captcha_id}", answer, ttl=CAPTCHA_TTL_SECONDS)
    if not stored:
        await _fallback_put(captcha_id, answer)


async def _take_answer(captcha_id: str) -> str | None:
    """Fetch and delete the stored answer — every captcha is single-use."""
    key = f"{_KEY_PREFIX}{captcha_id}"
    stored = await cache.get(key)
    if stored is not None:
        await cache.delete(key)
        return str(stored)
    return await _fallback_take(captcha_id)


# ---------------------------------------------------------------------------
# Challenge generation
# ---------------------------------------------------------------------------


def _random_code() -> str:
    return "".join(secrets.choice(_CODE_ALPHABET) for _ in range(_CODE_LENGTH))


def _random_sum() -> tuple[str, str]:
    a = random.randint(11, 79)  # noqa: S311 — non-cryptographic is fine for display
    b = random.randint(12, 59)
    return f"{a} + {b}", str(a + b)


def _render_svg(text: str) -> str:
    """Render challenge text as a distorted, noisy SVG on a dark plate."""
    char_spacing = 30
    x_start = 22
    baseline = 34

    glyphs: list[str] = []
    for index, char in enumerate(text):
        rotation = random.uniform(-24, 24)  # noqa: S311
        dy = random.uniform(-4, 4)
        size = random.uniform(26, 34)
        color = random.choice(_CHAR_COLORS)  # noqa: S311
        x = x_start + index * char_spacing
        glyphs.append(
            f'<text x="{x:.0f}" y="{baseline + dy:.1f}" '
            f'transform="rotate({rotation:.1f} {x:.0f} {baseline + dy:.1f})" '
            f'fill="{color}" font-size="{size:.0f}" font-weight="600" '
            f'font-family="\'Space Grotesk\', \'JetBrains Mono\', monospace" '
            f'letter-spacing="2">{char}</text>'
        )

    noise: list[str] = []
    for _ in range(3):
        y = random.uniform(8, 44)
        c1, c2 = random.uniform(10, 60), random.uniform(120, 170)
        mid = random.uniform(14, 38)
        color = random.choice(_NOISE_COLORS)  # noqa: S311
        noise.append(
            f'<path d="M 8 {y:.1f} C {c1:.0f} {mid:.1f}, {c2:.0f} {46 - mid:.1f}, 172 {random.uniform(6, 46):.1f}" '
            f'stroke="{color}" stroke-width="1.4" fill="none"/>'
        )
    for _ in range(14):
        dx, dy = random.uniform(4, 168), random.uniform(4, 48)
        noise.append(f'<circle cx="{dx:.0f}" cy="{dy:.0f}" r="1" fill="rgba(190, 204, 204, 0.35)"/>')

    return (
        '<svg xmlns="http://www.w3.org/2000/svg" width="190" height="52" '
        'viewBox="0 0 190 52" role="img" aria-label="captcha challenge">'
        '<rect width="190" height="52" rx="4" fill="#0d1418"/>'
        f"{''.join(noise)}{''.join(glyphs)}"
        "</svg>"
    )


async def generate_captcha() -> CaptchaChallenge:
    """Create a one-time challenge and store its answer server-side."""
    if random.random() < 0.5:  # noqa: S311
        question, answer = _random_sum()
        kind = "sum"
    else:
        question = _random_code()
        answer = question
        kind = "code"

    captcha_id = uuid.uuid4().hex
    await _store_answer(captcha_id, answer.lower().strip())
    return CaptchaChallenge(captcha_id=captcha_id, svg=_render_svg(question), kind=kind)

