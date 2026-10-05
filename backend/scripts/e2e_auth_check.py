"""End-to-end check of the auth + captcha flow.

Runs the real FastAPI app over an in-memory SQLite database (no Postgres
required) and exercises: captcha issuance, captcha-gated register, /auth/me,
captcha-gated login, and a captcha-less request being rejected.
"""

import asyncio
import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

# Captcha gate ON, dev-mode ephemeral JWT secret.
os.environ["AUTH_CAPTCHA_ENABLED"] = "true"

from httpx import ASGITransport, AsyncClient  # noqa: E402

