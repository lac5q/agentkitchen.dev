# Phase 97 Plan 01 Summary: Meeting Source Routing Contract

## Shipped

- Added `DEFAULT_MEETING_ROUTE_CONTRACTS` with Cordant routing signals for sparse meeting metadata.
- Added `inferMeetingRoute()` and `findMeetingRouteIssues()` to detect project misroutes from title/body evidence.
- Extended `check-knowledge-indexing` reports with `meetingRouteContracts` so captured-but-misfiled project meetings fail health checks.
- Added tests proving Cordant-looking meetings filed under `projects/general` are flagged.
- Removed the May 27, 2026 Cordant/Juan meeting duplicate from `projects/general` after promoting it to `projects/cordant`.
- Refreshed qmd so the global knowledge collection removed the bad duplicate and the Cordant collection retains the correct file.

## Verification

- `node --test scripts/check-knowledge-indexing.test.mjs` passed, 8/8.
- `QMD_FORCE_CPU=1 node scripts/check-knowledge-indexing.mjs --date=2026-05-27 --json` passed with `meetingRouteContracts.issues=[]`.
- `qmd search ... -c cordant` returns `qmd://cordant/meetings/2026-05-27-strategic-alignment-on-agentic-product-development.md` as the top result.
- Knowledge Spark ingestion helper tests passed, 11/11.
