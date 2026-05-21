# Deferred Items — Phase 70 Foundation Engine Core

Items discovered during plan execution that are out of scope for the originating plan.
These must be addressed in a future plan before the deferred capability is considered complete.

---

## From 70-03: Multi-hop retry + declarative rollback

### DEFERRED-70-03-A: rollback_compensation LangGraph graph node

- **Originating plan:** 70-03, Task 2
- **Plan artifact spec:** `graph.py` must provide "Multi-hop topology with RetryPolicy on dispatch + rollback_compensation node + expanded OrchestrationState"
- **Current state:** Rollback runs entirely in `engine._run_rollback_compensation()` — bypasses LangGraph state machine. Graph topology: `START → route_policy → [approval|dispatch] → END` (unchanged).
- **Why deferred:** Wave 0 RED tests tested engine lineage DB output, not graph node topology. Tests passed without the node, revealing a gap between test contract and full plan spec.
- **Required work:** Add `rollback_compensation` node to `build_langgraph()`. Wire retry exhaustion from the dispatch node to the `rollback_compensation` node (conditional edge). Move compensation logic from `engine._run_rollback_compensation` to graph node action. Update LangGraph checkpoint to reflect rollback in-flight.
- **Risk if not addressed:** Compensation does not appear in LangGraph checkpoint state. Restart during compensation loses in-flight rollback context (mitigated by DB rows, but graph state is inconsistent).

### DEFERRED-70-03-B: Multi-hop chain topology in graph.py

- **Originating plan:** 70-03, Task 1 objective
- **Plan spec:** "Expand the single-hop orchestration graph into a multi-hop chain"
- **Current state:** `OrchestrationState` has `hops` and `currentHopIndex` fields. The graph does not iterate through them — dispatch fires once and goes to END.
- **Why deferred:** The state fields were added as planned; the graph routing to loop over multiple hops was not. No Wave 0 RED test exercises multi-hop routing.
- **Required work:** Add conditional edge from dispatch back to dispatch (or a dedicated "next_hop" router) that checks `currentHopIndex < len(hops)`. Wire `rollback_compensation` node as the exhaustion target (depends on DEFERRED-70-03-A).
- **Risk if not addressed:** Multi-agent chains with N > 1 hops cannot be expressed as LangGraph graph traversals. `currentHopIndex` and `hops` fields are set up but never used for routing.

### DEFERRED-70-03-C: Per-hop attempt tracking in detail_json["attempts_per_hop"]

- **Originating plan:** 70-03, Task 1 done criteria
- **RESEARCH.md reference:** Pitfall 3 — "Per-hop retry counts must live in orchestration_lineage.detail_json['attempts_per_hop'], NOT in orchestration_runs.attempts"
- **Current state:** `orchestration_runs.attempts` is the sole retry counter. `detail_json["attempts_per_hop"]` is never written.
- **Why deferred:** No test exercises this. The single-hop topology means hop N = hop 1 always, so the counter conflation does not manifest as a correctness failure today.
- **Required work:** When dispatch node attempts a hop, write or increment `detail_json["attempts_per_hop"][lineage_row_id]` in the lineage row for that hop. Keep `orchestration_runs.attempts` as top-level total. Add test that verifies per-hop attempt counts are distinct for a 2-hop chain where hop 1 retries twice.
- **Risk if not addressed:** Once multi-hop topology is implemented (DEFERRED-70-03-B), a 2-hop chain where hop 1 retries once and hop 2 retries twice would show `attempts=3` with no way to distinguish which hop used which retries.

### DEFERRED-70-03-D: A2A compensate dispatch in _run_rollback_compensation

- **Originating plan:** 70-03, Task 2 behavior spec
- **Plan spec:** "Each compensation dispatches an A2A task with requiredCapability='compensate'; agents without that capability yield a compensation_skipped row"
- **Current state:** `_run_rollback_compensation` unconditionally writes `compensation_skipped` for every pending row — no A2A dispatch attempted.
- **Why deferred:** No A2A transport layer is wired into the orchestration service at this scope. No agent registry to check `requiredCapability`.
- **Required work:** In `_run_rollback_compensation`, for each `compensation_pending` row: (1) look up the agent by `agent_id`, (2) check if it has `requiredCapability="compensate"`, (3) if yes, dispatch A2A task and write `compensation_done` on acknowledgement, (4) if no, write `compensation_skipped`. Requires A2A transport integration.
- **Risk if not addressed:** Compensations are always skipped even when agents support rollback. The audit trail shows `compensation_skipped` which may be misleading for agents that do support `requiredCapability="compensate"`.
