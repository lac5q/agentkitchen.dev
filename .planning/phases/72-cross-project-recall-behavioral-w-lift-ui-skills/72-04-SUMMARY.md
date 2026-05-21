---
phase: 72-cross-project-recall-behavioral-w-lift-ui-skills
plan: "04"
subsystem: library-freshness
tags: [qmd, freshness, sse, streaming, tdd]
dependency_graph:
  requires: []
  provides: [library-freshness-api, qmd-update-sse-stream]
  affects: [apps/memroos/src/components/library/context-sources-panel.tsx, apps/memroos/src/lib/api-client.ts]
tech_stack:
  added: []
  patterns: [Web Streams SSE, authenticateUser session gate, spawn() child process]
key_files:
  created:
    - apps/memroos/src/lib/library/qmd-freshness.ts
    - apps/memroos/src/lib/library/__tests__/qmd-freshness.test.ts
    - apps/memroos/src/app/api/library/qmd-update/route.ts
    - apps/memroos/src/app/api/library/freshness/route.ts
  modified: []
decisions:
  - Staleness threshold is 2 hours for the freshness route (configurable per collection in future)
  - qmd index mtime from ~/.cache/qmd/index.sqlite used as proxy for last-completed update timestamp
  - spawn() + ReadableStream Web Streams for SSE — not execFile which buffers stdout
  - Dynamic import removed in favor of static import for collectCollectionFiles
metrics:
  duration: "~25 minutes"
  completed: "2026-05-21"
  tasks_completed: 2
  tasks_total: 3
  files_created: 4
  files_modified: 0
---

# Phase 72 Plan 04: QMD Update and Library Freshness UI Summary

**One-liner:** TDD freshness state machine (6 states) + authenticated SSE qmd-update stream + per-collection freshness API backed by real source mtime and qmd index timestamp.

## Completed Tasks

### Task 1: Freshness contract tests (TDD — RED then GREEN)

**RED commit:** `f63ea99` — 119 lines of failing tests for `qmd-freshness.ts`
**GREEN commit:** `8f940be` — implementation + test fix for boundary timestamp case

Freshness state machine covers all six states from the plan's `must_haves.truths`:

| State | Condition |
|-------|-----------|
| `live` | Index newer than source, within staleness threshold from now |
| `empty` | Index exists, no source files found |
| `updating` | `isUpdating` flag is set — takes priority |
| `stale` | Index older than source OR index age exceeds threshold |
| `degraded` | `isDegraded` flag is set |
| `missing` | `indexTimestamp` is null (no index) |

All 12 tests pass.

### Task 2: Authenticated qmd update stream + freshness route

**Commit:** `decdebd`

**`POST /api/library/qmd-update`**
- Auth-gated: `authenticateUser` + `requireRole("operator")`
- Uses `spawn()` with piped stdio — never `exec`/`execSync`
- Web Streams `ReadableStream` emits SSE events: `started`, `stdout`, `stderr`, `completed`, `failed`
- Client disconnect handled via `req.signal` `abort` event → SIGTERM child
- Max 30-minute runtime guard → kills process and emits `failed` event
- Terminal event guaranteed in all paths (Rule 2 — prevents UI stuck on "updating")

**`GET /api/library/freshness`**
- Auth-gated: `authenticateUser` (any authenticated user)
- Reads qmd index SQLite mtime from `~/.cache/qmd/index.sqlite` (or `QMD_INDEX_PATH`)
- Scans source file mtimes per collection via `collectCollectionFiles()`
- Returns `CollectionFreshness[]` using `computeFreshnessState()` from `qmd-freshness.ts`
- Staleness threshold: 2 hours

Typecheck clean.

### Task 3: Library freshness UI (CHECKPOINT — awaiting human verification)

Not started. Requires browser-visible wiring into `context-sources-panel.tsx` and new `useLibraryFreshness` hook in `api-client.ts`.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed test timestamp boundary producing false stale**
- **Found during:** Task 1 GREEN phase
- **Issue:** Test used absolute timestamps (10:00, 10:05) with NOW=12:00 — index was 115 min old, exceeding 1h staleness threshold, causing "stale" not "live"
- **Fix:** Changed test timestamps to use relative offsets from NOW (-50m, -45m) to ensure freshness window
- **Files modified:** `apps/memroos/src/lib/library/__tests__/qmd-freshness.test.ts`
- **Commit:** `8f940be`

**2. [Rule 2 - Missing critical] Guaranteed terminal SSE event on all exit paths**
- **Found during:** Task 2 implementation
- **Issue:** Plan risks explicitly called out "client disconnects must not leave UI stuck as updating"; the route must emit completed/failed even on spawn errors and SIGTERM
- **Fix:** All exit paths (spawn error, close event, abort handler, kill timer) emit terminal event before closing stream
- **Files modified:** `apps/memroos/src/app/api/library/qmd-update/route.ts`

## Known Stubs

- `isUpdating: false` is hardcoded in `GET /api/library/freshness` — a future plan should wire an in-process flag or lock-file check to expose live update state to the freshness endpoint
- Library UI (Task 3) not yet wired — `ContextSourcesPanel` still uses `/api/context/health`, not `/api/library/freshness`

## Threat Flags

| Flag | File | Description |
|------|------|-------------|
| threat_flag: command_injection | apps/memroos/src/app/api/library/qmd-update/route.ts | qmd binary path comes from `QMD_BIN` env var; no args accepted from request body — mitigated |
| threat_flag: operator_privilege | apps/memroos/src/app/api/library/qmd-update/route.ts | Operator-only gate prevents non-operator users from triggering expensive process |

## Self-Check: PASSED

- `apps/memroos/src/lib/library/qmd-freshness.ts` — FOUND
- `apps/memroos/src/lib/library/__tests__/qmd-freshness.test.ts` — FOUND
- `apps/memroos/src/app/api/library/qmd-update/route.ts` — FOUND
- `apps/memroos/src/app/api/library/freshness/route.ts` — FOUND
- Commit `f63ea99` — RED test commit
- Commit `8f940be` — GREEN implementation commit
- Commit `decdebd` — Task 2 routes commit
