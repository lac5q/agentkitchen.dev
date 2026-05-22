# App-wide Operational Performance Audit — 2026-05-21

Triggered by operator review of `/`, `/ledger`, and `/business-ops`.

## Standard

Any page that shows performance, usage, health, cost, quality, outcomes, failures, or operational status must expose:

- Date range or time-window control.
- Source/provenance state: live, empty, unavailable, fixture, or failed.
- Over-time view when the backing data supports buckets.
- Loading and error states that name the failing source or API.
- Functional controls only: navigation, local state mutation, real API call, or explicit missing-backend explanation.

## Route Inventory

| Route | Current Read | Follow-up |
| --- | --- | --- |
| `/` | NOC header now has date/workspace/export controls; embedded Engage removed; several panels still use `noc-mock-data`. | Complete `NOC-01..14` with unified live data contract and window propagation. |
| `/ledger` | Date range added for model mix/trends; RTK token stats source status now explicit. | Add ranged RTK stats when RTK exposes them; audit blank/slow model-routing panels. |
| `/business-ops` | Date range added; timeline errors name `/api/evals/history`; adapter status uses `/api/l3/events?since/until`. | Add adapter poll freshness/errors and real Salesforce/Zendesk/NetSuite adapters. |
| `/library`, `/cookbooks` | Already use `TimeSeriesChart` windows. | Add page-level source state and route-level mock/fixture review. |
| `/agents`, `/dispatch`, `/skills`, `/seal`, `/apo`, `/audit`, `/flow`, `/notebooks`, `/meetings`, `/escalations`, `/team` | Interactive controls exist, but this pass did not browser-verify every button or source state. | Covered by `OPS-AUDIT-01..04`; each route needs dead-control and date-window audit before v4.1 close. |
| `/agent-autogen`, `/memory-autogen` | Autogen/evolution surfaces likely need proposal history over time. | Add date-windowed proposal/run history or explicit backend-missing state. |
| `/login`, `/register` | Not performance pages. | Exempt except for auth error/loading UX. |

## Corrective Pass — 2026-05-21 16:45 PT

Closed in this pass:

- Global top-bar search now accepts input and routes to `/notebooks?q=...`.
- `/notebooks` reads the URL query and runs multi-tier memory search on load.
- Workflow Map no longer exposes a second `Engage` action; node actions route to the owning page or APO.
- Orchestration HIL moved out of Workflow Map and into `/dispatch` with the Engage surface.
- Engage roster prioritizes primary/common agents, shows runtime/model hints, and hides Paperclip support agents behind an explicit subsection.
- Engage diagnostics default to primary agents only; Paperclip is tested only when selected/opened.
- Direct Engage chat browser-tested locally; provider quota failure falls back to local agent context instead of surfacing as a dead UI turn.
- NOC activity heatmap SVG now scales to the full panel width, so the 13:00-24:00 axis is not visually blank from fixed-width clipping.
- Remaining Operations NOC panels no longer import `noc-mock-data`; they now read live hooks (`/api/hive`, `/api/memory-stats`, `/api/time-series`, `/api/skills`, `/api/security/report`, `/api/escalations`, `/api/model-routing/telemetry`, `/api/audit-log`) or render explicit blocked/empty source states.
- Operations header copy now says live telemetry with explicit gaps instead of sample-backed preview language.
- Ledger RTK source loading now disables React Query retries and caps `rtk gain` timeout via `RTK_STATS_TIMEOUT_MS` (default 1500ms), so an unavailable/slow RTK source fails fast with source status instead of repeatedly delaying the page.
- Business Ops adapter status now labels non-live Salesforce/Zendesk/NetSuite as `not wired`, not fixture.

Still open for the comprehensive no-mock-data standard:

- Route-by-route button audit still needs to cover `/apo`, `/seal`, `/skills`, `/agents`, `/audit`, `/escalations`, `/meetings`, `/agent-autogen`, and `/memory-autogen` with browser evidence.
- Ledger ranged token stats are still limited by RTK cumulative source shape.

## Mock Data Hotspots

Production NOC components importing `noc-mock-data`: none.

Remaining `fixture/mock/sample` strings in `apps/memroos/src/app` and `apps/memroos/src/components` are test fixtures or explicit adapter implementation flags (`mock: false`) rather than live UI sample data.
