from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, List, Optional


def simulate_world_state(
    base_state: Dict[str, Any],
    deltas: Dict[str, float],
    timeline_days: int,
) -> Dict[str, Any]:
    new_state = base_state.copy()
    indicator_decay = 0.95 ** (timeline_days / 30.0)

    for key, delta in deltas.items():
        if key in new_state.get("global_indicators", {}):
            new_state["global_indicators"][key] *= (1 + delta * indicator_decay)
        elif key in new_state:
            if isinstance(new_state[key], (int, float)):
                new_state[key] *= (1 + delta * indicator_decay)

    for cid in new_state.get("countries", {}):
        country = new_state["countries"][cid]
        for metric in ["risk_score", "economic_activity", "military_tension"]:
            if metric in country and metric in deltas:
                country[metric] *= (1 + deltas[metric] * indicator_decay)

    new_state["simulated_at"] = datetime.utcnow().isoformat()
    new_state["timeline_days"] = timeline_days

    return new_state
