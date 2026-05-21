# Requirements: Memroos v4.0 — Orchestration Depth + Intelligence Uplift

*Created: 2026-05-17*

---

## v4.0 Requirements

### HIL Enhancements

- [x] **HIL-01**: Operator can modify declared task state fields via a dedicated edit UI before resuming a paused LangGraph thread (Python endpoint complete in 70-02; TS route/client/UI pending 70-05)
- [x] **HIL-02**: System validates edited field values against `OrchestrationState` schema before accepting the update (Python validation complete in 70-02; TS proxy validation pending 70-05)
- [x] **HIL-03**: Audit log records who edited a HIL task, which fields changed, and before/after values (Python lineage row complete in 70-02; authenticated operator identity through TS proxy pending 70-05)
- [ ] **HIL-04**: Each HIL interrupt type has a configurable SLA deadline stored as an ISO timestamp
- [ ] **HIL-05**: Background scheduler proactively checks for expired HIL tasks every 60s and triggers escalation actions (notify, auto-resolve, or abandon)
- [ ] **HIL-06**: Operator can view pending HIL items with countdown timers and SLA traffic-light status in the dashboard

### Orchestration: Multi-Hop Retry + Rollback

- [ ] **ORCH-08**: Each hop in a multi-agent chain has a configurable retry budget via LangGraph `RetryPolicy` (pending 70-03)
- [ ] **ORCH-09**: Each forward action declares a paired compensating action stored as a declarative row in `orchestration_lineage` (pending 70-03)
- [ ] **ORCH-10**: A2A task status reflects granular failure state: "failed at hop N, compensated hops 1..N-1" (pending 70-03)

### Memory Backend Pluggability

- [x] **MEM-06**: `MemoryAdapter` interface exposes only `search()`, `write()`, and `health()` — no client handle leakage
- [x] **MEM-07**: Adapter registry maps `MemoryTier` to `MemoryAdapter[]`; new backends register without touching existing code
- [x] **MEM-08**: Existing mem0/Qdrant/Neo4j backends wrapped as concrete adapters implementing the interface

### Voice Meeting Bot

- [ ] **VOICE-06**: Pipecat meeting bot pipeline joins Daily.co rooms via `DailyTransport` (room URL + token from env/API)
- [ ] **VOICE-07**: Real-time transcript per speaker written to `messages` table; meeting highlights surfaced to `hive_actions`
- [ ] **VOICE-08**: Meeting URL and join tokens never logged to `audit_log`; recording consent UI shown before joining

### LLM-Powered Recall Scoring

- [ ] **RECALL-01**: Recall endpoint supports `mode=semantic|bm25|hybrid`; hybrid merges Ollama `nomic-embed-text` + BM25 via RRF; BM25 remains default; this applies to message recall in `conversations.db` and does not replace qmd BM25 or mem0/Qdrant vector memory
- [ ] **RECALL-02**: Embeddings precomputed at ingest via background job (50 messages/cycle, 5-min interval); degrades gracefully with `degraded: true` on embedding outage

### Cross-Project Recall

- [ ] **RECALL-03**: Caller can request cross-project recall by passing `crossProject: true` with explicit `allowed_project_ids`
- [ ] **RECALL-04**: Cross-project results ranked by semantic similarity and annotated with source repo; single-project remains default

### True Behavioral W-Lift

- [ ] **SEAL-04**: `BehavioralEvalService` implements `EvalServiceLike.rescoreForProposal()` dispatching real agent re-execution via A2A hub
- [ ] **SEAL-05**: Behavioral eval uses a sandboxed profile with no-op tool stubs on a held-out 10-20 task sample
- [ ] **SEAL-06**: `applyProposal()` returns `job_id` immediately; UI polls for completion; request handler never blocked; completed eval jobs expose evidence bundles with task sample, tools/commands, checks passed, assumptions, residual risks, and replay/rollback handle

### UI: Flow Trigger + Library Freshness

- [ ] **UI-05**: Operator can trigger `qmd update` pipeline from the UI with SSE progress streaming
- [ ] **UI-06**: Library page shows QMD index recency timestamp vs latest file mtime per collection as context freshness evidence

### Cross-Harness Skills

- [ ] **SKILL-01**: `skill_registry` table stores normalized skill definitions imported from Claude/OpenAI/Gemini harnesses (SKILL.md format) with governed contract fields: preconditions, allowed tools, risk tier, verification checks, owner, rollback behavior, and dispatch status
- [ ] **SKILL-02**: Operator can import a SKILL.md file and have it normalized and stored in the registry
- [ ] **SKILL-03**: A2A dispatcher looks up the skill registry before falling back to per-agent instructions
- [ ] **SKILL-04**: Skills UI shows all registered skills, their source harness, dispatch status, and contract completeness

---

## Future Requirements (v4.1+ candidates)

- [ ] Recall.ai bridge for Zoom/Teams/Meet meeting bot (Daily-only in v4.0)
- [ ] Full 50+ task behavioral W-lift golden set (held-out sample in v4.0)
- [ ] Voyage AI `voyage-4-large` embedding upgrade (Ollama local in v4.0, env-flag swap)
- [ ] Multi-participant meeting bot (listener-only in v4.0)
- [ ] Cross-harness skill auto-sync from agent directories (manual import in v4.0)
- [ ] Full Harness Control Plane: every dispatched task exposes a Plan-Execute-Verify timeline with plan contract, permission tier, tool actions, verification checks, and memory updates (Phase 72 covers the first evidence-bundle slice for eval/skill work)
- [ ] Universal evidence bundles: every agent output can show sources used, memories consumed, tools/commands run, checks passed, unverified assumptions, residual risks, and replay/rollback artifacts (Phase 72 covers SEAL/UI/skill evidence first)
- [ ] Shared harness state: tasks declare read/write sets, assumptions, version dependencies, verifier obligations, and conflict policy; stale belief/context drift is surfaced before action
- [ ] Skill-contract evidence examples: promoted skills attach worked examples and regression cases to the governed contract fields introduced in Phase 72
- [ ] Evolution Agent: telemetry-driven harness improvements are proposed, evaluated against held-out regression tasks, and require approval before changing permissions, validators, routing, or workflow topology
- [ ] Knowledge graph intelligence: repo/docs/PDF/image/transcript graphs expose confidence-tagged edges, god nodes, surprising connections, query/path/explain flows, wiki/report exports, and freshness hooks
- [ ] PR/workflow graph risk: graph communities and dependency paths identify merge-order conflicts, impacted concepts, stale graph regions, and coordination risk before dispatch or review
- [ ] Stacked agent work units: large agent tasks can be split into ordered, dependent, independently reviewable slices with stack-aware verification, promotion gates, and rollback invalidation when an earlier slice fails
- [ ] Model gateway observability: LiteLLM can be configured as the first optional `ModelGatewayAdapter` while direct-provider fallback remains available; every LLM call records provider/model route, prompt/template version, cache hit/miss, fallback path, token/cost budget, latency, and denial reason in the task evidence bundle
- [ ] Secret-scope health: runtime health checks flag agent secrets that are not project scoped, not loaded from an approved secret manager path, or risk persistence in plain `.env`/audit artifacts
- [ ] Eval-pinned promotion commits: passing eval runs capture model version, prompt/harness version, pass rate, dataset seed, and commit/release pointer for incident rollback
- [ ] Agent lessons ledger: repo-level lessons are captured from weird behavior, edge cases, config changes, incidents, and promoted skills, then surfaced in context packs and graph freshness checks
- [ ] Third-party eval adapter: Inspect-style safety eval packs can plug into the existing eval engine for deception, tool misuse, manipulation, and policy-boundary checks

---

## Out of Scope

- Zoom/Teams native transport without bridge (platform anti-bot measures; Daily.co is the supported path)
- Recursive readdir for cross-project recall (performance constraint; explicit path config only)
- Redis/Celery/Temporal for retry/rollback (stdlib + LangGraph `RetryPolicy` sufficient)
- node-llama-cpp local inference (macOS arm64 crash bug, GitHub upstream unfixed)

---

## Traceability

| Phase | Requirements |
|-------|-------------|
| Phase 70 | HIL-01..03, ORCH-08..10, MEM-06..08 |
| Phase 71 | RECALL-01..02, HIL-04..06, VOICE-06..08 |
| Phase 72 | RECALL-03..04, SEAL-04..06, UI-05..06, SKILL-01..04 |
