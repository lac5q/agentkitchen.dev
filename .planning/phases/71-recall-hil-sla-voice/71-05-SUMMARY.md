---
phase: 71-recall-hil-sla-voice
plan: "05"
subsystem: voice-server
tags: [daily, pipecat, meeting-bot, transcripts, hive-actions, voice, sqlite]
dependency_graph:
  requires: []
  provides:
    - pipeline_daily.build_daily_pipeline
    - meeting_writer.MeetingWriter
    - meeting_bot (entrypoint)
  affects:
    - services/voice-server/requirements.txt
    - services/voice-server/tests/conftest.py
tech_stack:
  added:
    - pipecat-ai[daily]>=1.2,<2.0 (DailyTransport)
    - daily-python 0.28.1 (installed as pipecat-ai[daily] dep)
  patterns:
    - listener-only pipeline (no LLM/TTS/output)
    - per-speaker content prefix "[Speaker] text" for FTS5 searchability
    - fresh sqlite3 connection per write (WAL + busy_timeout discipline)
key_files:
  created:
    - services/voice-server/pipeline_daily.py
    - services/voice-server/meeting_writer.py
    - services/voice-server/meeting_bot.py
    - services/voice-server/tests/test_meeting_writer.py
    - services/voice-server/tests/test_pipeline_daily.py
  modified:
    - services/voice-server/requirements.txt
    - services/voice-server/tests/conftest.py
decisions:
  - D-10: pipecat-ai upgraded to >=1.2,<2.0 with [daily] extra confirmed on pypi
  - D-11: listener-only pipeline enforced — no LLM, no TTS, no transport.output()
  - D-12: per-speaker utterances to messages; highlights to hive_actions (action_type=checkpoint)
  - D-13: room_url/token passed only into DailyTransport constructor, not retained on returned objects
metrics:
  duration: "~20 minutes"
  completed: "2026-05-21"
  tasks_completed: 4
  files_created: 5
  files_modified: 2
  tests_added: 12
  tests_passing: 36
---

# Phase 71 Plan 05: Daily.co Meeting Bot — DailyTransport Pipeline + Per-Speaker Transcripts Summary

**One-liner:** DailyTransport listener pipeline (pipecat 1.2.1) writes per-speaker utterances to `messages` and meeting highlights to `hive_actions` without persisting room URL/token anywhere.

## What Was Built

A complete Daily.co meeting bot foundation for the voice server:

- **`pipeline_daily.py`** — `build_daily_pipeline(room_url, token, session_id)` creates a listener-only Pipecat pipeline: `DailyTransport.input()` → STT → `TranscriptProcessor.user()`. No LLM, no TTS, no audio output (D-11).
- **`meeting_writer.py`** — `MeetingWriter(db_path, session_id)` with `write_utterance(speaker, content)` (writes `[Speaker] text` to `messages`) and `write_highlight(summary)` (writes to `hive_actions` with `action_type='checkpoint'`). Mirrors `TranscriptWriter` connection discipline (D-12).
- **`meeting_bot.py`** — async entrypoint reading `DAILY_ROOM_URL` / `DAILY_TOKEN` from env, generating a `session_id` (uuid4), and running the pipeline via `PipelineRunner`. Logs session_id only, never the room URL or token (D-13).
- **`requirements.txt`** — upgraded from `pipecat-ai[...]==1.0.0` to `pipecat-ai[daily,...]>=1.2,<2.0` (D-10).
- **`tests/conftest.py`** — extended with `pipecat.transports.daily` and `pipecat.transports.daily.transport` mocks (`_FakeDailyTransport` with `input()`/`output()`, `_FakeDailyParams`).
- **12 new tests** across `test_meeting_writer.py` (6) and `test_pipeline_daily.py` (6), all green.

## Test Results

```
36 passed — tests/test_fallback_tts.py (8), tests/test_health.py (5),
             tests/test_meeting_writer.py (6), tests/test_pipeline_daily.py (6),
             tests/test_pipeline_gemini.py (5), tests/test_transcript_writer.py (6)
```

No regressions from the pipecat 1.0.0 → 1.2.1 upgrade. The existing mocks in `conftest.py` covered all pre-existing test paths without modification.

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| 1 (RED) | d84cf21 | test(71-05): RED scaffolds — Daily mock + failing tests |
| 2 (GREEN) | 1fe6b18 | feat(71-05): MeetingWriter — per-speaker transcripts + highlights |
| 3 (GREEN) | ae218dc | feat(71-05): Daily.co listener pipeline + meeting bot entrypoint |
| 4 (verify) | — | No commit needed — all 36 tests pass, no conftest changes required |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed test assertions using `.name` attribute on MagicMock elements**
- **Found during:** Task 3 GREEN verification
- **Issue:** `test_pipeline_daily.py` used `el.name` to inspect pipeline elements. MagicMock's `.name` attribute returns another MagicMock (not a string), so `.lower()` / `in` comparisons always returned False.
- **Fix:** Changed all element-inspection assertions to use `repr(el)`, which includes the descriptive name set in `_FakeDailyTransport.input()` / `transcript_proc.user()`.
- **Files modified:** `services/voice-server/tests/test_pipeline_daily.py`
- **Commit:** ae218dc

## Security Validation (D-13)

- `pipeline_daily.py`: `room_url` and `token` are passed to `DailyTransport(room_url, token, params=params)` and then fall out of scope — no local variable assignment, no module global, no attribute on the returned `Pipeline`.
- `meeting_bot.py`: `logger.info("...", session_id)` only — no `room_url` or `token` in any log statement.
- `test_pipeline_daily.py` includes `test_room_url_not_on_returned_pipeline` and `test_token_not_on_returned_pipeline` that assert no string attribute on the pipeline equals the fake credentials.
- Grep confirms: `grep -r "room_url\|DAILY_TOKEN\|DAILY_ROOM_URL" services/voice-server/meeting_bot.py` shows only variable names (never passed to logger).

## Known Stubs

None. All data paths are wired: `DailyTransport` → STT → `TranscriptProcessor` → `MeetingWriter` → SQLite.

## Threat Flags

No new security-relevant surface beyond what the plan's threat model covers. The `meeting_bot.py` entrypoint reads `DAILY_ROOM_URL` / `DAILY_TOKEN` from environment only (not from HTTP requests or shared memory) — within the env/CLI trust boundary already modeled in T-71-15.

## Self-Check: PASSED

| Item | Status |
|------|--------|
| services/voice-server/pipeline_daily.py | FOUND |
| services/voice-server/meeting_writer.py | FOUND |
| services/voice-server/meeting_bot.py | FOUND |
| services/voice-server/tests/test_meeting_writer.py | FOUND |
| services/voice-server/tests/test_pipeline_daily.py | FOUND |
| commit d84cf21 | FOUND |
| commit 1fe6b18 | FOUND |
| commit ae218dc | FOUND |
