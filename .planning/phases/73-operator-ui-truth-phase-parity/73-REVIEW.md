---
phase: 73-operator-ui-truth-phase-parity
reviewed: 2026-05-22T00:00:00Z
depth: standard
files_reviewed: 14
files_reviewed_list:
  - apps/memroos/src/app/api/skills/review/route.ts
  - apps/memroos/src/lib/skill-workflow.ts
  - apps/memroos/src/lib/api-client.ts
  - apps/memroos/src/components/cookbooks/skills-list.tsx
  - apps/memroos/src/components/operations/efficiency-signals.tsx
  - apps/memroos/src/components/operations/noc-header.tsx
  - apps/memroos/src/components/operations/index.tsx
  - apps/memroos/src/components/engagement/agent-engagement-console.tsx
  - apps/memroos/src/app/api/memory-consolidate/route.ts
  - apps/memroos/src/app/api/memory-stats/route.ts
  - apps/memroos/src/app/api/recall/__tests__/route.test.ts
  - apps/memroos/src/lib/memory-consolidation.ts
  - apps/memroos/src/lib/parsers.ts
  - apps/memroos/src/lib/seal/service.ts
findings:
  critical: 3
  warning: 7
  info: 4
  total: 14
status: issues_found
---

# Phase 73: Code Review Report

**Reviewed:** 2026-05-22
**Depth:** standard
**Files Reviewed:** 14
**Status:** issues_found

## Summary

Phase 73 adds the skill review workflow (skills-list UI, review route, skill-workflow lib), NOC operator panels (noc-header, efficiency-signals, operations/index), and the agent engagement console. It also includes memory consolidation plumbing, memory-stats route, recall tests, parsers, and the SEAL service.

The skill review pipeline is well-structured overall — input validation is present in the right places, and the SEAL service has solid audit logging. The main critical risks are: two operator-level API routes that lack authentication, an unguarded workflow-state promotion path (skills can be promoted to enterprise from any prior status without requiring prior general approval), and an unbounded `draftBody` field that writes user-supplied content to disk without a size limit.

---

## Critical Issues

### CR-01: `/api/memory-consolidate` POST has no authentication

**File:** `apps/memroos/src/app/api/memory-consolidate/route.ts:7`
**Issue:** The POST handler calls `runConsolidation()` directly — no `authenticateUser` or `requireRole` check. Any unauthenticated caller can trigger an Anthropic API call, burning tokens and writing AI-generated content into the `memory_meta_insights` table. Compared to the `/api/skills/review` route (which enforces `operator` role), this omission is inconsistent and exposes a privileged operation without access control.
**Fix:**
```ts
import { authenticateUser } from "@/lib/auth/session";
import { requireRole } from "@/lib/auth/middleware-roles";

export async function POST(req: NextRequest) {
  const session = await authenticateUser(req);
  if (!session) return Response.json({ error: "authentication required" }, { status: 401 });
  const roleError = requireRole(session.role, "operator");
  if (roleError) return roleError;
  // ... rest of handler
}
```

---

### CR-02: `/api/memory-stats` GET has no authentication

**File:** `apps/memroos/src/app/api/memory-stats/route.ts:5`
**Issue:** The GET handler returns pending message counts, tier stats, source agent breakdowns, and recent failure counts — all from internal SQLite tables — with no auth check. This leaks operational metadata (agent IDs, consolidation model in use, failure counts) to any unauthenticated caller.
**Fix:** Add the same session + role guard as in CR-01, using `requireRole(session.role, "operator")` before executing any DB queries.

---

### CR-03: `draftBody` written to disk without size limit

**File:** `apps/memroos/src/lib/skill-workflow.ts:124-125`, `apps/memroos/src/app/api/skills/review/route.ts:36`
**Issue:** `draftBody` and `notes` are accepted as-is from the request body (only type-checked as `string`) and then written into the JSON state file on disk via `writeSkillReviewState`. There is no maximum length validation. An operator with the correct role can send a multi-megabyte payload that bloats the state file and may cause DoS on reads (the entire file is parsed on each request). The `skillName` is validated with `/^[\w.-]+$/`, but the field content is not capped.
**Fix:** Add length guards in the route before passing to `updateSkillReviewState`:
```ts
const MAX_NOTES = 10_000;
const MAX_DRAFT = 200_000;
if ((body.notes?.length ?? 0) > MAX_NOTES || (body.draftBody?.length ?? 0) > MAX_DRAFT) {
  return Response.json({ error: "field too long" }, { status: 400 });
}
```

---

## Warnings

### WR-01: Skill promotion has no state precondition check — any stage can be promoted to enterprise

**File:** `apps/memroos/src/lib/skill-workflow.ts:140-143`
**Issue:** `promote-enterprise` sets `stage = "enterprise"` and `status = "enterprise-ready"` regardless of the current stage or status. A skill in `"agent-limited"` / `"unreviewed"` can be promoted to `"enterprise-ready"` in a single action, bypassing the intended `agent-limited → general (approved) → enterprise` workflow. The `approve-general` action has a symmetric gap — it does not require `stage === "agent-limited"`.
**Fix:** Add precondition guards:
```ts
if (input.action === "promote-enterprise") {
  if (previous?.stage !== "general" || previous?.status !== "approved") {
    throw new Error("Skill must be approved at general stage before promoting to enterprise");
  }
  ...
}
```

---

### WR-02: `SkillReviewDesk.runReviewAction` swallows errors silently

**File:** `apps/memroos/src/components/cookbooks/skills-list.tsx:312-321`
**Issue:** `runReviewAction` is an `async` function that uses `await reviewMutation.mutateAsync(...)` but has no try/catch. When the mutation throws (network error, 400 from the API), the unhandled rejection propagates to `void` since all four callers are fire-and-forget via `onClick`. The `reviewMutation.isError` state will be set by tanstack-query's own error capture, but `setNotice(actionNotice(action))` on line 321 executes unconditionally after `mutateAsync` — if the promise rejects, this line is never reached, but it also means the success notice is never shown, leaving the UI in a confused state (neither error nor success text displayed consistently).
**Fix:**
```ts
async function runReviewAction(action: ...) {
  if (!selected) return;
  try {
    await reviewMutation.mutateAsync({ skillName: selected.name, action, notes, draftBody, changeReason });
    setNotice(actionNotice(action));
  } catch {
    // reviewMutation.error surfaces to the UI via isError; clear stale notice
    setNotice(null);
  }
}
```

---

### WR-03: `runAgentTests` has no error handling — UI silent on fetch failures

**File:** `apps/memroos/src/components/engagement/agent-engagement-console.tsx:445-459`
**Issue:** `runAgentTests` has a `try/finally` but no `catch`. If `fetch` throws (network unreachable) or `res.json()` fails, the exception propagates into a `void` caller and is silently swallowed. `testing` is correctly reset in `finally`, but there is no user-visible feedback.
**Fix:** Add a catch block that stores an error message in state and surfaces it to the user, or at minimum `console.error` the failure.

---

### WR-04: `URL.revokeObjectURL` called synchronously before anchor click completes download

**File:** `apps/memroos/src/components/operations/noc-header.tsx:29-31`
**Issue:** The `exportReport` function creates a blob URL, triggers `anchor.click()`, then immediately calls `URL.revokeObjectURL(url)`. On some browsers `click()` is not fully synchronous with the download initiation — revoking the URL before the browser fetches the blob can cause the download to fail. The anchor element is also never appended to the DOM, which on some browsers prevents the download from starting at all.
**Fix:** Append the anchor to the document, use `setTimeout` to defer revocation, and clean up:
```ts
document.body.appendChild(anchor);
anchor.click();
document.body.removeChild(anchor);
setTimeout(() => URL.revokeObjectURL(url), 100);
```

---

### WR-05: `getProposal(id) as SealProposal` casts away null without guard in `createProposal`

**File:** `apps/memroos/src/lib/seal/service.ts:170`
**Issue:** `createProposal` calls `this.getProposal(id) as SealProposal` immediately after `db.prepare(...).run(...)`. If the insert fails silently (e.g., constraint violation that doesn't throw in this SQLite binding configuration), `getProposal(id)` returns `null` and the cast to `SealProposal` produces a null reference that callers dereference without checking. The same pattern appears at lines 203, 207, and 210 in `handleAction`.
**Fix:** Add an explicit null check after the cast:
```ts
const proposal = this.getProposal(id);
if (!proposal) throw new Error(`Failed to read back created proposal: ${id}`);
return proposal;
```

---

### WR-06: `applyProposal` allows applying a `pending` proposal, bypassing approval workflow

**File:** `apps/memroos/src/lib/seal/service.ts:224`
**Issue:** `applyProposal` accepts proposals with `status === "pending"` (line 224 condition: `proposal.status !== "approved" && proposal.status !== "pending"`). The intent appears to be blocking non-approved proposals, but the logic is inverted — it throws only when `status` is neither `approved` nor `pending`, meaning `pending` proposals can be applied without operator approval. This bypasses the SEAL approval workflow.
**Fix:** The condition should be:
```ts
if (proposal.status !== "approved") {
  throw new Error(`Cannot apply proposal in ${proposal.status} state — must be approved first`);
}
```

---

### WR-07: `memory-consolidation.ts` scheduler uses a module-level `_started` flag that does not survive hot-reload

**File:** `apps/memroos/src/lib/memory-consolidation.ts:4,164-172`
**Issue:** The `_started` module-level boolean prevents double-start within a single process lifetime. However, in Next.js development mode (and on server-side module re-evaluation after hot-reload), the module is re-evaluated and `_started` resets to `false`. Each hot-reload launches a new `setInterval` without clearing the previous one, creating multiple concurrent consolidation schedulers that fight over the same DB rows and Anthropic API key. There is also no `clearInterval` handle stored — the interval cannot be cleaned up.
**Fix:** Store the interval reference and expose a `stopConsolidationScheduler()` for cleanup, and consider using a DB-level lock or last-run timestamp check as the true idempotency guard instead of a module variable.

---

## Info

### IN-01: Duplicate type definitions for `SkillWorkflowItem` / `SkillWorkflowStage` / `SkillReviewStatus`

**File:** `apps/memroos/src/lib/api-client.ts:262-289` and `apps/memroos/src/lib/skill-workflow.ts:4-42`
**Issue:** `SkillWorkflowStage`, `SkillReviewStatus`, and `SkillWorkflowItem` are defined identically in both `api-client.ts` and `skill-workflow.ts`. If one changes (e.g., a new stage is added), the other must be manually kept in sync.
**Fix:** Export the canonical types from `skill-workflow.ts` and re-export them from `api-client.ts`, or move them to a shared `@/types` file.

---

### IN-02: `metadataStage` keyword scan can misclassify skills

**File:** `apps/memroos/src/lib/skill-workflow.ts:271-276`
**Issue:** `metadataStage` returns `"enterprise"` if the word "enterprise", "compliance", or "governance" appears anywhere in the skill body or description. A skill that mentions "compliance" in a single sentence (e.g., "use this when preparing for compliance review") is classified as enterprise-stage even if it is a draft local skill.
**Fix:** Limit the keyword scan to the frontmatter only, or require the keyword in a `stage:` metadata field rather than free text.

---

### IN-03: `EfficiencySignals` `borderRight` rendered on last item via index comparison

**File:** `apps/memroos/src/components/operations/efficiency-signals.tsx:88-93`
**Issue:** The `borderRight` is set for all items where `i < MISSING_TELEMETRY.length - 1`. This works correctly only as long as `MISSING_TELEMETRY` is a static constant. If items are ever rendered conditionally or filtered, the last-item index check will be wrong. Using CSS (`border-right: none` on `:last-child` or a CSS grid gap) would be more robust.
**Fix:** Remove the `borderRight` inline style and use a CSS class or grid gap.

---

### IN-04: `history` slice in chat display is off-by-one from the stored history

**File:** `apps/memroos/src/components/engagement/agent-engagement-console.tsx:791`
**Issue:** The chat history display renders `history.slice(-10)` but history can grow unboundedly during a long room session. The stored history `meetingHistory` used for turn context uses `history.slice(-12)`. There is no cap on total history growth. This is a minor quality issue rather than a correctness bug, but it means long sessions accumulate unbounded state.
**Fix:** Cap history with a `MAX_HISTORY` constant and trim on each append, e.g., `setHistory((h) => [...h, msg].slice(-MAX_HISTORY))`.

---

_Reviewed: 2026-05-22_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
