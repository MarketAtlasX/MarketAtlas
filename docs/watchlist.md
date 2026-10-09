# Watchlist intelligence

The watchlist is a per-user set of assets (stock, ETF, commodity, index,
currency, bond) with optional target price, stop loss, and notes. It is backed
by the `watchlists` table and is strictly isolated by authenticated user.

## What works end to end

- CRUD at `/api/v1/profile/watchlist` (create, list, read, update, deactivate,
  delete). Tickers are validated (`^[A-Z][A-Z0-9.\-]{0,9}$`) and normalised to
  upper case. `asset_type` is constrained to the `AssetType` enum
  (`stock`, `etf`, `commodity`, `index`, `currency`, `bond`).
- Duplicate *active* entries are rejected; a previously deactivated entry for
  the same ticker is reactivated rather than duplicated.
- Persistence survives refresh and session changes (server-side rows).
- Every endpoint requires a bearer JWT and scopes queries by `current_user.id`
  (no client-supplied user id, no IDOR).

## Market data

- `GET /api/v1/profile/watchlist/quotes` joins each active item with a
  provider-backed quote (Alpha Vantage when `ALPHA_VANTAGE_API_KEY` is set,
  otherwise yfinance), fetched once per distinct ticker with bounded
  concurrency and cached by `financial_data_service`.
- Each quote carries `price`, `change`, `change_percent`, `previous_close`,
  `currency`, `provider`, `observed_at`, `freshness`, and a `status`.
- A missing provider quote yields `status: "unavailable"` with a listed
  limitation — the API never fabricates a price or timestamp.
- `GET /api/v1/profile/watchlist/{id}/history` returns a compact daily/weekly/
  monthly close series for sparklines, or an explicit unavailable envelope.

## Geopolitical evidence

- `GET /api/v1/profile/watchlist/{id}/evidence` composes:
  - **recorded** links: `Entity` matched by ticker → `event_entities` → `Event`
    (treated as a reliable association), and
  - **candidate** links: live events matched by ticker keyword (labelled
    `KEYWORD MATCH · UNVERIFIED LINK`).
- The response always sets `causality: "not_established"` and lists
  uncertainty. **Correlation is not causation**: an association is never
  presented as the cause of a price move.
- `geography` (from the matched entity, else the first live event) lets the UI
  focus the globe. When no geographic relationship exists, the endpoint returns
  `association_reliability: "none"` rather than guessing.

### Entity resolution (asset → entity)

`app/utils/asset_entity_map.py` holds reviewed, explicit aliases for commodities
(`GC`, `SI`, `CL`, `NG`, `HG`), indices (`SPX`, `NDX`, `DJI`), currencies
(`EURUSD`, `DXY`, …) and common equities. `EntityRepository.resolve_asset()`
tries an exact entity-name match on those aliases first (`explicit_mapping`),
then an exact `ticker_symbols` token (`ticker_symbol`). `get_by_ticker()` now
narrows with SQL `LIKE` before the exact-token check, so substring false
positives (`'GO'` matching `'GOOGL'`, `'GC'` matching `'LGC'`) are impossible.

Currencies deliberately carry **no** entity aliases: `EntityType` has no
currency concept, so mapping a currency onto a region would be a false positive.
Association reliability and `causality='not_established'` are unchanged —
resolution only *locates* an entity; it never confirms a relationship.

### Extension point

The reliable path remains the recorded `event_entities` junction. To move
commodities, indices and currencies from candidate to recorded, populate
matching `Entity` rows and link them to events during ingestion; the resolver
will then use them automatically.

## Alerts

- Rules live in `watchlist_alert_rules`; triggers in `watchlist_alert_events`
  (migrations `b2c3d4e5f6a7`, `c3d4e5f6a7b8`); run history in
  `watchlist_alert_eval_runs`.
- Kinds: `target_price`, `stop_loss`, `percent_move`, `event_severity`.
- `POST /api/v1/profile/watchlist/alerts/evaluate` evaluates the current user's
  active rules against provider-backed data:
  - fires only on a genuine threshold crossing (state-change or, on first
    evaluation, `previous_close`-based crossing);
  - suppresses repeats via a persisted `last_state`, `last_triggered_at`
    cooldown, and a `dedupe_key` guard;
  - locks rule rows (`SELECT … FOR UPDATE`) so concurrent evaluations cannot
    double-fire;
  - **skips** rules whose provider quote is unavailable (`not_evaluable`).
- `event_severity` only evaluates against **recorded** entity-linked events. If
  no reliable link exists, the rule is reported as not evaluable.

### Scheduled evaluation

Celery beat enqueues `app.workers.watchlist_alert_tasks.evaluate_watchlist_alerts_task`
every `WATCHLIST_ALERT_SCHEDULE_MINUTES` (default 5). It runs independently of
frontend requests and is safe to re-run:

- **Overlap protection** — a partial unique index on `watchlist_alert_eval_runs`
  (`status = 'running'`) permits at most one in-flight run; a second invocation
  returns `status='skipped_locked'` without touching any rule. A `running` row
  older than `WATCHLIST_ALERT_LOCK_TTL_SECONDS` (300) is reclaimed as `failed`,
  so a crashed worker can never wedge the schedule.
- **Retries** — the task retries up to 3 times (60s apart) on unexpected errors
  (e.g. DB outage). Provider outages are *not* errors: unavailable quotes skip
  the rule and are counted.
- **Idempotency** — crossing detection, cooldown and the `dedupe_key` guard
  ensure a repeat run cannot create a duplicate event for the same crossing.
- **Observability** — `GET /api/v1/profile/watchlist/alerts/scheduler` returns
  `schedule_minutes`, `is_running`, `runs_last_24h`, `failures_last_24h`,
  `last_run_at`, `last_run_status`, `last_run_error`, `last_success_at`.

Deployment: needs a running Celery **worker** and **beat** (see `dev.sh` /
`backend/docker-compose.yml`). It uses the existing broker/backend settings
(`CELERY_BROKER_URL`, `CELERY_RESULT_BACKEND`) — no new env vars. Without a
worker, rules never fire automatically, but the manual
`POST /alerts/evaluate` endpoint still works.

### Notification lifecycle

- Trigger records are exposed via `GET /alerts/events` (add `?unread_only=true`),
  with `GET /alerts/unread-count`.
- `POST /alerts/events/{id}/read` and `POST /alerts/events/read-all` set the
  in-app read state (`is_read`, `read_at`). All queries are scoped to the owner;
  another user receives `404`.
- Delivery to external channels is a separate extension: nothing is configured
  and no credentials are exposed. `delivered` stays `false` until a delivery
  adapter is added.

## ATLAS

- `GET /api/v1/profile/watchlist/atlas-context` returns an authorized,
  user-scoped context (`assets`, `movers`, `unavailable_tickers`) with
  `causality: "not_established"`.
- ATLAS answers watchlist questions ("what changed for my watchlist today?",
  "which assets may be exposed to this event?") from this context via the
  `brief_watchlist` tool. Answers separate reported facts from uncertainty and
  never invent prices or causal claims.

## Required external services

| Capability | External dependency | Behaviour when absent |
| --- | --- | --- |
| Quotes / history | Alpha Vantage (optional) or yfinance | Explicit `unavailable` state |
| Evidence | Postgres (`entities`, `events`, `event_entities`, `live_events`) | `association_reliability: "none"` |
| Scheduled alert runs | Celery worker + beat (broker) | Manual `/alerts/evaluate` only |
| Alert delivery | none configured | In-app records only |
| ATLAS provider answers | an LLM key (optional) | Deterministic, evidence-grounded fallback |
