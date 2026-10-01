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
| `evidenceStatus.ts` | Status metadata (label, meaning, tone, icon) |
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
