import os
import sqlite3
import tempfile
import unittest

from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from graph import LangGraphRuntime


class LangGraphRuntimeTest(unittest.TestCase):
    def test_interrupts_and_resumes_from_sqlite_checkpoint(self):
        with tempfile.TemporaryDirectory() as tmp:
            db_path = os.path.join(tmp, "orchestration.db")
            runtime = LangGraphRuntime(db_path)

            first = runtime.start(
                {
                    "runId": "run-graph-1",
                    "taskSummary": "Approve graph task",
                    "requiredCapability": "research",
                    "selectedAgentId": "agent-1",
                    "requiresApproval": True,
                }
            )

            self.assertEqual(first["status"], "waiting_for_approval")
            self.assertTrue(first["checkpointed"])
            self.assertTrue(first["interrupts"])

            resumed = runtime.resume("run-graph-1", "approve")

            self.assertEqual(resumed["status"], "approved")
            self.assertEqual(resumed["approvalDecision"], "approve")
            self.assertEqual(resumed["selectedAgentId"], "agent-1")

            with sqlite3.connect(db_path) as conn:
                tables = {
                    row[0]
                    for row in conn.execute("SELECT name FROM sqlite_master WHERE type = 'table'").fetchall()
                }
            self.assertIn("checkpoints", tables)
            self.assertIn("writes", tables)

    def test_routes_without_hil_through_stategraph(self):
        with tempfile.TemporaryDirectory() as tmp:
            runtime = LangGraphRuntime(os.path.join(tmp, "orchestration.db"))

            result = runtime.start(
                {
                    "runId": "run-graph-2",
                    "taskSummary": "Route graph task",
                    "selectedAgentId": "agent-2",
                    "requiresApproval": False,
                }
            )

            self.assertEqual(result["status"], "dispatched")
            self.assertEqual(result["selectedAgentId"], "agent-2")
            self.assertEqual(result["interrupts"], [])


if __name__ == "__main__":
    unittest.main()
