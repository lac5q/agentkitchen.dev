"""
voice-server/tests/test_pipeline_daily.py

Tests for pipeline_daily.py — Daily.co listener pipeline builder.

Expected to FAIL (RED) before pipeline_daily.py is implemented.
Security constraint D-13: room URL and join token MUST NOT be stored on any
returned object attribute that a caller could read back.
"""
import pytest
from unittest.mock import MagicMock

# conftest registers all pipecat mocks before this import
from tests.conftest import _FakeDailyTransport, _FakePipeline
from pipeline_daily import build_daily_pipeline


FAKE_ROOM_URL = "https://example.daily.co/test-room"
FAKE_TOKEN = "supersecret-join-token"
FAKE_SESSION_ID = "7f3e2a1b-0000-0000-0000-000000000001"


class TestBuildDailyPipeline:
    def test_returns_pipeline_object(self, in_memory_db, monkeypatch):
        """build_daily_pipeline returns a Pipeline object."""
        monkeypatch.setenv("SQLITE_DB_PATH", in_memory_db)
        pipeline = build_daily_pipeline(FAKE_ROOM_URL, FAKE_TOKEN, FAKE_SESSION_ID)
        assert pipeline is not None
        assert hasattr(pipeline, "elements")

    def test_first_element_is_daily_transport_input(self, in_memory_db, monkeypatch):
        """Pipeline starts with a DailyTransport.input() element (D-11 listener)."""
        monkeypatch.setenv("SQLITE_DB_PATH", in_memory_db)
        pipeline = build_daily_pipeline(FAKE_ROOM_URL, FAKE_TOKEN, FAKE_SESSION_ID)
        # The first element should be the mock returned by DailyTransport.input()
        first_el = pipeline.elements[0]
        # Check that it was produced by a DailyTransport instance
        assert first_el is not None
        # Its name should indicate daily transport input
        assert "daily_transport" in str(first_el).lower() or first_el.name == "daily_transport.input()"

    def test_pipeline_has_no_audio_output(self, in_memory_db, monkeypatch):
        """Listener-only: no transport.output() audio element (D-11)."""
        monkeypatch.setenv("SQLITE_DB_PATH", in_memory_db)
        pipeline = build_daily_pipeline(FAKE_ROOM_URL, FAKE_TOKEN, FAKE_SESSION_ID)
        # transport.output() mock has name "daily_transport.output()"
        output_names = [getattr(el, "name", "") for el in pipeline.elements]
        assert not any("output" in n for n in output_names), (
            "Listener pipeline must not contain transport.output() (D-11)"
        )

    def test_room_url_not_on_returned_pipeline(self, in_memory_db, monkeypatch):
        """D-13: room URL must not appear on any returned pipeline attribute."""
        monkeypatch.setenv("SQLITE_DB_PATH", in_memory_db)
        pipeline = build_daily_pipeline(FAKE_ROOM_URL, FAKE_TOKEN, FAKE_SESSION_ID)
        # Check all public attributes of the pipeline object itself
        for attr_name in dir(pipeline):
            if attr_name.startswith("_"):
                continue
            try:
                val = getattr(pipeline, attr_name)
            except Exception:
                continue
            if isinstance(val, str):
                assert FAKE_ROOM_URL not in val, (
                    f"D-13 violation: room_url found in pipeline.{attr_name}"
                )

    def test_token_not_on_returned_pipeline(self, in_memory_db, monkeypatch):
        """D-13: join token must not appear on any returned pipeline attribute."""
        monkeypatch.setenv("SQLITE_DB_PATH", in_memory_db)
        pipeline = build_daily_pipeline(FAKE_ROOM_URL, FAKE_TOKEN, FAKE_SESSION_ID)
        for attr_name in dir(pipeline):
            if attr_name.startswith("_"):
                continue
            try:
                val = getattr(pipeline, attr_name)
            except Exception:
                continue
            if isinstance(val, str):
                assert FAKE_TOKEN not in val, (
                    f"D-13 violation: token found in pipeline.{attr_name}"
                )

    def test_pipeline_contains_transcript_processor(self, in_memory_db, monkeypatch):
        """Pipeline includes a TranscriptProcessor element for speech-to-text routing."""
        monkeypatch.setenv("SQLITE_DB_PATH", in_memory_db)
        pipeline = build_daily_pipeline(FAKE_ROOM_URL, FAKE_TOKEN, FAKE_SESSION_ID)
        # TranscriptProcessor.user() mock name contains "transcript_proc"
        names = [getattr(el, "name", "") for el in pipeline.elements]
        assert any("transcript" in n.lower() for n in names), (
            "Pipeline must include a TranscriptProcessor user() element"
        )
