"""Request logging middleware for API observability."""
from __future__ import annotations

import logging
import time

logger = logging.getLogger(__name__)


class RequestTimer:
    """Context manager for timing request duration."""

    def __init__(self, method: str, path: str):
        self.method = method
        self.path = path
        self.start: float = 0.0
        self.duration_ms: float = 0.0

    def __enter__(self) -> 'RequestTimer':
        self.start = time.perf_counter()
        return self

    def __exit__(self, *_: object) -> None:
        self.duration_ms = (time.perf_counter() - self.start) * 1000
        level = logging.WARNING if self.duration_ms > 2000 else logging.INFO
        logger.log(level, '%s %s completed in %.1fms', self.method, self.path, self.duration_ms)
