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
