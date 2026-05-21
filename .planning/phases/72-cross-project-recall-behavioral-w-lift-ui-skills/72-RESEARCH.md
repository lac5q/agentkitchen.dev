# Phase 72 Research: Cross-Project Recall + Behavioral W-lift + UI + Skills

**Date:** 2026-05-21
**Status:** Ready for planning
**Inputs:** `72-CONTEXT.md`, v4.0 requirements, Phase 70/71 context, targeted repo review, official DeepEval and Next.js docs.

## Executive Recommendation

Plan Phase 72 as four vertical slices with one shared evidence/job substrate:

1. **Cross-project recall contract** - extend `/api/recall` and recall utilities with explicit allowlist scope and source annotations.
2. **Behavioral SEAL jobs** - add async eval job storage, sandbox/no-op dispatch, and evidence bundle persistence before touching `applyProposal()`.
3. **QMD freshness UI** - expose `qmd update` progress through a streaming route and show Library freshness states from real source/index timestamps.
4. **Skill registry** - add additive `skill_registry` schema, manual SKILL.md import/normalization, dispatcher lookup, and Skills UI contract completeness.

Keep all schema additive. Keep all operator-facing surfaces honest about missing/degraded telemetry. Treat evidence bundles as the common proof object rather than four disconnected feature logs.

## Official Docs Notes

- **DeepEval agent evals:** DeepEval's current docs show agent evaluation around `EvaluationDataset`, `Golden`, tracing/observation, and dataset iteration. Async examples use `AsyncConfig(run_async=True)` while iterating goldens and evaluating agent tasks. This supports the Phase 72 idea of a held-out 10-20 task sample, but MemroOS should wrap it in its own `BehavioralEvalService` contract instead of letting DeepEval own product semantics.
- **DeepEval install/version:** Docs recommend `pip install -U deepeval`. The roadmap currently says `deepeval>=4.0,<5.0`, but PyPI search surfaced 3.9.8 as a recent release. Planning should verify the actual installable version before pinning; do not blindly add an unavailable `>=4.0` constraint.
- **Next route handlers:** Current Next docs describe `route.ts` handlers using Web `Request`/`Response` APIs and support streaming with Web Streams. This is the right primitive for `qmd update` progress.
- **Next instrumentation:** `instrumentation.ts` `register()` runs once when a server instance starts and can be async. Use the existing scheduler-lock pattern for background workers; do not create unmanaged startup loops.

Sources:
- DeepEval quickstart: https://deepeval.com/docs/getting-started
- DeepEval agent eval quickstart: https://deepeval.com/docs/getting-started-agents
- Next route handlers: https://nextjs.org/docs/app/api-reference/file-conventions/route
- Next instrumentation: https://nextjs.org/docs/15/app/api-reference/file-conventions/instrumentation

## Repo Findings

### Cross-Project Recall

Current state:

- `apps/memroos/src/app/api/recall/route.ts` accepts `q`, `limit`, `agent_id`, and `mode=bm25|semantic|hybrid`.
- BM25 uses `recallByKeyword(db, q, limit)` and then filters by `agent_id` when present.
- Semantic/hybrid use `embedText()`, `semanticRecall()`, and `hybridRecall()`.
- `recordRecallSideEffects()` updates `last_recall_query`, `recall_log`, and `memory_salience`.

Planning implications:

- Add project scoping before ranking for BM25 where possible; for semantic/hybrid, query enough candidates across allowed projects and then rank/trim.
- Preserve `agent_id` filtering as a separate orthogonal filter.
- Add response fields per hit: `source_project`, `source_repo` or `project`, and `recall_scope`.
- Define exact request contract. For GET, use query params such as `crossProject=true&allowed_project_ids=a,b`. If POST is preferred for structured allowlists, keep GET backward compatible and add POST as the richer contract.
- Tests must prove default single-project behavior, explicit cross-project allowlist behavior, unauthorized/empty allowlist behavior, and degraded embedding fallback.

### Behavioral SEAL Jobs

Current state:

- `SealService.applyProposal()` is synchronous today. It calls `entry.applyShadow()`, then `evalService.rescoreForProposal()` or `runForTrace()`, then keeps/rolls back based on W.
- `EvalService.rescoreForProposal()` currently performs deterministic modeled post-apply rescoring through `rescorePostApply()`.
- The `EvalServiceLike` interface already allows async return values.

Planning implications:

- Do not replace existing synchronous behavior for all proposal types at once.
- Add a proposal-class predicate for behavioral eval types (`agent_instruction_patch`, `skill_addition`, future governed skill mutations).
- For those classes, `applyProposal()` should enqueue a durable job and return an `ApplyResult` variant with `jobId`.
- Add tables for `seal_eval_jobs` and `seal_evidence_bundles` or one normalized table plus JSON details. Keep event status machine explicit.
- A worker can initially be a Node scheduler-lock job if it only coordinates dispatch, or a Python orchestration-side runner if actual agent re-execution lives closer to A2A/LangGraph. The plan should pick one boundary and keep it small.
- The no-op tool sandbox should record intended tool calls in the evidence bundle; it must not call external systems.

### QMD Update And Library Freshness UI

Current state:

- `scripts/batch-embed.sh` can optionally run `qmd update` when `QMD_UPDATE_FIRST=1`.
- `context-sources-panel.tsx` already presents source/freshness evidence language.
- Production runs under launchd/native Next on port 3002.

Planning implications:

- Add an authenticated route for starting `qmd update`, plus a streaming progress endpoint or single POST route returning `text/event-stream`.
- Use Web Streams in a Next route handler and emit structured SSE messages: `started`, `collection`, `stdout`, `stderr`, `completed`, `failed`.
- Do not shell through `exec`/`execSync`; project rules prefer `execFile`/safe process APIs.
- Library freshness needs two measurements per collection: latest source mtime and qmd index/update timestamp. Missing timestamp is a first-class `missing` state.
- Browser verification must cover live, stale, updating, failed, and missing/empty states. Some can be fixture-backed.

### Skill Registry

Current state:

- `/api/skills` aggregates skill directory inventory, sync state, contribution logs, failure logs, budget reports, and review state.
- Existing skills data is filesystem/log-derived rather than a governed DB contract.
- Dispatch adapters already accept and expose `evidence` maps.

Planning implications:

- Add `skill_registry` and likely `skill_contract_checks` or JSON fields via `initSchema()`.
- Manual import route should accept file content or uploaded text and normalize only metadata/contract fields in v4.0.
- Dispatch lookup should fail closed: incomplete, disabled, or risk-unknown contracts are not selected for governed dispatch.
- Skills UI should distinguish discovered skills from governed/imported dispatchable skills.
- Contract completeness should be deterministic, testable, and displayed as field-level missing/completed status.

## Suggested Plan Split

### 72-01 Cross-Project Recall Contract

Requirements: `RECALL-03`, `RECALL-04`

Deliver:
- request contract, allowlist validation, scoped ranking, source annotations
- tests for default, allowlist, unauthorized/empty, degraded

### 72-02 Behavioral Eval Job Substrate

Requirements: `SEAL-04`, `SEAL-05`, `SEAL-06`

Deliver:
- async job/evidence schema
- `BehavioralEvalService` skeleton
- sandbox/no-op tool contract
- `applyProposal()` job-return path for behavioral proposal classes

### 72-03 Behavioral Eval Runner + SEAL UI Polling

Requirements: `SEAL-04`, `SEAL-05`, `SEAL-06`

Deliver:
- held-out sample runner through A2A/sandbox boundary
- job status API
- evidence bundle read API/UI polling
- keep/rollback status visibility

### 72-04 QMD Update + Library Freshness

Requirements: `UI-05`, `UI-06`

Deliver:
- authenticated qmd update streaming route
- freshness data contract
- Library UI states and browser tests

### 72-05 Cross-Harness Skill Registry

Requirements: `SKILL-01`, `SKILL-02`, `SKILL-04`

Deliver:
- additive registry schema
- manual SKILL.md import/normalization
- Skills UI contract completeness

### 72-06 Skill-Aware Dispatch + Evidence Integration

Requirements: `SKILL-03`, plus evidence-bundle cohesion

Deliver:
- A2A dispatcher registry lookup before instruction fallback
- dispatch denial/selection evidence
- integration tests proving incomplete contracts fail closed

## Risks And Required Checks

- `initSchema()` is high-blast-radius; every schema plan must run GitNexus impact first and keep migrations additive.
- `SealService.applyProposal()` affects proposal lifecycle; tests must cover legacy synchronous proposal types and new async behavioral types.
- qmd update can be long-running; streaming route must handle process failure and disconnects cleanly.
- Skill imports can become prompt-injection carriers. Treat SKILL.md content as data and never execute imported skill text during normalization.
- Browser verification is required for Library freshness, Skills contract completeness, and SEAL job/evidence status.

## Verification Targets

- Unit tests for recall scoping/ranking and degraded fallback.
- Unit/integration tests for SEAL job state machine, evidence bundle persistence, no-op tool sandbox, and rollback.
- Route tests for qmd update streaming events and failure states.
- UI tests for Library freshness states, Skills completeness, and SEAL polling/evidence.
- Python tests if behavioral runner lands in `services/orchestration`.
- `npm run typecheck`, focused vitest suites, relevant pytest suites, `npm run build`, and browser smoke on visible UI surfaces.
