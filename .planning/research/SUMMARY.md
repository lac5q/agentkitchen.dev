# Research Summary: Memroos v4.0 — Orchestration Depth + Intelligence Uplift

**Researched:** 2026-05-17
**Overall Confidence:** HIGH

---

## Executive Summary

v4.0 is a depth-over-breadth milestone that extends existing LangGraph/Pipecat/mem0 capabilities with minimal new dependencies — only `voyageai` and `deepeval` are net-new Python libraries. The build order is strictly determined by two infrastructure pre-conditions (WAL pragma on `orchestration.db`, memory adapter interface) that must land in Phase 1 to unblock all subsequent features. The three highest-risk items — voice transport feasibility, behavioral eval sandboxing, and concurrent HIL edit races — each have clear mitigations but require explicit design decisions before sprint work begins.

---

## Stack Additions (Net-New Only)

| Service/Package | Layer | Version | Feature |
|----------------|-------|---------|---------|
| `langgraph>=1.2,<2.0` | orchestration service (pin tightening) | 1.2.0 | HIL edit, timeout policy, retry, compensation |
| `pipecat-ai[daily]>=1.2,<2.0` | voice service (upgrade + extra) | 1.2.1 | Daily.co WebRTC transport for meeting bot |
| Recall.ai | external SaaS (optional bridge) | v1 REST | Zoom/Meet/Teams join if Daily-only not accepted |
| `voyageai>=0.2,<1.0` OR Ollama `nomic-embed-text` | memory service (new) | 0.2.4 / already-in-stack | LLM-powered recall embeddings (see Open Questions) |
| `deepeval>=4.0,<5.0` | orchestration service (new) | 4.0.2 | Behavioral W-lift eval harness |

**What NOT to add:** Redis/Celery, Temporal, LlamaIndex, APScheduler, Cohere rerank, `recallai` PyPI stub, node-llama-cpp (known macOS arm64 crash), AutoGen/CrewAI.

---

## Feature Table Stakes

### HIL Edit-and-Continue (Medium complexity)
- `PATCH /hil/{id}/edit` separate from `POST /hil/{id}/resolve`
- Edited values validated against `OrchestrationState` Pydantic schema before `update_state` call
- Audit log records who edited, which fields changed, before/after values

### HIL Timeout + SLA Escalation (Medium complexity)
- Configurable SLA deadline per interrupt type, stored as ISO timestamp in `orchestration_hil_decisions`
- Background scheduler in Next.js `instrumentation.ts` polls `/hil/expired` every 60s (NOT Python asyncio)
- Dashboard shows countdown timers and SLA traffic-light status

### Multi-Hop Retry + Rollback (High complexity)
- Per-hop retry budget via LangGraph `RetryPolicy`
- Compensation stored as declarative `orchestration_lineage` rows (never Python closures — lost on restart)
- A2A task status reflects failure granularly: "failed at hop N, compensated hops 1..N-1"

### Memory Backend Pluggability (Medium complexity)
- `MemoryAdapter` interface: `search()`, `write()`, `health()` only
- Adapter registry in `lib/memory/registry.ts` maps `MemoryTier` to `MemoryAdapter[]`
- Existing mem0/Qdrant/Neo4j wrapped as concrete adapters; new backends register without touching existing code

### Voice Meeting Bot (High complexity)
- `DailyTransport` (Daily.co WebRTC) — no native Zoom/Teams; bridge service (Recall.ai) needed for those
- `pipeline_meeting.py` as third pipeline mode in `services/voice-server/`
- Listener-only in v4 (no TTS output); meeting URL/tokens never logged; recording consent UI required

### LLM-Powered Recall Scoring (Medium complexity)
- Hybrid BM25 + dense embedding + RRF fusion
- Embeddings precomputed at ingest (background job, 50 messages/cycle, 5-min interval)
- New `message_embeddings` table in `conversations.db`; Qdrant remains exclusively for mem0
- `GET /api/recall` gains `mode=semantic|bm25|hybrid`; BM25 remains default; degrades gracefully

### Cross-Project Recall (Medium complexity)
- Opt-in per query: caller must pass `crossProject: true` + explicit `allowed_project_ids`
- Depends on LLM recall phase (`message_embeddings` + `semanticRecall()`)
- No recursive readdir; additional projects registered via explicit path config only

### True Behavioral W-Lift (High complexity — largest v4.0 surface)
- `BehavioralEvalService` implements `EvalServiceLike.rescoreForProposal()` with real A2A dispatch
- Held-out sample of 10-20 representative tasks (not exhaustive re-execution)
- `applyProposal()` returns job_id immediately; UI polls — never blocks request handler
- Sandboxed eval profile with stubbed side-effect tools is a design prerequisite

### UI: Flow Trigger + Library Freshness (Low complexity)
- `POST /api/knowledge/update` spawns `qmd update`, streams progress via SSE
- `/api/knowledge/status` exposes delta between last-indexed timestamp and latest file mtime

### Cross-Harness Skills (Low-Medium — SCOPE UNCONFIRMED)
- Not in `PROJECT.md` Active (v4.0) — must confirm or defer before roadmap is written
- If in scope: new `skill_registry` table; A2A dispatcher looks up registry first

---

## Critical Pre-Conditions (Must Resolve Before Phase 1)

| Pre-condition | File | Action |
|--------------|------|--------|
| WAL pragma on `orchestration.db` | `services/orchestration/engine.py` | Add `PRAGMA journal_mode=WAL` + `busy_timeout=5000` in `OrchestrationStore.__init__` before `_init_schema()` |
| LangGraph version pin | `services/orchestration/requirements.txt` | `langgraph>=1.2,<2.0` (currently unpinned) |
| Pipecat upgrade + daily extra | `services/voice-server/requirements.txt` | `pipecat-ai[daily]>=1.2,<2.0` (currently `==1.0.0`) |
| Voice transport decision | Architecture | Daily-only vs Daily+Recall.ai bridge before VOICE-06..08 requirements |
| Cross-harness skills scope | Product | Confirm v4.0 or defer before roadmap finalized |
| Embedding provider decision | Architecture | Ollama `nomic-embed-text` (local, no billing) vs `voyageai` (higher quality, new billing) |

---

## Watch Out For (Top Pitfalls)

1. **`orchestration.db` missing WAL pragma (CRITICAL)** — concurrent HIL edit+resume will stall under rollback journal. Fix in first phase that touches orchestration service.
2. **SEAL behavioral re-execution mutates live state (CRITICAL)** — must have sandboxed eval profile with no-op tool stubs before any Phase 3 SEAL work begins.
3. **No native Zoom/Teams transport in Pipecat (HIGH)** — `DailyTransport` is the production meeting transport. Choose integration path before writing VOICE requirements.
4. **Concurrent HIL edits race the checkpointer (HIGH)** — serialize per `thread_id` with a lock or optimistic status check.
5. **Wrong `as_node` silently terminates graph (HIGH)** — use `as_node="route_policy"` not `as_node="approval"` for task payload edits.
6. **Compensation closures lost on process restart (HIGH)** — store as `orchestration_lineage` rows, never Python callables.
7. **Cross-project recall defaults leak context (HIGH)** — must be opt-in with explicit `allowed_project_ids`; single-project default is mandatory.

---

## Recommended Phase Structure

### Phase 70: Foundation + Engine Core
WAL fix + HIL edit-and-continue + multi-hop retry/rollback + memory adapter interface.
Python engine and TypeScript adapter merged to avoid `graph.py` conflicts and double interrupt schema migrations.
**REQ:** HIL-01..03, ORCH-08..10, MEM-06..08

### Phase 71: Recall + HIL SLA + Voice
LLM semantic recall + SLA escalation timers + Daily.co meeting bot.
Parallelizable across teams after Phase 70 foundation.
**REQ:** RECALL-01..02, HIL-04..06, VOICE-06..08

### Phase 72: Cross-Project Recall + Behavioral W-lift + UI Polish
Depends on Phase 71 embeddings + stable A2A hub.
Highest-complexity features; sandbox design required before sprint.
**REQ:** RECALL-03..04, SEAL-04..06, UI-05, UI-06, (skills TBD)

### Research Flags for Plan-Phase

- **Phase 70 (ORCH-08..10):** Saga compensation requires auditing all existing agent chains for compensating actions — use `--research-phase` when planning
- **Phase 71 (VOICE-06..08):** External service integration (Daily + Recall.ai) has no CI coverage — use `--research-phase`
- **Phase 72 (SEAL-04..06):** Sandbox mechanism, async eval runner, token budget all need detailed design — use `--research-phase`

---

## Open Questions

1. **Embedding provider** — Ollama `nomic-embed-text` (local, no billing, already in stack) vs `voyageai` (higher quality, new billing). Recommendation: start with Ollama, gate behind `MEMROOS_EMBEDDING_PROVIDER` env flag.
2. **Voice transport path** — Daily-only acceptable for v4.0? If Zoom/Teams needed, initiate Recall.ai account before Phase 71 planning.
3. **Cross-harness skills portability** — v4.0 or defer to v4.1?
4. **SEAL behavioral eval sandbox** — who designs the no-op stub configuration? Must be a spec before Phase 72 sprint.
5. **Saga compensation audit** — which existing A2A chains have compensating actions, which need them retrofitted?

---

## Sources

- Source files: `services/orchestration/graph.py`, `engine.py`, `lib/memory/backends.ts`, `db-schema.ts`, `audit/sla.ts`, `lib/seal/service.ts`, `lib/evals/engine.ts`
- Context7: LangGraph (`update_state`, `as_node`, `interrupt`, `RetryPolicy`, `TimeoutPolicy`), Pipecat (`DailyTransport`), Voyage AI, DeepEval
- [Recall.ai docs](https://docs.recall.ai), [Pipecat issue #3272](https://github.com/pipecat-ai/pipecat/issues/3272)
- SagaLLM: arxiv 2503.11951

*Research completed: 2026-05-17 | Ready for roadmap: yes — pending 5 Open Questions above*
