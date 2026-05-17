# Architecture Patterns: v4.0 Integration Analysis

**Project:** Memroos v4.0 Orchestration Depth + Intelligence Uplift
**Researched:** 2026-05-17
**Confidence:** HIGH (all key claims verified against source code + Context7 docs)

---

## Critical Structural Constraint: Two-Database Reality

Every v4.0 feature lands on one of two database sides. This is the #1 constraint for the roadmapper.

| Database | Owner | Tables relevant to v4.0 |
|----------|-------|------------------------|
| `data/orchestration.db` | Python orchestration service | `orchestration_runs`, `orchestration_lineage`, `orchestration_hil_decisions`, LangGraph checkpoint tables |
| `data/conversations.db` | Next.js app (TypeScript) | `hil_escalations`, `audit_entries`, `seal_*`, `messages`, `memory_salience`, `recall_log`, `proposed_skills`, `agent_instructions` |

The Python service and TypeScript app never share a DB handle. Cross-boundary state (e.g., a LangGraph run ID referenced in a hil_escalation row) is passed as foreign key values over HTTP, not as SQL JOINs.

---

## Feature: HIL Edit-and-Continue (HIL-01..03)

**What it needs:** Operator edits task payload fields (e.g., `taskSummary`, `selectedAgentId`, or custom fields) in a paused LangGraph graph before resuming.

**Integration point:** The current `resume()` method in `services/orchestration/graph.py` only supports `Command(resume="approve"|"reject")`. It has no mechanism to push a state patch before resuming.

**LangGraph capability confirmed (HIGH confidence):** `graph.update_state(config, values=patch, as_node="approval")` followed by `graph.invoke(None, config)` is the canonical LangGraph pattern. `update_state` writes a new checkpoint with the patched fields; invoking with `None` resumes from that checkpoint. Source: https://docs.langchain.com/oss/python/langgraph/persistence

**New component:** `PATCH /hil/{decision_id}/edit` endpoint in the Python FastAPI service. Accepts a JSON body with the state fields to overwrite. Internally calls `graph.update_state(thread_config, values=patch, as_node="approval")` without invoking — the operator triggers resume separately. This is separate from the existing `POST /hil/{decision_id}/resolve`.

**Modified component:** `LangGraphRuntime.resume()` signature must change. Currently it only accepts `run_id: str, decision: str`. It needs to accept an optional `state_patch: dict` parameter and call `update_state` before `invoke(Command(resume=decision), config)`. Alternatively, edit and resume are two separate HTTP round trips, which is simpler and avoids racing.

**Modified component:** `OrchestrationHilDecision` TypeScript interface in `lib/orchestration/client.ts` — add `editedState` field to surface what was patched.

**Modified component:** `POST /hil/{decision_id}/resolve` endpoint body and `ResolveHilRequest` Pydantic model — add optional `statePatch: dict` field so a single call can both patch state and resume, as an alternative UX.

**DB side:** `orchestration.db` (Python). The patched checkpoint is stored by SqliteSaver automatically. No new table needed; the lineage hop type `"state_edit"` should be added to `orchestration_lineage` for auditability.

**Build order dependency:** Must complete before HIL Timeout + Escalation (HIL-04..06), because timeout auto-escalation may need to inject a state patch when it fires an override.

---

## Feature: HIL Timeout + Escalation (HIL-04..06)

**What it needs:** SLA countdown on paused LangGraph runs; auto-escalate (write to `hil_escalations`) or auto-reject when deadline passes.

**Existing pattern:** `hil_escalations` table exists in `conversations.db` (TypeScript-owned). `checkSlaBreaches()` in `lib/audit/sla.ts` handles the deadline check — but it is LAZY: only called when `GET /api/escalations` is hit. A paused LangGraph run gets no SLA enforcement unless a UI user happens to poll that endpoint.

**Decision required:** The SLA timer must fire proactively. Two viable locations:

1. **Extend `scheduler-singleton.ts`** — add a new scheduled job (alongside the existing memory consolidation scheduler) that calls `checkSlaBreaches()` on an interval (e.g., every 60 seconds). This keeps SLA logic in TypeScript, consistent with how `hil_escalations` is already owned. Preferred because it uses existing scheduler infrastructure and does not require cross-DB calls.

2. **Python orchestration service owns SLA** — the Python service polls its own `orchestration_hil_decisions` table and fires an HTTP callback to the Next.js app when a deadline passes. This creates an outbound callback dependency from Python to Next.js, which doesn't exist today.

**Recommendation:** Option 1. Add a `setInterval` in `instrumentation.ts` (the same file that bootstraps the memory consolidation scheduler) that calls `checkSlaBreaches()` every 60 seconds. When a run is SLA-breached, the existing audit machinery marks it `sla_breached` in `conversations.db`. A separate step (manual or via a configurable auto-reject policy) calls `POST /hil/{decision_id}/resolve` with `decision=reject` to actually resume/terminate the LangGraph run.

**New component:** SLA scheduler registration in `instrumentation.ts` — ~10 lines alongside existing `setInterval` for memory consolidation.

**Modified component:** `lib/audit/sla.ts` `checkSlaBreaches()` — currently only targets open escalations. Needs to also query `orchestration_hil_decisions` via HTTP (or a new cross-DB lookup function) to identify runs that have been paused past their SLA and create `hil_escalations` rows for them if none exist yet.

**DB side:** `conversations.db` for `hil_escalations`. Orchestration run lookups go through the existing `ORCHESTRATION_SERVICE_URL` HTTP client.

**Build order dependency:** Depends on HIL Edit-and-Continue being stable (auto-escalation may inject edits). Can share a phase with Multi-hop Retry given both touch the Python engine.

---

## Feature: Multi-hop Retry + Rollback Compensation (ORCH-08..10)

**What it needs:** Per-hop retry budget; coordinated rollback across multiple agents in a chain when all retry budgets are exhausted.

**Existing capability:** The orchestration engine already has `retry_limit`, `attempts`, and `orchestration_lineage` with `hop_type` values including `dispatch_failure`, `retry_scheduled`, and `retry_exhausted` (confirmed in `services/orchestration/engine.py`). Single-hop retry works today.

**Gap:** Multi-hop is not modeled. The current graph is a single-agent dispatch: `route_policy → approval → dispatch → END`. There is no loop, no sub-graph per hop, and no rollback compensation handler.

**New component (Python):** A `rollback_compensation` node in the LangGraph graph. When `retry_exhausted` fires on hop N, the graph routes to a `rollback_compensation` node that emits `hop_type="rollback"` lineage entries and transitions the run to `status="rolled_back"`. For multi-agent chains, compensation must be sequential in reverse hop order — the lineage table already records hop order, so the rollback node can read it.

**Modified component (Python):** `OrchestrationState` TypedDict — add `hops: list[dict]` and `rollback_policy: str` fields. The graph currently doesn't track per-hop sub-tasks.

**Modified component (Python):** `build_langgraph()` — add a `dispatch_loop` sub-graph or conditional re-entry that allows multiple dispatch hops before reaching END, each with its own interrupt point if `requiresApproval` per hop.

**Modified component (Python):** `OrchestrationStore._init_schema()` — add `rollback_reason TEXT` and `rolled_back_at TEXT` columns to `orchestration_runs`. Additive migration, safe with `ALTER TABLE IF NOT EXISTS` pattern.

**DB side:** `orchestration.db` (Python). All retry/rollback state lives there.

**Build order dependency:** Can be built in parallel with HIL Edit-and-Continue since both are Python engine changes. However, if rollback compensation triggers a HIL interrupt, it shares the interrupt protocol — coordinate the interrupt schema changes in a single phase to avoid conflicts.

---

## Feature: Memory Backend Pluggability (MEM-06..08)

**What it needs:** Adapter interface for swapping or adding vector/graph/episodic backends beyond the current hard-coded mem0/Qdrant/Neo4j/SQLite.

**Existing structure:** `lib/memory/backends.ts` contains three ad-hoc functions: `searchVectorMemory()` (calls mem0 HTTP), `queryGraphMemory()` (calls Neo4j HTTP directly), and episodic recall (in `lib/db-ingest.ts` via FTS5). There is no adapter interface — callers reach the concrete functions directly.

**New component:** `lib/memory/adapter.ts` — defines a `MemoryAdapter` interface with methods:
- `search(query: string, limit: number): Promise<MemorySearchResult[]>`
- `write(payload: Record<string, unknown>): Promise<void>`
- `health(): Promise<MemoryTierHealth>`

Three concrete implementations wrap the existing code:
- `Mem0VectorAdapter` — wraps `searchVectorMemory()` / mem0 HTTP
- `Neo4jGraphAdapter` — wraps `queryGraphMemory()` / Neo4j HTTP
- `SqliteEpisodicAdapter` — wraps `recallByKeyword()` / FTS5

**New component:** `lib/memory/registry.ts` — a runtime map from `MemoryTier` to `MemoryAdapter[]`. Supports multiple adapters per tier (fan-out for cross-project recall). Initialized from env config at startup.

**Modified component:** `lib/memory/backends.ts` — existing functions stay as-is internally; they become the implementation bodies of the concrete adapters. No callers need to change in this phase; the adapters are additive wrappers.

**DB side:** No new tables. The adapter registry is in-process state.

**Build order dependency:** MUST be completed before LLM-powered Recall and Cross-project Recall. Both of those features need to register new adapters (an embedding adapter and a cross-repo adapter respectively). Building pluggability first avoids implementing the same query path twice.

---

## Feature: Voice Meeting Bot (VOICE-06..08)

**What it needs:** Pipecat joins an external meeting (Daily.co room) as an active participant with real-time transcript and Memroos highlights panel.

**Existing infrastructure:** `services/voice-server/` runs Pipecat 1.0.0 on port 7860 using `WebsocketServerTransport`. The service already has a multi-mode `build_pipeline()` dispatcher (`VOICE_MODE=gemini|cascade`). Transcripts are written to `conversations.db` via `transcript_writer.py`.

**Pipecat meeting transport confirmed (HIGH confidence):** `DailyTransport` in Pipecat 1.0 accepts a `room_url: str` parameter to join any existing Daily.co room. Source: https://github.com/pipecat-ai/docs/blob/main/api-reference/server/services/transport/daily.mdx. The existing service uses `WebsocketServerTransport` — `DailyTransport` is a drop-in transport swap. No new service process is needed.

**New component (Python):** `pipeline_meeting.py` in `services/voice-server/` — a third pipeline mode alongside `pipeline_gemini.py` and `pipeline_cascade.py`. Uses `DailyTransport(room_url, token, bot_name, DailyParams(...))` instead of `WebsocketServerTransport`. Reuses the same STT/TTS/LLM chain.

**Modified component (Python):** `build_pipeline()` in `server.py` — add `elif mode == "meeting"` branch. Triggered by `VOICE_MODE=meeting` env var or a new `POST /meeting/join` FastAPI endpoint that accepts `{room_url, token}` and spawns a pipeline task.

**Modified component (Python):** `requirements.txt` — add `pipecat-ai[daily]` to pull the Daily SDK dependency. Current install is `pipecat-ai[google,groq,cartesia,elevenlabs,websocket,kokoro]==1.0.0`.

**New component (Next.js):** `GET/POST /api/voice/meeting` — Next.js proxy route that accepts a `room_url` and forwards to the voice service. Returns `session_id` and transcript WebSocket URL.

**New component (Next.js):** `MeetingHighlightsPanel` — UI component on the Flow page showing real-time transcript and extracted highlights (agent-referenced tasks, decisions, action items). Highlights extracted by the LLM inside the pipeline, written to `hive_actions` table (already exists).

**DB side:** Transcripts → `messages` table in `conversations.db` (same as existing voice transcripts, via `transcript_writer.py`). Highlights → `hive_actions` table.

**Build order dependency:** Independent of all other v4.0 features. Can be built in parallel with any other phase.

**Constraint:** Meeting bot only works with Daily.co rooms. Zoom/Meet/Teams are not supported by `DailyTransport`. Users need a Daily.co account and API key. This should be documented as a prerequisite.

---

## Feature: LLM-powered Recall Scoring (RECALL-01..02)

**What it needs:** Embedding-based semantic ranking to replace/complement the existing BM25 FTS5 recall in `GET /api/recall`.

**Existing recall path:** `recallByKeyword()` in `lib/db-ingest.ts` → SQLite FTS5 `messages_fts` table → BM25 rank. Pure keyword matching, no semantic understanding.

**Embedding storage decision:** Three options evaluated. Option A: `sqlite-vec` extension on `messages` — requires loading a native extension not currently installed in `better-sqlite3`. Option B: dual-write to a new Qdrant collection via mem0 — adds async consistency complexity and a new write path for a table currently SQLite-only. Option C (chosen): call the Ollama embeddings API (already running locally at `OLLAMA_BASE_URL`) with `nomic-embed-text`, store float vectors as JSON in a new `message_embeddings` SQLite table, compute cosine similarity in TypeScript.

**Recommendation: Option C using Ollama `nomic-embed-text`.** The Ollama service is already a stack dependency — `services/memory/.env.example` shows `OLLAMA_BASE_URL=http://localhost:11434` and the `.env.example` explicitly requires `nomic-embed-text` to be pulled. No new external API dependency or new service is introduced. Embeddings are stored as JSON-serialized float arrays in a new `message_embeddings(message_id, embedding_json, model, created_at)` table. At recall time, the query is embedded via Ollama, cosine similarity is computed in TypeScript, and results are re-ranked. Note: Anthropic does NOT have a public embeddings API — `@anthropic-ai/sdk` cannot produce embeddings.

**New component:** `lib/memory/embedding.ts` — `embedText(text: string): Promise<Float32Array>` via `fetch` to `${OLLAMA_BASE_URL}/api/embeddings` with `model: "nomic-embed-text"`. Cached in-process with a simple LRU map (< 1000 entries, short TTL) to avoid re-embedding identical queries.

**New component:** `lib/memory/recall-semantic.ts` — `semanticRecall(db, query, limit): Promise<RecallResult[]>`. Reads pre-computed embeddings from `message_embeddings`, computes cosine similarity in TypeScript, returns top-N.

**Modified component:** `lib/db-schema.ts` — add `message_embeddings` table. Additive migration.

**Modified component:** `GET /api/recall/route.ts` — add `mode=semantic|bm25|hybrid` query param. Default `bm25` for backward compatibility. `hybrid` re-ranks BM25 results by semantic score.

**Modified component:** A background job in `instrumentation.ts` — embed new messages on a rolling basis (not inline on ingest, to avoid blocking). Run every 5 minutes, embed up to 50 un-embedded messages per cycle.

**DB side:** `conversations.db` — new `message_embeddings` table.

**Build order dependency:** Depends on Memory Backend Pluggability (adapter interface should wrap both BM25 and semantic backends consistently). Also gates Cross-project Recall — cross-project needs the embedding function.

---

## Feature: Cross-project Recall (RECALL-03..04)

**What it needs:** Similar-task recommendations across multiple local repos. The `messages.project` column already stores the project name per message.

**Existing capability:** `messages.project TEXT NOT NULL` column exists. The existing `contextMatchSignal` algorithm in `lib/tool-attention.ts` already weights by `repo` (multiplier ×2). Cross-project recall is a query filter change, not a new index.

**Gap analysis:** Current `GET /api/recall` and `recallByKeyword()` have no multi-project option. The FTS5 index covers all projects already — it is not partitioned.

**New component:** `GET /api/recall/cross-project` — accepts `q`, `exclude_project` (current project to deprioritize), and `limit`. Calls semantic recall (from LLM-powered recall above) without project filter, then groups and labels results by `project`. Returns top results from OTHER projects ranked by semantic similarity.

**Modified component:** `lib/memory/registry.ts` (from pluggability phase) — add a `CrossProjectRecallAdapter` that queries `semanticRecall()` across all projects and re-ranks.

**No new DB table needed.** The `messages.project` column and the `message_embeddings` table (added in LLM recall phase) are sufficient.

**Build order dependency:** Strictly depends on LLM-powered Recall (needs `message_embeddings` and `semanticRecall()`). Memory Backend Pluggability must also be done first to have the adapter registry.

---

## Feature: True Behavioral W-lift (SEAL-04..06)

**What it needs:** When a SEAL proposal is applied, the W-score measurement must come from a real agent re-execution via the A2A hub, not from a synthetic re-score of the existing trace.

**Existing capability:** `SealService.applyProposal()` already has the hook: it calls `this.evalService.rescoreForProposal()` if the method exists on the injected eval service, otherwise falls back to `runForTrace()`. The `EvalServiceLike` interface in `lib/seal/service.ts` defines `rescoreForProposal?` as optional. The current `EvalService` implementation does not implement it — `rescorePostApply` in `lib/seal/rescore.ts` provides synthetic re-scoring (modifies expected outputs based on proposal diff, no real agent call).

**Gap:** `rescoreForProposal` needs a real implementation that dispatches the original trace's input to an agent via the A2A hub (`POST /api/a2a/task`) and captures the output for W-scoring.

**New component:** `lib/seal/behavioral-eval.ts` — `BehavioralEvalService` that implements `EvalServiceLike`. Its `rescoreForProposal()`:
1. Looks up the original trace's input from `eval_run_examples` (already stored per run)
2. Dispatches to the same `agentId` via `POST /api/a2a/tasks` with the original input
3. Polls for completion (the A2A task API already has status tracking in `a2a_tasks` table)
4. Scores the agent's new output using `scoreTraceWithEvalEngine()` from `lib/evals/engine.ts`
5. Returns an `EvalRunResult` with the real W score

**Modified component:** `lib/seal/service.ts` — `SealServiceOptions.evalService` should default to `BehavioralEvalService` when `SEAL_BEHAVIORAL_EVAL=true` env var is set. Retains `EvalService` as default for environments without live agents.

**Modified component:** `lib/evals/engine.ts` — ensure `scoreTraceWithEvalEngine()` can accept a raw output string (from agent response) in addition to a stored trace. Currently it reads from stored trace records; needs a path for live-capture traces.

**DB side:** New eval runs written to `eval_runs` and `eval_run_examples` in `conversations.db`. A2A task dispatch tracked in `a2a_tasks`. No new tables.

**Build order dependency:** Depends on the A2A hub being reliable (shipped in v2.0, confirmed stable). Depends on `eval_run_examples` having the original trace inputs stored — verify this is populated before building. Can be built in parallel with Voice Meeting Bot and Recall features.

**Risk:** Real agent re-execution is non-deterministic and slow (seconds to tens of seconds). The behavioral eval path must be async and must not block the SEAL approval UI. The `applyProposal()` method is already async; ensure the UI uses polling or a webhook for result delivery.

---

## Feature: Cross-harness Skills (universal skill registry)

**What it needs:** A universal skill registry not tied to a single agent harness; skills callable from any agent via A2A.

**Existing tables:** `proposed_skills(id, skill_id, instruction_text, ...)`, `agent_skill_reports(agent_id, skill_id, ...)`, `agent_instructions(agent_id, ...)`. These are per-agent tables, not a universal registry.

**New component:** `skill_registry` table in `conversations.db` — columns: `id TEXT PK`, `name TEXT`, `description TEXT`, `instruction_text TEXT`, `harness TEXT` (the agent type/harness it was defined in), `promoted_from_agent_id TEXT`, `status TEXT` (draft/active/deprecated), `created_at TEXT`, `updated_at TEXT`.

**New component:** `GET/POST /api/skills/registry` — CRUD for the universal registry. `POST` promotes a `proposed_skill` or `agent_instruction` into the universal registry.

**Modified component:** `lib/db-schema.ts` — additive `CREATE TABLE IF NOT EXISTS skill_registry` migration.

**Modified component:** A2A task dispatch — when an agent requests skill execution, the dispatcher looks up `skill_registry` first, then falls back to per-agent `agent_instructions`. This requires a change in `lib/dispatch/` or `lib/a2a/` (verify exact dispatch path before touching).

**DB side:** `conversations.db`.

**Build order dependency:** Independent. Can be built in any phase after the Memory Pluggability phase (to stay organized with the adapter registry pattern).

---

## Feature: Flow Trigger Button (UI-05) and Library Freshness Indicator (UI-06)

These are UI-only features with thin backend changes. Grouped here for completeness.

**Flow trigger button:** `POST /api/knowledge/update` route that calls `qmd update` via `execFileSync`. The `POST` route does not exist today; only GET endpoints exist under `/api/knowledge/`. Add a protected `POST /api/knowledge/update` that spawns the QMD process and streams progress via SSE or returns job status. No new DB table.

**Library freshness indicator:** The PROJECT.md notes this as known debt: "Library freshness indicator reflects file mtime, not QMD index recency." Fix: `qmd status` output (or a `.qmd-last-indexed` timestamp file written by QMD post-run) becomes the source of truth. The existing `/api/health` or a new `/api/knowledge/status` endpoint exposes the delta between last-indexed timestamp and latest file mtime. No new DB table.

**Build order dependency:** Both are independent of all other v4.0 features. Can be done in any phase, likely bundled together.

---

## Component Classification Summary

| Component | New or Modified | Service | DB |
|-----------|----------------|---------|-----|
| `PATCH /hil/{id}/edit` FastAPI endpoint | NEW | orchestration (Python) | orchestration.db |
| `LangGraphRuntime.resume()` + `update_state` | MODIFIED | orchestration (Python) | orchestration.db |
| SLA scheduler job in `instrumentation.ts` | NEW | Next.js (TypeScript) | conversations.db |
| `hil_escalations` backfill for LangGraph runs | MODIFIED | Next.js `lib/audit/sla.ts` | conversations.db |
| `rollback_compensation` graph node | NEW | orchestration (Python) | orchestration.db |
| Multi-hop `OrchestrationState` fields | MODIFIED | orchestration (Python) | orchestration.db |
| `lib/memory/adapter.ts` (MemoryAdapter interface) | NEW | Next.js | — |
| `lib/memory/registry.ts` (adapter registry) | NEW | Next.js | — |
| `lib/memory/backends.ts` concrete adapters | MODIFIED (wrap existing) | Next.js | — |
| `pipeline_meeting.py` + DailyTransport | NEW | voice-server (Python) | — |
| `POST /meeting/join` FastAPI endpoint | NEW | voice-server (Python) | — |
| `pipecat-ai[daily]` in requirements.txt | MODIFIED | voice-server (Python) | — |
| `GET/POST /api/voice/meeting` Next.js proxy | NEW | Next.js | — |
| `MeetingHighlightsPanel` UI component | NEW | Next.js | conversations.db |
| `lib/memory/embedding.ts` | NEW | Next.js | — |
| `lib/memory/recall-semantic.ts` | NEW | Next.js | — |
| `message_embeddings` table in db-schema.ts | NEW | Next.js | conversations.db |
| `GET /api/recall` semantic mode | MODIFIED | Next.js | conversations.db |
| Embedding background job in `instrumentation.ts` | NEW | Next.js | conversations.db |
| `GET /api/recall/cross-project` | NEW | Next.js | conversations.db |
| `lib/seal/behavioral-eval.ts` | NEW | Next.js | conversations.db |
| `skill_registry` table | NEW | Next.js | conversations.db |
| `GET/POST /api/skills/registry` | NEW | Next.js | conversations.db |
| `POST /api/knowledge/update` | NEW | Next.js | — |
| `/api/knowledge/status` freshness endpoint | NEW | Next.js | — |

---

## Dependency-aware Build Order

```
Phase A: Memory Backend Pluggability (MEM-06..08)
  - No dependencies on other v4.0 features
  - Blocks: LLM Recall, Cross-project Recall (need adapter interface)
  - Risk: LOW — pure refactor, existing tests cover current functions

Phase B (parallel with A): HIL Edit-and-Continue (HIL-01..03)
  - No dependencies on Phase A
  - Blocks: HIL Timeout + Escalation (uses edit semantics in auto-escalate)
  - Risk: MEDIUM — interrupt protocol change; requires coordinated
    update to ResolveHilRequest schema and TS client

Phase B+C (MUST be same phase): HIL Edit-and-Continue + Multi-hop Retry + Rollback
  - HIL Edit (HIL-01..03) and Multi-hop Retry/Rollback (ORCH-08..10) both modify
    graph.py, OrchestrationState, and the interrupt protocol in the same Python service.
    Building them in separate phases creates merge conflicts and forces two interrupt
    protocol migrations. Ship them together in a single phase.
  - Blocks: HIL Timeout + Escalation (Phase E)
  - Risk: MEDIUM — graph topology change + interrupt protocol update;
    extend both Python engine tests and TS client tests before shipping

Phase D (after A): LLM-powered Recall Scoring (RECALL-01..02)
  - Requires: Phase A (adapter interface)
  - Blocks: Cross-project Recall
  - Risk: LOW-MEDIUM — Ollama must have nomic-embed-text pulled; gate
    with MEMROOS_EMBEDDING_ENABLED flag; cap 50 messages/cycle to avoid
    blocking the scheduler

Phase E (after B): HIL Timeout + Escalation (HIL-04..06)
  - Requires: Phase B (edit semantics available for auto-override)
  - Risk: LOW-MEDIUM — extends existing scheduler pattern

Phase F (after D): Cross-project Recall (RECALL-03..04)
  - Requires: Phase D (message_embeddings table + semanticRecall())
  - Risk: LOW — mostly a query filter + new API route

Phase G (independent): Voice Meeting Bot (VOICE-06..08)
  - No dependencies on other v4.0 features
  - Requires: Daily.co account + DAILY_API_KEY in env (external dependency)
  - Risk: MEDIUM — external service dependency; DailyTransport not tested
    in current CI (voice-server tests are unit tests only)

Phase H (independent): True Behavioral W-lift (SEAL-04..06)
  - Depends on A2A hub reliability (shipped v2.0, stable)
  - No dependency on other v4.0 phases
  - Risk: HIGH — async agent execution with non-deterministic timing;
    needs timeout + retry on the A2A dispatch call

Phase I (independent, low risk): Flow Trigger + Library Freshness (UI-05, UI-06)
  - No dependencies
  - Risk: LOW — thin backend + UI

Phase J (after A): Cross-harness Skills registry
  - No hard dependency, but logically follows adapter registry pattern
  - Risk: LOW — new table + CRUD routes
```

Recommended sequencing for roadmapper:
- **Phase 1:** A + (B+C merged) — Memory pluggability (TS) + HIL edit + Multi-hop retry (Python engine, same phase to avoid graph.py conflicts)
- **Phase 2:** D + E + G — LLM recall (Ollama embeddings) + HIL timeout escalation + Voice meeting bot (all parallelizable)
- **Phase 3:** F + H + I + J — Cross-project recall + True W-lift + UI polish + Skills registry

---

## Pitfall Register

### Interrupt protocol is a breaking change

The current `resume()` accepts only `"approve"|"reject"` strings. Adding `state_patch` support changes the contract between Next.js (`lib/orchestration/client.ts`) and the Python service. Any phase that touches `resolve_hil` must update both sides atomically. Test coverage exists for the Python engine (`services/orchestration/tests/`) — extend it before shipping.

### SLA timer is currently lazy

`checkSlaBreaches()` only fires on `GET /api/escalations`. For paused LangGraph runs with no UI polling, SLA breaches will not be detected until someone opens the escalations panel. The scheduler-based fix (Phase E) is required for the feature to work in production.

### Embedding requires Ollama with nomic-embed-text

The background embedding job calls Ollama's local API (`nomic-embed-text` model). If Ollama is not running or the model is not pulled, the job silently no-ops (embeddings remain absent, `messages_fts` BM25 still works as fallback). Add a startup check: if `MEMROOS_EMBEDDING_ENABLED=true` but Ollama is unreachable, log a warning and surface it in the Library health panel. Gate the feature with `MEMROOS_EMBEDDING_ENABLED` env flag (default off). Cap the background job to 50 messages/cycle to avoid blocking the scheduler lock.

### Daily.co is required for meeting bot

Pipecat's meeting bot support is via `DailyTransport`, which requires Daily.co rooms. There is no Zoom/Meet/Teams transport in Pipecat 1.0 without third-party bridges (Recall.ai, etc.). This is an external service dependency. Document it and gate the meeting bot UI behind a `DAILY_API_KEY` check.

### Behavioral W-lift timing

Real agent re-execution via A2A takes seconds to tens of seconds. `applyProposal()` is async but the current SEAL UI may treat it as synchronous. Ensure the `/api/seal/proposals/{id}/apply` endpoint returns immediately with a `job_id`, and the UI polls for completion. Blocking on a live agent call in a request handler will hit Next.js 30-second timeout limits.

### Two-DB foreign key illusion

`hil_escalations.entity_id` stores strings like `"orchestration_run:abc123"` that refer to rows in `orchestration.db`. SQLite cannot enforce this FK across databases. Application code must validate existence via HTTP before writing escalation rows, not by relying on DB integrity.

---

## Sources

- `services/orchestration/graph.py` — LangGraph runtime, interrupt protocol, graph topology (read directly)
- `services/orchestration/engine.py` — retry/rollback/lineage model (read directly)
- `apps/memroos/src/lib/seal/service.ts` — SEAL apply/rollback/W-scoring flow (read directly)
- `apps/memroos/src/lib/memory/backends.ts` — current memory backend structure (read directly)
- `apps/memroos/src/lib/db-schema.ts` — full SQLite schema (read directly)
- `apps/memroos/src/lib/audit/sla.ts` — lazy SLA breach check pattern (read directly)
- `apps/memroos/src/lib/scheduler-singleton.ts` — scheduler lock pattern (read directly)
- `services/voice-server/server.py`, `requirements.txt` — Pipecat 1.0.0 WebsocketServerTransport setup (read directly)
- LangGraph `update_state` + time-travel: https://docs.langchain.com/oss/python/langgraph/persistence (HIGH confidence, Context7)
- Pipecat `DailyTransport` room_url parameter: https://github.com/pipecat-ai/docs/blob/main/api-reference/server/services/transport/daily.mdx (HIGH confidence, Context7)
