"""
voice-server/tests/test_meeting_writer.py

Tests for MeetingWriter — per-speaker transcript persistence and highlight
writing. These tests use the in_memory_db fixture (temp file SQLite) which
has the messages table pre-created. The hive_actions table is created inline.

Expected to FAIL (RED) before meeting_writer.py is implemented.
"""
import sqlite3
import pytest

# conftest registers all pipecat mocks before this import
from meeting_writer import MeetingWriter


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _add_hive_actions_table(db_path: str) -> None:
    """Create hive_actions table in the temp DB (mirrors db-schema.ts DDL)."""
    with sqlite3.connect(db_path) as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS hive_actions (
                id          INTEGER PRIMARY KEY,
                agent_id    TEXT    NOT NULL,
                action_type TEXT    NOT NULL
                            CHECK(action_type IN
                                  ('continue','loop','checkpoint','trigger','stop','error')),
                summary     TEXT    NOT NULL,
                artifacts   TEXT,
                session_id  TEXT,
                timestamp   TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
            )
        """)
        conn.commit()


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------

class TestWriteUtterance:
    def test_inserts_messages_row(self, in_memory_db):
        """write_utterance inserts a row with correct agent_id and project."""
        writer = MeetingWriter(in_memory_db, "session-abc")
        writer.write_utterance("Alice", "Hello everyone")

        with sqlite3.connect(in_memory_db) as conn:
            rows = conn.execute(
                "SELECT agent_id, project, role FROM messages WHERE session_id='session-abc'"
            ).fetchall()

        assert len(rows) == 1
        agent_id, project, role = rows[0]
        assert agent_id == "voice"
        assert project == "memroos"
        assert role == "user"

    def test_speaker_identity_in_content(self, in_memory_db):
        """Speaker identity is captured in the content field."""
        writer = MeetingWriter(in_memory_db, "session-abc")
        writer.write_utterance("Bob", "The quarterly numbers look good")

        with sqlite3.connect(in_memory_db) as conn:
            content = conn.execute(
                "SELECT content FROM messages WHERE session_id='session-abc'"
            ).fetchone()[0]

        assert "Bob" in content
        assert "quarterly numbers" in content

    def test_distinct_speakers_produce_distinct_rows(self, in_memory_db):
        """Two utterances from different speakers produce two distinct rows."""
        writer = MeetingWriter(in_memory_db, "session-multi")
        writer.write_utterance("Alice", "Good morning")
        writer.write_utterance("Bob", "Good morning to you too")

        with sqlite3.connect(in_memory_db) as conn:
            rows = conn.execute(
                "SELECT content FROM messages WHERE session_id='session-multi'"
            ).fetchall()

        assert len(rows) == 2
        contents = [r[0] for r in rows]
        # Each row should contain the respective speaker label
        assert any("Alice" in c for c in contents)
        assert any("Bob" in c for c in contents)

    def test_unique_request_ids(self, in_memory_db):
        """Each write gets a fresh unique request_id (UNIQUE constraint compliance)."""
        writer = MeetingWriter(in_memory_db, "session-uuid")
        writer.write_utterance("Alice", "First")
        writer.write_utterance("Alice", "Second")

        with sqlite3.connect(in_memory_db) as conn:
            request_ids = conn.execute(
                "SELECT request_id FROM messages WHERE session_id='session-uuid'"
            ).fetchall()

        ids = [r[0] for r in request_ids]
        assert len(ids) == 2
        assert ids[0] != ids[1]


class TestWriteHighlight:
    def test_inserts_hive_actions_row(self, in_memory_db):
        """write_highlight inserts a hive_actions row with correct fields."""
        _add_hive_actions_table(in_memory_db)
        writer = MeetingWriter(in_memory_db, "session-hl")
        writer.write_highlight("Q3 revenue is up 12%")

        with sqlite3.connect(in_memory_db) as conn:
            rows = conn.execute(
                "SELECT agent_id, action_type, summary, session_id FROM hive_actions"
            ).fetchall()

        assert len(rows) == 1
        agent_id, action_type, summary, session_id = rows[0]
        assert agent_id == "voice"
        assert action_type == "checkpoint"
        assert "Q3 revenue" in summary
        assert session_id == "session-hl"

    def test_highlight_action_type_is_checkpoint(self, in_memory_db):
        """Meeting highlights use action_type='checkpoint' as per D-12."""
        _add_hive_actions_table(in_memory_db)
        writer = MeetingWriter(in_memory_db, "session-hl2")
        writer.write_highlight("Budget approved for next quarter")

        with sqlite3.connect(in_memory_db) as conn:
            action_type = conn.execute(
                "SELECT action_type FROM hive_actions WHERE session_id='session-hl2'"
            ).fetchone()[0]

        assert action_type == "checkpoint"
