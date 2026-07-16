from __future__ import annotations

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from graph_engine.api.routes import router
from graph_engine.api.websocket import manager
from graph_engine.config import settings

logging.basicConfig(level=getattr(logging, settings.log_level.upper(), logging.INFO))
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info(f"Starting {settings.service_name} on port {settings.port}")
    yield
    logger.info(f"Shutting down {settings.service_name}")


app = FastAPI(
    title="MarketAtlas Graph Engine",
    version="0.1.0",
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


@app.websocket("/ws/graph")
async def graph_websocket(websocket: WebSocket):
    await manager.handle_connection(websocket)


@app.get("/api/graph/config")
def get_config():
    return {
        "service": settings.service_name,
        "version": "0.1.0",
        "host": settings.host,
        "port": settings.port,
        "log_level": settings.log_level,
    }


@app.get("/api/graph/version")
def get_version():
    return {"version": "0.1.0", "service": "graph_engine", "build": "2026-07-16"}


@app.get("/")
def root():
    return {
        "service": "MarketAtlas Graph Engine",
        "version": "0.1.0",
        "endpoints": {
            "REST": "/api/graph/*",
            "WebSocket": "/ws/graph",
            "docs": "/docs",
        },
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("graph_engine.main:app", host=settings.host, port=settings.port, reload=True)
