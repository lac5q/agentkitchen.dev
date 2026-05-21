# Phase 72: Cross-Project Recall + Behavioral W-lift + UI + Skills - Context

**Gathered:** 2026-05-21
**Status:** Ready for research and planning
**Source:** `/goal 72 all` plus v4.0 roadmap, requirements, Phase 70/71 context, and product goal review

<domain>
## Phase Boundary

Phase 72 closes the v4.0 memory-backed agent workflow loop. It turns Phase 70's
stable orchestration/memory substrate and Phase 71's semantic recall foundation
into operator-visible, evidence-producing capabilities:

- Cross-project recall over explicitly allowed projects only.
- True behavioral W-lift for SEAL instruction/skill proposals through real
  sandboxed agent re-execution.
- Async proposal apply/eval jobs that return immediately and expose evidence
  bundles.
- Operator-triggered `qmd update` with progress streaming and Library freshness
  evidence.
- Cross-harness skill import, governed skill contracts, dispatcher lookup, and a
  Skills UI that shows contract completeness.

The phase is still scoped to MemroOS as agent workflow memory infrastructure:
retained context, consumed context, governed dispatch, reusable skills, and
evidence. It is not a general NOC rewrite, model gateway buildout, public eval
API v2, or new meeting-transport phase.

</domain>

<decisions>
## Implementation Decisions

### Cross-Project Recall

- **D-01:** Cross-project recall is strictly opt-in. The default recall behavior
  remains single-project even when multiple projects exist in the database.
- **D-02:** Callers must pass both `crossProject: true` and an explicit
  `allowed_project_ids` list. Missing, empty, or unauthorized allowlists return
  single-project results or a structured authorization error; no implicit repo
  expansion is allowed.
- **D-03:** No recursive filesystem scanning, no broad repo discovery, and no
  "all projects" wildcard in v4.0. Project scope is data-driven from known
  message/project metadata.
- **D-04:** Cross-project results must preserve Phase 71 ranking behavior:
  semantic ranking uses `message_embeddings`, hybrid ranking uses RRF, and BM25
  remains available. Each result includes source project/repo annotation and
  enough provenance for the UI/API caller to understand why it was returned.
- **D-05:** Embedding-provider outage behavior remains inherited from Phase 71:
  cross-project semantic/hybrid recall degrades to BM25 with `degraded: true`
  rather than failing the request.

### Behavioral Eval Sandbox

- **D-06:** `BehavioralEvalService.rescoreForProposal()` is the production
  boundary for true behavioral W-lift. It implements `EvalServiceLike` and is
  used for instruction/skill proposal classes that Phase 60 intentionally kept
  modeled or unchanged.
- **D-07:** Behavioral eval dispatches real agent re-execution through the A2A
  hub, not a mocked eval service, against a held-out 10-20 task sample.
- **D-08:** Behavioral eval always uses a sandbox profile. Side-effecting tools
  are replaced with no-op stubs that record intended calls, inputs, denials, and
  outputs without touching live external systems.
- **D-09:** The sandbox must capture enough evidence to compare before/after
  behavior: task sample ID, agent identity, proposal ID, tool-call transcript,
  verification checks, assumptions, residual risks, and replay/rollback handle.
- **D-10:** Live state mutation during behavioral eval is a critical pitfall.
  Planning must define the sandbox profile before any re-execution code is
  implemented.

### Async SEAL Eval Jobs And Evidence Bundles

- **D-11:** `applyProposal()` returns a `job_id` immediately for behavioral eval
  proposal classes. Request handlers must not block on the full held-out sample
  run.
- **D-12:** A durable eval job record tracks queued, running, passed, failed,
  rolled_back, and canceled states. The UI polls for status; SSE is optional if
  it fits existing patterns, but polling is required.
- **D-13:** Evidence bundles are first-class artifacts of Phase 72. They should
  be queryable from the SEAL UI/API and must include sources/memories consumed,
  tools/commands attempted, checks passed, unverified assumptions, residual
  risks, and replay/rollback artifacts.
- **D-14:** Eval-pinned promotion metadata should be captured when feasible:
  commit/release pointer, model or harness version, prompt/template version,
  dataset/sample seed, pass rate, and config hash. If a field is unavailable,
  render it as missing rather than fabricating it.
- **D-15:** Rollback remains mandatory. Failed behavioral evals must keep or
  restore the pre-proposal state and make the rollback reason visible.

### QMD Update And Library Freshness UI

- **D-16:** `qmd update` is framed as context freshness and source evidence, not
  as a search-admin feature. The UI should answer: "Is the context fresh enough
  for agents to rely on?"
- **D-17:** Operators can trigger the `qmd update` pipeline from the UI with
  progress streaming. SSE is the preferred transport because Phase 72 explicitly
  calls for streaming progress; if an existing route pattern makes polling safer,
  planning must call out the deviation.
- **D-18:** The Library page shows QMD index recency timestamp versus latest
  source file mtime per collection. States must distinguish live, empty,
  updating, stale, degraded, and missing.
- **D-19:** UI freshness panels must not imply coverage that the system cannot
  prove. Missing file mtime, failed update, or unindexed collections render as
  honest degraded/missing states.
- **D-20:** Use existing qmd/batch embedding scripts where possible, but do not
  run `qmd embed`; qmd remains BM25/lexical and vector/semantic memory remains
  Qdrant/mem0 or Phase 71 SQLite message embeddings depending on tier.

### Cross-Harness Skill Registry

- **D-21:** `skill_registry` stores normalized skill definitions imported from
  Claude/OpenAI/Gemini harnesses using SKILL.md-compatible fields plus governed
  contract metadata: preconditions, allowed tools, risk tier, verification
  checks, owner, rollback behavior, source harness, dispatch status, and
  contract completeness.
- **D-22:** Import is manual in v4.0. Cross-harness auto-sync from agent
  directories is deferred; operators import a SKILL.md file or explicit skill
  payload and review normalization output.
- **D-23:** The A2A dispatcher looks up the skill registry before falling back
  to per-agent instructions. Dispatch never silently uses an incomplete or
  disabled skill contract.
- **D-24:** The Skills UI shows source harness, dispatch status, risk tier,
  contract completeness, verification checks, and owner. Incomplete contracts
  are visible but not presented as ready for governed dispatch.
- **D-25:** File-system skill mutation from SEAL remains governed by the deferred
  Phase 60 path (`SEAL-FOLLOWUP-02`). Phase 72 imports and dispatches skill
  contracts; it does not auto-write executable skill files unless the plan adds
  an explicit isolated staging/snapshot/rollback mechanism.

### the agent's Discretion

- The planner may split Phase 72 into waves based on file ownership and risk,
  but each wave must preserve user-visible proof: API contract, UI surface or
  explicit backend-only label, tests, and summary evidence.
- The planner may choose exact table names, job runner shape, and API route
  names if they follow existing MemroOS patterns and remain additive.
- The planner may choose polling plus optional SSE for SEAL job status; qmd
  update progress should use SSE unless research finds a concrete repo-local
  reason not to.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project And GSD State

- `.planning/GOAL.md` - north star, core loop, and GSD phase completion goal
- `.planning/STATE.md` - current v4.0 status and deployment constraints
- `.planning/ROADMAP.md` - Phase 72 scope, dependencies, prerequisite tasks, and success criteria
- `.planning/REQUIREMENTS.md` - RECALL-03..04, SEAL-04..06, UI-05..06, SKILL-01..04

### Prior Phase Context

- `.planning/phases/70-foundation-engine-core/70-CONTEXT.md` - MemoryAdapter, orchestration substrate, and safety posture
- `.planning/phases/71-recall-hil-sla-voice/71-CONTEXT.md` - semantic/hybrid recall decisions and embedding outage behavior
- `.planning/phases/73-operator-ui-truth-phase-parity/73-CONTEXT.md` - UI truth/parity guardrails and phase-close UI evidence expectations
- `.planning/phases/60-agent-autogen-learnings/60-CONTEXT.md` - prior agent autogen mutation/eval decisions and deferred behavioral W-lift artifacts

### Existing Code Surfaces

- `apps/memroos/src/app/api/recall/route.ts` - Phase 71 recall endpoint and mode handling
- `apps/memroos/src/lib/embeddings/recall.ts` - `semanticRecall()` and `hybridRecall()` ranking utilities
- `apps/memroos/src/lib/embeddings/store.ts` - message embedding storage for `conversations.db`
- `apps/memroos/src/lib/seal/service.ts` - `SealService.applyProposal()` and eval-service hook
- `apps/memroos/src/lib/seal/apply.ts` - public apply helper surface
- `apps/memroos/src/lib/evals/service.ts` - current eval service and `rescoreForProposal()` shape
- `apps/memroos/src/lib/seal/sdk-eval-service.ts` - SDK eval service adapter pattern
- `apps/memroos/src/lib/dispatch/a2a-adapter.ts` - A2A dispatch integration point
- `apps/memroos/src/lib/dispatch/types.ts` - dispatch evidence shape
- `apps/memroos/src/app/api/skills/route.ts` - existing skills API surface
- `scripts/batch-embed.sh` - existing `qmd update` / embedding batch script behavior
- `apps/memroos/src/components/library/context-sources-panel.tsx` - existing context-source freshness UI pattern

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets

- `semanticRecall()` and `hybridRecall()` already rank messages from
  `message_embeddings`; cross-project recall should extend query scope and
  result annotation rather than inventing a second recall engine.
- `SealService.applyProposal()` already calls an optional
  `evalService.rescoreForProposal()` hook; Phase 72 can introduce async
  behavioral jobs behind that contract instead of bypassing the SEAL substrate.
- Dispatch adapters already return `evidence` maps; behavioral eval evidence
  bundles should reuse and formalize that pattern.
- `context-sources-panel.tsx` already frames source health/freshness as evidence;
  Library qmd freshness should build on this style.

### Established Patterns

- Additive schema changes go through `initSchema()` with guarded
  `CREATE TABLE IF NOT EXISTS` / `ALTER TABLE` patterns.
- Background jobs should use the `instrumentation.ts` scheduler lock pattern
  when they run inside the Next.js process.
- Auth-gated operator surfaces redirect to `/login`; API routes should follow
  current auth and tenant boundaries.
- UI completion requires browser/visual verification when the operator can see
  or use the feature.

### Integration Points

- Cross-project recall connects `GET /api/recall`, message/project metadata,
  `message_embeddings`, and recall consumers.
- Behavioral W-lift connects SEAL proposals, eval service, A2A dispatch,
  sandbox/no-op tool stubs, eval job storage, and the SEAL UI.
- QMD freshness connects qmd update scripts/processes, source file mtimes,
  Library UI, and streaming route/progress state.
- Skill registry connects SKILL.md parsing/normalization, database schema,
  Skills API/UI, and A2A dispatch lookup.

</code_context>

<specifics>
## Specific Ideas

- Treat evidence bundles as the connective tissue across Phase 72: recall
  provenance, behavioral eval traces, qmd freshness, and governed skill
  contracts should all expose why an agent can trust the work.
- Keep "missing/degraded" states honest. If a source, skill contract, eval
  field, or qmd freshness timestamp is unavailable, show it as unavailable.
- Prioritize small, testable vertical slices: one cross-project recall contract,
  one behavioral eval job path, one qmd update/freshness UI flow, one skill
  import/dispatch path.

</specifics>

<deferred>
## Deferred Ideas

- Operations NOC live-data replacement remains Phase 73 / future NOC scope, not
  Phase 72 except where Phase 72 exposes evidence that NOC can later consume.
- Full Harness Control Plane for every task is future scope; Phase 72 covers
  the first evidence-bundle slice for eval/skill work.
- Cross-harness skill auto-sync from agent directories is deferred; v4.0 uses
  manual import.
- File-system skill generation is deferred unless an explicit isolated
  staging/snapshot/rollback mechanism is planned and verified.
- Recall.ai bridge, Zoom/Teams/Meet transports, Voyage embeddings, LiteLLM model
  gateway observability, and public eval API v2 are future requirements.

</deferred>

---

*Phase: 72-cross-project-recall-behavioral-w-lift-ui-skills*
*Context gathered: 2026-05-21*
