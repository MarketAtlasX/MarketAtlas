from __future__ import annotations

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from simulator.api.routes import router
from simulator.api.websocket import ws_handler
from simulator.config import settings

logging.basicConfig(level=getattr(logging, settings.log_level.upper(), logging.INFO))
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info(f"Starting {settings.service_name} on port {settings.port}")
    yield
    logger.info(f"Shutting down {settings.service_name}")


app = FastAPI(
    title=settings.service_name,
    version=settings.version,
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)


@app.websocket("/ws/simulation")
async def simulation_websocket(websocket: WebSocket):
    await ws_handler(websocket)


@app.get("/api/simulation/config")
def get_config():
    return {
        "service": settings.service_name,
        "version": settings.version,
        "host": settings.host,
        "port": settings.port,
        "log_level": settings.log_level,
        "monte_carlo_runs": settings.monte_carlo_runs,
        "max_propagation_depth": settings.max_propagation_depth,
        "default_horizons_days": settings.default_horizons_days,
    }


@app.get("/api/simulation/version")
def get_version():
    return {"version": settings.version, "service": "simulator", "build": "2026-07-30"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host=settings.host, port=settings.port)
