"""MarketAtlas Memory Service - Entry Point"""

from contextlib import asynccontextmanager

import uvicorn
from fastapi import FastAPI, WebSocket
from fastapi.middleware.cors import CORSMiddleware

from api.memory_service import MemoryService
from api.routes import router
from api.websocket import websocket_handler
from config import settings


@asynccontextmanager
async def lifespan(app: FastAPI):
    memory_service = MemoryService()
    try:
        await memory_service.initialize()
    except Exception as e:
        print(f"Warning: Memory backend initialization failed ({e}). Running in degraded mode.")
        app.state._storage_error = str(e)

    app.state.memory_service = memory_service
    yield
    try:
        await memory_service.close()
    except Exception:
        pass


app = FastAPI(
    title=settings.project_name,
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


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket_handler(websocket)


@app.get("/")
async def root():
    return {
        "service": settings.project_name,
        "version": settings.version,
        "status": "running",
        "docs": "/docs",
    }


if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host=settings.api_host,
        port=settings.api_port,
        reload=settings.debug,
    )
