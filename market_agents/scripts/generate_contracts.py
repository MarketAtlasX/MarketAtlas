from __future__ import annotations

import json
from pathlib import Path

from market_agents.contracts import AgentEvent
from market_agents.services.gateway import app as gateway_app
from market_agents.services.impact_service import app as impact_app
from market_agents.services.market_service import app as market_app
from market_agents.services.recommendation_service import app as recommendation_app

ROOT = Path(__file__).resolve().parents[1]
OPENAPI_DIR = ROOT / "docs" / "openapi"
EVENTS_DIR = ROOT / "docs" / "events"


def write_json(path: Path, payload: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2), encoding="utf-8")


def main() -> None:
    apps = {
        "gateway": gateway_app,
        "market-data": market_app,
        "impact": impact_app,
        "recommendation": recommendation_app,
    }
    for name, app in apps.items():
        write_json(OPENAPI_DIR / f"{name}.openapi.json", app.openapi())
    write_json(EVENTS_DIR / "agent-event.schema.json", AgentEvent.model_json_schema())


if __name__ == "__main__":
    main()
