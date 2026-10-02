# MarketAtlas — Final Demo Runbook

One-page guide to running and demonstrating the core flow:

**Live Event → Timeline → Globe → Evidence → Causal Chain → Markets → ATLAS**

---

## Architecture overview (demo scope)

```
                       ┌───────────────────────────────┐
   GDELT DOC 2.0  ───►  │  FastAPI backend (:8000)      │
   (poll 120s)         │  • /api/v1/*  routes           │
                       │  • /ws broadcaster             │
                       │  • /live-events/observation    │  ◄── canonical
                       │    (EvidenceObservation)       │      evidence envelope
                       │  • GDELT + market stream tasks  │
                       └───────────┬───────────────────┘
                                   │ PostgreSQL 16 / Redis 7
                                   │
                       ┌───────────▼───────────────────┐
   Browser (:3000)  ─►  │  Vite + React SPA             │
                       │  /api/*  ──proxy──► backend    │
                       │  /ws     ──proxy──► backend    │
                       └───────────────────────────────┘
                           │
      Timeline ─► Globe focus ─► EvidencePanel ─► Causal Intelligence ─► Markets ─► ATLAS
```

- **One** live store (`WorldStore`), **one** evidence model
  (`EvidenceObservation`), **one** WebSocket (`/ws`), **one** evidence fetch
  path. Nothing in the demo flow requires a second source of truth.
- Market quotes and causal hops travel **inside** the canonical evidence
  envelope; the UI never invents a relationship, price, or timestamp.

---

## Required environment variables

Copy `backend/.env.example` → `backend/.env` and `frontend/.env.example` →
`frontend/.env.local`, then set:

| Variable | Required | Purpose |
|----------|----------|---------|
| `DB_USER`, `DB_PASSWORD`, `DB_HOST`, `DB_PORT`, `DB_NAME` | ✅ | PostgreSQL connection |
| `REDIS_URL` | ✅ | cache + live-event broadcast |
| `JWT_SECRET` | ✅ in production | auth signing (startup fails without it when `APP_ENV=production`) |
| `CORS_ORIGINS` | recommended | e.g. `http://localhost:3000` |
| One of `PERPLEXITY_API_KEY` / `OPENAI_API_KEY` / `GEMINI_API_KEY` / `CLAUDE_API_KEY` | recommended | provider-backed ATLAS answers |
| `ALPHA_VANTAGE_API_KEY` | optional | US quotes (yfinance fallback otherwise) |
| `VITE_API_BASE_URL` | optional | proxy target for `/api` + `/ws` (default `http://localhost:8000`) |

Everything else is optional microservice wiring and degrades gracefully — see
[`DEPLOYMENT.md`](DEPLOYMENT.md#9-graceful-degradation).

---

## Exact commands

```bash
# ── 0. PostgreSQL + Redis must be running (local or `docker compose -f backend/docker-compose.yml up -d db redis`)

# ── 1. Backend ─────────────────────────────────────────
cd backend
../venv/bin/alembic upgrade head
PYTHONPATH="$(pwd):$(dirname "$(pwd)")" \
  ../venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8000

# ── 2. Frontend (production build) ─────────────────────
cd frontend
npm ci
npm run build
npm run preview            # http://localhost:3000

# ── Controlled demo (seeds data, starts backend + frontend together)
./dev.sh
```

---

## Demo checklist

1. **Health** — `curl localhost:8000/health` → `database: ok`, `redis: ok`,
   `llm: ok` (or `MOCK`, which is stated honestly).
2. **Build served** — open `http://localhost:3000`; the globe loads and the
   console header shows `LIVE EVENTS` (backend reachable) or
   `EVENTS · SIMULATED` (offline).
3. **Live event lands** — a new event appears at the top of the timeline with a
   `LIVE` badge and relative age (or the seeded `SIMULATED` feed, clearly
   labelled, when the backend/network is unavailable).
4. **Click the event** → the globe focuses the backend-provided location and the
   Evidence panel loads the canonical observation for that selection.
5. **Evidence** — confirm freshness, provider, confidence, sources, impacts,
   and explicit `UNAVAILABLE`/`NOT PROVIDED` for anything the envelope lacks.
6. **Causal chain** — `Causal Intelligence` renders the recorded
   `EVENT → IMPACT → ASSET → MARKET OBSERVATION` hops with recorded type,
   confidence, and evidence reference; missing confidence/market data is shown
   as a limitation, and the caveat states causality is not inferred.
7. **Markets** — affected assets show value/change, freshness/provider, and a
   `LIVE`/`STALE`/`SIMULATED`/`UNAVAILABLE` status chip; clicking one re-focuses
   the globe through the same selection path.
8. **ATLAS** — “Ask ATLAS about this evidence” answers from the exact
   observation on screen and explicitly separates recorded evidence from
   unsupported inference.
9. **Reconnect** — stop the backend: the timeline degrades to `SIMULATED` /
   `NO LIVE UPDATE` without crashing; restart it and live data resumes.
10. **Providers down** — the app stays usable and keeps labelling simulated vs
    live data honestly.

---

## Live vs simulated components

| Component | Live (provider-backed) | Simulated / fallback |
|-----------|------------------------|----------------------|
| Live events | GDELT → `/ws` `live_event_new` (validated, deduped) | Seeded events, tagged `SIMULATED` |
| Globe event markers | backend lat/lng only | unlocated events are not placed |
| Evidence | `GET /live-events/observation` canonical envelope | `unavailable` / `stale` envelopes, shown as such |
| Market observations | Alpha Vantage / yfinance quote, `provider-backed` | `unavailable` (never a fake number); `cached` → `STALE`; `simulated` labelled `SIMULATED` |
| Causal chain | persisted event → impact → affected-asset hops | no links → shown as not established |
| Sidebar market signals | — | Seeded demo signals, labelled `SIMULATED` |
| ATLAS LLM | configured provider key | `MockLLM` fallback (flagged in `/health`); ATLAS still answers from canonical evidence |
| Prediction Space | backend `/predict` | offline generator marked `simulated` |

---

## Demo limitations

- Alpha Vantage's free tier is rate-limited; missing quotes render as
  `UNAVAILABLE` by design rather than being backfilled.
- GDELT polls every 120 s — a “live” event may take up to two minutes to appear.
- Optional microservices (graph_engine, simulator, world_state, memory,
  market_agents, kg-agent) are not required for this flow.
- The command center is a desktop-first layout (fixed right rail).

---

## Verification

```bash
cd backend  && python -m pytest -q          # 90 passed
cd frontend && npx tsc --noEmit && npm test # 73 files / 319 tests
cd frontend && npm run build                # production bundle
git diff --check                            # whitespace / conflict markers
```
