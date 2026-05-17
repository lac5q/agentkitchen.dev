# Feature Landscape: Memroos v4.0

**Domain:** AI agent hub — orchestration runtime, memory, voice, recall, SEAL evaluation
**Researched:** 2026-05-17
**Mode:** Subsequent milestone — new capabilities only (existing features excluded)

---

## HIL Edit-and-Continue

**Depends on:** Basic HIL approve/reject in LangGraph (v3.x existing)

### Table Stakes

- Operator can modify one or more declared task state fields before resuming the graph (not just approve/reject)
- Modified payload is passed via `Command(resume={...})` carrying the edited field values; LangGraph's `interrupt()` call returns the operator-provided object
- UI presents only the fields declared as editable in the interrupt value — not a raw JSON dump of entire graph state
- Edited values are validated against expected types before resume (prevents graph crashes from malformed input)
- Audit log records: who edited, which fields changed, before/after values, timestamp

### Differentiators

- Diff view: highlight which fields the operator changed vs the agent's proposed values
- Field-level change reason prompt: operator can annotate why they changed a value (stored in audit log)
- Pre-resume dry-run: show which downstream nodes will be affected by the edited fields before committing

### Anti-features

- Full state-tree visual editor (anti — editable fields must be declared by the graph; exposing full internal state to operators is a security and UX footgun)
- Free-form JSON paste (anti — schema-validated form fields only; raw JSON input creates type error blast radius)
- Re-running already-completed upstream nodes to "re-derive" state (anti — edit-and-continue means forward-only from the interrupt point)

**Complexity:** Medium. The `interrupt()` / `Command(resume=...)` primitive is native LangGraph; the work is UI form generation from declared editable fields + audit integration.

---

## HIL Timeout + SLA Escalation

**Depends on:** Basic HIL approve/reject in LangGraph, audit log (v1.5+)

### Table Stakes

- Each interrupt point has a configurable SLA deadline (e.g., 30 min, 4 hr, 24 hr)
- A background job (scheduler) scans pending interrupt threads and fires escalation when deadline passes
- Escalation actions: (a) notify a secondary operator, (b) auto-approve with AI recommendation, (c) auto-reject and compensate, (d) mark thread abandoned
- SLA configuration is per-interrupt-type (not global), stored with the graph definition
- Dashboard shows pending HIL items with countdown timers and SLA status (green/yellow/red)
- Escalation events are written to the audit log

### Differentiators

- Escalation chain: primary operator → secondary → auto-decision, each with its own deadline
- SLA breach metrics on dashboard (how often HIL items exceed SLA, by interrupt type)
- Operator notification via existing channels (in-app, or extensible to webhook/email)

### Anti-features

- LangGraph native SLA (does not exist — LangGraph threads sit in the checkpointer indefinitely with no built-in timeout; the scheduler and TTL scan must be built outside LangGraph)
- Per-user SLA routing (anti for v4 — single-operator system; routing is to "escalation target" not to a user pool)
- Integrating an external workflow engine like Temporal just for SLA (anti — a cron/scheduler scanning SQLite thread metadata achieves the same at zero infra cost)

**Complexity:** Medium. LangGraph provides no native timeout — the scheduler pattern from v1.5 (instrumentation.ts 15-min cron) is the implementation model. Core work is: deadline storage, scanner job, escalation action dispatch, and dashboard countdown UI.

---

## Multi-hop Retry + Rollback

**Depends on:** A2A hub, agent registry, LangGraph orchestration (v2.0+)

### Table Stakes

- Per-hop retry budget: each agent node in a multi-agent chain has a configurable `max_attempts` with backoff (LangGraph `RetryPolicy` + `TimeoutPolicy` are native — use them)
- On exhaustion of retries at any hop, the chain does not silently succeed — it fires a compensation path
- Compensation path executes undo/rollback actions in reverse order for completed hops (Saga pattern: each forward action has a paired compensating action)
- Failed chain state is persisted (not lost) — operator can inspect which hop failed and why
- A2A task status reflects the failure accurately: not just "error" but "failed at hop N, compensated hops 1..N-1"

### Differentiators

- Partial success surfacing: completed hops before the failure are enumerated in the UI, showing what succeeded before rollback
- Idempotency keys per hop: retry-safe by design (re-executing a hop is safe if the upstream result is unchanged)
- Selective retry: operator can manually retry a specific failed hop without re-running the whole chain

### Anti-features

- Full distributed transaction semantics / two-phase commit (anti — Saga with best-effort compensation is the correct model for LLM agent chains; 2PC is unimplementable across heterogeneous agents)
- Writing your own Temporal-equivalent orchestration engine (anti — LangGraph `RetryPolicy` + Saga compensation logic on top of existing checkpointing is sufficient)
- Automatic infinite retry (anti — retry budgets must be finite; unbounded retry loops starve the queue and mask real bugs)

**Complexity:** High. Saga compensation requires that every agent action in a multi-hop chain declare a compensating action — this is a design contract, not just an implementation detail. Retrofitting existing chains requires per-chain analysis.

---

## Memory Backend Pluggability

**Depends on:** Unified three-tier memory (Qdrant Cloud + Neo4j via mem0 + SQLite episodic, v2.0+)

### Table Stakes

- Adapter interface (abstract base class or protocol) defining the contract: `add`, `search`, `delete`, `health_check` for each memory tier (vector, graph, episodic)
- Existing backends (mem0/Qdrant, mem0/Neo4j, SQLite) are refactored to implement the adapter interface — no behavior change, just formalized contract
- New backend can be registered by dropping in a class that implements the adapter protocol — no changes to calling code
- Adapter configuration is environment-driven (which backends are active and with what credentials)
- Health check aggregates across all active adapters (existing context health UI extends to show per-adapter status)

### Differentiators

- Reference adapter implementations: at least one additional vector backend (e.g., Pinecone or Chroma) as a worked example
- Adapter validation test suite: any new adapter can be verified by running a shared test harness
- Hot-swap documentation: clear operator guide for switching backends without data loss

### Anti-features

- Writing custom vector/graph databases (anti — the point is adapter-out, not NIH backends)
- Universal migration tooling between backends (anti for v4 — migration is operator responsibility; pluggability means you can swap, not that migration is automatic)
- Exposing adapter internals to agents (anti — adapters are infrastructure, not agent-visible; agents query memory through the existing API surface)

**Complexity:** Medium. The adapter interface design is the hard part; the mechanical refactoring of existing backends is straightforward. Risk: mem0's HTTP API model means the "adapter" for the existing vector/graph tier wraps HTTP calls, not a storage library directly.

---

## Voice Meeting Bot

**Depends on:** Pipecat voice server (local mic/speaker, v1.5+)

### Table Stakes

- Bot joins a live Zoom, Teams, or Google Meet meeting as a participant (not a passive recording tool) using a meeting bot infrastructure layer (Recall.ai or Meeting BaaS are the two dominant APIs; Pipecat's transport adapters support both)
- Real-time transcript is captured per speaker (not just a single merged audio stream)
- Transcript is written to SQLite (consistent with existing voice transcript storage from v1.5)
- Bot appears in the meeting participant list with a recognizable display name (not anonymous)
- Bot can be started/stopped from the Memroos dashboard with a meeting URL as input

### Differentiators

- Memroos highlights panel: during or after the meeting, surfaces key moments (action items, decisions, questions) extracted by LLM from the transcript
- Per-speaker attribution in the transcript panel (who said what, not just what was said)
- Post-meeting summary pushed to episodic memory (meeting is stored as a searchable memory event)

### Anti-features

- Bot speaking in the meeting (TTS output to meeting participants) — this is a listener-only use case for v4; a speaking bot requires latency budgets, turn-taking logic, and meeting etiquette handling that are out of scope
- Building a meeting recording infrastructure layer from scratch (anti — Recall.ai or Meeting BaaS handle the platform authentication, bot injection, and audio routing; Pipecat connects to them via transport adapter)
- Diarization model training (anti — use Gladia or Deepgram for speaker-separated transcription; off-the-shelf STT with diarization is sufficient)
- Multi-meeting concurrent joining (anti for v4 — single meeting at a time; concurrency adds queue management complexity with no clear v4 use case)

**Complexity:** High. The Pipecat local voice server (v1.5) runs on mic/speaker; a meeting bot is a fundamentally different deployment: it requires a headless browser or native SDK to inject into the meeting platform, plus a cloud-callable service endpoint. Recall.ai or Meeting BaaS abstract this, but they are paid APIs. The Pipecat + Recall.ai integration exists in the ecosystem (GitHub issue #3272 documents it) but is not a native Pipecat transport — it requires custom wiring.

---

## LLM-Powered Recall Scoring

**Depends on:** BM25 lexical recall (QMD, v1.x), mem0/Qdrant vector search (v2.0+)

### Table Stakes

- Hybrid retrieval: BM25 candidates + dense embedding candidates merged via Reciprocal Rank Fusion (RRF) before returning results — not replacing BM25, augmenting it
- Embedding model produces query and document vectors; cosine similarity provides the semantic ranking signal
- RRF fusion prevents score-scale mismatch between BM25 and embedding scores (standard practice — RRF is model-agnostic and parameter-light)
- Recall API returns a single ranked list; callers do not need to know which backend contributed each result

### Differentiators

- Cross-encoder reranking as a second-pass: top-N hybrid candidates are reranked by a cross-encoder model (e.g., `bge-reranker-v2-m3` or Cohere Rerank) for higher precision
- Dynamic alpha tuning: fusion weight between BM25 and dense scores adjusts based on query type (keyword-heavy queries weight BM25 higher; conceptual queries weight dense higher)
- Recall quality metrics: nDCG@k tracked as a dashboard metric to show recall improvement over baseline BM25

### Anti-features

- Replacing BM25 entirely with embeddings (anti — BM25 has higher precision on exact-match queries like function names, error codes, and identifiers; hybrid always outperforms pure dense)
- Hosting a reranker model locally (anti for v4 — adds GPU/inference infrastructure; use Cohere Rerank API or a quantized ONNX model only if latency budget allows)
- Per-query embedding model fine-tuning (anti — use a general-purpose embedding model; fine-tuning requires labeled data the system does not have)

**Complexity:** Medium. The embedding infrastructure (Qdrant Cloud) already exists. The work is: query embedding pipeline, RRF fusion logic, and updated recall API response shape. The optional cross-encoder reranking adds a second API call per query.

---

## Cross-Project Recall

**Depends on:** Similar-task memory recommendations (contextMatchSignal, v1.7), mem0/Qdrant (v2.0+)

### Table Stakes

- Recall API accepts a `scope: "cross-project"` parameter that searches across all indexed repos, not just the current one
- Each memory/task record is tagged with its source repo identifier at ingestion time
- Results are ranked by semantic similarity regardless of source repo, but source repo is surfaced in the result metadata
- SimilarTaskPanel (v1.7) can display cross-project results with repo attribution

### Differentiators

- Repo affinity scoring: weight results from repos with similar tech stack or overlapping agent/skill usage higher than unrelated repos
- Cross-project pattern surfacing: "this pattern was solved in 3 other repos" summary above the result list
- Project similarity index: lightweight precomputed similarity between repos based on shared tools, skills, and task types (not full embedding of all code)

### Anti-features

- Org-wide enterprise search (anti — Memroos is a local tool; cross-project means multiple local repos on the same machine, not a hosted search index across an organization's GitHub)
- Indexing all files in all repos (anti — the existing no-recursive-readdir constraint from PROJECT.md applies; cross-project recall is bounded to the same ingestion rules as single-project recall)
- Cross-project memory writes (anti — cross-project recall is read-only; agents write memory scoped to their active project only)

**Complexity:** Medium. The core change is adding `repo_id` as a filter dimension in the recall API and removing that filter for cross-project queries. The contextMatchSignal algorithm (v1.7) already uses repo as a weighting signal — the upgrade is letting that signal cross repo boundaries.

---

## True Behavioral W-lift

**Depends on:** SEAL substrate, modeled W-lift (v2.5+), LangGraph orchestration

### Table Stakes

- An instruction or skill proposal generated by SEAL is evaluated by actually re-executing representative tasks with the proposed instruction/skill active, not just by a modeled score
- Re-execution harness: takes a held-out task set, runs the agent with the proposal applied, captures outcomes (success/fail, output quality score)
- Behavioral W-lift = delta in outcome quality between baseline (without proposal) and treatment (with proposal) on the held-out task set
- Proposals with negative or negligible behavioral W-lift are not promoted, regardless of their modeled score

### Differentiators

- Baseline vs treatment result comparison UI: side-by-side task outcomes for a sample of the held-out set, so the operator can inspect what actually changed
- Confidence interval on behavioral W-lift: report not just the mean delta but the variance across the held-out task set
- Automatic promotion gating: proposals only reach "ready to apply" status if behavioral W-lift exceeds a configured threshold (e.g., +5% outcome quality)

### Anti-features

- Model retraining / fine-tuning (anti — behavioral W-lift evaluates the proposal against the existing model using re-execution; SEAL is about instruction/skill improvement, not weight updates)
- Exhaustive task re-execution (anti — a held-out sample of 10-20 representative tasks is sufficient for the signal; running every historical task is computationally prohibitive and unnecessary)
- Real-time behavioral eval during production (anti — behavioral W-lift is computed offline as a pre-promotion gate, not as a live production metric)

**Complexity:** High. Re-execution requires a deterministic task replay harness: tasks must be replayable with known inputs, agent must be instrumented to capture outcomes consistently, and the held-out set must be curated and maintained. This is the largest engineering surface in v4.0.

---

## Cross-Harness Skills Portability

**Depends on:** Agent registry, A2A hub (v2.0+), existing skill management (v1.2+)

### Table Stakes

- Memroos skill registry stores skills in the SKILL.md open standard format (Anthropic spec, December 2025; adopted by 32+ tools including Codex CLI, Gemini CLI, Cursor, VS Code by March 2026)
- A skill registered in Memroos is readable by any harness that supports SKILL.md: two required YAML fields (`name`, `description`) plus a Markdown body
- Skills directory structure follows the standard: `SKILL.md` + optional `scripts/`, `references/`, `assets/` subdirectories
- Skill export: operator can export a skill from the registry as a portable SKILL.md directory

### Differentiators

- Harness-specific compatibility flags: each skill entry records which harnesses it has been verified on (Claude Code, Codex, Gemini CLI, etc.)
- Import from existing skill directories: Memroos can ingest a SKILL.md directory discovered on the local filesystem and register it without manual re-entry
- Skill validation: on registration, Memroos checks that the SKILL.md parses correctly and that all referenced scripts/assets exist

### Anti-features

- Maintaining separate skill formats per harness (anti — the SKILL.md standard is the convergence point; do not build Claude-specific, OpenAI-specific, or Gemini-specific skill schemas in Memroos)
- Skill execution runtime (anti — Memroos stores and serves skills; execution happens in the consuming harness, not in Memroos)
- Automated skill translation between formats (anti — the SKILL.md standard makes translation unnecessary; if a harness doesn't support SKILL.md, it is not in scope for portability)

**Complexity:** Low-to-Medium. The SKILL.md format is intentionally minimal (two YAML fields + Markdown). The main work is: migrating the existing skill storage schema to be SKILL.md-aligned, adding import/export UI, and adding compatibility flag tracking. No novel format design required.

---

## Feature Dependencies Summary

```
HIL edit-and-continue  ←  HIL approve/reject (existing)
HIL timeout + SLA      ←  HIL approve/reject (existing), scheduler pattern (v1.5), audit log (v1.5)
Multi-hop retry        ←  A2A hub (v2.0), LangGraph orchestration (v2.0)
Memory pluggability    ←  Three-tier memory (v2.0): Qdrant + Neo4j via mem0 + SQLite
Voice meeting bot      ←  Pipecat voice server (v1.5)
LLM recall scoring     ←  BM25/QMD (v1.x), Qdrant Cloud (v2.0)
Cross-project recall   ←  contextMatchSignal (v1.7), Qdrant (v2.0)
True behavioral W-lift ←  SEAL substrate (v2.5), modeled W-lift (v2.5), LangGraph (v2.0)
Skills portability     ←  Agent registry (v2.0), skill management (v1.2)
```

## Complexity Summary

| Feature | Complexity | Primary risk |
|---------|-----------|-------------|
| HIL edit-and-continue | Medium | UI form generation from declared editable fields |
| HIL timeout + SLA | Medium | No LangGraph native timeout — external scheduler required |
| Multi-hop retry + rollback | High | Every agent action needs a declared compensating action |
| Memory backend pluggability | Medium | mem0 HTTP-only constraint shapes adapter interface |
| Voice meeting bot | High | Pipecat meeting transport is not native — requires Recall.ai or Meeting BaaS |
| LLM recall scoring | Medium | Embedding pipeline + RRF fusion layered on existing BM25 |
| Cross-project recall | Medium | repo_id scoping + cross-repo query path |
| True behavioral W-lift | High | Deterministic task replay harness is the hard engineering surface |
| Skills portability | Low-Medium | SKILL.md is minimal — mostly schema migration + import/export UI |

## Sources

- LangGraph interrupt / Command(resume) / RetryPolicy / TimeoutPolicy: https://docs.langchain.com/oss/python/langgraph/
- LangGraph fault tolerance patterns: https://docs.langchain.com/oss/python/langgraph/fault-tolerance
- Recall.ai meeting bot API: https://www.recall.ai/product/meeting-bot-api
- Pipecat + Recall.ai multi-participant transcript: https://github.com/pipecat-ai/pipecat/issues/3272
- Meeting BaaS + Pipecat speaking bots: https://github.com/Meeting-Baas/speaking-meeting-bot
- SagaLLM — Saga pattern for multi-agent LLM systems: https://arxiv.org/html/2503.11951v3
- Hybrid BM25 + dense retrieval + RRF: https://optyxstack.com/rag-reliability/hybrid-search-reranking-playbook
- SKILL.md open standard: https://www.anthropic.com/engineering/equipping-agents-for-the-real-world-with-agent-skills
- SKILL.md adoption breadth: https://www.paperclipped.de/en/blog/agent-skills-open-standard-interoperability/
- mem0 pluggable backends: https://github.com/mem0ai/mem0
- Cross-repo semantic code recall: https://arxiv.org/html/2510.04905v1
