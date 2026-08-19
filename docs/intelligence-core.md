# MarketAtlas — ATLAS Intelligence & the World Core

> *How a spoken question becomes a living globe scene — the end-to-end intelligence pipeline of MarketAtlas.*

ATLAS is the voice-first general intelligence at the heart of MarketAtlas. It
hears natural language, decides whether the question is about markets or about
the world in general, produces an answer with any LLM provider, and — when the
answer touches geography, trade, risk, or conflict — returns a structured
**`VisualizationIntent`** that drives the frontend's **World Intelligence Core**.

This document walks the whole path, layer by layer.

---

## 1. The Layers

| Layer | Where it lives | Responsibility |
|-------|---------------|----------------|
| **Voice** | `frontend/src/assistant/voice` | OpenAI Realtime WebRTC or browser speech; wakes the brain |
| **Brain** | `frontend/src/assistant/brain` | Routes to the backend; answers offline if needed |
| **Backend Workflow** | `backend/app/chatbot/workflow` | LangGraph orchestrates intent routing → agents → response |
| **Visualization** | `backend/app/chatbot/atlas` | Query → `VisualizationIntent` (mirrored offline in the frontend) |
| **World Core** | `frontend/src/features/globe`, `frontend/src/globe` | Renders the intent as particles, routes, heat, and camera motion |

### The Brain Contract

Frontend and backend agree on a single JSON contract — `VisualizationIntent`:

```
mode        → core | globe | country | region | route | network | risk | conflict | abstract
focus       → [countries / entities to highlight]
origin      → route start
destination → route end
scale       → global | regional | country
camera      → pullback | zoom_in | orbit
transition  → particle_reform | disintegrate | reassemble
palette     → ultron | gold | risk | core
caption     → human-readable summary
```

The type is defined once on the backend in `backend/app/chatbot/models.py`
(`VisualMode`, `VisualizationIntent`) and mirrored on the frontend in
`frontend/src/api/chatApi.ts` and `frontend/src/features/globe/visualizationIntent.ts`.

---

## 2. The Frontend Brain

`brain/atlasBrain.ts` is the entry point for every utterance:

```
utterance
  │
  ├─ backendOnline()?
  │     ├─ YES → POST /api/chat
  │     │        ├─ text       → spoken back
  │     │        └─ commands   → VISUALIZE / FOCUS_COUNTRY / SHOW_ROUTE / ...
  │     └─ NO  → atlasBrain(utterance)?   (domain commands)
  │                 └─ no match → generalAnswer(utterance)
  │                               ├─ curated topics (relativity, LSTM vs
  │                               │   Transformer, Hormuz, GDP, ...)
  │                               ├─ safe math evaluator ("15 * 4 + 2 = 62")
  │                               └─ graceful fallback copy
  │
  └─ inferVisualization(utterance) → VisualizationIntent (offline mirror)
```

### The Offline General Brain

`brain/generalKnowledge.ts` answers without any backend:

- **Math** — a shunting-yard evaluator handles `+ - * / ^ ( )` safely
  (no `eval`, regex-validated input).
- **Curated topics** — relativity, quantum mechanics, Fourier transforms,
  LSTM vs Transformers, black holes, trade routes, Hormuz, GDP, inflation,
  chip supply chains.
- **Code & questions** — guides the user to describe the task precisely and
  transparently notes when deeper depth needs the backend LLM.

---

## 3. The Backend Workflow

`backend/app/chatbot/workflow/graph.py` builds a LangGraph `StateGraph`:

```
route_intent (LLM classification + heuristics)
   │
   ├─ MARKETATLAS intent ──► specialist agents (News, Market, Impact, Graph, ...)
   │
   └─ ATLAS intent ──────► execute_atlas → AtlasAgent → LLM answer
                             (general reasoning, no market scaffolding)

every path continues to:
   extract_visualization(query, intent) ──► visualization (or None)
   build_response ──► ChatResponse { text, commands, visualization }
```

`intent_router.py` keeps three signals in sync:

1. An **LLM classification prompt** that includes a ATLAS category.
2. A heuristic `_looks_general()` guard for obvious general queries.
3. A `GENERAL_SIGNALS` list (science/code/math/history/philosophy terms).

`AtlasAgent` (`backend/app/chatbot/agents/atlas_agent.py`) uses the shared
`get_llm()` provider abstraction, so it works with OpenAI, Gemini, Claude, or
Ollama — or a deterministic mock when nothing is configured.

---

## 4. The World Intelligence Core

The globe is the canvas. `WorldCore` (`frontend/src/features/globe/WorldCore.tsx`)
turns an intent into a rendered scene:

```
VisualizationIntent
      │
      ▼
resolveScene(intent) ──► SceneConfig { transition, camera, routes, regions, overlays }
      │
      ├── ParticleCore     26k-particle GLSL sphere
      │                     • detach → disintegrate / reform
      │                     • focus  → particles heat toward a country
      │                     • red clusters over high-risk world states
      ├── FlowParticles     animated golden/blue streams along routes
      ├── RegionClusters    pulsing dense clusters at focuses
      ├── Heatmap / Arcs / Nodes / Labels   (mode-dependent overlays)
      └── CameraDirector    GSAP flight to the semantic framing
```

### SceneDirector (`frontend/src/features/globe/SceneDirector.ts`)

`resolveScene` reads the intent and decides *everything visual*:

| Mode | Camera | What you see |
|------|--------|--------------|
| `globe` | pullback (~6.5) | full particle world, breathing idle |
| `country` | zoom (~3.1) | particles heat around the focused country |
| `region` | regional (~4.1) | region clusters + selected overlay |
| `route` | pullback (~7) | origin → destination particle stream |
| `network` | pullback | arcs over major hubs |
| `risk` | zoom_in | red heatmap + disintegrate transition |
| `conflict` | zoom_in | risk palette + conflict clusters |
| `abstract` | orbit | full detachment, slow orbital camera |

Routes are built from the intent's origin/destination or fan out from a focus
entity toward `MAJOR_HUBS`. Risk regions come from `worldStates` with
`riskScore >= 55`. Palettes (`ultron`, `gold`, `risk`, `core`) recolor the core,
flows, and clusters in one switch.

### ParticleCore (`frontend/src/globe/ParticleCore.tsx`)

A fibonacci-sphere of ~26,000 particles with a hand-written GLSL shader:

- **Breathing** — per-particle sinusoidal radius wobble.
- **Swirl** — slow differential rotation by seed.
- **Detach** — interpolates each particle between its shell position and a
  scattered cloud (the `disintegrate` / `particle_reform` transitions).
- **Focus heat** — particles near the focused country are pulled toward it,
  brighten, and shift toward the heat color.
- **Risk clusters** — particles aligned with high-risk countries tint red.

The shader guards against zero-length focus vectors, so idle/globe mode never
produces NaN artifacts.

### FlowParticles & RegionClusters

- `FlowParticles` draws one arc per route (spherical quadratic through an
  elevated midpoint), and animates a bright "head" traveling along the arc —
  the classic ULTRON route stream.
- `RegionClusters` spawns ~700-particle clouds at each focus, pulsing and
  rotating slowly, colored by intensity.

### CameraDirector

A tiny component that owns a GSAP tween on `camera.position` and re-aims
`camera.lookAt` every tick. It receives the `SceneConfig.camera` target and a
`runId` — the first run applies instantly, later runs fly smoothly
(power2.inOut, ~1.6s).

---

## 5. Worked Examples

| Query | Intent | Globe response |
|-------|--------|----------------|
| "Show me the route from India to Germany" | `route` · India → Germany | golden particle stream along the corridor, pullback camera |
| "What is happening in Iran?" | `country` · focus [Iran] | zoom to Iran; particles heat around it |
| "Show me the trade routes to Asia" | `route` · focus [Asia hubs] | streams fan out to major Asian ports |
| "What about conflict zones?" | `conflict` · risk palette | red clusters + heatmap, zoom_in, disintegrate |
| "Show India-China border tensions" | `conflict` · focus [India, China] | both countries highlighted, risk overlay |
| "Explain general relativity" | `abstract` · orbit | full particle detach, slow orbital camera |
| "What is 15 * 4 + 2?" | `abstract` | globe answers "62", no camera move |
| "Show China maritime trade routes" | `route` · origin [China] | streams from China to major hubs |

## 6. Verification

- `npx tsc --noEmit` and `npm run build` pass in `frontend/`.
- `npx vitest run` — 72 tests, including `inferVisualization.test.ts`
  (mode mapping) and `generalKnowledge.test.ts` (math + curated topics).
- Backend modules compile via `python -m py_compile`; the visualization
  extractor is exercised with a stubbed model in isolated runs.

## 7. Design Decisions

1. **One contract, two implementations** — backend and offline frontend produce
   the same `VisualizationIntent` shape, so the globe never waits on the network.
2. **Deterministic priority** — abstract → route → conflict → risk → network →
   country → region → globe keeps recognition predictable and testable.
3. **Heuristics over magic** — `_looks_general()` and keyword signals make the
   classifier work even before the LLM prompt, and stay fast on every query.
4. **Shaders that never NaN** — the particle shader guards zero-length focus so
   idle modes render cleanly on every GPU.
5. **Camera as a consequence** — the camera is derived from the intent, never
   hand-positioned, so voice and UI clicks share one choreography.