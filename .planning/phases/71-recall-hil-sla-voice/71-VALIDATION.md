---
phase: 71-recall-hil-sla-voice
nyquist_compliant: true
total_plans: 6
total_waves: 2
created: 2026-05-21
---

# Phase 71 Validation Map: Recall + HIL SLA + Voice

Nyquist rule: every implementation task carries an `<automated>` verify command,
OR is itself a Wave 0 RED scaffold that establishes the test a later task makes
GREEN. No task ships without a verify. This file is the per-task audit.

## Wave Structure

Three independent feature groups, all unblocked by Phase 70. Disjoint file sets
within a wave → parallel execution.

| Wave | Plans | Feature group | Parallel? |
|------|-------|---------------|-----------|
| 1 | 71-01, 71-03, 71-05 | Recall foundation / HIL SLA engine / Voice Daily bot | Yes — disjoint files |
| 2 | 71-02, 71-04, 71-06 | Recall endpoint+job / HIL dashboard / Voice consent UI | Yes — disjoint files; each depends only on its wave-1 sibling |

Dependency edges:
- 71-02 depends_on 71-01 (needs `message_embeddings`, provider, store).
- 71-04 depends_on 71-03 (dashboard reflects the SLA engine's state).
- 71-06 depends_on 71-05 (consent gate fronts the Daily bot).

Wave-1 → Wave-2 `instrumentation.ts` note: 71-02 and 71-03 both register a
scheduler in `instrumentation.ts`. 71-03 is Wave 1, 71-02 is Wave 2 — the edits
are sequential, no merge conflict. Both append inside the existing
`tryAcquireSchedulerLock()` block.

## Wave 0 RED Scaffold Checklist

Each plan's Task 1 creates failing tests BEFORE implementation. These are the
Nyquist scaffolds — they pin contracts so later tasks have a measurable GREEN
target.

| Plan | Wave 0 scaffold task | Test files created (must fail first) |
|------|----------------------|--------------------------------------|
| 71-01 | Task 1 | `embeddings/__tests__/provider.test.ts`, `embeddings/__tests__/store.test.ts` |
| 71-02 | Task 1 | `embeddings/__tests__/recall.test.ts`, `embeddings/__tests__/embedding-job.test.ts` |
| 71-03 | Task 1 | `hil/__tests__/sla-actions.test.ts`, `hil/__tests__/sla-scheduler.test.ts` |
| 71-04 | Task 1 | `hil/__tests__/sla-status.test.ts`, `escalations/__tests__/sla-countdown.test.tsx` |
| 71-05 | Task 1 | `voice-server/tests/test_meeting_writer.py`, `voice-server/tests/test_pipeline_daily.py` |
| 71-06 | Task 1 | `voice/__tests__/meeting-consent.test.ts`, `meeting/join/__tests__/route.test.ts` |

Wave 0 gate: each scaffold task's `<verify>` asserts the suite FAILS (module not
found / red). Every later task in the same plan turns a specific scaffold GREEN.

## Per-Task Verification Map

### 71-01 — Message embeddings schema + Ollama provider

| Task | Type | Verify command | Nyquist |
|------|------|----------------|---------|
| 1 — RED scaffolds | auto | `vitest run src/lib/embeddings/__tests__/` greps for fail/Cannot find module | RED scaffold |
| 2 — message_embeddings table + store | auto/tdd | `vitest run .../store.test.ts` greps for pass | GREEN of scaffold |
| 3 — Ollama provider + degraded fallback | auto/tdd | `vitest run .../provider.test.ts` greps for pass | GREEN of scaffold |

### 71-02 — Semantic/hybrid recall endpoint + background job

| Task | Type | Verify command | Nyquist |
|------|------|----------------|---------|
| 1 — RED scaffolds | auto | `vitest run .../recall.test.ts .../embedding-job.test.ts` greps for fail | RED scaffold |
| 2 — semanticRecall + hybridRecall (RRF) | auto/tdd | `vitest run .../recall.test.ts` greps for pass | GREEN of scaffold |
| 3 — embedding job + instrumentation | auto/tdd | `vitest run .../embedding-job.test.ts` greps for pass | GREEN of scaffold |
| 4 — mode-aware recall endpoint | auto/tdd | `tsc --noEmit` confirms `recall/route` has no errors | Type-gate (route covered by recall.test.ts contracts) |

### 71-03 — HIL SLA action config + 60s scheduler

| Task | Type | Verify command | Nyquist |
|------|------|----------------|---------|
| 1 — RED scaffolds | auto | `vitest run src/lib/hil/__tests__/` greps for fail | RED scaffold |
| 2 — getSlaAction + action engine | auto/tdd | `vitest run .../sla-actions.test.ts` greps for pass | GREEN of scaffold |
| 3 — 60s scheduler + instrumentation | auto/tdd | `vitest run .../sla-scheduler.test.ts` greps for pass | GREEN of scaffold |

### 71-04 — HIL dashboard live countdown + traffic-light

| Task | Type | Verify command | Nyquist |
|------|------|----------------|---------|
| 1 — RED scaffolds | auto | `vitest run .../sla-status.test.ts .../sla-countdown.test.tsx` greps for fail | RED scaffold |
| 2 — slaTrafficLight + SlaCountdown | auto/tdd | `vitest run` both suites grep for pass | GREEN of scaffold |
| 3 — wire SlaCountdown into page | auto | `tsc --noEmit` confirms `escalations/page` has no errors | Type-gate |
| 4 — human-verify countdown | checkpoint | Visual: countdown ticks, traffic-light colors correct | Human-check (UI-only, no automated path) |

### 71-05 — Daily.co meeting bot

| Task | Type | Verify command | Nyquist |
|------|------|----------------|---------|
| 0 — package legitimacy | checkpoint:human-verify (blocking-human) | pypi.org verification of `pipecat-ai` + `daily` extra | Human-check (supply-chain gate) |
| 1 — pipecat upgrade + RED scaffolds | auto | `pytest test_meeting_writer.py test_pipeline_daily.py` greps for failed/error | RED scaffold |
| 2 — MeetingWriter | auto/tdd | `pytest tests/test_meeting_writer.py` greps for passed | GREEN of scaffold |
| 3 — Daily pipeline + bot entrypoint | auto/tdd | `pytest tests/test_pipeline_daily.py` greps for passed | GREEN of scaffold |
| 4 — regression: full voice suite | auto | `pytest` greps for passed AND not failed/error | Regression gate |

### 71-06 — Recording-consent gate + meeting join UI

| Task | Type | Verify command | Nyquist |
|------|------|----------------|---------|
| 1 — RED scaffolds | auto | `vitest run .../meeting-consent.test.ts .../join/route.test.ts` greps for fail | RED scaffold |
| 2 — meeting_consents table + consent lib | auto/tdd | `vitest run .../meeting-consent.test.ts` greps for pass | GREEN of scaffold |
| 3 — consent-gated join endpoint | auto/tdd | `vitest run .../join/route.test.ts` greps for pass | GREEN of scaffold |
| 4 — ConsentDialog + meetings page | auto | `tsc --noEmit` confirms `meetings/page` + `consent-dialog` clean | Type-gate |
| 5 — human-verify consent flow | checkpoint | Visual: consent-before-join, no secrets in audit | Human-check (UI + audit inspection) |

## Nyquist Compliance Statement

- Every `auto` task has an `<automated>` verify command. ✓
- Every Wave 0 Task 1 scaffold has an `<automated>` verify asserting the suite
  fails first. ✓
- Type-gate tasks (71-02 T4, 71-04 T3, 71-06 T4) use `tsc --noEmit` scoped to
  the changed file — these tasks modify route/page wiring whose behavior is
  pinned by the sibling RED suites; the type-gate is the automated proof that
  the wiring compiles. ✓
- `checkpoint:human-verify` tasks (71-04 T4, 71-05 T0, 71-06 T5) are inherently
  human — UI rendering, supply-chain verification, and audit inspection have no
  automated substitute. They are declared, not silently skipped. ✓
- No `auto` task ships without a verify. ✓

`nyquist_compliant: true`.

## Requirement Coverage Map

| Requirement | Plan(s) | Source |
|-------------|---------|--------|
| RECALL-01 | 71-01, 71-02 | GOAL, REQ |
| RECALL-02 | 71-01, 71-02 | GOAL, REQ |
| HIL-04 | 71-03 | GOAL, REQ |
| HIL-05 | 71-03 | GOAL, REQ |
| HIL-06 | 71-04 | GOAL, REQ |
| VOICE-06 | 71-05 | GOAL, REQ |
| VOICE-07 | 71-05 | GOAL, REQ |
| VOICE-08 | 71-05 (bot secrets discipline), 71-06 (consent UI) | GOAL, REQ |

All 8 Phase 71 requirements are covered. No orphans. No requirement is split in
a way that leaves a partial deliverable: VOICE-08 has two halves (bot-side
secrets discipline in 71-05, operator-side consent gate in 71-06) and both ship
within the phase.

## Source Audit (GOAL / REQ / CONTEXT)

- GOAL (ROADMAP Phase 71 success criteria 1-5): all five covered —
  recall modes + RRF + degraded (71-01/02), background embedding job (71-02),
  per-type SLA + 60s scheduler (71-03), dashboard countdown + traffic-light
  (71-04), Daily bot + transcripts + secrets + consent (71-05/06).
- REQ: RECALL-01..02, HIL-04..06, VOICE-06..08 — all mapped above.
- CONTEXT: D-01..D-15 each have an implementing task; D-15 (Daily-only) and the
  `<deferred>` items are honored by omission. No deferred idea is planned.

No unplanned items. No phase split required — each plan is scoped to 2-4 tasks
within the ~50% context budget.
