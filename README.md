# Geopolitical Episodic Memory (GEM)

> *Cognitive science inspired memory system for MarketAtlas — because geopolitical intelligence shouldn't forget.*

**GEM** is an active memory service that transforms geopolitical events into structured, queryable, evolving episodes. Inspired by how the human brain organizes experience into episodic, semantic, and procedural memory, GEM serves as the central intelligence layer for MarketAtlas — powering the chatbot, forecasting models, scenario simulator, explainability engine, and LSTM pipelines.

---

## Philosophy

Humans don't remember every sentence they read. We remember *episodes*.

```
COVID Pandemic
├── when it started
├── who was involved
├── how it evolved
├── market reaction
├── outcome
└── lessons learned
```

MarketAtlas works the same way. News articles are clustered, deduplicated, and fused into rich **Memory Episodes** — not documents. Each episode has a timeline, participants, entities, commodities, sectors, market reactions, outcomes, embedded representations, graph relationships, and evolving lessons. Memory grows over time, never freezes.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Memory Service                            │
│  ┌───────────┬───────────┬───────────┬──────────────────┐   │
│  │ Episodic  │ Semantic  │Procedural │   Embeddings /   │   │
│  │  Memory   │  Memory   │  Memory   │    Similarity    │   │
│  ├───────────┼───────────┼───────────┼──────────────────┤   │
│  │ Episodes  │  Facts    │Processes  │   Weighted Cos.  │   │
│  │ Timelines │ Relations │ Workflows │   Hybrid Search  │   │
│  │ Outcomes  │  Graphs   │ Triggers  │   Analog Search  │   │
│  │ Lessons   │           │           │   Multi-dim Rank │   │
│  └───────────┴───────────┴───────────┴──────────────────┘   │
│                             │                                │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Storage Layer                                       │   │
│  │  ┌──────────┐  ┌────────┐  ┌───────┐  ┌──────────┐ │   │
│  │  │PostgreSQL│  │ Qdrant │  │ Neo4j │  │    S3    │ │   │
│  │  │Metadata  │  │Vector  │  │ Graph │  │ Raw Data │ │   │
│  │  └──────────┘  └────────┘  └───────┘  └──────────┘ │   │
│  └──────────────────────────────────────────────────────┘   │
│                             │                                │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  API Layer (REST + WebSocket)                        │   │
│  │  Chatbot  Forecasting  LSTM  Simulator  Explainability│   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### Processing Pipeline

```
News ──► Deduplicate ──► Cluster ──► Episode Builder
                                              │
                                              ▼
                                    Embedding Generator
                                              │
                                              ▼
                                    Knowledge Graph (Neo4j)
                                              │
                                              ▼
                                    Outcome Tracker
                                              │
                                              ▼
                                    Lesson Engine
                                              │
                                              ▼
                                    Memory Store (PG + Qdrant + Neo4j + S3)
                                              │
                                              ▼
                                    Evolution / Consolidation
```

---

## Memory Types

| Type | What | Example |
|------|------|---------|
| **Episodic** | Events with context | *Russia invaded Ukraine (Feb 2022)* |
| **Semantic** | Facts and relations | *Russia exports oil; Sanctions cause inflation* |
| **Procedural** | Processes and workflows | *How sanctions affect supply chains → 5-step assessment* |

---

## Core Object: `Episode`

```python
Episode {
    id                  # Unique identifier
    title               # Event title
    summary             # Narrative description
    timeline            # Chronological event sequence
    participants        # Nations, orgs, non-state actors
    locations           # Geographic scope
    entities            # Named entities involved
    commodities         # Oil, gas, wheat, gold, etc.
    sectors             # Energy, defense, agriculture, etc.
    market_reaction     # Market impact snapshot
    world_state_before  # Pre-event conditions
    world_state_after   # Post-event conditions
    embeddings          # Multi-field vector representation
    confidence          # Source reliability score (0-1)
    outcomes            # Measurable market/economic results
    lessons             # Reusable derived insights
    references          # Source URLs
    tags                # Classification labels
    cluster_id          # News cluster grouping
    is_meta             # Consolidated meta-memory flag
}
```

---

## Repository Structure

```
marketatlas-memory/
│
├── episodic_memory/          # Event-centric memory
│   ├── models/               # Episode, Participant, Outcome, Timeline
│   ├── builders/             # Episode, Timeline, Lesson builders
│   ├── retrievers/           # Similarity & analog search
│   ├── storage/              # PostgreSQL, Qdrant, Neo4j stores
│   └── evolution/            # Updater, Merger, Consolidator
│
├── semantic_memory/          # Fact-centric memory
│   ├── models.py             # Fact, SemanticGraph
│   ├── extractor.py          # Regex-based fact extraction
│   └── store.py              # In-memory fact graph
│
├── procedural_memory/        # Process-centric memory
│   ├── models.py             # Procedure, ProcedureStep
│   ├── extractor.py          # Sanctions/conflict templates
│   └── store.py              # Procedure registry
│
├── embeddings/               # Vector representation
│   ├── generator.py          # Sentence-transformer encoder
│   └── models.py             # Weighted multi-field encoding
│
├── similarity/               # Similarity computation
│   ├── cosine.py             # Pure cosine similarity
│   └── weighted.py           # 7-dim weighted similarity
│
├── indexing/                 # Pre-processing
│   ├── clusterer.py          # DBSCAN event clustering
│   └── deduplicator.py       # Fingerprint + embedding dedup
│
├── consolidation/            # Memory compression
│   ├── meta_memory.py        # Meta-episode builder
│   └── compressor.py         # Event count compression
│
├── retrieval/                # Search layer
│   ├── episode_retrieval.py  # Semantic + metadata search
│   └── hybrid.py             # Vector + graph hybrid search
│
├── outcomes/                 # Outcome tracking
│   ├── tracker.py            # Record & classify outcomes
│   └── analyzer.py           # Cross-episode analytics
│
├── lessons/                  # Lesson mining
│   ├── engine.py             # Lesson generation engine
│   └── templates.py          # Market, conflict, supply templates
│
├── evolution/                # Memory lifecycle
│   ├── updater.py            # Append new data to episodes
│   ├── merger.py             # Merge episodes into meta-memories
│   └── consolidator.py       # Weekly auto-consolidation
│
├── storage/                  # Infrastructure
│   ├── factory.py            # Storage layer factory
│   └── s3.py                 # Object storage for raw data
│
├── api/                      # Service layer
│   ├── memory_service.py     # Central intelligence hub
│   ├── routes.py             # 23 REST endpoints
│   ├── websocket.py          # Bidirectional WebSocket
│   └── dependencies.py       # FastAPI DI
│
├── tests/                    # 44 tests (all passing)
│
├── main.py                   # FastAPI application entry
├── config.py                 # Pydantic settings
├── pyproject.toml            # Project metadata
└── requirements.txt          # Python dependencies
```

---

## API Reference

### REST Endpoints (23 total)

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/health` | Service health check |
| | **Episodes** | |
| `POST` | `/api/v1/memory/episodes` | Create episode from articles |
| `GET` | `/api/v1/memory/episodes` | List recent episodes |
| `GET` | `/api/v1/memory/episodes/{id}` | Get episode details |
| `PUT` | `/api/v1/memory/episodes/{id}` | Update with new articles |
| `DELETE` | `/api/v1/memory/episodes/{id}` | Delete episode |
| | **Search** | |
| `GET` | `/api/v1/memory/search?query=` | Semantic vector search |
| `GET` | `/api/v1/memory/search/hybrid?query=` | Vector + graph hybrid search |
| `GET` | `/api/v1/memory/search/metadata?locations=&sectors=` | Metadata-filtered search |
| | **Similarity & Analogy** | |
| `GET` | `/api/v1/memory/similar/{id}` | Weighted multi-dim similarity |
| `GET` | `/api/v1/memory/analogous/{id}` | Historical analogy engine |
| | **Outcomes** | |
| `POST` | `/api/v1/memory/outcomes/{id}` | Record market/economic outcome |
| `GET` | `/api/v1/memory/outcomes/{id}` | Get outcome summary |
| `POST` | `/api/v1/memory/outcomes/analyze` | Cross-episode outcome analysis |
| | **Lessons** | |
| `POST` | `/api/v1/memory/lessons/{id}/generate` | Generate derived lessons |
| `GET` | `/api/v1/memory/lessons/{id}` | Get stored lessons |
| | **Consolidation** | |
| `POST` | `/api/v1/memory/consolidate` | Merge episodes into meta-memory |
| `POST` | `/api/v1/memory/consolidate/auto` | Auto-consolidate similar episodes |
| | **Analysis** | |
| `GET` | `/api/v1/memory/timeline/{id}` | Timeline reconstruction |
| `GET` | `/api/v1/memory/confidence/{id}` | Confidence estimation |
| `GET` | `/api/v1/memory/facts` | Semantic fact query |
| `GET` | `/api/v1/memory/procedures` | Procedural memory query |
| `GET` | `/api/v1/memory/stats` | Memory service statistics |

### WebSocket (`/ws`)

| Action | Description |
|--------|-------------|
| `search` | Semantic search with filters |
| `find_similar` | Weighted similarity by episode ID |
| `get_episode` | Full episode details |
| `get_timeline` | Chronological timeline |
| `get_outcomes` | Outcome summary |
| `generate_lessons` | Generate lessons on demand |
| `analogous` | Historical analogy search |
| `hybrid_search` | Vector + graph hybrid search |
| `ping` | Connection health check |

---

## Similarity Model

GEM computes similarity across **seven dimensions**, each weighted:

```
Similarity = 0.25 × Event + 0.20 × Entities + 0.15 × Sectors
           + 0.10 × Location + 0.15 × Market + 0.10 × Timeline
           + 0.05 × Graph
```

Each comparison returns a **breakdown** so you can see exactly *why* two episodes are considered similar — not just a black-box score.

---

## Storage Architecture

| Database | Purpose |
|----------|---------|
| **PostgreSQL** | Episode metadata, structured fields, search indexes |
| **Qdrant** | Vector embeddings, semantic similarity search |
| **Neo4j** | Knowledge graph, entity relationships, graph traversal |
| **S3** | Raw articles, reports, large binary payloads |

---

## Quick Start

```bash
# Install dependencies
pip install -r requirements.txt

# Configure environment (optional: uses defaults otherwise)
export MATLAS_POSTGRES_DSN="postgresql+asyncpg://user:pass@localhost:5432/marketatlas"
export MATLAS_QDRANT_URL="http://localhost:6333"
export MATLAS_NEO4J_URI="bolt://localhost:7687"

# Run the service
python main.py

# Open API docs
# → http://localhost:8010/docs
```

---

## Integration

GEM is the **central memory layer** consumed by every MarketAtlas component:

```
┌────────────┐   ┌──────────────┐   ┌────────────┐
│  Chatbot   │   │  Forecasting │   │    LSTM    │
│  (RAG QA)  │   │  (Prediction)│   │  (Pattern) │
└─────┬──────┘   └──────┬───────┘   └─────┬──────┘
      │                 │                 │
      └─────────────────┼─────────────────┘
                        ▼
              ┌──────────────────┐
              │  Memory Service  │
              │  (GEM API)       │
              └──────────────────┘
                        ▲
      ┌─────────────────┼─────────────────┐
      │                 │                 │
┌─────┴──────┐   ┌──────┴───────┐   ┌─────┴──────┐
│ World      │   │Explainability│   │  Scenario  │
│ Simulator  │   │ (Why Engine) │   │  Simulator │
└────────────┘   └──────────────┘   └────────────┘
```

---

## Design Principles

1. **Memory is an active service, not passive storage** — every component calls the Memory Service through APIs
2. **Three memory systems** — episodic (events), semantic (facts), procedural (processes) — mirroring cognitive science
3. **Episodes evolve** — memories grow richer over time via updates, outcomes, and lessons
4. **Consolidation compresses** — similar episodes merge into meta-memories, exactly like human memory
5. **General by design** — templates and patterns are abstract, not hardcoded to specific events
6. **Weighted similarity** — multi-dimensional comparison that considers every facet of an event
7. **Confidence scoring** — every memory carries a reliability score based on source count, diversity, and verification

---

## Testing

```bash
# Run all tests
pytest tests/ -v

# 44 tests covering:
#   ✓ Episode model creation & manipulation
#   ✓ Episode builder pipeline
#   ✓ Cosine & weighted similarity
#   ✓ Outcome recording & analysis
#   ✓ Lesson generation engine
#   ✓ Deduplication & clustering
```

---

## License

MIT — MarketAtlas
