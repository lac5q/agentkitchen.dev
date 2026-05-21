"""
voice-server/pipeline_daily.py

Daily.co listener pipeline builder (VOICE-06, D-11).

The bot joins a Daily.co room as a passive listener — it ingests audio and
writes per-speaker transcripts, but has NO TTS/LLM reply capability and
produces NO audio output into the room.

Pipeline order:
    transport.input()
    -> STT (GroqSTT or WhisperMLX)
    -> transcript_proc.user()

Security (D-13): room_url and token are passed into the DailyTransport
constructor and then go out of scope. They are NEVER stored on the returned
Pipeline object or on any module-level variable.
"""
import os
import logging

from pipecat.transports.daily.transport import DailyTransport, DailyParams
from pipecat.pipeline.pipeline import Pipeline
from pipecat.processors.transcript_processor import TranscriptProcessor

from pipeline_cascade import build_stt
from meeting_writer import MeetingWriter

logger = logging.getLogger(__name__)


def build_daily_pipeline(room_url: str, token: str, session_id: str) -> Pipeline:
    """
    Build a listener-only Pipecat pipeline that joins a Daily.co room.

    Args:
        room_url:   Daily.co room URL (secret — not stored after this call)
        token:      Daily.co join token (secret — not stored after this call)
        session_id: UUID string for the meeting session (used for DB writes and logs)

    Returns:
        Pipeline — a listener-only pipeline. Neither room_url nor token
        appear on any attribute of the returned object (D-13).
    """
    # D-11: listener-only params — audio in enabled, audio/TTS out disabled
    params = DailyParams(
        audio_in_enabled=True,
        audio_out_enabled=False,
    )
    # room_url and token pass into DailyTransport constructor only;
    # they are NOT assigned to any local or module variable after this line
    transport = DailyTransport(room_url, token, params=params)

    stt = build_stt()

    # Wire TranscriptProcessor → MeetingWriter for per-speaker attribution
    proc = TranscriptProcessor()
    writer = MeetingWriter(
        db_path=os.getenv("SQLITE_DB_PATH", "data/conversations.db"),
        session_id=session_id,
    )

    @proc.event_handler("on_transcript_update")
    async def on_update(processor, frame, direction):
        # Derive speaker from participant metadata — try user_id, then speaker,
        # then participant_id as fallback (Pipecat 1.2.x TranscriptionFrame fields)
        speaker = (
            getattr(frame, "user_id", None)
            or getattr(frame, "speaker", None)
            or getattr(frame, "participant_id", None)
            or "unknown"
        )
        text = getattr(frame, "content", None) or getattr(frame, "text", "")
        if text.strip():
            writer.write_utterance(speaker=speaker, content=text)

    # Listener-only pipeline: input -> STT -> transcript
    # NO LLM, NO TTS, NO transport.output() — D-11
    return Pipeline([
        transport.input(),
        stt,
        proc.user(),
    ])
