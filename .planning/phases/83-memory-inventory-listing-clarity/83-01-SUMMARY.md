---
phase: 83-memory-inventory-listing-clarity
plan: 01
status: complete
requirements_completed: [MEMLIST-01, MEMLIST-02, MEMLIST-03, MEMLIST-04, MEMLIST-05]
completed_at: 2026-05-24
---

# Phase 83 Summary 01 — Memory Inventory + Listing Clarity

## Status

Complete as of 2026-05-24 for the v5.1 inventory clarity slice.

## Completed

- Added `apps/memroos/src/lib/memory-inventory.ts` as the canonical category vocabulary and inventory builder.
- Added `GET /api/memory-inventory` with operator auth, source-backed counts, definitions, filters, provenance rows, and honest degraded states.
- Updated the Memory page from ambiguous aggregate memory stats to explicit category cards: vector memories, ingested messages, consolidated insights, episodic writes, graph facts, and knowledge files.
- Updated Memory list/detail components to render category, backend, source, project/workspace, security label snapshot, consolidation state, salience/access metadata, and evidence pointers.
- Added tests covering source-backed counts, degraded vector count handling, provenance rows, and removal of ambiguous "Total Memories" list copy.

## Verification

- `npm --prefix apps/memroos run test -- src/app/api/memory-inventory/__tests__/route.test.ts` - PASS, 2 tests.
- `npm --prefix apps/memroos run test -- src/components/notebooks/__tests__/memory-list.test.tsx` - PASS, 1 test.
- `npm --prefix apps/memroos run typecheck` - PASS.
- Targeted lint on touched files - PASS with no errors after cleanup.

## Risk Notes

- Existing `/api/memory-stats` and NOC consumers are untouched.
- Vector and graph counts are not guessed. If backend health does not expose a usable count, the category is marked degraded with a warning.
- Inventory rows currently list local/source-owned stores. Vector and graph list rows stay search-backed through Multi-Memory Search until those backends expose authoritative list APIs.
