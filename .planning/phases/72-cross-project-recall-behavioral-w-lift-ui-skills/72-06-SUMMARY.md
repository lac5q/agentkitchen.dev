---
phase: 72-cross-project-recall-behavioral-w-lift-ui-skills
plan: "06"
subsystem: dispatch, skills
tags: [skill-dispatch, governance, evidence, tdd, SKILL-03, fail-closed]

requires:
  - phase: 72-cross-project-recall-behavioral-w-lift-ui-skills
    plan: "05"
    provides: skill_registry table, enabled/completeness normalization, governed dispatch_status

provides:
  - lookupSkillContract: indexed skill registry lookup (null=fallback, hit, denied)
  - buildSkillEvidence: converts lookup result to typed SkillGovernanceEvidence block
  - POST /api/dispatch: skill_name param → registry check before adapter dispatch
  - 403 SKILL_GOVERNANCE_DENIED: disabled/incomplete/review/not-found contracts fail closed with audit log
  - evidence.skill_governance merged into every DispatchResult (selected skill or denial reason)
  - 12 tests covering all lookup paths, security (no raw_body leak), and evidence shape

affects:
  - apps/memroos/src/lib/dispatch/types.ts (DispatchTask.skill_name added, SkillGovernanceEvidence type)
  - apps/memroos/src/app/api/dispatch/route.ts (skill check integrated before adapter dispatch)

tech-stack:
  added: []
  patterns:
    - "Fail-closed governance: SQL WHERE dispatch_status='enabled' AND completeness_pct=100 in DB, not JS post-filter"
    - "Evidence no-leak: SkillContractSummary excludes raw_body/preconditions/allowed_tools/verification_checks/rollback_behavior"
    - "Discriminated union: SkillLookupResult = {kind:'hit'} | {kind:'denied'} | null (fallback)"
    - "TDD RED→GREEN: test commit before implementation commit"

key-files:
  created:
    - apps/memroos/src/lib/dispatch/skill-lookup.ts
    - apps/memroos/src/lib/dispatch/__tests__/skill-dispatch.test.ts
  modified:
    - apps/memroos/src/lib/dispatch/types.ts
    - apps/memroos/src/app/api/dispatch/route.ts

key-decisions:
  - "Lookup key is skill_name (optional string in request body) — no new table needed, no agent→skill mapping table"
  - "SQL WHERE enforces enabled+complete — fail-closed at DB layer not JS"
  - "Evidence never includes untrusted body text — only safe identifying fields (id, name, source_harness, risk_tier, completeness_pct, dispatch_status)"
  - "Fallback path: no skill_name → null result → existing adapter dispatch proceeds unchanged"
  - "Denial path: 403 SKILL_GOVERNANCE_DENIED with audit log and skill_governance evidence block"

requirements-completed: [SKILL-03]

duration: 12min
completed: 2026-05-21T21:20:00Z
---

# Phase 72 Plan 06: Skill-Aware Dispatch and Evidence Integration Summary

**Skill registry lookup integrated into the A2A dispatcher with fail-closed governance, indexed SQL enforcement, evidence no-leak guarantee, and 12 tests — all 3 tasks complete.**

## Performance

- **Duration:** ~12 min
- **Started:** 2026-05-21T21:08:00Z
- **Completed:** 2026-05-21T21:20:00Z
- **Tasks:** 3 of 3 complete
- **Files modified:** 4

## Accomplishments

- `skill-lookup.ts`: new module with `lookupSkillContract(db, skillName)` and `buildSkillEvidence(result)`
- Lookup is indexed: SQL WHERE on `name` (B-tree), fail-closed filter at DB layer
- Discriminated union result type: `null` (fallback), `{kind:'hit'}`, `{kind:'denied'}`
- Denial cases: disabled, incomplete, review, not-found — each with typed reason string
- Evidence security: `SkillContractSummary` exposes only `id/name/source_harness/risk_tier/dispatch_status/completeness_pct` — no `raw_body` or body section text
- `POST /api/dispatch`: accepts optional `skill_name` body field
- Denied contracts → 403 `SKILL_GOVERNANCE_DENIED` with audit log entry before adapter runs
- Approved skill hit or fallback → adapter dispatch proceeds, evidence merged into result
- `DispatchTask` extended with `skill_name?: string`
- `SkillGovernanceEvidence` type added to `types.ts`
- All 34 dispatch tests pass; `npm run build` succeeds

## Task Commits

1. **Task 1 RED: Skill dispatch tests** — `01c3148`
2. **Task 1 GREEN: Implement skill-lookup.ts** — `2cc78c9`
3. **Task 2: Dispatcher registry lookup integration** — `5b44fcb`

*Note: Task 3 evidence integration was executed as part of Task 2's implementation — the `buildSkillEvidence` function and route response merging were implemented in a single atomic commit. No separate Task 3 commit was needed as all evidence shape requirements were satisfied in the `skill-lookup.ts` + route integration commit.*

## Deviations from Plan

### Task Boundary (Non-Material)

Tasks 2 and 3 were collapsed into one commit. The plan separated "dispatcher registry lookup" (Task 2) from "evidence integration" (Task 3), but the evidence builder (`buildSkillEvidence`) is a pure function tightly coupled to the lookup result type — splitting them into separate commits would have required implementing a stub evidence function and replacing it, adding noise with no value. Both Task 2 and Task 3 verify steps pass from the same commit.

## Known Stubs

None — all evidence fields are real (DB values), no placeholders.

## Threat Flags

| Flag | File | Description |
|------|------|-------------|
| threat_flag: evidence-content | apps/memroos/src/lib/dispatch/skill-lookup.ts | Deliberately excludes raw_body and body sections to prevent untrusted skill content from leaking into dispatch evidence; verified by test |

## Self-Check: PASSED

- `apps/memroos/src/lib/dispatch/skill-lookup.ts` — FOUND
- `apps/memroos/src/lib/dispatch/__tests__/skill-dispatch.test.ts` — FOUND
- `apps/memroos/src/lib/dispatch/types.ts` — FOUND (DispatchTask.skill_name + SkillGovernanceEvidence added)
- `apps/memroos/src/app/api/dispatch/route.ts` — FOUND (skill check integrated)
- Commit `01c3148` (RED tests) — FOUND
- Commit `2cc78c9` (GREEN impl) — FOUND
- Commit `5b44fcb` (dispatcher integration) — FOUND
- All 34 dispatch tests pass: VERIFIED
- `npm run build` passes: VERIFIED
