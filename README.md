# market_agents

MarketAtlas `market_agents` is a lightweight Python prototype that combines market signals with simple geopolitical impact analysis and basic trade recommendations. It's designed to be fast to iterate on and resilient when external services (APIs, Neo4j) are unavailable.

Core agents

- Impact Analysis Agent: extracts simple entity relations from text, builds an in-memory graph, and computes local/composite risk scores.
- Market Data Agent: computes momentum, rolling volatility, and volume status from a price series.
- Recommendation Agent: synthesizes market snapshot + impact score to produce BUY / HOLD / SELL guidance.

What works today

- Runnable demo entrypoint: `main.py`.
- Best-effort ingest helpers for Alpha Vantage, FRED, EIA, GDELT, and ACLED with deterministic fallbacks.
- A focused pytest suite covering demo flows, market-data signals, impact processing, recommendation logic, and ingest helper behavior.
- Optional Neo4j persistence for Impact graphs (best-effort -- does not break runtime if Neo4j is unreachable).

Repository layout

```text
market_agents/
  main.py
  graph/
  impact/
  ingest/
  market_data/
  persistence/
  recommendation/
  tests/
  requirements.txt
  README.md
  docker-compose.neo4j.yml
```

Setup

1. Create and activate a virtual environment and install dependencies:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

2. (Optional) Create a `.env` file in the repository root for live API keys and optional Neo4j connection information:

```env
ALPHAVANTAGE_API_KEY=your_key_here
FRED_API_KEY=your_key_here
EIA_API_KEY=your_key_here
# Optional Neo4j connection (when running the local Neo4j container)
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=test
```

Running the demo

From the repository root:

```powershell
python main.py
```

Run tests

```powershell
python -m pytest -q tests
```

Neo4j (local development)

This repo includes `docker-compose.neo4j.yml` to run a local Neo4j instance for development and optional persistence. The service uses `NEO4J_AUTH=neo4j/test` by default.

Start Neo4j (background):

```powershell
docker compose -f docker-compose.neo4j.yml up -d
```

Check status:

```powershell
docker compose -f docker-compose.neo4j.yml ps
```

The browser is available at http://localhost:7474 (use `neo4j` / `test` by default). If you start Neo4j locally, set `NEO4J_URI`, `NEO4J_USER`, and `NEO4J_PASSWORD` in your environment or `.env` file so the `ImpactAgent` can attempt best-effort writes.

Git and pushing changes

To stage, commit and push the changes made in this workspace:

```powershell
cd <repo-root>
git add .
git commit -m "Update README, add Neo4j persistence and tests"
git push origin main
```

Status & notes

- All tests in `tests/` currently pass locally (11 passed at the last run).
- Neo4j persistence is optional: `ImpactAgent` attempts a best-effort write when `NEO4J_URI` is set; failures are ignored so the pipeline remains resilient.
- The `persistence/neo4j_client.py` contains a simple MERGE-based writer -- consider hardening Cypher parameterization for production.

Next steps

- Add CI (GitHub Actions) to run tests on push/PR and a separate job to exercise Neo4j integration using Docker-in-Docker or GitHub services.
- Expand the LangGraph workflow and integrate an LLM-based impact extractor.

Files of interest

- README: [README.md](README.md)
- Local Neo4j compose: [docker-compose.neo4j.yml](docker-compose.neo4j.yml)
- Neo4j client: [persistence/neo4j_client.py](persistence/neo4j_client.py)
- Impact agent: [impact/impact_agent.py](impact/impact_agent.py)

**Recent Work (up to June 2, 2026)**

- **Tests:** All unit tests pass locally (11 passed) -- run with `python -m pytest -q tests`.
- **Microservices scaffold:** Added lightweight FastAPI wrappers and Dockerfiles for three services:
  - `services/market_data` -- market-data-service (port 8001)
  - `services/impact` -- impact-service (port 8002)
  - `services/recommendation` -- recommendation-service (port 8003)
- **Local dev compose:** Added `docker-compose.dev.yml` to run Neo4j, RabbitMQ, and the three services for local development.
- **API specs:** Minimal OpenAPI specs added under `api_specs/` for the three services.

**Run everything locally (recommended dev flow)**

- Start Docker Desktop and ensure the engine is running.
- From the repository root run:

```powershell
docker compose -f docker-compose.dev.yml up -d
docker compose -f docker-compose.dev.yml ps
```

- Service docs (when services are running):
  - Market data: `http://localhost:8001/docs`
  - Impact: `http://localhost:8002/docs`
  - Recommendation: `http://localhost:8003/docs`

**Quick local checks (without Docker)**

- Run unit tests:

```powershell
python -m pytest -q tests
```

- Run the demo (uses local fallback data):

```powershell
python main.py
```

**How persistence and messaging are wired in dev**

- `docker-compose.dev.yml` brings up:
  - Neo4j (bolt/http ports 7687/7474) for graph persistence.
  - RabbitMQ (5672/15672) to enable an event-driven flow later.
- The `impact` service is configured (in compose) with `NEO4J_URI`, `NEO4J_USER`, and `NEO4J_PASSWORD` so it will attempt best-effort writes when Neo4j is available.

**What's been committed and pushed**

- Commit `e8e0c20`: Update README, add Neo4j persistence and tests
- Commit `a20fe8e`: Scaffold FastAPI services, add docker-compose.dev and API specs

Both commits were pushed to `origin/main`.

**Next recommended steps (pick one and I can implement it)**

- Add an ingest->impact example using RabbitMQ (publish/subscribe demo).
- Harden Neo4j client (`persistence/neo4j_client.py`) with parameterized Cypher and retries.
- Add GitHub Actions to run unit tests and build service images on push.

If you'd like me to implement one of these now, tell me which and I'll proceed.

If you'd like, I can commit and push these changes now and then start the local Neo4j container for you.
