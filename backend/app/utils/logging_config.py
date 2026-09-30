"""Structured logging configuration for MarketAtlas backend."""
from __future__ import annotations

import logging
import sys
from typing import Optional


LOG_FORMAT = '%(asctime)s | %(levelname)-8s | %(name)-30s | %(message)s'
DATE_FORMAT = '%Y-%m-%d %H:%M:%S'


def configure_logging(
    level: str = 'INFO',
    log_file: Optional[str] = None,
) -> None:
    """Configure structured logging for the application."""
    handlers: list[logging.Handler] = [
        logging.StreamHandler(sys.stdout),
    ]

    if log_file:
        file_handler = logging.FileHandler(log_file, encoding='utf-8')
        file_handler.setFormatter(logging.Formatter(LOG_FORMAT, datefmt=DATE_FORMAT))
        handlers.append(file_handler)

    logging.basicConfig(
        level=getattr(logging, level.upper(), logging.INFO),
        format=LOG_FORMAT,
        datefmt=DATE_FORMAT,
        handlers=handlers,
        force=True,
    )

    for noisy_logger in ('httpx', 'httpcore', 'urllib3', 'asyncio'):
        logging.getLogger(noisy_logger).setLevel(logging.WARNING)
