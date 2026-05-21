import os
import tempfile
import unittest

from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from engine import OrchestrationEngine, OrchestrationStore


AGENTS = [
    {
        "id": "slow-agent",
        "name": "Slow Agent",
        "status": "dormant",
        "protocol": "a2a",
        "capabilities": [{"id": "research", "name": "Research", "tags": ["research"]}],
    },
    {
        "id": "active-agent",
        "name": "Active Agent",
        "status": "active",
        "protocol": "a2a",
        "capabilities": [{"id": "research", "name": "Research", "tags": ["research", "analysis"]}],
    },
]


class OrchestrationEngineTest(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.db_path = os.path.join(self.tmp.name, "orchestration.db")
        self.store = OrchestrationStore(self.db_path)
        self.engine = OrchestrationEngine(self.store, retry_limit=2)

    def tearDown(self):
        self.store.close()
        self.tmp.cleanup()

    def test_routes_by_declared_capability_and_persists_lineage(self):
        result = self.engine.route_task(
            {
                "taskSummary": "Research current LangGraph checkpointing",
                "requiredCapability": "research",
                "agents": AGENTS,
                "correlationId": "corr-1",
            }
        )

        self.assertEqual(result["status"], "dispatched")
        self.assertEqual(result["selectedAgentId"], "active-agent")
        self.assertEqual(result["correlationId"], "corr-1")
        self.assertEqual(result["retryLimit"], 2)
        self.assertEqual(result["boundary"], "LangGraph chooses policy; Memroos/A2A owns transport")
        run = self.store.get_run(result["runId"])
        self.assertEqual(run["selected_agent_id"], "active-agent")
        lineage = self.store.list_lineage(result["correlationId"])
        # ORCH-09: compensation_pending row is now paired with dispatch_request at dispatch time.
        self.assertEqual(
            [hop["hop_type"] for hop in lineage],
            ["ingress", "route", "dispatch_request", "compensation_pending"],
        )

    def test_creates_pending_hil_decision_when_approval_required(self):
        result = self.engine.route_task(
            {
                "taskSummary": "Deploy a production change",
                "requiredCapability": "research",
                "agents": AGENTS,
                "correlationId": "corr-hil",
                "requiresApproval": True,
            }
        )

        self.assertEqual(result["status"], "waiting_for_approval")
        self.assertTrue(result["hilDecisionId"])
        pending = self.store.list_pending_hil()
        self.assertEqual(len(pending), 1)
        self.assertEqual(pending[0]["correlationId"], "corr-hil")
        self.assertEqual(pending[0]["status"], "pending")

    def test_approve_and_reject_resume_hil_decisions(self):
        result = self.engine.route_task(
            {
                "taskSummary": "Needs approval",
                "requiredCapability": "research",
                "agents": AGENTS,
                "correlationId": "corr-resume",
                "requiresApproval": True,
            }
        )

        approved = self.engine.resolve_hil(result["hilDecisionId"], "approve", "luis")
        self.assertEqual(approved["status"], "approved")
        self.assertEqual(approved["resumed"], True)
        self.assertEqual(self.store.list_pending_hil(), [])

        rejected_run = self.engine.route_task(
            {
                "taskSummary": "Reject this",
                "requiredCapability": "research",
                "agents": AGENTS,
                "correlationId": "corr-reject",
                "requiresApproval": True,
            }
        )
        rejected = self.engine.resolve_hil(rejected_run["hilDecisionId"], "reject", "luis")
        self.assertEqual(rejected["status"], "rejected")
        self.assertEqual(rejected["resumed"], False)

    def test_task_failure_retries_then_surfaces_pending_hil(self):
        result = self.engine.route_task(
            {
                "taskSummary": "Retry this dispatch",
                "requiredCapability": "research",
                "agents": AGENTS,
                "correlationId": "corr-retry",
            }
        )

        first = self.engine.record_task_failure(result["runId"], "timeout")
        self.assertEqual(first["status"], "retrying")
        self.assertEqual(first["attempts"], 1)
        self.assertEqual(first["remainingRetries"], 1)

        second = self.engine.record_task_failure(result["runId"], "timeout")
        self.assertEqual(second["status"], "waiting_for_approval")
        self.assertEqual(second["attempts"], 2)
        self.assertTrue(second["hilDecisionId"])
        self.assertEqual(self.store.list_pending_hil()[0]["correlationId"], "corr-retry")


    # HIL-03: Audit log records who edited a HIL task, which fields changed, and before/after values.
    # Tests that engine.record_state_edit() writes a hop_type="state_edit" row automatically.
    def test_state_edit_audit(self):
        # REQ: HIL-03
        result = self.engine.route_task(
            {
                "taskSummary": "Audit this edit",
                "requiredCapability": "research",
                "agents": AGENTS,
                "correlationId": "corr-state-edit",
                "requiresApproval": True,
            }
        )
        run_id = result["runId"]
        correlation_id = result["correlationId"]

        # engine.record_state_edit() does not exist yet (Wave 0 RED).
        # Once HIL-03 is implemented, calling this method must write a state_edit lineage row
        # with actor, before, and after in detail_json — without the caller doing it manually.
        self.engine.record_state_edit(
            run_id=run_id,
            correlation_id=correlation_id,
            actor="luis@epiloguecapital.com",
            patch={"taskSummary": "Audit this edit (corrected)"},
        )

        lineage = self.store.list_lineage(correlation_id)
        edit_rows = [r for r in lineage if r["hop_type"] == "state_edit"]
        self.assertEqual(len(edit_rows), 1, "Exactly one state_edit lineage row must exist")

        import json as _json
        detail = _json.loads(edit_rows[0]["detail_json"])
        self.assertIn("actor", detail, "state_edit detail must contain actor")
        self.assertIn("before", detail, "state_edit detail must contain before snapshot")
        self.assertIn("after", detail, "state_edit detail must contain after snapshot")

    # ORCH-09: Each forward action declares a paired compensating action stored as a
    # compensation_pending row in orchestration_lineage, updated to done/skipped on rollback.
    def test_compensation_row(self):
        # REQ: ORCH-09
        result = self.engine.route_task(
            {
                "taskSummary": "Compensation test task",
                "requiredCapability": "research",
                "agents": AGENTS,
                "correlationId": "corr-comp",
            }
        )
        run_id = result["runId"]
        correlation_id = result["correlationId"]

        # compensation_pending rows are not yet written by dispatch (Wave 0 RED).
        # This test asserts the required structure once ORCH-09 is implemented:
        # At dispatch time, a compensation_pending row must exist in lineage.
        lineage = self.store.list_lineage(correlation_id)
        comp_rows = [r for r in lineage if r["hop_type"] == "compensation_pending"]
        self.assertGreater(
            len(comp_rows),
            0,
            "A compensation_pending lineage row must be written at dispatch time (ORCH-09)",
        )

        import json as _json
        detail = _json.loads(comp_rows[0]["detail_json"])
        self.assertIn("forward_hop_id", detail, "compensation_pending must reference forward_hop_id")
        self.assertIn("compensation_verb", detail, "compensation_pending must declare compensation_verb")

    # ORCH-10: A2A task status reflects granular failure: "rolled_back" with non-null rollback_reason.
    # Tests that after retry exhaustion and rollback, orchestration_runs.status is "rolled_back".
    def test_rolled_back_status(self):
        # REQ: ORCH-10
        result = self.engine.route_task(
            {
                "taskSummary": "Rollback test task",
                "requiredCapability": "research",
                "agents": AGENTS,
                "correlationId": "corr-rollback",
            }
        )
        run_id = result["runId"]

        # Drive to retry exhaustion
        for _ in range(self.engine.retry_limit):
            self.engine.record_task_failure(run_id, "simulated_error")

        run = self.store.get_run(run_id)

        # "rolled_back" status and rollback_reason column are not set yet (Wave 0 RED).
        # Once ORCH-10 is implemented: status must be "rolled_back" and rollback_reason non-null.
        self.assertEqual(
            run["status"],
            "rolled_back",
            "After retry exhaustion and compensation, status must be 'rolled_back' (ORCH-10)",
        )
        self.assertIsNotNone(
            run.get("rollback_reason"),
            "rollback_reason must be non-null after rollback (ORCH-10)",
        )


if __name__ == "__main__":
    unittest.main()
