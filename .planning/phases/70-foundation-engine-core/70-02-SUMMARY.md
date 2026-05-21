---
phase: 70-foundation-engine-core
plan: "02"
subsystem: orchestration-engine
tags: [hil, edit-and-continue, langgraph, fastapi, pydantic, audit-lineage, tdd, green-tests]
dependency_graph:
  requires:
    - 70-01 (WAL pragma + langgraph pin + RED test scaffolds)
  provides:
    - PATCH /hil/{id}/edit Python endpoint (HIL-01, HIL-02)
    - HilEditRequest Pydantic schema with extra="forbid" (HIL-02)
    - LangGraphRuntime.edit_and_checkpoint() with as_node="route_policy" (HIL-01)
    - OrchestrationEngine.record_state_edit() writing hop_type="state_edit" lineage (HIL-03)
    - Request/response contract for PATCH /hil/{id}/edit (Plan 05 depends on this)
  affects:
    - services/orchestration/graph.py
    - services/orchestration/app.py
    - services/orchestration/engine.py
tech_stack:
  added: []
  patterns:
    - LangGraph update_state with as_node="route_policy" (edit-without-resume checkpoint pattern)
    - Pydantic v2 ConfigDict(extra="forbid") for unknown-key rejection
    - Status CAS guard (accept edit only in "waiting_for_approval" status)
    - orchestration_lineage hop_type="state_edit" audit row with actor/before/after
key_files:
  created: []
  modified:
    - services/orchestration/graph.py
    - services/orchestration/app.py
    - services/orchestration/engine.py
decisions:
  - "as_node='route_policy' hardcoded in edit_and_checkpoint — never sourced from caller input (T-70-03)"
  - "Actor identity via x-operator-id header on PATCH endpoint, consistent with TS plan-05 proxy pattern"
  - "No Python-level auth guard on PATCH endpoint — consistent with existing /resolve endpoint; TS proxy adds authorizeRegistryWrite in Plan 05"
  - "Tasks 2 and 3 committed together — record_state_edit is called inside the PATCH handler so separation would create a partial state"
  - "before= parameter is optional on record_state_edit to support engine-only test contexts without graph_runtime"
  - "PATCH path param is hil_decision_id not run_id — consistent with /hil/{id}/resolve; get_hil_decision() added as read-only store lookup"
metrics:
  duration: "~12 minutes"
  completed: "2026-05-21"
  tasks: 3
  files_changed: 3
---

# Phase 70 Plan 02: HIL edit-and-continue Python endpoint Summary

PATCH /hil/{id}/edit Python endpoint with schema validation, LangGraph checkpoint patching via as_node="route_policy", and state_edit audit lineage rows.

## What Was Done

### Task 1: edit_and_checkpoint in LangGraphRuntime (graph.py)

Added `edit_and_checkpoint(self, run_id: str, patch: dict) -> dict` to `LangGraphRuntime`:

```python
def edit_and_checkpoint(self, run_id: str, patch: Dict[str, Any]) -> Dict[str, Any]:
    config = {"configurable": {"thread_id": run_id}}
    with self._compiled() as graph:
        current = graph.get_state(config)
        before = {k: current.values.get(k) for k in patch}
        # as_node="route_policy" ensures resume re-enters needs_approval conditional
        # and routes to dispatch when requiresApproval=False. (HIL-P1: never use "approval")
        graph.update_state(config, patch, as_node="route_policy")
    return {"before": before, "after": patch}
```

Key safety properties:
- `as_node` is a hardcoded string literal — never sourced from caller input (T-70-03)
- Resume after edit routes to `dispatch` (not `END`) because `route_policy` conditional re-evaluates
- Returns `{before, after}` dict for downstream audit lineage

### Task 2: PATCH /hil/{id}/edit endpoint (app.py)

**HilEditRequest Pydantic model:**

```python
class HilEditRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")  # unknown keys → 422

    taskSummary: Optional[str] = None
    requiredCapability: Optional[str] = None
    selectedAgentId: Optional[str] = None
    requiresApproval: Optional[bool] = None
```

Excluded from editable fields:
- `runId` — immutable identifier
- `status` — system-managed
- `approvalDecision` — set by resume, not by operator edit

**Endpoint signature:**

```python
@app.patch("/hil/{decision_id}/edit")
def edit_hil(
    decision_id: str,
    request: HilEditRequest,
    x_operator_id: Optional[str] = Header(default=None, alias="x-operator-id"),
) -> dict[str, Any]:
```

**Request/response contract (Plan 05 depends on this):**

```
PATCH /hil/{decision_id}/edit

Path:   decision_id  — str, the HIL decision ID (hil_<hex>)

Headers:
  x-operator-id     optional str — operator identity for audit log; defaults to "operator"

Body (JSON, all fields optional):
  taskSummary        string | null
  requiredCapability string | null
  selectedAgentId    string | null
  requiresApproval   boolean | null
  (any unknown key)  → HTTP 422

Success response (200):
  { "ok": true, "editedFields": ["taskSummary", "requiresApproval", ...] }

Error responses:
  404  — decision_id not found, or associated run_id not found
  409  — run status is not "waiting_for_approval" (status CAS guard)
  422  — unknown keys in request body (Pydantic extra="forbid")
```

**Endpoint flow:**
1. Look up HIL decision → get `run_id`, `correlation_id`
2. Status CAS: check `run.status == "waiting_for_approval"` → 409 if not
3. Build patch dict from non-None HilEditRequest fields
4. Call `engine.graph_runtime.edit_and_checkpoint(run_id, patch)` → get `before`
5. Call `engine.record_state_edit(run_id, correlation_id, actor, patch, before)` → lineage row
6. Return `{ok: true, editedFields: [...]}`

### Task 3: record_state_edit audit lineage (engine.py)

Added `get_hil_decision()` read-only store method and `record_state_edit()` engine method:

```python
def record_state_edit(
    self,
    *,
    run_id: str,
    correlation_id: str,
    actor: str | None,
    patch: dict[str, Any],
    before: dict[str, Any] | None = None,
) -> None:
    self.store.append_lineage(
        correlation_id=correlation_id,
        run_id=run_id,
        hop_type="state_edit",
        detail={
            "actor": actor,
            "before": before if before is not None else {},
            "after": patch,
        },
    )
```

Lineage row shape:
```json
{
  "hop_type": "state_edit",
  "detail_json": {
    "actor": "luis@epiloguecapital.com",
    "before": {"taskSummary": "Deploy reviewed change"},
    "after": {"taskSummary": "Deploy reviewed change (edited)", "requiresApproval": false}
  }
}
```

No new table or column added — `state_edit` is a new hop_type value only (RESEARCH.md Pattern 3).

## Verification Results

```
HIL-specific tests:
  tests/test_graph_runtime.py::test_hil_checkpoint_edit  PASS  (HIL-01)
  tests/test_app.py::test_hil_edit_validation             PASS  (HIL-02)
  tests/test_engine.py::test_state_edit_audit             PASS  (HIL-03)

Full suite: 11 passed, 3 failed
  FAILED tests/test_engine.py::test_compensation_row      (Wave 0 RED — ORCH-09, Plan 70-03 scope)
  FAILED tests/test_engine.py::test_rolled_back_status    (Wave 0 RED — ORCH-10, Plan 70-03 scope)
  FAILED tests/test_graph_runtime.py::test_dispatch_retry_policy  (Wave 0 RED — ORCH-08, Plan 70-03 scope)
```

No regressions — the 11 passing tests include all Plan 70-01 tests plus the 3 new HIL tests.

## Commits

| Commit  | Type | Description |
|---------|------|-------------|
| 73d0ca6 | feat | add edit_and_checkpoint to LangGraphRuntime (Task 1) |
| ed2c814 | feat | add PATCH /hil/{id}/edit endpoint and record_state_edit audit (Tasks 2+3) |

## Deviations from Plan

### Minor Deviations

**1. Tasks 2 and 3 committed together**

- **Found during:** Implementation — record_state_edit is called inside the edit_hil handler
- **Reason:** The PATCH endpoint directly calls record_state_edit; splitting into separate commits would leave the endpoint in a broken state
- **Impact:** Both tests (test_hil_edit_validation and test_state_edit_audit) turn GREEN in the same commit

**2. actor extracted to x-operator-id header, not HilEditRequest body field**

- **Found during:** Design review (advisor) — actor is not an OrchestrationState field
- **Reason:** HilEditRequest must mirror only editable OrchestrationState fields (extra="forbid" means actor in body would break unknown-key test if it were later removed)
- **Fix:** Actor accepted via `x-operator-id` header; defaults to "operator" when absent
- **Impact:** Plan 05 TS proxy should forward the authenticated operator identity in this header

**3. No Python-level x-operator-token auth on PATCH endpoint**

- **Found during:** Threat model review — T-70-04 specifies x-operator-token when service port is exposed
- **Reason:** Existing /hil/{id}/resolve endpoint has no Python-level auth guard; adding it only to the new endpoint would be inconsistent. The Python service is an internal service; auth is enforced by the TS proxy layer.
- **Impact:** Plan 05 must add authorizeRegistryWrite on the TS PATCH route. Documented here to satisfy T-70-04 disposition.

**4. GitNexus MCP tools not available — used CLI fallback**

- **Found during:** Pre-task impact analysis (consistent with Plan 01)
- **Fix:** Used `npx gitnexus impact LangGraphRuntime/OrchestrationEngine --direction upstream --repo memroos`
- **Result:** Both LOW risk (1 direct caller each: app.py, 0 affected processes)

## Threat Dispositions

| Threat | Status |
|--------|--------|
| T-70-02: Tampering via unknown edit payload keys | MITIGATED — Pydantic extra="forbid" rejects unknown keys with 422 |
| T-70-03: as_node parameter injection | MITIGATED — as_node is hardcoded literal "route_policy" in edit_and_checkpoint |
| T-70-04: Unauthenticated access to PATCH endpoint | DEFERRED TO PLAN 05 — consistent with existing /resolve endpoint; TS proxy adds authorizeRegistryWrite |
| T-70-05: Concurrent edit + resume race | MITIGATED — status CAS check: edit only accepted when status="waiting_for_approval" |

## Known Stubs

None — all code paths are wired. The PATCH endpoint, checkpoint patching, and audit lineage all function end-to-end.

## Threat Flags

No new network endpoints, auth paths, or schema changes beyond what was planned. The `PATCH /hil/{id}/edit` endpoint was in the threat model.

## Self-Check: PASSED

- services/orchestration/graph.py: contains edit_and_checkpoint and as_node="route_policy" ✓
- services/orchestration/app.py: contains HilEditRequest and PATCH /hil/{decision_id}/edit ✓
- services/orchestration/engine.py: contains record_state_edit and get_hil_decision ✓
- Commit 73d0ca6: present in git log ✓
- Commit ed2c814: present in git log ✓
- test_hil_checkpoint_edit: PASS ✓
- test_hil_edit_validation: PASS ✓
- test_state_edit_audit: PASS ✓
- Full suite: 11 passed, 3 failed (all 3 failures are pre-existing Wave 0 RED scaffolds) ✓
