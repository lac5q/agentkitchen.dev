# Requirements: Memroos v4.0 — Orchestration Depth + Intelligence Uplift

*Created: 2026-05-17*

---

## v4.0 Requirements

### HIL Enhancements

- [x] **HIL-01**: Operator can modify declared task state fields via a dedicated edit UI before resuming a paused LangGraph thread (70-02 Python endpoint + 70-05 TS route/client/UI complete; live panel parity tracked by `UI-PARITY-02`)
- [x] **HIL-02**: System validates edited field values against `OrchestrationState` schema before accepting the update (70-02 Python validation + 70-05 TS proxy validation complete; live panel parity tracked by `UI-PARITY-02`)
- [x] **HIL-03**: Audit log records who edited a HIL task, which fields changed, and before/after values (70-02 lineage row + 70-05 operator identity proxy complete; live panel parity tracked by `UI-PARITY-02`)
- [x] **HIL-04**: Each HIL interrupt type has a configurable SLA deadline stored as an ISO timestamp
- [x] **HIL-05**: Background scheduler proactively checks for expired HIL tasks every 60s and triggers escalation actions (notify, auto-resolve, or abandon)
- [x] **HIL-06**: Operator can view pending HIL items with countdown timers and SLA traffic-light status in the dashboard (71-04 complete; local DB empty state browser-checked, countdown behavior covered by component tests)

### Orchestration: Multi-Hop Retry + Rollback

- [x] **ORCH-08**: Each hop in a multi-agent chain has a configurable retry budget via LangGraph `RetryPolicy` (70-03 complete; topology closure follow-up tracked by `ORCH-FOLLOWUP-01`)
- [x] **ORCH-09**: Each forward action declares a paired compensating action stored as a declarative row in `orchestration_lineage` (70-03 complete; graph-node/A2A compensation closure tracked by `ORCH-FOLLOWUP-01`)
- [x] **ORCH-10**: A2A task status reflects granular failure state: "failed at hop N, compensated hops 1..N-1" (70-03 complete; graph-node/A2A compensation closure tracked by `ORCH-FOLLOWUP-01`)

### Memory Backend Pluggability

- [x] **MEM-06**: `MemoryAdapter` interface exposes only `search()`, `write()`, and `health()` — no client handle leakage
- [x] **MEM-07**: Adapter registry maps `MemoryTier` to `MemoryAdapter[]`; new backends register without touching existing code
- [x] **MEM-08**: Existing mem0/Qdrant/Neo4j backends wrapped as concrete adapters implementing the interface

### Voice Meeting Bot

- [x] **VOICE-06**: Pipecat meeting bot pipeline joins Daily.co rooms via `DailyTransport` (room URL + token from env/API)
- [x] **VOICE-07**: Real-time transcript per speaker written to `messages` table; meeting highlights surfaced to `hive_actions`
- [x] **VOICE-08**: Meeting URL and join tokens never logged to `audit_log`; recording consent UI shown before joining (71-05 secrets discipline complete; 71-06 consent gate and join UI complete)

### LLM-Powered Recall Scoring

- [x] **RECALL-01**: Recall endpoint supports `mode=semantic|bm25|hybrid`; hybrid merges Ollama `nomic-embed-text` + BM25 via RRF; BM25 remains default; this applies to message recall in `conversations.db` and does not replace qmd BM25 or mem0/Qdrant vector memory (71-01 embedding foundation + 71-02 endpoint modes complete)
- [x] **RECALL-02**: Embeddings precomputed at ingest via background job (50 messages/cycle, 5-min interval); degrades gracefully with `degraded: true` on embedding outage (71-01 store/provider + 71-02 background job complete)

### Cross-Project Recall

- [x] **RECALL-03**: Caller can request cross-project recall by passing `crossProject: true` with explicit `allowed_project_ids`
- [x] **RECALL-04**: Cross-project results ranked by semantic similarity and annotated with source repo; single-project remains default

### True Behavioral W-Lift

- [x] **SEAL-04**: `BehavioralEvalService` implements `EvalServiceLike.rescoreForProposal()` dispatching real agent re-execution via A2A hub
- [x] **SEAL-05**: Behavioral eval uses a sandboxed profile with no-op tool stubs on a held-out 10-20 task sample
- [x] **SEAL-06**: `applyProposal()` returns `job_id` immediately; UI polls for completion; request handler never blocked; completed eval jobs expose evidence bundles with task sample, tools/commands, checks passed, assumptions, residual risks, and replay/rollback handle

### UI: Flow Trigger + Library Freshness

- [x] **UI-05**: Operator can trigger `qmd update` pipeline from the UI with SSE progress streaming
- [x] **UI-06**: Library page shows QMD index recency timestamp vs latest file mtime per collection as context freshness evidence

### Cross-Harness Skills

- [x] **SKILL-01**: `skill_registry` table stores normalized skill definitions imported from Claude/OpenAI/Gemini harnesses (SKILL.md format) with governed contract fields: preconditions, allowed tools, risk tier, verification checks, owner, rollback behavior, and dispatch status
- [x] **SKILL-02**: Operator can import a SKILL.md file and have it normalized and stored in the registry
- [x] **SKILL-03**: A2A dispatcher looks up the skill registry before falling back to per-agent instructions
- [x] **SKILL-04**: Skills UI shows all registered skills, their source harness, dispatch status, and contract completeness

---

## Future Requirements (v4.1+ candidates)

- [ ] **NOC-01**: Operations NOC must not render hardcoded sample values for any panel. Production `components/operations/*` panels must consume live data through a unified `/api/operations/noc` contract or existing React Query hooks; mock constants may only remain in tests, development fixtures, or explicitly labeled demos.
- [ ] **NOC-02**: Operations NOC data contract exposes per-panel provenance: `source`, `lastUpdated`, `window`, `status=live|empty|degraded|missing`, and `warnings`; missing/degraded telemetry must render honestly instead of fabricated metrics.
- [ ] **NOC-03**: Pulse strip derives tasks completed, active dispatches, memory reads, spend today, savings vs baseline, and wasted work from live `agents`, `hive`, `activity`, `tokens`, `memory`, and `model-routing` sources, with missing-source callouts where telemetry does not exist.
- [ ] **NOC-04**: Memory consumption and "memory not digested" panels derive from memory consolidation, memory tier health, recall stats/evals, and per-memory access telemetry; if per-memory access telemetry is absent, add it before claiming high-salience memories are unused.
- [ ] **NOC-05**: Agent workload panel derives agent names, status, current task, heartbeat, dispatch activity, HIL waits, and failure/retry signals from the canonical registry, local runtime detection, hive actions, orchestration/HIL state, and Paperclip fleet data.
- [ ] **NOC-06**: Model utility panel derives model rows from real model usage and model-routing telemetry, including task count, cost, latency, quality score, success rate, and best-fit recommendation.
- [ ] **NOC-07**: Skills lifecycle and behavior signals derive from the skills API, contribution history, coverage telemetry status, failure logs, review state, SEAL proposals, model-routing drift, memory evals, and security/audit events; inferred signals must cite source evidence and avoid presenting speculative recommendations as facts.
- [ ] **NOC-08**: Governance strip derives preflight blocks, HIL approvals, tool denials, audit lines, escalations, and recent governance events from live audit, orchestration, security, and escalation APIs.
- [ ] **NOC-09**: Engagement console on the NOC home screen uses the canonical agent registry and real chat/dispatch APIs; sending a directive must create a real dispatch/chat action or return a visible error, never a canned interaction.
- [ ] **NOC-10**: Efficiency signals require new telemetry before being shown as live: retrieval calls before useful work, same-source re-read count, raw-context ingest token share, operator re-ask redundancy, and rediscovered-fact rate. Until those streams exist, the efficiency section must render a missing-telemetry checklist, not sample numbers.
- [ ] **NOC-11**: Verification proves the NOC is real-data backed: tests fail if production Operations components import `noc-mock-data`; seeded API tests assert metrics match fixture DB/log inputs; Playwright verifies live, empty, and degraded states; authenticated local/public smoke checks confirm `/` renders live NOC data after deployment.
- [ ] **ORCH-FOLLOWUP-01**: Phase 70 deferred multi-hop topology work is promoted from phase-local debt: add a real `rollback_compensation` LangGraph node, loop through multi-hop chains in graph topology, track per-hop attempts in lineage detail JSON, and dispatch A2A compensation tasks when agents expose `requiredCapability="compensate"`.
- [ ] **ARCH-01**: MemroOS documents and verifies coverage of the agentic AI stack layers: goal, orchestration, agents, tools, memory, monitoring, reliability/failure handling, and governance/security.
- [ ] **ARCH-02**: MemroOS exposes architecture/layer health that reports configured, degraded, and missing capabilities across the agentic stack without requiring operators to infer gaps from scattered panels.
- [ ] **ARCH-03**: Onboarding and setup guide users through the agentic stack layers and their required configuration, not just isolated features.
- [ ] **PRODUCT-01**: Eval Engine product packaging decision: choose whether the 3-layer composite `W` and SEAL self-improvement loop ship only bundled with MemroOS Hub or also as a separately positioned eval/self-improvement product surface.
- [ ] **PRODUCT-02**: Eval Engine commercialization requirements: define pricing axis, trace-ingestion contract, judge-model cost ownership, golden-set marketplace strategy, compliance floor, and competitive framing before expanding the public eval API beyond dogfooding.
- [ ] **VERTICAL-01**: Second vertical candidate backlog: after finance reconciliation has a live customer proof, select healthcare, legal, or ops/logistics as the next adapter + golden-set + UI-terminology vertical without baking vertical logic into the core.
- [ ] **CTX-FOLLOWUP-01**: Context-source contract coverage extends beyond the Phase 69 starter set: every configured source family used by operators (including Drive, Slack, Gmail/Spark, local folders, qmd, mem0, and future connectors) declares ingest, index, freshness, safe-answer, and repair behavior with no silent unindexed lanes.
- [ ] **CTX-FOLLOWUP-02**: Runtime health reports memory degradation paths, not just service reachability: queued writes, retry backlog, stale semantic recall, replay verification, and source-to-QMD indexing proof must be visible to operators and evals.
- [ ] **INT-FOLLOWUP-01**: MemroOS MCP consolidation removes the legacy standalone mem0-only MCP adapter from agent registration paths and routes all memory tools through the unified `memroos` MCP facade. Scope includes `services/memory/mcp-mem0.py`, `services/memory/mcp-mem0-wrapper.sh`, stale `memory_get_all`/`memory_health` capability references, docs/configs, and verification that `.mcp.json`, `.cursor/mcp.json`, `.gemini/mcp.json`, ChatGPT LaunchAgent, and onboarding scripts expose only the unified MemroOS MCP surface.
- [ ] **INT-FOLLOWUP-02**: FastMCP v3.x migration upgrades `services/knowledge-mcp` from `fastmcp>=2,<3` to `fastmcp>=3,<4`, moves server transport/path/stateless/auth options to the v3-compatible runtime API, preserves stdio and Streamable HTTP `/mcp`, and verifies `fastmcp inspect`, `knowledge_health`, `search`, `fetch`, `memory_search`, `memory_save`, `agent_memory_save`, `tool_catalog`, launchd restart, and ChatGPT connector behavior.
- [ ] **INT-FOLLOWUP-03**: Integration dependency modernization audit keeps a source-backed inventory of older integration surfaces before they drift further. The audit output must include current/local versions, current upstream versions, owner, risk rating, migration notes, rollback path, and live probe matrix, and it must route concrete work to the dedicated follow-ups below instead of treating major upgrades as routine package bumps.
- [ ] **INT-FOLLOWUP-04**: `mem0ai` 2.x migration upgrades the memory service from `mem0ai>=0.1,<1.0` to the current 2.x Python SDK, preserving Qdrant/Neo4j config loading, queued-write retry behavior, `/health`, `/memory/add`, `/memory/search`, `/memory/failures`, and the unified MemroOS MCP `memory_search`/`memory_save` tools. Verification must include a real or fixture-backed `Memory.from_config` add/search smoke, queue retry tests, and rollback instructions to the pinned 0.1.x line.
- [ ] **INT-FOLLOWUP-05**: A2A/ADK current-spec compatibility pass validates MemroOS against the current A2A agent-card and messaging spec before new A2A extensions ship. Scope includes `A2A_VERSION`, canonical `/.well-known/agent-card.json`, legacy `/.well-known/agent.json` compatibility policy, HTTP+JSON and JSON-RPC method names, streaming and unsupported-operation behavior, cancel/subscribe semantics, auth/security metadata, Google ADK fixture interop, and an explicit decision on ADK's non-legacy A2A extension mode.
- [ ] **INT-FOLLOWUP-06**: Runtime patch sweep verifies current minor/patch integration drift for Pipecat/Daily, LangGraph/checkpointer, and Next.js 16.2.x proxy behavior. Pipecat/Daily scope covers stale 1.0-era comments/import assumptions, `DailyTransport` listener smokes, transcript frame handling, and room-token redaction. LangGraph scope covers the 1.2.x patch bump, explicit `langgraph-checkpoint-sqlite` inventory/security floor, `SqliteSaver` checkpoint resume/HIL tests, and retry-policy behavior. Next.js scope covers the `proxy.ts` convention, route matchers, auth/tenant redirects, and absence of stale `middleware` configuration.
- [ ] **INT-FOLLOWUP-07**: Frontend/security toolchain major audit stages `jose` 5-to-6, shadcn CLI 3-to-4, ESLint 9-to-10, and TypeScript 5-to-6 before bumping. The audit must verify Node/runtime compatibility, JWT sign/verify/cookie auth behavior, shadcn registry/dry-run behavior, lint config lookup and custom rule compatibility, TypeScript root/module defaults, `npm run lint`, typecheck, Next build, and representative auth/navigation Playwright smoke tests.
- [ ] **EVAL-FOLLOWUP-01**: Eval engine judge operations include provider-backed judge invocation, judge-model re-baselining, model/prompt/dataset version capture, and cost ownership before customer-facing eval claims are made.
- [ ] **EVAL-API-FOLLOWUP-01**: Public eval API v2 supports production ingestion and notification patterns: external OpenInference traces, OpenTelemetry collector bridge, bulk trace submission, webhook push delivery, and streaming/SSE result delivery.
- [ ] **EVAL-API-FOLLOWUP-02**: Public eval API operations are externalization-ready: Redis or shared rate limiting for multi-instance deployments, tenant API-key UI, usage metering/billing hooks, SDK semantic-version automation, and verified `docs/eval-quickstart.md` before customer exposure.
- [ ] **MEMGEN-FOLLOWUP-01**: Memory autogen proposals must have an explicit phase contract and live-backend validation path: non-fixture evals exercise mem0/graph/vector memory, record deterministic replay evidence, and distinguish modeled W-lift from real behavioral lift.
- [ ] **SEAL-FOLLOWUP-01**: SEAL proposal lifecycle operations include governed auto-apply mode, bulk review, expiry/garbage-collection policy, and tenant isolation for proposal queues.
- [ ] **SEAL-FOLLOWUP-02**: SEAL proposal types become plugin-capable with file-system snapshot/restore for `skill_addition` mutations and a safe runtime proposal-type registry.
- [ ] **AGENTGEN-FOLLOWUP-01**: Agent trajectory evaluation adds a trace-capture to human-annotation workflow, configurable `max_trajectory_steps`, and audit events for eval preset changes so W trends remain interpretable.
- [ ] **L3-FOLLOWUP-01**: Business outcome layer adds live Salesforce, Zendesk, and NetSuite adapters with real OAuth/SOAP/API setup rather than fixtures.
- [ ] **L3-FOLLOWUP-02**: Business outcome ingestion supports inbound webhooks and automated correlation-ID injection or setup verification for external systems, not only polling/manual configuration.
- [ ] **L3-FOLLOWUP-03**: Business outcome scoring validates against production tenant data with per-company golden sets, W-threshold alerts, and configurable SLA/TTR targets instead of observed-only signals.
- [ ] **AUTH-FOLLOWUP-01**: Team auth hardening adds email invitation delivery, password reset, email change/verification, OAuth/SSO login, and login/refresh lockout telemetry.
- [ ] **AUTH-FOLLOWUP-02**: Role-aware UI gating hides or disables unauthorized nav/actions before click-through while keeping API/page-level 403 enforcement.
- [ ] **AUTH-FOLLOWUP-03**: Tenant/admin management includes API-key rotation, tenant settings, user lifecycle management, and migration of legacy audit actor fields to authenticated user identity.
- [ ] **AUDIT-FOLLOWUP-01**: Audit compliance hardening adds tamper-evident hash chaining plus retention and archival policies configurable by admins.
- [ ] **AUDIT-FOLLOWUP-02**: HIL/escalation operations add email/webhook or Slack notifications, bulk resolution, and SLA escalation UX beyond the queue-only view.
- [ ] **AUDIT-FOLLOWUP-03**: Audit access expands to full-text search over reason/metadata and tenant-scoped audit-log access through the public/customer API boundary.
- [ ] **UX-FOLLOWUP-01**: ClaudeClaw-inspired Chat tab provides a dedicated command/chat workspace for CLIs, Paperclip project agents, runtime subagents, and MemroOS system identities separate from Flow.
- [ ] **UX-FOLLOWUP-02**: Memory search surface unifies SQLite recall, mem0/vector memory, Neo4j graph memory, qmd/knowledge files, and filters for agent, project, source, date, and memory tier.
- [ ] **UX-FOLLOWUP-03**: Schedules and routines console exposes recurring jobs, cron health, standing delegations, maintenance routines, and approval-required automations.
- [ ] **UX-FOLLOWUP-04**: Hivemind Obsidian view provides graph/canvas exploration of agents, memories, tasks, proposals, skills, backlinks, and relationships.
- [ ] **UX-FOLLOWUP-05**: Paperclip design-system completion migrates drawers, sheets, modals, detail panels, empty states, and error states off the older dark dashboard shell.
- [ ] **UX-FOLLOWUP-06**: Flow canvas redesign migrates React Flow topology, minimap, controls, node cards, edge styling, group boxes, and node detail panels into the Paperclip-style system while preserving graph readability.
- [ ] **GSD-FOLLOWUP-01**: Milestone close requires every phase-local deferred item, open context question, scope trim, and retro-documented gap to be either closed as intentionally shipped, promoted to a requirement ID, or marked explicitly out of scope with rationale.
- [ ] **UI-PARITY-01**: Correct phase and requirement status claims so `REQUIREMENTS.md`, `ROADMAP.md`, `STATE.md`, plan summaries, and actual operator-visible behavior agree; Phase 71 checkmarks must distinguish completed wave-1 foundations from unfinished wave-2 UI/API work.
- [ ] **UI-PARITY-02**: Wire the Phase 70 HIL edit-and-continue UI into the live orchestration approval panel so an operator can edit, validate, audit, and resume a real paused HIL task from the visible app surface.
- [x] **UI-PARITY-03**: Complete Phase 71 wave-2 operator surfaces and contracts: semantic/hybrid recall endpoint plus embedding job, HIL SLA countdown/traffic-light dashboard, and recording-consent gate plus meeting join UI.
- [ ] **UI-PARITY-04**: Reconcile the Operations NOC with product truth: replace mock panels with live data where available, or clearly render missing/degraded telemetry states until the NOC real-data requirements are implemented.
- [ ] **UI-PARITY-05**: Add a GSD phase-close gate requiring every completed phase to declare its operator representation: visible UI, visible status/provenance in an existing UI, API/backend-only with explicit label, or promoted follow-up UI requirement.
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
| Phase 73 | UI-PARITY-01..05 |
