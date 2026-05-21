---
status: complete
phase: 70-foundation-engine-core
source:
  - 70-01-SUMMARY.md
  - 70-02-SUMMARY.md
  - 70-03-SUMMARY.md
  - 70-04-SUMMARY.md
  - 70-05-SUMMARY.md
started: 2026-05-21T08:00:00Z
updated: 2026-05-21T08:05:00Z
---

## Current Test

[testing complete]

## Tests

### 1. WAL journal mode on OrchestrationStore
expected: |
  OrchestrationStore opens orchestration.db in WAL mode with busy_timeout=5000.
  Pragma runs before _init_schema() so concurrent HIL edit+resume cannot stall.
result: pass
method: automated
verification: python3.11 -c "from engine import OrchestrationStore; import tempfile, os; p=os.path.join(tempfile.mkdtemp(),'t.db'); s=OrchestrationStore(p); print(s.conn.execute('PRAGMA journal_mode').fetchone()[0])" — outputs "wal"

### 2. langgraph pinned to >=1.2,<2.0
expected: |
  services/orchestration/requirements.txt contains langgraph>=1.2,<2.0.
  Dry-run confirmed resolves to langgraph-1.2.0 on Python 3.11.
result: pass
method: automated
verification: grep -qE '^langgraph>=1\.2,<2\.0' services/orchestration/requirements.txt — PASS

### 3. PATCH /hil/{id}/edit Python endpoint
expected: |
  POST-and-continue: PATCH /hil/{id}/edit with valid fields returns {ok: true, editedFields: [...]}.
  Uses graph.update_state(config, patch, as_node="route_policy") — not "approval" — so the graph
  resumes to dispatch rather than terminating at END.
result: pass
method: automated
verification: python3.11 -m pytest tests/ -k edit -q — 4 tests pass (test_hil_checkpoint_edit, test_hil_edit_validation, test_state_edit_audit, + response contract)

### 4. Schema validation — unknown keys return 422
expected: |
  PATCH /hil/{id}/edit with an unrecognized field returns HTTP 422.
  Known fields: taskSummary, requiredCapability, selectedAgentId, requiresApproval.
  runId and status are excluded (immutable/system-managed).
result: pass
method: automated
verification: python3.11 -m pytest tests/test_app.py -k edit_validation -q — test_hil_edit_validation PASS

### 5. State edit audit lineage row
expected: |
  Accepting an edit writes a hop_type="state_edit" row to orchestration_lineage with
  the actor identity (from x-operator-id header), plus before/after snapshots.
result: pass
method: automated
verification: python3.11 -m pytest tests/test_engine.py -k state_edit_audit -q — test_state_edit_audit PASS

### 6. RetryPolicy on dispatch — retries up to max_attempts
expected: |
  Dispatch node is configured with RetryPolicy(max_attempts=ORCHESTRATION_RETRY_LIMIT, retry_on=[Exception]).
  max_attempts is env-configurable (not hardcoded).
result: pass
method: automated
verification: python3.11 -m pytest tests/test_graph_runtime.py -k retry_policy -q — test_dispatch_retry_policy PASS

### 7. Compensation row written at dispatch time
expected: |
  When a task is dispatched, a compensation_pending row is written to orchestration_lineage
  paired with the dispatch_request row via forward_hop_id. Row is stored declaratively — no
  Python closures.
result: pass
method: automated
verification: python3.11 -m pytest tests/test_engine.py -k compensation_row -q — test_compensation_row PASS

### 8. Rolled-back status after retry exhaustion
expected: |
  After retries are exhausted, orchestration_runs.status is set to "rolled_back" with
  a granular rollback_reason column value.
result: pass
method: automated
verification: python3.11 -m pytest tests/test_engine.py -k rolled_back_status -q — test_rolled_back_status PASS

### 9. MemoryAdapter interface — no client-handle leakage
expected: |
  MemoryAdapter exposes only tiers, capabilities, search(), write(), health().
  No method returns a Qdrant or Neo4j client handle.
  capabilities field is required (not optional), typed as MemoryCapability[].
result: pass
method: automated
verification: npx vitest run src/lib/memory/__tests__/adapters.test.ts — 6 tests pass

### 10. Adapter registry round-trip
expected: |
  registerAdapter() appends to all tiers an adapter claims.
  getAdapters(tier) returns registered adapters for that tier.
  clearRegistry() empties all tiers.
  New adapters register without modifying existing adapter code.
result: pass
method: automated
verification: npx vitest run src/lib/memory/__tests__/registry.test.ts — 8 tests pass

### 11. editOrchestrationHil client + auth-guarded TS proxy
expected: |
  editOrchestrationHil(id, patch) PATCHes /api/orchestration/hil/{id}/edit.
  422 responses return a typed HilEditValidationError (ok: false, validationError: true) — not thrown.
  The TS proxy route returns 403 for unauthorized requests via authorizeRegistryWrite.
  Authorized requests proxy to Python; upstream 422 passes through unchanged.
result: pass
method: automated
verification: npx vitest run src/lib/orchestration src/app/api/orchestration/hil — all tests pass (125 files, 719 tests total GREEN)

### 12. HilEditPanel renders and submits
expected: |
  HilEditPanel renders editable OrchestrationState fields for a paused (waiting_for_approval) task.
  On submit, calls editOrchestrationHil sending only changed fields.
  On 422, shows field-level rejection messages and does not clear form.
  On success, shows confirmed editedFields.
result: pass
method: automated
verification: npx vitest run src/components/orchestration/__tests__/HilEditPanel.test.tsx — PASS

## Summary

total: 12
passed: 12
issues: 0
pending: 0
skipped: 0

## Gaps

[none]
