---
phase: 72-cross-project-recall-behavioral-w-lift-ui-skills
plan: "01"
subsystem: recall
tags: [recall, cross-project, embeddings, semantic, hybrid, bm25, tdd]
dependency_graph:
  requires: ["71-02"]
  provides: ["cross-project-recall-contract", "RECALL-03", "RECALL-04"]
  affects: ["api/recall", "lib/embeddings/recall"]
tech_stack:
  added: []
  patterns: ["SQL-level project allowlist filter", "optional param backward compat", "source_project annotation"]
key_files:
  created: []
  modified:
    - apps/memroos/src/lib/embeddings/recall.ts
    - apps/memroos/src/app/api/recall/route.ts
    - apps/memroos/src/lib/embeddings/__tests__/recall.test.ts
    - apps/memroos/src/app/api/recall/__tests__/route.test.ts
decisions:
  - "Cross-project recall is strictly opt-in via crossProject=true + explicit allowed_project_ids"
  - "Default (no crossProject param) preserves backward compat with no project filter"
  - "Empty or missing allowedProjectIds with crossProject=true returns 400 structured error"
  - "SQL-level WHERE IN filter for semantic recall; JS post-filter for BM25 (recallByKeyword has no project param)"
  - "source_project annotation added to all result types (SemanticRecallResult, HybridRecallResult, BM25 results)"
  - "recall_scope field added to all responses: 'single' or 'cross'"
metrics:
  duration: "~6 minutes"
  completed_date: "2026-05-21"
  tasks_completed: 3
  files_changed: 4
---

# Phase 72 Plan 01: Cross-project recall contract Summary

**One-liner:** Explicit opt-in cross-project recall via SQL allowlist filter with source_project annotations and 400 validation for missing/empty allowlists.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | RED tests for recall scope | f1cc9da | recall.test.ts, route.test.ts |
| 2 | Scope-aware recall ranking | 4e59eff | recall.ts |
| 3 | API contract and side effects | 13e7230 | route.ts |

## What Was Built

### Cross-Project Recall Contract (RECALL-03, RECALL-04)

**`semanticRecall` and `hybridRecall` (recall.ts):**
- Added optional `allowedProjectIds?: string[]` parameter to both functions
- `undefined` = no filter, backward compat, Phase 71 single-project behavior unchanged
- `[]` = empty allowlist returns zero rows (impossible SQL condition `AND 1=0`)
- `["project-a", "project-b"]` = SQL `WHERE m.project IN (?)` for semantic candidates (performance: filter is pushed to SQL, not JS post-filter)
- BM25 in hybridRecall applies JS post-filter (recallByKeyword has no project parameter)
- `source_project` field added to `SemanticRecallResult` and `HybridRecallResult` interfaces (always populated from `m.project`)

**`GET /api/recall` (route.ts):**
- Parses `crossProject=true` and `allowed_project_ids=a,b,c` query params
- Returns `400` + structured `{ error: "..." }` when `crossProject=true` but allowlist is missing or empty
- Passes `allowedProjectIds` to `semanticRecall`/`hybridRecall` for filtering
- Returns `recall_scope: "single" | "cross"` on all responses
- Returns `allowed_project_ids: [...]` in envelope when scope is "cross"
- BM25 results also annotated with `source_project` for consistent response shape
- All Phase 71 side effects preserved (last_recall_query meta, recall_log, memory_salience access_count)

## Deviations from Plan

None — plan executed exactly as written. The TDD gate was followed: RED tests committed first (f1cc9da), then GREEN implementation (4e59eff + 13e7230).

## Test Coverage

- 28 tests passing (up from 16 baseline)
- 12 new tests: 6 in recall.test.ts (cross-project scope utility tests), 6 in route.test.ts (API contract tests)
- Covers: backward compat, allowlist filter, empty allowlist 400, cross-project 200, source_project annotation, degraded fallback HTTP 200

## Performance Notes

Per the task brief, project filtering was implemented at the SQL level for semantic recall to avoid N+1 patterns. The `WHERE m.project IN (...)` clause is pushed into the SQLite query rather than fetching all candidates and post-filtering in JS. For BM25, `recallByKeyword` has no project parameter so JS post-filter is used — this is a known trade-off documented in the code.

## Threat Flags

None — no new network endpoints or auth paths introduced. The existing `GET /api/recall` route was extended additively.

## Self-Check: PASSED

Files verified:
- apps/memroos/src/lib/embeddings/recall.ts: EXISTS
- apps/memroos/src/app/api/recall/route.ts: EXISTS
- apps/memroos/src/lib/embeddings/__tests__/recall.test.ts: EXISTS
- apps/memroos/src/app/api/recall/__tests__/route.test.ts: EXISTS

Commits verified:
- f1cc9da: exists (test RED)
- 4e59eff: exists (feat GREEN recall.ts)
- 13e7230: exists (feat GREEN route.ts)
