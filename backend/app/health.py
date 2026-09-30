"""Health check endpoint utilities."""
from __future__ import annotations

import time
from dataclasses import dataclass, field
from typing import Dict, Optional


@dataclass
class ComponentHealth:
    """Health status of a single component."""
    name: str
    status: str
    latency_ms: Optional[float] = None
    message: str = ''


@dataclass
class SystemHealth:
    """Overall system health report."""
    status: str = 'healthy'
    version: str = '1.0.0'
    uptime_seconds: float = 0.0
    components: Dict[str, ComponentHealth] = field(default_factory=dict)
    timestamp: str = ''

    def add_component(self, component: ComponentHealth) -> None:
        self.components[component.name] = component
        if component.status == 'unhealthy':
            self.status = 'unhealthy'
        elif component.status == 'degraded' and self.status == 'healthy':
            self.status = 'degraded'


_start_time = time.monotonic()


def get_uptime() -> float:
    """Return application uptime in seconds."""
    return time.monotonic() - _start_time
