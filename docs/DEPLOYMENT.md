# Deployment & Production Demo Guide

This guide covers running MarketAtlas in a production-style configuration:
a built frontend, a non-reload backend, PostgreSQL, Redis, and the complete
flow **Live Event → Timeline → Globe → Evidence → Causal Chain → Markets → ATLAS**.

For a one-page runbook, see [`DEMO.md`](DEMO.md).

---

## Prerequisites

| Requirement | Version | Notes |
|-------------|---------|-------|
| Python | 3.12+ | Backend runtime |
| Node.js | 20+ | Frontend build |
| PostgreSQL | 16 | Primary datastore |
| Redis | 7 | Cache, live-event broadcaster, Celery broker |
| Docker | optional | Only if you prefer containers over local Postgres/Redis |

The backend and frontend are the only two services the demo flow needs.
Everything else (market_agents `:8004`, world_state `:8006`, graph_engine
`:8005`, simulator `:8007`, memory `:8010`, kg-agent `:8008`) is **optional**
and degrades gracefully — see below.

---

## 1. Environment variables

```bash
cp backend/.env.example backend/.env      # backend settings + secrets
cp frontend/.env.example frontend/.env.local
```

- Full list with descriptions: [`../backend/.env.example`](../backend/.env.example)
  and [`../frontend/.env.example`](../frontend/.env.example).
- **Required:** `DB_*` (PostgreSQL), `REDIS_URL`, and `JWT_SECRET` when
  `APP_ENV=production` (startup fails fast without it).
- **Strongly recommended:** one LLM key (`PERPLEXITY_API_KEY`, `OPENAI_API_KEY`,
  `GEMINI_API_KEY`, or `CLAUDE_API_KEY`) so ATLAS answers with a live model.
- **Recommended for live markets:** `ALPHA_VANTAGE_API_KEY` (optional —
  `yfinance` is used automatically as the free fallback).
- Never commit `.env` / `.env.local`; both are git-ignored.

`VITE_API_BASE_URL` is read by `vite.config.ts` at startup and controls where
both the dev server and `npm run preview` proxy `/api` and `/ws`. It defaults
to `http://localhost:8000`.

---

## 2. Database setup & migrations

```bash
# Create the database (skip if it already exists)
createdb marketatlas            # or: psql -c "CREATE DATABASE marketatlas;"

# Apply migrations
cd backend
../venv/bin/alembic upgrade head

# Optional: seed entities and sample events
../venv/bin/python seed_real.py
../venv/bin/python -m app.chatbot.scripts.seed_data
```

Migrations live in `backend/alembic/versions/`. Alembic reads the same
`DB_*` variables as the app (`backend/alembic.ini` + `app.config.settings`).

---

## 3. Backend (production, no reload)

```bash
cd backend
PYTHONPATH="$(pwd):$(dirname "$(pwd)")" \
  ../venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8000
```

Verify:

```bash
curl -s localhost:8000/health
# {"status":"healthy",...,"checks":{"database":"ok","redis":"ok","llm":"ok (...)"}}
```

`/health` reports `degraded` when the database is unreachable, `redis:
unavailable` when Redis is down, and `llm: "⚠ MOCK — no real LLM configured"`
when no provider key/Ollama is present — so you can always tell what is live.

---

## 4. Frontend (production build + preview)

```bash
cd frontend
npm ci                 # reproducible install (or `npm install`)
npm run build          # tsc + vite build → frontend/dist
npm run preview        # serves dist on :3000 with the API/WS proxy
```

`npm run preview` is a real production server: it serves the built assets and
proxies `/api`, `/ws`, `/api/graph`, `/api/world-state`, `/api/simulation/*`,
`/ws/graph`, and `/ws/simulation` to the same backends as `npm run dev`
(one shared proxy map in `vite.config.ts`).

### Static hosting behind a reverse proxy

If you serve `frontend/dist` from nginx/CDN instead of `vite preview`, replicate
the same routes:

| Path | Upstream |
|------|----------|
| `/api/*` (except the specific paths below) | `http://<backend>:8000/api/v1/*` (strip `/api`, prefix `/api/v1`) |
| `/api/world-state`, `/api/graph`, `/api/simulation/` | the matching microservice |
| `/ws` and `/ws/*` (WebSocket upgrade) | `http://<backend>:8000` / `ws://<backend>:8000` |

---

## 5. Docker (backend + infrastructure)

```bash
# Infrastructure only (Postgres + Redis), point the local backend at it
docker compose -f backend/docker-compose.yml up -d db redis

# Full backend stack (api + worker + beat + optional services)
docker compose -f backend/docker-compose.yml up --build
```

Compose reads `backend/.env` and overrides `DB_HOST=db`, `REDIS_URL`,
`CELERY_*` so services reach each other by name.

---

## 6. WebSocket configuration

- The backend exposes a single broadcaster at `/ws` (channels: `signals`,
  `events`, `risk`, `forecasts`, `live_events`) plus `/ws/graph` and
  `/ws/simulation`.
- The frontend connects to the **relative** `/ws` path, so any deployment that
  proxies `/ws` with WebSocket upgrade works without code changes.
- The client reconnects with bounded backoff (4 attempts, reset on a healthy
  open) and also retries when the initial connection cannot be constructed —
  e.g. when the page was loaded before the backend was up.
- Auth-gated realtime (`/ws/chat`) requires a `?token=` JWT query parameter.

---

## 7. Live-event provider configuration

- **GDELT** (`backend/app/services/gdelt_stream_service.py`) is the live-event
  source. It polls the public GDELT DOC 2.0 API every 120 s, needs **no key**,
  and broadcasts new articles to `/ws`.
- It starts automatically with the app lifespan as a background task. If the
  network or GDELT is unavailable, the task logs a warning and **the API keeps
  serving**.
- The frontend strictly validates every envelope; events without coordinates or
  a parseable timestamp are dropped rather than placed at invented positions.

---

## 8. Market-data provider configuration

- `ALPHA_VANTAGE_API_KEY` (optional) is used for US quotes; **`yfinance` is the
  automatic fallback**, and a quote of `None` is surfaced as an explicit
  `unavailable` market observation — never a fabricated number.
- Sector metrics come from the `SECTOR_TICKERS` feed with a Redis-cached TTL.

---

## 9. Graceful degradation

| Missing / down | Behaviour |
|----------------|-----------|
| PostgreSQL | `/health` → `degraded`; DB-backed routes return errors, UI shows explicit error states |
| Redis | cache/broadcast degrade; `/health` reports `redis: unavailable` |
| LLM key + Ollama | chatbot uses `MockLLM`; ATLAS still answers from canonical evidence, and `/health` flags the mock |
| Alpha Vantage | falls back to `yfinance`; otherwise market rows render `UNAVAILABLE` |
| GDELT / network | stream task warns and retries; frontend shows the seeded `SIMULATED` feed |
| Optional microservices | the related panel degrades; core flow unaffected |
| WebSocket unavailable | timeline shows `SIMULATED` + `NO LIVE UPDATE`; the app never crashes |

---

## 10. Verification commands

```bash
# Backend
cd backend && python -m pytest -q

# Frontend typecheck, tests, production build
cd frontend && npx tsc --noEmit && npm test && npm run build

# Repo hygiene
git diff --check
```
