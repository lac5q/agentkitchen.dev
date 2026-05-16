---
phase: 58
plan: 01
title: SEAL Self-Improvement Substrate
status: complete-tier1
completed: 2026-05-16
requirements: [SEAL-01, SEAL-02, SEAL-03, SEAL-04, SEAL-05, SEAL-06]
---

# Phase 58 Plan 01 — SEAL Self-Improvement Substrate: Summary

> Reconstructed during the 2026-05-16 reconciliation (see 57-01-SUMMARY.md note).

## Outcome

Full reflection → typed proposal → operator approval → shadow-apply →
keep-if-W-improved → rollback → audit loop is implemented with real logic.
`SealService` (321 lines) plus a closed `proposal-registry`. All 5 SEAL
substrate tests pass after reconciliation.

2026-05-16 follow-up: the dogfood W-lift gap is closed at the Tier 1 bar.
`EvalService.rescoreForProposal` now drives SEAL apply through a deterministic
modeled post-apply re-score (`lib/seal/rescore.ts`) using the real eval engine,
golden-set loader, layer scorers, judge, drift guard, persistence, and audit
metadata. This is a modeled delta, not agent re-execution.

## What Was Done

- `lib/seal/service.ts`, `proposal-registry.ts`, `apply.ts`, `reflection.ts`,
  `audit.ts`; `seal_proposals`, `seal_proposal_decisions`, `seal_audit_log` tables.
- `lib/seal/rescore.ts` plus proposal-aware `EvalService.rescoreForProposal`;
  `SealService.applyProposal` now prefers proposal-aware re-scoring when
  available and records `wLiftModeled` audit detail.
- Tests cover deterministic W movement, keep-on-improvement, rollback-on-
  regression, and honest unchanged W for behavioral proposal types.
- **Reconciliation fixes:**
  - `seal_audit_log.proposal_id` FK to `seal_proposals` dropped (kept NOT NULL).
    An append-only/immutable audit log must always record even if the proposal
    is absent or later purged — aligns with phase 64 immutable-audit intent.
  - Test mock `getRunById` was discarding the stored row's `trace_id` /
    `composite_w`, defeating the service's (correct) trace-ownership and
    threshold checks; mock now returns the real persisted values.
  - ESM `require("../audit")` replaced with a static namespace import.

## Gaps / Deferred

- Reflection/apply are deliberately thin wrappers over the service — correct by
  design.
- Tier 1 W-lift is **modeled**, not empirical. It is deterministic evidence that
  memory/config proposal classes can move W through the fixed harness after
  shadow apply. It is not a claim that an agent re-ran the task.
- `agent_instruction_patch`, `skill_addition`, and `noop_test` intentionally
  return unchanged W with `wLiftModeled:false`; true behavioral W-lift for
  instruction/skill proposals is carried to v3.

> Closure path completed for Tier 1 via `.planning/phases/58-seal-self-improvement/58-02-PLAN.md`. Tier 2 (instruction/skill behavioral W-lift) remains v3 scope.
