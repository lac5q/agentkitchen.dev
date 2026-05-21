---
phase: 72-cross-project-recall-behavioral-w-lift-ui-skills
plan: "03"
subsystem: seal-behavioral-runner
tags: [seal, behavioral-eval, runner, evidence-bundles, api-routes]
dependency_graph:
  requires: [72-02]
  provides: [behavioral-runner, seal-job-status-api, seal-evidence-api, api-client-job-hooks]
  affects: [seal-ui-polling]
tech_stack:
  added: []
  patterns: [tdd-red-green, sandbox-no-op-dispatch, job-state-machine]
key_files:
  created:
    - apps/memroos/src/lib/seal/__tests__/behavioral-runner.test.ts
    - apps/memroos/src/lib/seal/behavioral-runner.ts
    - apps/memroos/src/app/api/seal/jobs/[id]/route.ts
    - apps/memroos/src/app/api/seal/jobs/[id]/evidence/route.ts
  modified:
    - apps/memroos/src/lib/api-client.ts
decisions:
  - "Runner W-scoring uses rescorePostApply() (modeled baseline delta) — sandbox transcript is the behavioral evidence artifact, not real agent re-execution output. Matches D-06 honesty constraint."
  - "taskSampleId is set to proposal.trace_id (single-sample behavioral eval) — multi-sample golden set expansion deferred to v5."
  - "preScoringHook seam on BehavioralRunnerOptions allows test injection of tool calls into sandbox transcript without changing the runner dispatch model."
  - "Failed runs persist partial evidence bundle with postApplyW=null — never truncates evidence on exception."
metrics:
  duration: "~12 minutes"
  completed: "2026-05-21"
  tasks_completed: 2
  tasks_total: 3
  files_modified: 5
---

# Phase 72 Plan 03: Behavioral eval runner and SEAL UI polling Summary

Implemented the behavioral eval runner and job/evidence APIs that deliver on SEAL-04, SEAL-05, SEAL-06. The runner loads queued jobs, executes sandbox dispatch (no-op tool stubs), scores W, and transitions job/proposal states with persisted evidence bundles. Two read-only API routes expose job status and evidence to the SEAL UI.

## What Was Built

### Task 1: Runner and API tests (TDD RED — committed `39daa52`)

Added 13 failing tests covering:
- Runner success path: queued → running → passed, evidence persisted with `postApplyW` set
- W regression path: queued → running → rolled_back, proposal status also flips to `rolled_back`
- Exception path: `error_message` recorded, `status=failed`, partial evidence bundle saved
- Sandbox transcript: `denied=true` on all tool calls, transcript persisted in evidence bundle
- `getJobStatus(db, jobId)` returns job or null
- `getJobEvidence(db, jobId)` returns bundle or null before eval completes

### Task 2: Behavioral runner + API routes (TDD GREEN — committed `1312931`)

**`behavioral-runner.ts`:** `runQueuedJob(db, jobId, opts)` — full state machine:
1. Load job + proposal (missing proposal → failed)
2. Transition to `running`
3. Create sandbox profile, run optional `preScoringHook`
4. Rescore W via `opts.rescoreForProposal()` (modeled delta via `rescorePostApply`)
5. Persist evidence bundle (transcript + W deltas + promotion metadata)
6. W does not regress → `passed`, proposal `applied`
7. W regresses → `rolled_back`, proposal `rolled_back`, rollback handle recorded
8. Exception → `failed`, `error_message` recorded, partial bundle saved

**`GET /api/seal/jobs/[id]/route.ts`:** Returns `EvalJob` or 404. Auth-gated.

**`GET /api/seal/jobs/[id]/evidence/route.ts`:** Returns `EvidenceBundle` or 404 when not yet available. Missing fields render as `null` (D-14 honesty). Auth-gated.

**`api-client.ts`:** Added `useSealJob()` (polls 5s intervals, stops on terminal status) and `useSealJobEvidence()` React Query hooks.

### Task 3: SEAL UI polling and evidence view (PAUSED — checkpoint:human-verify)

Task 3 is a `gate="blocking"` checkpoint requiring operator browser smoke on `/seal`. Execution paused for human verification of the wired UI and APIs.

## Deviations from Plan

### Auto-fixed Issues

None — plan executed as written through Tasks 1-2.

### Intentional Design Decisions

**[Decision] W-scoring via modeled rescorePostApply, not real agent re-execution**
- `rescorePostApply()` short-circuits behavioral proposal types (returns `cloneUnmodeledBaseline`) — so W effectively stays at baseline (wLiftModeled=false). The behavioral value is the sandbox tool-call transcript capturing what the agent would have attempted.
- This matches Phase 60 honesty decisions: true agent re-execution W-lift is deferred to v5. The evidence bundle documents what happened.

**[Decision] taskSampleId = proposal.trace_id**
- No held-out golden set loader is available in this plan. The proposal's own trace is used as the single behavioral sample. Full 10-20 sample expansion requires a dataset not yet defined — documented as a known stub.

## Known Stubs

| Stub | File | Line/Location | Reason |
|------|------|---------------|--------|
| `taskSampleId = proposal.trace_id` | `behavioral-runner.ts` | `bundle.taskSampleId` | No held-out sample dataset yet; trace ID is honest stand-in. Future plan wires golden set. |
| `verificationChecks: []` | `behavioral-runner.ts` | `bundle.verificationChecks` | Runner does not run SEAL verification checklist yet; field is empty but not fabricated. |
| `sourcesConsumed: []` | `behavioral-runner.ts` | `bundle.sourcesConsumed` | Memory source tracking during sandbox eval not wired in this plan. |

## Known Limitations

- `rescorePostApply()` returns `compositeW = baseline.compositeW` for behavioral proposal types (modeled, not real agent output). The "W does not regress" branch will almost always be taken unless baselineW is extremely high. This is correct behavior for the current architecture — W-lift from instruction changes requires full agent re-execution infrastructure not in scope.
- The runner is invoked manually (test-driven). No scheduler runs it automatically. A future plan should add a Next.js instrumentation scheduler lock to drain the queue.

## Threat Flags

None — no new network endpoints at trust boundaries. Routes are auth-gated with existing `authenticateUser`.

## Self-Check

Files created:
- `apps/memroos/src/lib/seal/__tests__/behavioral-runner.test.ts` — FOUND (39daa52)
- `apps/memroos/src/lib/seal/behavioral-runner.ts` — FOUND (1312931)
- `apps/memroos/src/app/api/seal/jobs/[id]/route.ts` — FOUND (1312931)
- `apps/memroos/src/app/api/seal/jobs/[id]/evidence/route.ts` — FOUND (1312931)

Commits:
- `39daa52` — test(72-03): add failing tests for behavioral runner and job/evidence APIs
- `1312931` — feat(72-03): implement behavioral runner and job/evidence APIs

Tests: 13/13 passing
Typecheck: clean

## Self-Check: PASSED
