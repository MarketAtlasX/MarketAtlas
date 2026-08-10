"""Shared FastAPI service assembly helpers."""
from __future__ import annotations

from fastapi import FastAPI

from market_agents.contracts import HealthResponse
from market_agents.observability import configure_logging, instrument_app


def create_service_app(service_name: str, title: str) -> FastAPI:
    configure_logging(service_name)
    app = FastAPI(title=title, version="0.1.0")
    instrument_app(app, service_name)

    @app.get("/health", response_model=HealthResponse)
    def health():
        return HealthResponse(service=service_name)

    return app
