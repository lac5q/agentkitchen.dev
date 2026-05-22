---
phase: 73-operator-ui-truth-phase-parity
fixed_at: 2026-05-22T02:01:00Z
review_path: .planning/phases/73-operator-ui-truth-phase-parity/73-REVIEW.md
iteration: 1
findings_in_scope: 10
fixed: 10
skipped: 0
status: all_fixed
---

# Phase 73: Code Review Fix Report

**Fixed at:** 2026-05-22T02:01:00Z
**Source review:** .planning/phases/73-operator-ui-truth-phase-parity/73-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 10 (3 Critical + 7 Warning)
- Fixed: 10
- Skipped: 0

## Fixed Issues

### CR-01: `/api/memory-consolidate` POST has no authentication

**Files modified:** `apps/memroos/src/app/api/memory-consolidate/route.ts`
**Commit:** bc7ea6c
**Applied fix:** Added `import type { NextRequest }` from `next/server`, imported `authenticateUser` from `@/lib/auth/session` and `requireRole` from `@/lib/auth/middleware-roles`. Updated POST signature to accept `req: NextRequest`. Added session check returning 401 on missing auth and role check returning 403 if below `operator` level, matching the pattern in the skills/review route.

---

### CR-02: `/api/memory-stats` GET has no authentication

**Files modified:** `apps/memroos/src/app/api/memory-stats/route.ts`, `apps/memroos/src/app/api/memory-stats/__tests__/route.test.ts`
**Commit:** 9e130ff (route), b04385d (test)
**Applied fix:** Added the same `authenticateUser` + `requireRole("operator")` guard as CR-01 to the GET handler. Also updated the route's test file to mock `@/lib/auth/session` and `@/lib/auth/middleware-roles` so the 4 existing tests continue to pass (they called the route without auth tokens and would otherwise receive 401).

---

### CR-03: `draftBody` written to disk without size limit

**Files modified:** `apps/memroos/src/app/api/skills/review/route.ts`
**Commit:** db4bc89
**Applied fix:** Added `MAX_NOTES = 4_000` and `MAX_DRAFT = 50_000` constants. Returns 400 with `{ error: "field too long" }` if `body.notes` exceeds 4,000 chars or `body.draftBody` exceeds 50,000 chars, before calling `updateSkillReviewState`.

---

### WR-01: Skill promotion has no state precondition check

**Files modified:** `apps/memroos/src/lib/skill-workflow.ts`
**Commit:** 62527f1
**Applied fix:** Added precondition guard inside the `promote-enterprise` branch: throws `"Skill must be approved at general stage before promoting to enterprise"` if `previous?.stage !== "general"` or `previous?.status !== "approved"`. This enforces the intended `agent-limited → general (approved) → enterprise` workflow.
**Note:** Requires human verification — this is a logic/state-machine fix.

---

### WR-02: `SkillReviewDesk.runReviewAction` swallows errors silently

**Files modified:** `apps/memroos/src/components/cookbooks/skills-list.tsx`, `apps/memroos/src/components/cookbooks/__tests__/skills-list.test.tsx`
**Commit:** fb2b204 (component), c8a4a55 (test)
**Applied fix:** Wrapped `mutateAsync` call in try/catch. On success, still calls `setNotice(actionNotice(action))`. On failure, calls `setNotice("Error: " + err.message)` so the user sees a visible error rather than a silent swallow. Also fixed a pre-existing test bug: the test asserted `mutateAsync` was called without `changeReason` but the function always passes it; added `changeReason: ""` to the test assertion.

---

### WR-03: `runAgentTests` has no catch block

**Files modified:** `apps/memroos/src/components/engagement/agent-engagement-console.tsx`
**Commit:** 34dc408
**Applied fix:** Added `const [testError, setTestError] = useState<string | null>(null)` state. In `runAgentTests`, added `setTestError(null)` on entry and a `catch` block that sets `testError` to the error message. Rendered the error message as a `<p>` element with `text-red-600` styling below the "Test primary agents" button.

---

### WR-04: `URL.revokeObjectURL` called before download completes, anchor not in DOM

**Files modified:** `apps/memroos/src/components/operations/noc-header.tsx`
**Commit:** 4f44299
**Applied fix:** Inserted `document.body.appendChild(anchor)` before `anchor.click()`, `document.body.removeChild(anchor)` after click, and deferred `URL.revokeObjectURL(url)` into a `setTimeout(..., 100)` to ensure the browser has time to initiate the download before the blob URL is revoked.

---

### WR-05: `getProposal(id) as SealProposal` casts away null without guard in `createProposal`

**Files modified:** `apps/memroos/src/lib/seal/service.ts`
**Commit:** f0b79ea
**Applied fix:** Replaced `return this.getProposal(id) as SealProposal` with an explicit null check: assigns result to `proposal`, throws `"Failed to read back created proposal: ${id}"` if null, then returns the non-null value. This removes the unsafe cast.

---

### WR-06: `applyProposal` guard condition is inverted

**Files modified:** `apps/memroos/src/lib/seal/service.ts`
**Commit:** e78049b
**Applied fix:** Changed the guard from `proposal.status !== "approved" && proposal.status !== "pending"` (which allowed `pending` proposals to be applied) to `proposal.status !== "approved"` with message `"Cannot apply proposal in ${proposal.status} state — must be approved first"`. Only `"approved"` proposals can now be applied.
**Note:** Requires human verification — this is a logic/approval-workflow fix.

---

### WR-07: Consolidation scheduler `_started` flag resets on hot-reload

**Files modified:** `apps/memroos/src/lib/memory-consolidation.ts`
**Commit:** a6066b0
**Applied fix:** Replaced the module-level `let _started = false` with a `globalThis._consolidationInterval` pattern that survives Next.js hot-reload module re-evaluation. Added a `declare global` block to type the global. The `startConsolidationScheduler` guard is now `if (typeof globalThis._consolidationInterval !== 'undefined') return`. Stores the interval reference in `globalThis._consolidationInterval`. Added `stopConsolidationScheduler()` export that clears the interval and resets the global, useful for tests and graceful shutdown.

---

## Skipped Issues

None — all 10 findings were successfully fixed.

---

_Fixed: 2026-05-22T02:01:00Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
