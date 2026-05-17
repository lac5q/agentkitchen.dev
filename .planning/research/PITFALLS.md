# Domain Pitfalls: Memroos v4.0

**Project:** Memroos — AI Agent Hub
**Researched:** 2026-05-17
**Scope:** Adding v4.0 features to an existing production system

---

## SCOPE NOTE

`cross-harness skills portability` appears in the task brief but is **not listed in PROJECT.md Active (v4.0)** requirements. All other features map to known requirement IDs. The roadmapper must confirm whether cross-harness portability is in v4.0 scope before writing requirements for it. Pitfalls below cover only the nine features with explicit PROJECT.md requirement IDs. A stub section at the end notes what would need research if it is confirmed in scope.

---

## Cross-Cutting Pitfalls (Apply to ALL Phases)

These pitfalls must be established as guardrails before the first v4.0 phase is written.

### CC-1: Two SQLite Files, Two Lock Domains
**What goes wrong:** `data/memroos.db` is owned by the Next.js `better-sqlite3` singleton (WAL mode, `busy_timeout=5000`). `data/orchestration.db` is owned by the Python `OrchestrationStore` (sqlite3, no WAL pragma — confirmed by reading `engine.py`). Any feature that tries to read one from the other process, or opens the same file from both, will produce lock contention or data races.
**Risk Level:** CRITICAL
**Prevention:** Never open `orchestration.db` from Node/TypeScript code, and never open `memroos.db` from Python. Data exchange between the two processes is over HTTP only — the orchestration FastAPI service and Next.js API routes.
**Which Phase:** ALL — enforce as architectural invariant from the first v4.0 phase.

### CC-2: `OrchestrationStore` is Per-Request, Not a Singleton
**What goes wrong:** `app.py` calls `get_engine()` on every HTTP request, which creates a new `sqlite3.connect()` and closes it in `finally`. Any feature that assumes in-process Python state persists between requests (timers, retry queues, in-flight counters, async tasks) will lose that state on the next request.
**Risk Level:** HIGH
**Prevention:** All timer state, retry budgets, and SLA deadlines must be rows in `orchestration.db`, not in-memory Python objects.
**Which Phase:** ALL — call out in any phase touching the orchestration service.

### CC-3: `execSync`/`exec` Ban at Process Boundaries
**What goes wrong:** Behavioral W-lift and voice-bot control code will need to invoke subprocesses. Using `exec` or `execSync` with a shell string is both a security risk and a constraint violation (PROJECT.md Constraints). Researchers familiar with Python subprocess patterns may port the wrong idiom.
**Risk Level:** HIGH
**Prevention:** All subprocess invocations in TypeScript must use `execFileSync` with an explicit argv array, never a shell string. In Python, use `subprocess.run([...], shell=False)`.
**Which Phase:** SEAL-04..06 (behavioral W-lift sandbox), VOICE-06..08 (meeting bot control).

### CC-4: `orchestration.db` Missing WAL Mode
**What goes wrong:** The `OrchestrationStore._init_schema()` runs `executescript(CREATE TABLE IF NOT EXISTS ...)` but never sets `PRAGMA journal_mode=WAL`. With v4.0 adding edit-and-continue (concurrent read+write) and timer polling, the default rollback journal mode will cause writer-blocks-reader stalls under concurrent HTTP requests.
**Risk Level:** HIGH
**Prevention:** Add `conn.execute("PRAGMA journal_mode=WAL")` and `conn.execute("PRAGMA busy_timeout=5000")` in `OrchestrationStore.__init__` before `_init_schema()`. Do this in the first phase that touches the orchestration service (HIL-01..03).
**Which Phase:** HIL-01..03 — first opportunity, make it a prerequisite.

### CC-5: New Endpoints Must Not Skip `authorizeRegistryWrite`
**What goes wrong:** v4.0 adds multiple new API routes (HIL edit, SLA escalation, meeting bot control, SEAL re-execution trigger). If any new route omits the `authorizeRegistryWrite` guard (pattern established in `route.ts` for HIL), it becomes an open endpoint reachable through the Cloudflare tunnel.
**Risk Level:** HIGH
**Prevention:** Copy the exact guard pattern from `/api/orchestration/hil/route.ts` to every new API route. Add a CI lint rule or test asserting that every route under `/api/orchestration/` calls `authorizeRegistryWrite`.
**Which Phase:** ALL — check in every new route PR.

---

## HIL Edit-and-Continue (HIL-01..03)

### HIL-P1: `update_state` + `as_node` Ordering Mistake
**What goes wrong:** LangGraph's edit-and-continue requires calling `graph.update_state(config, values, as_node="<node>")` before issuing `Command(resume=...)`. The `as_node` parameter tells LangGraph which node produced the updated values, which determines which node runs next. In the current graph, if `as_node="route_policy"` is used, execution resumes at `approval` or `dispatch` (route_policy's successors), which is correct for a task-payload edit. If `as_node` is omitted or set to `"approval"`, the successor is `END` and the graph terminates immediately after the edit without dispatching.
**Risk Level:** HIGH
**Prevention:** In the Python edit endpoint, always pass `as_node="route_policy"` when editing task payload fields before resume. Verify against the compiled graph's edge map, not assumptions. Covered by Context7 LangGraph docs (`update_state` with `as_node` for forking state).
**Which Phase:** HIL-01..03

### HIL-P2: Concurrent Edits Racing the Checkpointer
**What goes wrong:** `LangGraphRuntime._compiled()` opens a new `SqliteSaver` context on every call. Two simultaneous edit-and-resume requests for the same `thread_id` will both read the same checkpoint, apply edits, and write back — last writer wins, first edit is silently lost.
**Risk Level:** HIGH
**Prevention:** Serialize edit+resume operations per `thread_id` using a per-thread lock (e.g., a threading.Lock registry keyed by `run_id`). Alternatively, enforce at the HTTP layer: accept edit only when `status == "waiting_for_approval"` and optimistically lock with a status CAS.
**Which Phase:** HIL-01..03

### HIL-P3: Unvalidated Keys in `update_state` Payload
**What goes wrong:** `graph.update_state(config, arbitrary_dict)` will write any keys into the checkpoint. If the edit endpoint accepts arbitrary JSON from the operator without validating against `OrchestrationState`, injected keys will silently persist in the checkpoint and may cause type errors or incorrect routing at resume time.
**Risk Level:** MEDIUM
**Prevention:** Validate the edit payload against the `OrchestrationState` TypedDict schema (Pydantic model on the FastAPI side) before passing to `update_state`. Reject unknown keys with HTTP 422.
**Which Phase:** HIL-01..03

---

## HIL Timeout + SLA Escalation (HIL-04..06)

### HIL-P4: In-Process Timer State Lost on Restart
**What goes wrong:** LaunchAgent will restart the orchestration service on crash or OS reboot. Any timer state stored as a Python `asyncio.sleep` task or `threading.Timer` will be lost. Pending decisions that were approaching their SLA will restart their clock from zero silently.
**Risk Level:** HIGH
**Prevention:** Store SLA deadline as an ISO timestamp column (`sla_deadline_at`) on `orchestration_hil_decisions` at creation time. The timer mechanism is a Next.js `instrumentation.ts` scheduler tick polling `/hil/expired` — not an in-process Python timer. Matches the established scheduler pattern (PROJECT.md Key Decisions v1.5).
**Which Phase:** HIL-04..06

### HIL-P5: Escalation Fan-Out on Repeated Timer Ticks
**What goes wrong:** The scheduler polls `/hil/expired` on a fixed interval. If escalation creates a new HIL decision without an idempotency guard, a slow human response will cause the scheduler to create a new escalation decision on every tick until the decision is resolved.
**Risk Level:** HIGH
**Prevention:** Add a unique constraint on `(run_id, escalation_level)` in `orchestration_hil_decisions`. Set `status = "escalated"` on the original decision at the same time as creating the escalation row (single DB transaction).
**Which Phase:** HIL-04..06

### HIL-P6: Timer Ownership Ambiguity
**What goes wrong:** Adding an `asyncio` background task in the FastAPI app for SLA polling creates a second, incompatible scheduler path alongside the established `instrumentation.ts` scheduler. Two sources of escalation for the same decision will race.
**Risk Level:** MEDIUM
**Prevention:** One canonical timer owner: Next.js `instrumentation.ts`. The orchestration service exposes a stateless `/hil/expired` endpoint that returns decisions past their `sla_deadline_at`. The scheduler calls that endpoint and triggers escalation via a `POST /hil/{id}/escalate`.
**Which Phase:** HIL-04..06

---

## Multi-Hop Retry + Rollback (ORCH-08..10)

### ORCH-P1: Compensation Closures in Code, Not Data
**What goes wrong:** Storing rollback logic as Python callables (lambda, functools.partial) means that a process crash mid-rollback loses the compensation plan. The next process start cannot reconstruct what compensation steps were pending.
**Risk Level:** HIGH
**Prevention:** Store compensation as declarative rows in `orchestration_lineage` with `hop_type="compensation_pending"` and a `detail_json` that encodes the compensation verb and target. Reconstruction reads the lineage log, not in-memory state.
**Which Phase:** ORCH-08..10

### ORCH-P2: A2A Transport Has No Rollback Verb
**What goes wrong:** Multi-hop rollback may need to send a compensation action to a remote agent via A2A. A2A v1 has no first-class "undo" message type. Assuming remote agents will handle a freeform "rollback" task message is fragile and depends on agent cooperation.
**Risk Level:** HIGH
**Prevention:** Define a Memroos-side local compensation contract. Remote agents receive a standard task with `requiredCapability: "compensate"` and a `correlationId` back-reference. If the agent does not implement compensation, Memroos records a `compensation_skipped` lineage row and continues without expecting remote rollback.
**Which Phase:** ORCH-08..10

### ORCH-P3: Per-Hop Retry Budget Stuffed into `attempts` Column
**What goes wrong:** The current `orchestration_runs` table has a single `attempts` INTEGER. Multi-hop rollback needs per-hop retry tracking. Incrementing the same column for different hops makes it impossible to know which hop exhausted its budget.
**Risk Level:** MEDIUM
**Prevention:** Store per-hop retry counts in `orchestration_lineage.detail_json` keyed by `hop_id`. Do not reuse or overload the top-level `attempts` column for hop-level tracking.
**Which Phase:** ORCH-08..10

### ORCH-P4: Increment-Before-Dispatch Leaves Inflated Attempt Count on Crash
**What goes wrong:** `increment_attempts` commits to SQLite before the dispatch call. If the process crashes between the commit and the actual dispatch, `attempts` is inflated by 1 with no actual hop having occurred. This is a latent bug that rollback work will amplify.
**Risk Level:** MEDIUM
**Prevention:** Add a `dispatch_confirmed_at` timestamp column. Only count an attempt as real when the dispatch acknowledgement is received. Saga recovery reads unconfirmed attempts as candidates for re-dispatch.
**Which Phase:** ORCH-08..10 (address before adding new hop logic on top).

---

## Memory Backend Pluggability (MEM-06..08)

### MEM-P1: Adapter Exposing Direct Vector Client Handle
**What goes wrong:** The HTTP-only invariant for mem0/Qdrant (PROJECT.md Key Decisions v1.3) prohibits direct Qdrant client access from app code. An adapter interface that exposes a `getClient()` or `getQdrantClient()` method will invite callers to bypass the constraint.
**Risk Level:** HIGH
**Prevention:** The `MemoryBackendAdapter` interface exposes only `search(query, limit)`, `save(entry)`, and `health()`. No client handle, no raw collection access. Enforce at the TypeScript interface level — no method returning a Qdrant/Neo4j client type.
**Which Phase:** MEM-06..08

### MEM-P2: Single-Writer-Per-Tier Violated by Bundled Adapters
**What goes wrong:** If a new adapter bundles two tiers (e.g., a Postgres+pgvector adapter handling both vector and episodic), the existing `searchVectorMemory` (mem0 HTTP) and SQLite episodic paths will continue to write concurrently — double-writing to the same logical tier.
**Risk Level:** HIGH
**Prevention:** The adapter contract must declare which tiers it owns (`tiers: ("vector" | "graph" | "episodic")[]`). A registered adapter that claims a tier disables the built-in path for that tier. No tier may have two active writers simultaneously.
**Which Phase:** MEM-06..08

### MEM-P3: Health Panel Reporting Stale Tiers After Adapter Swap
**What goes wrong:** `SqliteHealthPanel` and `MemoryIntelligencePanel` call `checkVectorHealth()` and `checkGraphHealth()` by name. Swapping in a new adapter for the vector tier will leave the panels still polling the old mem0 endpoint, reporting stale/incorrect health.
**Risk Level:** MEDIUM
**Prevention:** Health check functions must be dynamically resolved from the adapter registry, not hardcoded to `checkVectorHealth`/`checkGraphHealth`. Each registered adapter provides a `healthCheck()` function.
**Which Phase:** MEM-06..08

### MEM-P4: Env Namespace Collision Between Adapters
**What goes wrong:** Today `backends.ts` reads `NEO4J_HTTP_URL`, `NEO4J_DATABASE`, etc. at call time. A second graph adapter would need the same env vars but for a different host. Unnamespaced global env vars mean you can only configure one backend per tier at a time and cannot stage a migration.
**Risk Level:** MEDIUM
**Prevention:** Use a namespaced env convention: `MEMORY_BACKEND_<ADAPTER_NAME>_URL`, `MEMORY_BACKEND_<ADAPTER_NAME>_KEY`. The adapter registration call specifies its env prefix.
**Which Phase:** MEM-06..08

---

## Voice Meeting Bot (VOICE-06..08)

### VOICE-P1: Pipecat Has No Native Zoom/Teams Transport (FEASIBILITY BLOCKER)
**What goes wrong:** The current voice server uses `WebsocketServerTransport` (port 7860), which accepts inbound WebSocket connections from a browser. Pipecat's production transport for real external calls is `DailyTransport` (Daily WebRTC). Zoom and Teams do not expose a Daily room URL — joining an external Zoom/Teams meeting requires either: (a) a virtual audio device that routes through a WebRTC bridge, (b) a Zoom/Teams SDK bot (bot-platform API, available on paid plans), or (c) a telephony bridge (Twilio PSTN dial-in). Pipecat has Twilio and Daily transports but no first-class Zoom or Teams meeting-join transport. Once an integration path is chosen (Daily bridge, Twilio PSTN, or Zoom bot SDK), risk drops to HIGH.
**Risk Level:** CRITICAL — This is a feasibility-class constraint. The roadmapper must choose the integration path before writing VOICE-06..08 requirements. Pipecat documentation confirms Daily WebRTC is the recommended production transport; Zoom/Teams direct join requires an intermediary service.
**Prevention:** Decide on the meeting-join path before phase planning. The safest path in this stack: use Daily.co as the WebRTC fabric (Pipecat has `DailyTransport` and dial-out support), and use Daily's Zoom meeting integration or a Zoom bot SDK to bridge. Document this as a new external dependency (`DAILY_API_KEY`).
**Which Phase:** VOICE-06..08 — must be resolved in phase design, not implementation.

### VOICE-P2: Meeting URLs Are Bearer Credentials — Must Not Be Logged
**What goes wrong:** Zoom and Teams meeting URLs contain join tokens. If meeting-bot join requests pass through the existing `audit_log` or `hive_actions` tables (which log summaries freely), the join token will be persisted in plaintext and visible to any dashboard user.
**Risk Level:** HIGH
**Prevention:** Never log meeting URLs or join tokens to `audit_log` or `hive_actions`. Log only the meeting ID (opaque string). Add a content scanner rule (matching the existing 18-pattern scanner in v1.5) for meeting URL patterns.
**Which Phase:** VOICE-06..08

### VOICE-P3: FTS5 Trigger Cost Under High-Volume Meeting Transcripts
**What goes wrong:** The `transcript_writer.py` writes meeting transcripts to the main SQLite (`messages` table). A 60-minute meeting at 10-second transcript flush intervals = 360 `INSERT INTO messages` calls, each triggering the `messages_ai` FTS5 trigger. Combined with other live writes during a meeting, this will saturate the SQLite write window.
**Risk Level:** MEDIUM
**Prevention:** Batch transcript segments into 60-second chunks before writing. For meetings > 30 minutes, write to a separate `meeting_transcripts` table without FTS5 trigger, and index asynchronously after the meeting ends.
**Which Phase:** VOICE-06..08

### VOICE-P4: Two-Port Architecture Overloaded with Meeting Control
**What goes wrong:** The voice server currently uses port 7860 (audio WebSocket) and port 7861 (health FastAPI). Adding meeting-join control (join URL, leave, mute) via the health endpoint overloads its responsibility and breaks the health-check contract.
**Risk Level:** MEDIUM
**Prevention:** Add a third endpoint surface (port 7862 or a new FastAPI route group `/meeting`) for meeting-bot control APIs. Do not add meeting commands to the `/health` endpoint.
**Which Phase:** VOICE-06..08

### VOICE-P5: Recording Consent (Non-Technical)
**What goes wrong:** Recording and transcribing external meetings without participant consent violates GDPR, CCPA, and local wiretap laws in many jurisdictions.
**Risk Level:** HIGH (legal, not technical)
**Prevention:** Require the meeting bot to announce itself and state it is recording on join. Provide a clear UI toggle for recording consent confirmation before the bot joins. Document jurisdiction restrictions in the operator guide.
**Which Phase:** VOICE-06..08

---

## LLM-Powered Recall Scoring (RECALL-01..02)

### RECALL-P1: Embedding Every Candidate at Query Time
**What goes wrong:** If embeddings are computed for all candidate messages at query-time, a recall request over a large conversation store (tens of thousands of messages) will issue thousands of LLM embedding API calls per query — catastrophic latency and cost.
**Risk Level:** HIGH
**Prevention:** Precompute and persist embeddings at ingest time. The `messages_ai` trigger (or a post-insert hook) should enqueue an embedding job. Store embeddings in a `message_embeddings` table (BLOB column with vector dimension or sqlite-vec extension). Query-time embedding is only for the query string itself.
**Which Phase:** RECALL-01..02

### RECALL-P2: Choosing the Same Local Embedding Stack as GitNexus
**What goes wrong:** PROJECT.md Known Debt: "GitNexus embeddings partial (285/473) — crash bug upstream" (node-llama-cpp macOS arm64). Using the same local llama.cpp runtime for recall embeddings will hit the same crash.
**Risk Level:** HIGH
**Prevention:** Use a remote embedding provider (OpenAI `text-embedding-3-small`, Voyage, or Cohere) or a different local runtime (Ollama with a small model). Do not depend on node-llama-cpp until the upstream bug is resolved.
**Which Phase:** RECALL-01..02

### RECALL-P3: Embedding Storage Conflict with mem0/Qdrant
**What goes wrong:** mem0 already stores embeddings in Qdrant Cloud for the `agent_memory` collection. If recall embeddings for `messages` are also stored in Qdrant under a new collection, there are now two Qdrant collections with different write paths, ownership, and retention policies.
**Risk Level:** MEDIUM
**Prevention:** Define clearly: recall embeddings for `messages` live in SQLite (sqlite-vec extension or a `BLOB` column), not in Qdrant. Qdrant remains exclusively for mem0-managed agent memory. This keeps the mem0 HTTP-only invariant unambiguous.
**Which Phase:** RECALL-01..02

### RECALL-P4: BM25 Fallback Path Abandoned on Embedding Outage
**What goes wrong:** If the embedding API is down, recall falls back to nothing (no BM25 results) rather than the existing FTS5/BM25 path.
**Risk Level:** MEDIUM
**Prevention:** Keep the FTS5 recall path as a fallback, following the degradation gate pattern from v3.1 context source contracts. If embedding API health check fails, recall silently falls back to BM25 and adds `degraded: true` to the response.
**Which Phase:** RECALL-01..02

---

## Cross-Project Recall (RECALL-03..04)

### RECALL-P5: Triggering Recursive `readdir` on Project Roots
**What goes wrong:** Cross-project recall needs to know which projects exist and their conversation logs. If implementation scans project root directories recursively at query time, it hits the same constraint as the Obsidian vault: catastrophic inode load (PROJECT.md Constraints: "No recursive readdir on Obsidian vault").
**Risk Level:** HIGH
**Prevention:** Cross-project recall uses opt-in path configuration only. Each additional project is registered as an explicit path list (e.g., in `context-sources.config.json`). No filesystem discovery at query time.
**Which Phase:** RECALL-03..04

### RECALL-P6: Default Cross-Project Leaks Work Context Across Clients
**What goes wrong:** If cross-project recall is on by default, a query about Project A may surface memories from Project B (potentially from a different employer or client), creating a privacy violation.
**Risk Level:** HIGH
**Prevention:** Cross-project recall is opt-in per query — a caller must explicitly pass `crossProject: true` and a list of allowed project IDs. The default `recall` behavior remains single-project scoped.
**Which Phase:** RECALL-03..04

### RECALL-P7: Unormalized Scores Favour Larger Projects
**What goes wrong:** If a cross-project BM25 or cosine score is compared directly across projects of different sizes, the larger project's denser index will dominate results regardless of relevance.
**Risk Level:** MEDIUM
**Prevention:** Normalize recall scores per project before merging (e.g., max-norm per project). Merge and re-rank after normalization.
**Which Phase:** RECALL-03..04

---

## True Behavioral W-Lift (SEAL-04..06)

### SEAL-P1: Re-Execution Against Live State-Mutating Agents
**What goes wrong:** Behavioral W-lift re-runs agent instructions to measure outcome improvement. If the agent under eval has side-effecting tools enabled (file writes, email sends, API calls), a re-execution run will mutate real state — creating files, sending emails, etc.
**Risk Level:** CRITICAL
**Prevention:** Behavioral re-execution requires a sandboxed eval profile that stubs or disables all side-effecting tools. The eval runner must pass a tool-stub configuration that replaces `file_write`, `send_email`, and any external API tools with no-op stubs that return synthetic success responses.
**Which Phase:** SEAL-04..06 — the sandbox mechanism must be designed and tested before any behavioral re-execution is run.

### SEAL-P2: Scoring Across Different Model Versions
**What goes wrong:** If behavioral eval runs for "before" and "after" use different `judge_model` versions (due to model deprecation or auto-routing), the W-lift delta reflects model variance, not agent improvement.
**Risk Level:** HIGH
**Prevention:** Pin `judge_model` and `judge_model_family` for the duration of a SEAL evaluation cycle. `EvalRunRow` already carries these fields — add a constraint that behavioral W-lift pairs must share the same `judge_model`. Reject comparison if versions differ.
**Which Phase:** SEAL-04..06

### SEAL-P3: Unbounded Re-Execution Token Cost
**What goes wrong:** Each behavioral re-execution involves multiple LLM calls (agent execution + judge scoring). Without a budget, a single SEAL cycle on a complex agent could exhaust daily token quotas or incur unexpected cost.
**Risk Level:** HIGH
**Prevention:** Require a daily token budget knob (`SEAL_MAX_DAILY_TOKENS`) enforced by the eval runner before each re-execution. Surface current-day usage in the eval UI before running.
**Which Phase:** SEAL-04..06

### SEAL-P4: Behavioral Runs Overwriting Existing Eval Rows
**What goes wrong:** `persistEvalRun` keys on `trace_id`. If behavioral re-execution reuses the original `trace_id`, it will overwrite the baseline eval row, losing the before/after comparison.
**Risk Level:** MEDIUM
**Prevention:** Behavioral W-lift runs append new `EvalRun` rows with a `(trace_id, generation)` compound key, where `generation` increments per behavioral run. The baseline is `generation=0`. Never upsert over the baseline row.
**Which Phase:** SEAL-04..06

---

## Cross-Harness Skills Portability (Scope Unconfirmed)

This feature appears in the task brief but is not in `PROJECT.md Active (v4.0)`. If the roadmapper confirms it is in v4.0 scope, key pitfall areas to research are:

- Skill schema portability across different harness formats (Claude Code, LangChain, AutoGen) — likely needs a canonical skill serialization format that maps to each harness's tool-call schema.
- Skill execution sandboxing — same concerns as SEAL-P1 above.
- Import/export auth: skills may contain API keys or service assumptions embedded in their instructions.

**Action for roadmapper:** Confirm scope before assigning requirement IDs.

---

## Phase-Specific Warning Summary

| Phase | Feature | Top Pitfall | Mitigation |
|-------|---------|-------------|------------|
| First v4.0 phase | ALL | CC-4: `orchestration.db` missing WAL mode | Add WAL pragma in `OrchestrationStore.__init__` before writing any v4.0 features |
| HIL-01..03 | Edit-and-continue | HIL-P1: Wrong `as_node` terminates graph silently | Use `as_node="route_policy"`, validate against edge map |
| HIL-01..03 | Edit-and-continue | HIL-P2: Concurrent edits race checkpointer | Per-`thread_id` serialization lock |
| HIL-04..06 | SLA escalation | HIL-P4: In-process timers lost on restart | DB-row deadlines + Next.js scheduler tick |
| HIL-04..06 | SLA escalation | HIL-P5: Escalation fan-out | Unique constraint on `(run_id, escalation_level)` |
| ORCH-08..10 | Multi-hop rollback | ORCH-P1: Compensation closures in code | Declarative compensation rows in lineage |
| ORCH-08..10 | Multi-hop rollback | ORCH-P2: A2A has no rollback verb | Local compensation contract, not remote dependency |
| MEM-06..08 | Backend pluggability | MEM-P1: Adapter exposes client handle | Interface must have only search/save/health |
| MEM-06..08 | Backend pluggability | MEM-P2: Double-writer per tier | Adapter declares owned tiers; built-in path disabled |
| VOICE-06..08 | Meeting bot | VOICE-P1: No native Zoom/Teams transport | Resolve integration path (Daily.co bridge) before phase design |
| VOICE-06..08 | Meeting bot | VOICE-P2: Meeting URLs in audit log | Never log join tokens; add content scanner rule |
| RECALL-01..02 | LLM recall scoring | RECALL-P1: Per-query embedding of all candidates | Pre-compute at ingest; query-time only for query string |
| RECALL-01..02 | LLM recall scoring | RECALL-P2: node-llama-cpp crash | Use remote embedding provider or Ollama |
| RECALL-03..04 | Cross-project recall | RECALL-P5: Recursive readdir | Opt-in path config, no filesystem discovery |
| RECALL-03..04 | Cross-project recall | RECALL-P6: Default cross-project data leak | Opt-in per query only |
| SEAL-04..06 | Behavioral W-lift | SEAL-P1: Re-execution mutates live state | Sandboxed eval profile with stubbed side-effect tools |
| SEAL-04..06 | Behavioral W-lift | SEAL-P3: Unbounded re-execution cost | Daily token budget knob before any run |

---

## Sources

- LangGraph Python docs via Context7 (`/websites/langchain_oss_python_langgraph`) — `update_state` + `as_node` semantics, `Command(resume=...)` pattern. MEDIUM-HIGH confidence (current official source).
- Pipecat docs via Context7 (`/pipecat-ai/docs`) — transport options (Daily WebRTC, Twilio), confirmed absence of native Zoom/Teams transport. HIGH confidence (official source).
- `services/orchestration/engine.py` — confirmed absence of WAL pragma on `orchestration.db`. HIGH confidence (source code).
- `apps/memroos/src/lib/db.ts` — confirmed WAL + busy_timeout on main `memroos.db`. HIGH confidence (source code).
- `services/voice-server/server.py` — confirmed two-port architecture and `WebsocketServerTransport`. HIGH confidence (source code).
- `apps/memroos/src/lib/memory/backends.ts` — confirmed HTTP-only mem0 access, global env var pattern for Neo4j. HIGH confidence (source code).
- `apps/memroos/src/lib/evals/service.ts` — confirmed `EvalRunRow` fields (`judge_model`, `judge_model_family`, `trace_id`). HIGH confidence (source code).
- `PROJECT.md` — constraints, key decisions, known debt. HIGH confidence.
