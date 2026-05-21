---
phase: 70-foundation-engine-core
plan: "01"
subsystem: orchestration-engine, memory-adapter, test-scaffolds
tags: [wal, sqlite, langgraph, tdd, red-tests, hil, retry-policy, memory-adapter]
dependency_graph:
  requires: []
  provides:
    - WAL-enabled OrchestrationStore (prerequisite for HIL-01..03 concurrent edit+resume)
    - langgraph>=1.2,<2.0 pin (prerequisite for RetryPolicy / ORCH-08..10)
    - Wave 0 RED test scaffolds for all nine Phase 70 requirements
  affects:
    - services/orchestration/engine.py
    - services/orchestration/requirements.txt
    - services/orchestration/tests/test_engine.py
    - services/orchestration/tests/test_graph_runtime.py
    - services/orchestration/tests/test_app.py
    - apps/memroos/src/lib/memory/__tests__/registry.test.ts
    - apps/memroos/src/lib/memory/__tests__/adapters.test.ts
    - apps/memroos/src/components/orchestration/__tests__/HilEditPanel.test.tsx
tech_stack:
  added: []
  patterns:
    - SQLite WAL mode (PRAGMA journal_mode=WAL + busy_timeout=5000)
    - Wave 0 RED test scaffolds (TDD gate compliance)
key_files:
  created:
    - apps/memroos/src/lib/memory/__tests__/registry.test.ts
    - apps/memroos/src/lib/memory/__tests__/adapters.test.ts
    - apps/memroos/src/components/orchestration/__tests__/HilEditPanel.test.tsx
  modified:
    - services/orchestration/engine.py
    - services/orchestration/requirements.txt
    - services/orchestration/tests/test_engine.py
    - services/orchestration/tests/test_graph_runtime.py
    - services/orchestration/tests/test_app.py
decisions:
  - "WAL pragmas placed before _init_schema() in OrchestrationStore.__init__ per RESEARCH.md Pattern 1"
  - "langgraph dry-run resolved to 1.2.0 on Python 3.11 (memroos venv); system Python 3.14 is externally managed"
  - "test_hil_edit_validation and test_hil_checkpoint_edit added to test_app.py/test_graph_runtime.py per plan; also added to test_engine.py (test_state_edit_audit uses record_state_edit()) to ensure 6 collectable tests in pytest"
  - "test_state_edit_audit tests engine.record_state_edit() method (does not exist yet) rather than store.append_lineage() directly — avoids trivially-passing scenario"
metrics:
  duration: "~20 minutes"
  completed: "2026-05-20"
  tasks: 3
  files_changed: 8
---

# Phase 70 Plan 01: Foundation Prerequisites — WAL pragma + langgraph pin + Wave 0 RED test scaffolds Summary

WAL pragma + busy_timeout=5000 added to OrchestrationStore, langgraph pinned to >=1.2,<2.0, and Wave 0 RED test scaffolds created for all nine Phase 70 requirements.

## What Was Done

### Task 1: WAL pragma + busy_timeout in OrchestrationStore.__init__

Added two PRAGMA statements to `services/orchestration/engine.py` inside `OrchestrationStore.__init__`, positioned after `row_factory` assignment and before `_init_schema()`:

```python
self.conn.execute("PRAGMA journal_mode=WAL")
self.conn.execute("PRAGMA busy_timeout=5000")
```

This prevents concurrent edit+resume stalls that HIL-01..03 would trigger (T-70-01 threat mitigation).

**Impact analysis (GitNexus CLI):** LOW risk — only `app.py` imports `OrchestrationStore` (d=1 direct). No affected execution processes. Change is purely additive (no signature changes).

### Task 2: Pin langgraph in requirements.txt

Changed `langgraph` to `langgraph>=1.2,<2.0` in `services/orchestration/requirements.txt`.

Dry-run resolved to `langgraph-1.2.0` against the project's `.venv` (Python 3.11). The system Python 3.14.2 is externally managed by Homebrew and requires a venv for pip operations — the memroos project venv at `.venv/` was used for the dry-run.

### Task 3: Wave 0 RED test scaffolds for all nine requirements

**Python (extending existing test files):**

| File | Test Method | Requirement | RED Reason |
|------|-------------|-------------|------------|
| test_graph_runtime.py | test_hil_checkpoint_edit | HIL-01 | runtime.edit_and_checkpoint() does not exist yet |
| test_graph_runtime.py | test_dispatch_retry_policy | ORCH-08 | RetryPolicy not set on dispatch node yet |
| test_app.py | test_hil_edit_validation | HIL-02 | PATCH /hil/{id}/edit endpoint does not exist yet |
| test_engine.py | test_state_edit_audit | HIL-03 | engine.record_state_edit() does not exist yet |
| test_engine.py | test_compensation_row | ORCH-09 | compensation_pending row not written at dispatch yet |
| test_engine.py | test_rolled_back_status | ORCH-10 | status="rolled_back" not implemented yet |

**TypeScript (new files):**

| File | Requirements | RED Reason |
|------|-------------|------------|
| registry.test.ts | MEM-07 | imports from ../registry and ../adapter — files do not exist yet |
| adapters.test.ts | MEM-06, MEM-08 | imports from ../adapter; VectorMemoryAdapter/GraphMemoryAdapter not exported yet |
| HilEditPanel.test.tsx | HIL-01, HIL-02, HIL-03 | imports ../HilEditPanel — component does not exist yet |

## Verification Results

### Task 1 Verification
```
journal_mode: wal   ✓ PASS
busy_timeout: 5000  ✓ PASS
```

### Task 2 Verification
```
grep -qE '^langgraph>=1\.2,<2\.0' services/orchestration/requirements.txt
✓ PASS
```

### Task 3 Verification
```
Python test count: 11 (>= 6 required)  ✓ PYTHON_PASS
TS files exist:                          ✓ TS_FILES_PASS
```

Python RED tests confirmed failing:
- test_compensation_row: AssertionError: 0 not greater than 0 (no compensation_pending row)
- test_rolled_back_status: AssertionError: 'waiting_for_approval' != 'rolled_back'
- test_state_edit_audit: AttributeError: 'OrchestrationEngine' has no attribute 'record_state_edit'

## Commits

| Commit | Type | Description |
|--------|------|-------------|
| 0e479a1 | feat | WAL pragma + busy_timeout in OrchestrationStore.__init__ |
| 8704e95 | feat | Pin langgraph>=1.2,<2.0 in orchestration requirements |
| 259ddbd | test | Wave 0 RED test scaffolds for all nine Phase 70 requirements |

## Deviations from Plan

### Auto-fixed Issues

None — plan executed as written with one minor deviation.

### Deviations

**1. test_state_edit_audit uses engine.record_state_edit() instead of store.append_lineage()**

- **Found during:** Task 3 implementation
- **Issue:** An initial version of test_state_edit_audit called store.append_lineage() directly and then asserted the row existed. This made the test trivially passing (PASS when it should be RED).
- **Fix:** Rewrote to call engine.record_state_edit() (a method that does not exist yet), making it properly RED with AttributeError.
- **Files modified:** services/orchestration/tests/test_engine.py

**2. GitNexus MCP tools not available — used CLI fallback**

- **Found during:** Pre-task impact analysis
- **Issue:** CLAUDE.md requires gitnexus_impact before editing symbols, but MCP tools (gitnexus_impact, gitnexus_detect_changes) are not in the executor's tool list.
- **Fix:** Used `npx gitnexus impact OrchestrationStore -d upstream --repo memroos` CLI fallback. Result: LOW risk, 1 direct caller (app.py), 0 affected processes. Used `npx gitnexus detect-changes --repo memroos` before commit (MEDIUM risk from pre-existing branch changes in chat-runtime.ts and gitnexus/route.ts — not from this plan's changes).
- **Impact:** No change to plan execution; impact assessment completed via CLI equivalent.

**3. System Python 3.14 is externally managed — dry-run used memroos .venv**

- **Found during:** Task 2 dry-run
- **Issue:** `python3 -m pip install --dry-run` fails on system Python 3.14.2 with PEP 668 externally-managed-environment error.
- **Fix:** Activated `.venv/` (Python 3.11) for the dry-run. Resolution: `langgraph-1.2.0` — compatible. Note: the orchestration service should also be run from a venv; the note applies to Plan 05/production deployment.
- **Impact:** Dry-run confirms langgraph 1.2 is available and resolves cleanly. No blocker.

## Known Stubs

None — no UI stubs or placeholder values introduced. Test scaffolds are intentionally incomplete (Wave 0 RED is the goal).

## Threat Flags

No new network endpoints, auth paths, file access patterns, or schema changes beyond what was planned. The WAL pragma change is the T-70-01 threat mitigation from the plan's threat register.

## Self-Check: PASSED

- services/orchestration/engine.py: exists, contains "journal_mode=WAL" ✓
- services/orchestration/requirements.txt: contains "langgraph>=1.2,<2.0" ✓
- services/orchestration/tests/test_engine.py: contains test_state_edit_audit, test_compensation_row, test_rolled_back_status ✓
- services/orchestration/tests/test_graph_runtime.py: contains test_hil_checkpoint_edit, test_dispatch_retry_policy ✓
- services/orchestration/tests/test_app.py: contains test_hil_edit_validation ✓
- apps/memroos/src/lib/memory/__tests__/registry.test.ts: exists ✓
- apps/memroos/src/lib/memory/__tests__/adapters.test.ts: exists ✓
- apps/memroos/src/components/orchestration/__tests__/HilEditPanel.test.tsx: exists ✓
- Commits 0e479a1, 8704e95, 259ddbd: all present in git log ✓
