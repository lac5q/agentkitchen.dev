"""
voice-server/meeting_bot.py

Meeting bot entrypoint for Daily.co rooms (VOICE-06, VOICE-07, VOICE-08).

Reads room URL and join token from environment variables, joins the room via
DailyTransport as a listener, and writes per-speaker transcripts to the
shared conversations.db.

Security (D-13): only the session_id (uuid4) is logged — the room URL and
join token are never written to logs, audit records, or any persisted store.

Usage:
    DAILY_ROOM_URL=https://example.daily.co/room \
    DAILY_TOKEN=<join-token> \
    SQLITE_DB_PATH=/path/to/conversations.db \
    python services/voice-server/meeting_bot.py

Or pass room_url and token as CLI positional args:
    python services/voice-server/meeting_bot.py <room_url> <token>
"""
import asyncio
import logging
import os
import sys
import uuid

from dotenv import load_dotenv

from pipecat.pipeline.task import PipelineTask, PipelineParams
from pipecat.pipeline.runner import PipelineRunner

from pipeline_daily import build_daily_pipeline

load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
)
logger = logging.getLogger("meeting_bot")


async def run_meeting_bot(room_url: str, token: str) -> None:
    """
    Join a Daily.co room as a listener and write transcripts.

    Args:
        room_url: Daily.co room URL (secret — never logged)
        token:    Daily.co join token (secret — never logged)
    """
    session_id = str(uuid.uuid4())
    # D-13: log only the session_id, never the room URL or token
    logger.info("Meeting bot starting | session_id=%s", session_id)

    pipeline = build_daily_pipeline(room_url, token, session_id)
    task = PipelineTask(pipeline, params=PipelineParams(enable_metrics=False))
    runner = PipelineRunner(handle_sigint=True)

    logger.info("Joining meeting | session_id=%s", session_id)
    await runner.run(task)
    logger.info("Meeting bot finished | session_id=%s", session_id)


def _get_credentials() -> tuple[str, str]:
    """
    Resolve room URL and token from CLI args or environment variables.

    Returns:
        (room_url, token) tuple

    Raises:
        SystemExit if credentials are unavailable.
    """
    if len(sys.argv) >= 3:
        return sys.argv[1], sys.argv[2]

    room_url = os.getenv("DAILY_ROOM_URL", "")
    token = os.getenv("DAILY_TOKEN", "")

    if not room_url or not token:
        logger.error(
            "Missing credentials. Set DAILY_ROOM_URL and DAILY_TOKEN env vars, "
            "or pass them as positional arguments."
        )
        sys.exit(1)

    return room_url, token


if __name__ == "__main__":
    room_url, token = _get_credentials()
    asyncio.run(run_meeting_bot(room_url, token))
