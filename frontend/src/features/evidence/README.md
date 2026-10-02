# Evidence Intelligence

Surface the canonical backend evidence contract on the globe without creating a
second evidence architecture.

## Contract

The panel renders exactly the backend `EvidenceObservation` envelope served by
`GET /api/v1/live-events/observation` (proxied as `/api/live-events/observation`)
and defined in `backend/app/schemas/observation.py`. The frontend mirror lives in
`src/api/evidenceApi.ts`.

Status values are `live`, `stale`, `degraded`, `unavailable`, and `demo`. Each is
shown with an icon, a label, and a plain-language meaning — never color alone.

## Flow

```
GLOBE selection (click) → useEvidenceSelection → /live-events/observation
      → AtlasStore.evidence → EvidencePanel → ATLAS (same observation in context)
                                      ↓ related entity click
                    handleGlobeSelect (existing globe focus/selection) → repeat

Backend event (GDELT / ingestion) → broadcast live_event_new on /ws
      → useLiveWorldSocket (validate + dedup) → WorldStore (globe/lists)
      → useLiveEvidenceRefresh (affects the selection?)
      → useEvidenceSelection.refresh() → same canonical observation → ATLAS
```

`useEvidenceSelection` is the only fetch path. It:

- runs only for a committed, non-empty selection (never on hover/camera motion),
- de-duplicates identical selections,
- drops late responses for a previous selection through a generation counter,
- resets to idle when the selection clears,
- refreshes the *same* selection in place on a poll interval (default 20s) and
  on demand, keeping the current observation visible while `refreshing` is true,
- keeps the last good observation if a refresh fails (surfacing the failure only),
- records `lastUpdatedAt` on every successful load/refresh.

A new selection shows a loading state and never the previous entity's
observation; a refresh of the same selection never resets the panel or the
globe. The globe overlay derives from `evidence.observation`, so it updates in
place when a refresh returns new data and clears affected highlights when an
observation becomes `unavailable`.

## Files

| File | Purpose |
|------|---------|
| `EvidencePanel.tsx` | Presentational panel: event, sources, impacts, markets, causal chain, freshness, confidence, provider status |
| `EvidenceStatusBadge.tsx` | Icon + label status chip |
| `evidenceStatus.ts` | Status metadata (label, meaning, tone, icon) for evidence and market observations |
| `marketObservations.ts` | Pure market-observation helpers (entity resolution, value/change formatting) |
| `causalChain.ts` | Pure causal-chain view over `causal_chain` (per-hop fields, limitations, market binding) |
| `useEvidenceSelection.ts` | Selection → canonical observation fetch lifecycle |

## Related-entity navigation

Causal links and affected assets become clickable **only** when the observation
carries a reliable entity reference:

- Causal nodes are navigable when their `source_type` / `target_type` is
  `geography`, `entity`, or `asset` — the node types the backend actually emits.
  Narrative `event` nodes stay inert.
- Affected assets are navigable when a `ticker` (preferred) or `name` is present.

`causalNodeEntity` and `affectedAssetEntity` in `src/api/evidenceApi.ts` are the
single source of that decision; they never infer a mapping. Clicking a related
entity calls the same `handleGlobeSelect` the globe uses, so the globe focus,
committed selection, and evidence load all flow through the existing system.

## Event → market impact

Market data is never a separate layer: it travels inside the canonical
`EvidenceObservation.market_observations` list, which the backend composes from
the event's affected assets (`backend/app/routes/live_events.py`) using the
existing quote service. The frontend mirrors that shape in
`api/evidenceApi.ts` and introduces no second market store, fetch path, or
socket.

Both surfaces render the same records:

- **Evidence panel (`Markets`)** — one row per affected asset with the affected
  asset, available value/change, observation timestamp/freshness, provider, and
  a status chip: `LIVE` (provider-backed), `STALE` (cached), `SIMULATED`, or
  explicitly `UNAVAILABLE`.
- **Event timeline** — the focused event's row surfaces a compact market strip
  from the same observation (the `evidence` prop threaded from
  `WorldCommandCenter`). Before evidence loads it says `MARKETS · LOADING`;
  with no records it says `MARKETS UNAVAILABLE`. It never fetches on its own.

Clicking a market asset routes through the **same globe focus path** as causal
nodes and affected-asset chips (`onSelectEntity` → `handleGlobeSelect`), so the
globe, committed selection, and evidence load all follow the existing system.
The single source of that decision is `marketObservationEntity` — a symbol is
navigable only when the provider actually supplied one.

Nothing is fabricated. An `unavailable` observation states so and never
substitutes a seeded or synthetic value, and `simulated` data is labelled
`SIMULATED` everywhere (it is deliberately **not** collapsed into the generic
`DEMO` chip). The layer displays only relationships already present in the
canonical evidence; it never infers a causal link between an event and a price
move.

## Causal intelligence

`causalChain.ts` turns the canonical `EvidenceObservation.causal_chain` into a
structured view — `EVENT → IMPACT → AFFECTED ENTITY/ASSET → MARKET OBSERVATION`
— without a graph engine or a second evidence model. Each hop exposes only what
the envelope recorded:

- the recorded source and target labels and their recorded types;
- the recorded confidence, or an explicit `CONFIDENCE NOT RECORDED`;
- the recorded `evidence_ref`, or `EVIDENCE REFERENCE NOT RECORDED`;
- for an asset target, the market observation **already in the same envelope**
  (bound by exact provider symbol), or `NO MARKET OBSERVATION RECORDED FOR THIS ASSET`.

The panel renders this prominently (right after the event), shows a
`RECORDED / MARKET-LINKED / LIMITED` summary, and reuses the existing related-
entity navigation: `geography`/`entity`/`asset` nodes are clickable through the
same `onSelectEntity` → `handleGlobeSelect` path; narrative `event` nodes and
unrecognized types stay inert. The globe overlay already draws an arc only when
both sides are reliable typed, resolvable references.

Every gap is stated rather than filled: missing source/target/type, an
unrecognized node type, missing confidence, a missing evidence reference, and a
missing market observation are all surfaced as limitations. The section never
asserts causality beyond the recorded links — a note states that co-movement in
time is not treated as a cause, and an empty chain is shown as `NO CAUSAL LINKS
WERE RETURNED`.

ATLAS reads the same chain through its context briefing: the `CAUSAL
RELATIONSHIPS` section lists every recorded link with its types, confidence, and
evidence reference, then explicitly distinguishes recorded evidence from
unsupported inference. The backend agent prompt carries the same rule, so the
provider never asserts causality the envelope does not record.

## Globe visualization

The globe reacts to the observation currently displayed in the panel. It does
not fetch on its own — `CinematicGlobe` reads `AtlasStore.evidence` and derives
highlights through `buildEvidenceGlobeOverlay`:

- the selected entity gets a distinct gold marker, ring, and label;
- affected entities/assets (from `entities`, `assets`, `impacts`) get cyan
  markers **only** when they resolve to real coordinates;
- causal edges become arcs **only** when both sides are reliable typed refs and
  both endpoints resolve;
- when evidence is cleared/loading/changed the overlay is empty, which clears
  every evidence-driven highlight.

Coordinates come from the existing globe systems (`resolveCoords`, then
`resolveCompanyLocation`). Nothing is placed on the globe without a genuine
coordinate, so no relationship or location is invented.

## Live event ingestion → evidence refresh

New backend events arrive over the **existing** `/ws` broadcaster (channel
`live_events`, plus `events`) — no second socket, store, or bus. The extended
`useLiveWorldSocket`:

- subscribes to `live_events` alongside the existing channels;
- strictly validates every event envelope (`parseLiveEventEnvelope`): missing
  id, title, severity, coordinates, or a parseable timestamp drops the message
  instead of inventing a country, position, or time;
- deduplicates by id / source URL / title across reconnects and across the
  backend's dual `live_events` + `events` broadcasts of the same article;
- ignores `live_event_update` / `live_event_resolved` for entries already on
  screen (only `live_event_new` creates a world-state entry);
- reconnects with bounded backoff, resets the counter on a healthy open, and
  never reconnects after unmount or past the retry cap.

`useLiveEvidenceRefresh` wraps the existing `useEvidenceSelection` lifecycle:
when a validated event affects the current selection (backend country code/
name or a word-boundary mention — `eventAffectsSelection`), it calls the same
in-place `refresh()`. Selection, panel, globe, and ATLAS context are preserved
while the refreshed canonical observation swaps in. Evidence that is loading,
failed, or belongs to another entity is never refreshed.

Seeded/simulated events stay `dataMode: 'simulated'`; only validated backend
WebSocket events flip the world state to `live`.

## No fabrication

The panel never invents sources, confidence, market values, causal links,
timestamps, or provider information. Missing optional fields render as
`NOT PROVIDED` / `UNAVAILABLE`, and an empty section states that no records were
returned. Transport failures render an explicit error state rather than falling
back to fabricated evidence.

ATLAS reads the same `AtlasStore.evidence.observation` from its context snapshot,
so the assistant references the exact evidence the panel displays. When evidence
is `unavailable`, `stale`, or `demo`, that status stays explicit in both surfaces.

## Evidence-grounded ATLAS answers

`evidenceBriefing.ts` renders the canonical observation as a deterministic
briefing covering every aspect ATLAS must answer: what happened, sources,
impacts, assets/markets, causal relationships, freshness/confidence/
uncertainty, plus an explicit `NOT ESTABLISHED` list of what the envelope does
not contain. It never invents a value: missing fields render as `NOT PROVIDED`
and empty sections state that the evidence does not establish them.

The briefing travels with the context snapshot (`evidence.briefing`) so the
structured provider answers from the observation on screen (reinforced by
evidence-grounding rules in the backend agent prompt), and it powers the
deterministic fallback answer for evidence questions — including the Ask ATLAS
flag threaded from the panel. The snapshot derives `latestEvidence` from the
current observation, so a loading selection or failed load never carries a
previous entity's evidence into ATLAS.
