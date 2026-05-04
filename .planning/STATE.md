---
gsd_state_version: 1.0
milestone: v1.7
milestone_name: Progressive Tool Gateway Runtime
status: in_progress
stopped_at: Phase 33 complete — gateway hardening shipped; lint exits 0, pytest 18 tests pass, category field live
last_updated: "2026-05-04T00:00:00Z"
last_activity: 2026-05-04
progress:
  total_phases: 5
  completed_phases: 4
  total_plans: 9
  completed_plans: 9
  percent: 85
---

# State: Agent Kitchen

## Project Reference

See: .planning/PROJECT.md (updated 2026-05-01 for v1.7)

**Core value:** Every agent and knowledge system is visible, connected, and self-improving.
**Current focus:** v1.7 progressive tool gateway runtime

## Current Position

Phase: 33 (gateway-hardening) — COMPLETE
Plan: 1 of 1 complete
Status: Lint exits 0, NFT warning documented, pytest coverage 18 tests, category field in tool_discover
Last activity: 2026-05-04

Progress: [████████--] 85%

## Performance Metrics

**Velocity:**

- Total plans completed: 0
- Average duration: —
- Total execution time: —

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| — | — | — | — |
| Phase 21 P02 | 25 | 2 tasks | 7 files |
| Phase 24-security-audit P02 | 12m | 2 tasks | 4 files |
| Phase 25 P01 | 6m | 2 tasks | 6 files |
| Phase 25-usage-analytics P02 | 12m | 2 tasks | 8 files |
| Phase 22-voice-server P02 | 525602 | 2 tasks | 8 files |

## Accumulated Context

### Decisions

- Production runs on port 3002 via `npm start -- --port 3002`; kill existing: `lsof -ti :3002 | xargs kill -9`
- After any build change: rebuild with `npm run build` then restart
- **Vector store architecture (CRITICAL):** QMD handles BM25/lexical only. ALL vector/semantic search uses Qdrant Cloud. `qmd embed` is FORBIDDEN.
- **Security:** No `execSync`/`exec` — use `execFileSync` or pure `fs/promises` only
- **mem0 writes:** Only via `POST http://localhost:3201/memory/add` — never touch `agent_memory` Qdrant directly
- **Group children:** Use `parentId` + `extent:'parent'` pattern (Phase 17 — already in codebase)
- [v1.5 roadmap]: DASH requirements woven into feature phases — DASH-01→P19, DASH-02→P20, DASH-03→P21, DASH-04→P22
- [v1.5 roadmap]: Voice (Phase 22) depends on Phase 19 (SQLDB) for transcript storage, not on Phase 21 (PAPER) — parallel track
- [v1.5 roadmap]: Security (Phase 24) depends on Phase 20 (HIVE) — audit log needs hive_mind table established first
- [v1.5 roadmap]: SQLite DB = single shared file; all tables (hive_mind, memories, audit_log, warroom_transcript) in one DB
- [Phase 21]: group-paperclip placed below main request path at y=560; dynamic group width prevents overflow
- [Phase 21]: PaperclipFleetPanel conditional render in NodeDetailPanel: only when nodeId==='manager'
- [Phase 24-security-audit]: useAuditLog uses queryKey ['audit-log', limit] to support multiple limit values simultaneously
- [Phase 24-security-audit]: AuditLogPanel severity DEFAULT_COLOR falls back to slate for unknown severity values
- [Phase 25]: SQLite datetime expressions embedded in SQL (not bound parameters) for window boundaries — hardcoded allowlist constants, not user input
- [Phase 25]: TimeSeriesMetric and TimeSeriesWindow exported as named types from api-client.ts for Plan 02 component reuse
- [Phase 25-usage-analytics]: Window toggle state lives in analytics panel (not shared chart) — all charts share one toggle via coordinated state lift
- [Phase 25-usage-analytics]: TimeSeriesChart is pure presentational — receives data as props, no hook calls inside
- [Phase 22-voice-server]: agent_id-only recall uses direct SELECT on messages table (not FTS) to support transcript retrieval without keyword search
- [Phase 22-voice-server]: VoicePanel scrollIntoView guarded with typeof check for jsdom compatibility
- [v1.6 roadmap]: Keep private Knowledge Hub content outside this repo; import only service/runtime code needed for MCP.
- [Phase 26]: Root scripts delegate to `apps/kitchen`; runtime data stays rooted under `data/`.
- [Phase 27]: Tool Attention is a progressive discovery layer, not a blanket runtime dependency on `mcp-agent`.
- [Phase 28]: CI validates the monorepo layout with Kitchen tests/build and Python service smoke tests.
- [Phase 29]: Knowledge MCP exposes top-level `tool_*` gateway tools while keeping the `tool-attention` workspace route intact.
- [Phase 30 Plan 01]: Outcome summaries count uses/successes/failures/score by capability and do not expose private task text.
- [Phase 32]: contextMatchSignal multipliers: task_type×2, repo×2, agent_id×1, tags×1. overallScore = textMatchScore*10 + outcomeSummary.score + contextMatchScore*3. task field NEVER read.
- [Phase 33 OPSGW-02]: NFT warning is structural — turbopack.root covers full monorepo + process.env.HOME = full-project trace. Isolated with code comment only.

### Pending Todos

None.

### Blockers/Concerns

- Voice server is a standalone Python Pipecat service — not embedded in Next.js; requires separate process management
- Production build has a non-blocking Turbopack NFT warning involving `/api/apo` — documented in code comment (OPSGW-02), non-resolvable without moving APO storage to a static subfolder.

## Session Continuity

Last session: 2026-05-04T00:00:00.000Z
Stopped at: Phase 33 gateway hardening complete; all commits pushed
Resume file: None
Next action: Phase 31 UI gateway operations view (UIGW-01/02/03) or next milestone planning
