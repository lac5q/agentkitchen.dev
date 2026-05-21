"""
voice-server/meeting_writer.py

Per-speaker transcript + meeting highlight persistence for the Daily.co meeting bot.

Per D-12 and D-13:
- write_utterance: inserts per-speaker rows to `messages` (agent_id='voice',
  project='memroos', role='user'). Speaker identity is prefixed into content
  as "[Speaker] text" so FTS5 indexes it for /api/recall.
- write_highlight: inserts meeting-significant moments to `hive_actions`
  (agent_id='voice', action_type='checkpoint').

Connection discipline mirrors TranscriptWriter (VOICE-04):
- Fresh sqlite3.connect per write (no persistent connection across processes)
- PRAGMA journal_mode=WAL and PRAGMA busy_timeout=5000 on every connection
- INSERT OR IGNORE for idempotency on duplicate request_id
"""
import sqlite3
import uuid
from datetime import datetime, timezone


class MeetingWriter:
    """Writes meeting transcript rows and highlights to SQLite."""

    def __init__(self, db_path: str, session_id: str) -> None:
        self.db_path = db_path
        self.session_id = session_id

    def write_utterance(self, speaker: str, content: str) -> None:
        """
        Insert a per-speaker utterance row into the messages table.

        Speaker identity is captured by prefixing content with "[Speaker] " so
        the FTS5 index (messages_fts) makes it searchable via /api/recall.
        Each call generates a fresh request_id (uuid4) ensuring distinct rows
        even for repeated utterances from the same speaker.

        Args:
            speaker: participant display name / ID from Daily participant metadata
            content: the transcript text of the utterance
        """
        tagged_content = f"[{speaker}] {content}"
        with sqlite3.connect(self.db_path, timeout=5.0) as conn:
            conn.execute("PRAGMA journal_mode=WAL")
            conn.execute("PRAGMA busy_timeout=5000")
            conn.execute(
                """INSERT OR IGNORE INTO messages
                   (session_id, project, agent_id, role, content, timestamp, request_id)
                   VALUES (?, 'memroos', 'voice', 'user', ?, ?, ?)""",
                (
                    self.session_id,
                    tagged_content,
                    datetime.now(timezone.utc).isoformat(),
                    str(uuid.uuid4()),
                ),
            )

    def write_highlight(self, summary: str) -> None:
        """
        Insert a meeting highlight row into the hive_actions table.

        Meeting highlights are 'checkpoint'-class signals (D-12): significant
        moments that should surface in the meeting memory for future recall.

        Args:
            summary: human-readable description of the meeting highlight
        """
        with sqlite3.connect(self.db_path, timeout=5.0) as conn:
            conn.execute("PRAGMA journal_mode=WAL")
            conn.execute("PRAGMA busy_timeout=5000")
            conn.execute(
                """INSERT INTO hive_actions
                   (agent_id, action_type, summary, session_id, timestamp)
                   VALUES ('voice', 'checkpoint', ?, ?, ?)""",
                (
                    summary,
                    self.session_id,
                    datetime.now(timezone.utc).isoformat(),
                ),
            )
