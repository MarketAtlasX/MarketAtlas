"""Assistant endpoints — ephemeral credentials for the ATLAS voice assistant."""
import httpx
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.config import settings

router = APIRouter(prefix="/assistant", tags=["assistant"])


class RealtimeTokenResponse(BaseModel):
    value: str


@router.post("/realtime-token", response_model=RealtimeTokenResponse)
async def create_realtime_token() -> RealtimeTokenResponse:
    """Issue a short-lived OpenAI Realtime ephemeral client secret.

    The browser never sees the server-side OPENAI_API_KEY; it receives a
    time-boxed client secret scoped to the realtime session and uses it as a
    Bearer token against the OpenAI WebRTC endpoint (`/v1/realtime/calls`).
    """
    if not settings.openai_api_key:
        raise HTTPException(status_code=503, detail="OpenAI API key not configured")

    payload = {
        "session": {
            "type": "realtime",
            "model": settings.assistant_realtime_model,
            "audio": {
                "output": {
                    "voice": settings.assistant_realtime_voice,
                },
            },
        }
    }

    async with httpx.AsyncClient(timeout=30) as client:
        response = await client.post(
            "https://api.openai.com/v1/realtime/client_secrets",
            headers={
                "Authorization": f"Bearer {settings.openai_api_key}",
                "Content-Type": "application/json",
                "OpenAI-Safety-Identifier": "marketatlas-web",
            },
            json=payload,
        )

    if response.status_code >= 400:
        raise HTTPException(status_code=response.status_code, detail=response.text[:300])

    data = response.json()
    value = (data.get("client_secret") or {}).get("value")
    if not value:
        raise HTTPException(status_code=502, detail="No client secret returned by OpenAI")

    return RealtimeTokenResponse(value=value)
