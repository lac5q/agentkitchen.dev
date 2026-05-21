---
phase: 73-operator-ui-truth-phase-parity
plan: "01"
subsystem: operations-ui, orchestration-ui, gsd
tags: [ui-parity, hil, noc, gsd, tdd]

provides:
  - Phase 70 HIL edit UI mounted in the live orchestration approval panel
  - Operations NOC header truth state changed from live/fresh to telemetry preview/live wiring pending
  - Efficiency signals changed from sample metrics to a missing-telemetry checklist
  - Phase-close UI representation validator for completed summaries
  - `.planning/GOAL.md` done definition requiring explicit operator representation decisions

affects:
  - apps/memroos/src/components/orchestration/orchestration-hil-panel.tsx
  - apps/memroos/src/components/orchestration/__tests__/hil-panel.test.tsx
  - apps/memroos/src/components/operations/noc-header.tsx
  - apps/memroos/src/components/operations/efficiency-signals.tsx
  - apps/memroos/src/components/operations/__tests__/efficiency-signals.test.tsx
  - apps/memroos/src/components/operations/__tests__/operations-noc.test.tsx
  - apps/memroos/src/lib/gsd/phase-ui-representation.ts
  - apps/memroos/src/lib/gsd/__tests__/phase-ui-representation.test.ts
  - .planning/GOAL.md

requirements-completed: [UI-PARITY-01, UI-PARITY-02, UI-PARITY-03, UI-PARITY-04, UI-PARITY-05]
ui_representation: visible_ui
ui_representation_note: Phase 73 is visible in the Flow HIL approval panel, Operations NOC truth states, and GSD phase-close contract.

completed: 2026-05-21T21:45:00Z
---

# Phase 73 Plan 01: Operator UI Truth And Phase Parity Summary

Phase 73 closes the v4.0 operator-truth gap without pretending the larger NOC real-data backlog is done.

## Accomplishments

- Mounted `HilEditPanel` inside `OrchestrationHilPanel`, so a pending HIL approval now exposes edit, validation, changed-field summary, approve, and reject from the same live surface.
- Replaced the efficiency sample metrics with a missing-telemetry checklist for retrieval calls before useful work, same-source re-read count, raw-context ingest token share, operator re-ask redundancy, and rediscovered-fact rate.
- Changed the NOC header from `Operations · live` and `refreshed 14s ago` to `Operations · telemetry preview` and `live wiring pending`.
- Added `validatePhaseUiRepresentation()` to enforce a phase-close representation decision: visible UI, existing UI provenance, API/backend-only, or follow-up required.
- Updated `.planning/GOAL.md` so every completed requirement must declare its operator representation before close.

## Verification

- `npm --prefix apps/memroos run test -- src/components/orchestration/__tests__/hil-panel.test.tsx src/components/orchestration/__tests__/HilEditPanel.test.tsx src/components/operations/__tests__/efficiency-signals.test.tsx src/components/operations/__tests__/operations-noc.test.tsx src/lib/gsd/__tests__/phase-ui-representation.test.ts` — 5 files, 10 tests passed.
- `npm run typecheck` — passed.
- `npm run build` — passed with pre-existing Turbopack NFT tracing warnings around `next.config.ts`.
- Authenticated browser smoke on fresh production server `http://127.0.0.1:3003`:
  - `/` rendered the Operations NOC and verified `Efficiency signals` plus `missing telemetry`.
  - `/flow` rendered the workflow/orchestration surface.
  - Screenshots: `/tmp/memroos-phase73-root.png`, `/tmp/memroos-phase73-flow.png`.

## Residual Debt

- NOC-01..11 remain the broader real-data wiring backlog. Phase 73 made the current visible surface honest; it did not claim all NOC panels are backed by live telemetry.
- The phase-close validator is local library coverage plus planning contract. Full workflow/CLI enforcement can be promoted into GSD tooling if needed.
