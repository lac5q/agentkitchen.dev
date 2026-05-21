---
phase: 70-foundation-engine-core
plan: "04"
subsystem: memory
tags: [typescript, memory-adapter, registry, qdrant, neo4j, sqlite, mem0, better-sqlite3]

requires:
  - phase: 70-01
    provides: WAL pragma and DB singleton pattern used by EpisodicMemoryAdapter

provides:
  - MemoryAdapter TypeScript interface with MemoryCapability union (adapter.ts)
  - Adapter registry Map<MemoryTier, MemoryAdapter[]> with registerAdapter/getAdapters/clearRegistry (registry.ts)
  - VectorMemoryAdapter class wrapping mem0 HTTP search/write (backends.ts)
  - GraphMemoryAdapter class wrapping Neo4j HTTP API (backends.ts)
  - EpisodicMemoryAdapter class wrapping recallByKeyword via DB factory (backends.ts)
  - Module-init registration with idempotency guard
  - Shim delegation on searchVectorMemory/queryGraphMemory/checkVectorHealth/checkGraphHealth

affects: [71-recall-engine, 70-05, phase-70.1-shadow-adapter]

tech-stack:
  added: []
  patterns:
    - "MemoryAdapter interface: tiers + capabilities + search/write/health — no client handle leakage"
    - "Registry pattern: Map<MemoryTier, MemoryAdapter[]> with registerAdapter/getAdapters/clearRegistry"
    - "Shim delegation: check getAdapters(tier)[0] first, fallback to direct impl — exactly one path per tier"
    - "Idempotency guard: _registered boolean prevents double-registration on module re-import"
    - "Episodic adapter: () => Database factory pattern — DB handle never exposed externally"

key-files:
  created:
    - apps/memroos/src/lib/memory/adapter.ts
    - apps/memroos/src/lib/memory/registry.ts
  modified:
    - apps/memroos/src/lib/memory/backends.ts
    - apps/memroos/src/lib/memory/__tests__/registry.test.ts
    - apps/memroos/src/lib/memory/__tests__/adapters.test.ts

key-decisions:
  - "capabilities field is required (not optional) on MemoryAdapter — matches CONTEXT.md MemoryCapability union"
  - "Static import of getDb() from db.ts at module top — no circular dependency exists, avoids require() path alias failure in vitest"
  - "EpisodicMemoryAdapter stores () => Database factory, calls getDb() at search/health time not construction time"
  - "GraphMemoryAdapter.write() routes through mem0 HTTP with type=graph — never Qdrant direct (T-70-11)"
  - "checkGraphHealth shim delegates to graph adapter health() — internal graph health still calls Neo4j"
  - "EpisodicMemoryAdapter.write() is a no-op stub — episodic writes require the full ingest pipeline for FTS5 index integrity"

patterns-established:
  - "Adapter pattern: new backends implement MemoryAdapter + call registerAdapter() — no existing code modified"
  - "Shim pattern: exported function checks registry first, falls through to direct impl — backward compatible"

requirements-completed: [MEM-06, MEM-07, MEM-08]

duration: 22min
completed: 2026-05-20
---

# Phase 70 Plan 04: MemoryAdapter interface + registry + concrete shim adapters Summary

**TypeScript MemoryAdapter interface with capability metadata, tier registry, and three concrete adapters (Vector/Graph/Episodic) wrapping existing backends as shims — unblocks Phase 71 recall work**

## Performance

- **Duration:** ~22 min
- **Started:** 2026-05-20T21:16:00Z
- **Completed:** 2026-05-20T21:32:30Z
- **Tasks:** 3
- **Files modified:** 5 (2 new, 3 modified)

## Accomplishments
- Defined `MemoryAdapter` interface with `MemoryCapability` union, `MemorySearchResult`, and no client-handle methods (MEM-06)
- Created adapter registry (`Map<MemoryTier, MemoryAdapter[]>`) with `registerAdapter`/`getAdapters`/`clearRegistry` — new adapters register without touching existing code (MEM-07)
- Wrapped all three existing backends as concrete adapters registered at module init — existing callers unchanged via shim delegation (MEM-08)
- All 14 memory tests GREEN; TypeScript type check passes; full suite 707/707 pass (1 pre-existing RED unrelated)

## Task Commits

1. **Task 1: MemoryAdapter interface + adapter registry** - `1798cc3` (feat)
2. **Task 2+3: Concrete adapters + shims + module-init registration** - `62cf011` (feat)

## Files Created/Modified
- `apps/memroos/src/lib/memory/adapter.ts` — MemoryCapability union, MemorySearchResult, MemoryAdapter interface
- `apps/memroos/src/lib/memory/registry.ts` — Map<MemoryTier, MemoryAdapter[]> registry
- `apps/memroos/src/lib/memory/backends.ts` — VectorMemoryAdapter, GraphMemoryAdapter, EpisodicMemoryAdapter classes; module-init registration; shim exports
- `apps/memroos/src/lib/memory/__tests__/registry.test.ts` — added `capabilities: []` to stub adapters (required field)
- `apps/memroos/src/lib/memory/__tests__/adapters.test.ts` — replaced broken placeholder test with real client-handle check; added `capabilities` to stubs

## Decisions Made
- `capabilities` field is required (not optional) per CONTEXT.md — Wave 0 test stubs updated to include it
- Static `import { getDb }` at module top-level instead of `require()` in `_registerDefaultAdapters` — avoids Vite path alias resolution failure for `@/` in require() calls during vitest runs
- `EpisodicMemoryAdapter.write()` is a no-op stub — episodic writes route through the full ingest pipeline (`db-ingest.ts`) which maintains FTS5 index integrity; no equivalent HTTP write path exists
- `GraphMemoryAdapter.write()` routes through `MEM0_URL/memory/add` with `type: "graph"` metadata — consistent with mem0 HTTP-only constraint (T-70-11)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed broken Wave 0 placeholder assertion in adapters.test.ts**
- **Found during:** Task 1 (test review before implementation)
- **Issue:** Wave 0 RED test used `require("../adapter")` to get a TypeScript interface — interfaces don't exist at runtime; assertion was guaranteed to fail even with correct implementation
- **Fix:** Replaced with async `import("../backends")` + concrete adapter instantiation + `getClient` undefined check
- **Files modified:** `apps/memroos/src/lib/memory/__tests__/adapters.test.ts`
- **Verification:** `adapters.test.ts` 6/6 pass after implementation
- **Committed in:** `1798cc3`

**2. [Rule 1 - Bug] Added capabilities field to Wave 0 test stubs**
- **Found during:** Task 1 (test review — advisor flagged)
- **Issue:** `makeStubAdapter` in `registry.test.ts` and `makeAdapter` in `adapters.test.ts` omitted `capabilities` field; would cause TypeScript errors once the interface required it
- **Fix:** Added `capabilities: []` to `makeStubAdapter` and `capabilities: ["semantic"]` to `makeAdapter`
- **Files modified:** Both test files
- **Committed in:** `1798cc3`

**3. [Rule 3 - Blocking] Replaced require() with static import for getDb**
- **Found during:** Task 2 (running adapters tests)
- **Issue:** `require("@/lib/db")` inside `_registerDefaultAdapters()` failed at module init because `require()` doesn't resolve Vite path aliases in vitest environment
- **Fix:** Added static `import { getDb } from "@/lib/db"` at top of `backends.ts`; no circular dependency exists between `db.ts` and `memory/backends.ts`
- **Files modified:** `apps/memroos/src/lib/memory/backends.ts`
- **Committed in:** `62cf011`

**4. [Deviation - GitNexus MCP unavailable] Manual impact analysis via grep**
- **Found during:** Pre-task (GitNexus MCP tools not loaded in this agent context)
- **Issue:** CLAUDE.md requires `gitnexus_impact` before editing `searchVectorMemory`, `queryGraphMemory`, `recallByKeyword`
- **Action:** Performed manual grep-based impact analysis. Callers confirmed:
  - `searchVectorMemory`: `search/route.ts`, `multi-search/route.ts` — LOW risk
  - `queryGraphMemory`: `graph/route.ts`, `multi-search/route.ts`, `memory-recall-evals.ts` — LOW risk
  - `recallByKeyword`: `recall/route.ts`, `memory-recall-evals.ts` (not modified — episodic adapter wraps it via import)
  - Existing function signatures preserved unchanged — existing callers not broken
- **GitNexus detect_changes**: Not run — MCP unavailable

---

**Total deviations:** 3 auto-fixed + 1 MCP unavailability (per deviation rules)
**Impact on plan:** Auto-fixes necessary for test correctness and test environment compatibility. No scope creep.

## Issues Encountered
- `vitest` not installed in monorepo `node_modules` initially — ran `npm install` at repo root to hoist it
- `require()` with `@/` path alias doesn't work in vitest; static `import` resolves correctly

## Threat Surface Scan
No new network endpoints, auth paths, or file access patterns introduced. The `MemoryAdapter` interface intentionally excludes client handles (T-70-10). `VectorMemoryAdapter.write()` exclusively uses `MEM0_URL/memory/add` HTTP path (T-70-11). No new threat surface beyond what is in the plan's threat model.

## Next Phase Readiness
- `MemoryAdapter` interface is stable — Phase 71 recall work can begin
- Phase 70.1 shadow adapter can register against the registry without modifying existing code (MEM-07 delivered)
- Existing memory API routes (`search/route.ts`, `graph/route.ts`, `multi-search/route.ts`, `health/route.ts`) continue working unchanged via shim delegation

## Self-Check: PASSED
- `adapter.ts` exists: confirmed
- `registry.ts` exists: confirmed
- `backends.ts` modified with concrete adapters: confirmed
- Task commits exist: `1798cc3` ✓, `62cf011` ✓
- 14 memory tests GREEN
- TypeScript type check PASSED

---
*Phase: 70-foundation-engine-core*
*Completed: 2026-05-20*
