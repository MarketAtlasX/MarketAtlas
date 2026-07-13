from fastapi import Request

from .memory_service import MemoryService


async def get_memory_service(request: Request) -> MemoryService:
    return request.app.state.memory_service
