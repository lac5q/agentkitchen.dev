import os
import sqlite3
import tempfile
import unittest

from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from fastapi.testclient import TestClient
from app import app


AGENTS = [
    {
        "id": "graph-agent",
        "name": "Graph Agent",
        "status": "active",
        "protocol": "a2a",
        "capabilities": [{"id": "research", "name": "Research", "tags": ["research"]}],
    }
]


class OrchestrationAppTest(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.db_path = os.path.join(self.tmp.name, "orchestration.db")
        self.prev_db = os.environ.get("ORCHESTRATION_DB_PATH")
        os.environ["ORCHESTRATION_DB_PATH"] = self.db_path
        self.client = TestClient(app)

    def tearDown(self):
        if self.prev_db is None:
            os.environ.pop("ORCHESTRATION_DB_PATH", None)
        else:
            os.environ["ORCHESTRATION_DB_PATH"] = self.prev_db
        self.tmp.cleanup()

    def test_route_and_resolve_hil_uses_langgraph_checkpoint(self):
        response = self.client.post(
            "/tasks/route",
            json={
                "taskSummary": "Approve through graph",
                "requiredCapability": "research",
                "agents": AGENTS,
                "requiresApproval": True,
                "correlationId": "corr-app-graph",
            },
        )
        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertEqual(body["status"], "waiting_for_approval")
        self.assertEqual(body["graphState"]["status"], "waiting_for_approval")
        self.assertTrue(body["graphState"]["interrupts"])

        resolved = self.client.post(f"/hil/{body['hilDecisionId']}/resolve", json={"decision": "approve"})
        self.assertEqual(resolved.status_code, 200)
        resolved_body = resolved.json()
        self.assertEqual(resolved_body["status"], "approved")
        self.assertEqual(resolved_body["graphState"]["status"], "approved")

        with sqlite3.connect(self.db_path) as conn:
            tables = {row[0] for row in conn.execute("SELECT name FROM sqlite_master WHERE type = 'table'")}
        self.assertIn("checkpoints", tables)
        self.assertIn("orchestration_runs", tables)

    def test_reject_hil_also_resumes_langgraph_checkpoint(self):
        response = self.client.post(
            "/tasks/route",
            json={
                "taskSummary": "Reject through graph",
                "requiredCapability": "research",
                "agents": AGENTS,
                "requiresApproval": True,
                "correlationId": "corr-app-reject",
            },
        )
        body = response.json()

        rejected = self.client.post(f"/hil/{body['hilDecisionId']}/resolve", json={"decision": "reject"})

        self.assertEqual(rejected.status_code, 200)
        rejected_body = rejected.json()
        self.assertEqual(rejected_body["status"], "rejected")
        self.assertEqual(rejected_body["graphState"]["status"], "rejected")
        self.assertEqual(rejected_body["graphState"]["approvalDecision"], "reject")


if __name__ == "__main__":
    unittest.main()
