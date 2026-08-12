from __future__ import annotations

from dataclasses import dataclass, field
from typing import List


@dataclass
class SimulatorConfig:
    service_name: str = "MarketAtlas Scenario Simulator"
    version: str = "0.1.0"
    host: str = "0.0.0.0"
    port: int = 8007
    log_level: str = "INFO"

    monte_carlo_runs: int = 1000
    max_propagation_depth: int = 10
    propagation_decay: float = 0.85

    default_horizons_days: List[int] = field(default_factory=lambda: [0, 1, 7, 30, 90, 180, 365])

    world_state_api_url: str = "http://localhost:8006"
    graph_engine_api_url: str = "http://localhost:8005"

    memory_store_enabled: bool = True
    max_episode_history: int = 1000


settings = SimulatorConfig()
