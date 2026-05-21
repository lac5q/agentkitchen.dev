---
phase: 71-recall-hil-sla-voice
plan: "03"
subsystem: hil
tags: [sqlite, better-sqlite3, vitest, scheduler, audit, sla]

# Dependency graph
requires:
  - phase: 64
    provides: hil_escalations table, audit_entries, writeAuditEntry, checkSlaBreaches SQL pattern
  - phase: 71-03
    provides: getSlaSeconds pattern in sla-config.ts (mirrored for getSlaAction)
provides:
  - getSlaAction(escalationType) — per-interrupt-type SLA action resolver
  - runSlaActions(db) — applies notify/auto-resolve/abandon to expired open escalations, idempotent
  - startSlaScheduler() — 60s polling loop for expired HIL escalations
  - AUDIT_EVENT_TYPES.HIL_SLA_NOTIFIED + HIL_SLA_ABANDONED — new closed enum entries
affects: [71-02, 71-06, hil-dashboard, sla-monitoring]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Per-interrupt-type SLA action config from memroos.eval.yaml hil.sla_actions block
    - Cached-config pattern (module-level _cachedSlaActions, mirrors getSlaSeconds)
    - Idempotent batch action via WHERE status='open' guard inside transaction
    - Per-item try/catch in batch loop so one failure does not abort others
    - setInterval scheduler with module-level started guard (mirrors startDecayScheduler)

key-files:
  created:
    - apps/memroos/src/lib/hil/sla-actions.ts
    - apps/memroos/src/lib/hil/sla-scheduler.ts
    - apps/memroos/src/lib/hil/__tests__/sla-actions.test.ts
    - apps/memroos/src/lib/hil/__tests__/sla-scheduler.test.ts
  modified:
    - apps/memroos/src/lib/evals/sla-config.ts
    - apps/memroos/src/lib/audit/event-types.ts
    - apps/memroos/src/instrumentation.ts

key-decisions:
  - "resolved_by set to NULL for system auto-resolutions (not 'system') — users.id FK would fail; attribution preserved in audit entry actor_id:'system'"
  - "getSlaAction mirrors getSlaSeconds caching pattern — separate _cachedSlaActions cache, separate clearSlaActionConfigCache() for test isolation"
  - "hil.sla_notified + hil.sla_abandoned added to closed AUDIT_EVENT_TYPES enum — TypeScript type-safety on writeAuditEntry event_type field"
  - "Auto-resolve path uses direct SQL UPDATE rather than resolveEscalation() — avoids resolved_by FK constraint with system actor"

patterns-established:
  - "Pattern: Scheduler module exports SLA_POLL_INTERVAL_MS constant, runSlaPoll (testable), startSlaScheduler (registers via instrumentation.ts)"
  - "Pattern: SLA action engine returns { acted: number; byAction: Record<string,number> } for observability"
  - "Pattern: Idempotency via AND status='open' in UPDATE — changes.changes===0 suppresses duplicate audit writes"

requirements-completed: [HIL-04, HIL-05]

# Metrics
duration: 8min
completed: 2026-05-21
---

# Phase 71 Plan 03: HIL SLA action config + 60s escalation scheduler Summary

**Per-interrupt-type SLA action engine (notify/auto-resolve/abandon) and 60-second instrumentation.ts scheduler that proactively acts on expired HIL escalations with idempotent batch processing**

## Performance

- **Duration:** 8 min
- **Started:** 2026-05-21T08:09:27Z
- **Completed:** 2026-05-21T08:17:47Z
- **Tasks:** 3 (+ 1 fix commit)
- **Files modified:** 7

## Accomplishments

- `getSlaAction(escalationType)` reads `hil.sla_actions` from `memroos.eval.yaml`, falls back to hardcoded defaults (agent_escalate→notify, seal_approval→notify, eval_below_threshold→auto-resolve)
- `runSlaActions(db)` finds expired open escalations and applies their configured action atomically; idempotent via `AND status='open'` guard; per-item try/catch prevents one failure from aborting the batch
- `startSlaScheduler()` registered in `instrumentation.ts` alongside existing schedulers; 60-second interval; module-level started guard prevents double-start
- Two new `AuditEventType` entries (`hil.sla_notified`, `hil.sla_abandoned`) extend the closed enum for TypeScript type safety
- 15 tests GREEN across both new test suites

## Task Commits

1. **Task 1: Wave 0 RED scaffolds** - `6ff4558` (test)
2. **Task 2: getSlaAction + sla-actions.ts** - `0b96957` (feat)
3. **Task 3: sla-scheduler.ts + instrumentation.ts** - `51e7046` (feat)
4. **Task 3 fix: event-types.ts** - `4c76825` (fix)

## Files Created/Modified

- `apps/memroos/src/lib/hil/sla-actions.ts` — SLA action engine: runSlaActions, applyAction
- `apps/memroos/src/lib/hil/sla-scheduler.ts` — 60s poll scheduler: SLA_POLL_INTERVAL_MS, runSlaPoll, startSlaScheduler
- `apps/memroos/src/lib/hil/__tests__/sla-actions.test.ts` — 10 tests: getSlaAction defaults, auto-resolve/abandon/notify contracts, idempotency
- `apps/memroos/src/lib/hil/__tests__/sla-scheduler.test.ts` — 5 tests: constants, exported functions, error safety
- `apps/memroos/src/lib/evals/sla-config.ts` — Extended with getSlaAction, clearSlaActionConfigCache, SlaAction type
- `apps/memroos/src/lib/audit/event-types.ts` — Added HIL_SLA_NOTIFIED + HIL_SLA_ABANDONED
- `apps/memroos/src/instrumentation.ts` — Added startSlaScheduler() inside scheduler-singleton lock

## Decisions Made

- **resolved_by = NULL for system auto-resolve**: `hil_escalations.resolved_by` has a FK to `users(id)`. Using `"system"` would fail in both tests and production (no system user row). Attribution is fully preserved in the audit entry's `actor_id: "system"`. The plan's intent (attributable auto-resolve) is met.
- **Direct SQL UPDATE for auto-resolve** (not `resolveEscalation`): Bypasses the resolved_by FK issue without modifying shared infrastructure. `resolveEscalation` remains useful for operator-initiated resolutions.
- **Separate audit event types**: `hil.sla_notified` and `hil.sla_abandoned` are distinct from `hil.sla_breached` — enables fine-grained audit queries and supports T-71-09 (non-repudiation).
- **Cached sla_actions config**: Mirrors `getSlaSeconds` pattern exactly — module-level cache, `clearSlaActionConfigCache()` for test isolation, falls back to hardcoded defaults on file-not-found.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] resolved_by FK constraint with system actor**
- **Found during:** Task 2 (sla-actions.ts implementation + test run)
- **Issue:** `resolveEscalation("system", ...)` sets `resolved_by = 'system'` which violates `hil_escalations.resolved_by REFERENCES users(id)`. No users row with id `"system"` exists. This would fail in production, not just tests.
- **Fix:** Implemented auto-resolve via direct `UPDATE ... SET resolved_by = NULL` + `writeAuditEntry` (rather than delegating to `resolveEscalation`). Attribution is preserved in the audit entry's `actor_id` field.
- **Files modified:** `apps/memroos/src/lib/hil/sla-actions.ts`
- **Verification:** All 10 sla-actions tests GREEN
- **Committed in:** `0b96957`

**2. [Rule 2 - Missing Critical] Missing AUDIT_EVENT_TYPES entries**
- **Found during:** Task 3 (TypeScript type check)
- **Issue:** `writeAuditEntry` has a typed `event_type: AuditEventType` parameter. `hil.sla_notified` and `hil.sla_abandoned` were not in the closed enum — TypeScript error at compile time.
- **Fix:** Added `HIL_SLA_NOTIFIED` and `HIL_SLA_ABANDONED` to `AUDIT_EVENT_TYPES` in `event-types.ts`.
- **Files modified:** `apps/memroos/src/lib/audit/event-types.ts`
- **Verification:** `npx tsc --noEmit` shows no errors in our files
- **Committed in:** `4c76825`

---

**Total deviations:** 2 auto-fixed (1 Rule 1 bug fix, 1 Rule 2 missing critical)
**Impact on plan:** Both fixes necessary for correctness. The resolved_by fix also prevents a production FK constraint failure. No scope creep.

## Issues Encountered

- `better-sqlite3` enforces FK constraints on in-memory DBs even without explicit `PRAGMA foreign_keys = ON` — behavior confirmed empirically. Tests use `default-tenant` (seeded by `initSchema`) to satisfy the `audit_entries.tenant_id` FK.

## Threat Surface Scan

No new network endpoints, auth paths, file access patterns, or schema changes at trust boundaries beyond those in the plan's threat model. The new scheduler path (`scheduler → hil_escalations`) was already registered in the threat model (T-71-08 through T-71-11).

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- HIL-04 (per-type SLA actions) and HIL-05 (60s scheduler) are complete
- HIL-06 (dashboard live countdown) can proceed — depends on `hil_escalations.sla_deadline` (already present) and the `status` field (unchanged)
- 71-02 edits `instrumentation.ts` in wave 2 — no conflict (sequential waves)
- `getSlaAction` is available for any future plan that needs to read or extend the per-type action config

---
*Phase: 71-recall-hil-sla-voice*
*Completed: 2026-05-21*
