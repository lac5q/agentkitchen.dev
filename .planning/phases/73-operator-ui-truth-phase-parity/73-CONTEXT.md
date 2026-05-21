# Phase 73: Operator UI Truth + Phase Parity

## Status

Backlog status: promoted to `.planning/REQUIREMENTS.md` as `UI-PARITY-01..05` and to `.planning/ROADMAP.md` under Future Milestone Priority. `UI-PARITY-03` was closed during Phase 71 Wave 2 completion on 2026-05-21.

## Goal

Reconcile completed/current phase claims against actual operator-visible UI, fix incorrect requirement checkmarks, wire missing panels, and add a phase-close rule that prevents backend-complete work from being mistaken for product-complete work.

## Why This Exists

Recent phase work has produced real backend/service capabilities, but the visible app does not consistently prove or expose them. A phase should not be treated as operator-complete unless the operator can see it, use it, or the roadmap explicitly labels it API/backend-only.

## Findings To Reconcile

- Phase 71 status/checkmark drift was corrected during Wave 2 completion: `71-02`, `71-04`, `71-06`, and `UI-PARITY-03` are now complete.
- Phase 70 HIL edit-and-continue produced `HilEditPanel`, but the live orchestration approval panel still needs to expose that edit path.
- Phase 71 wave-2 operator surfaces are complete; keep their summaries as the evidence trail for semantic/hybrid recall, HIL SLA countdown, and meeting consent UI.
- Operations NOC still contains mock/sample panels; it should either use real data or display honest missing/degraded telemetry.
- GSD phase close needs an explicit UI representation decision for every completed requirement.

## Most Urgent Order

1. Wire Phase 70 HIL edit UI into the real orchestration panel.
2. Replace or honestly label the NOC mock panels.
3. Add a "UI representation required?" gate to future GSD phase close.
4. Keep Phase 71 summary/browser evidence linked from any future parity audit.

## Requirement Mapping

- `UI-PARITY-01`: Status/checkmark truth across requirements, roadmap, state, summaries, and visible behavior.
- `UI-PARITY-02`: Phase 70 HIL edit UI wired into the live orchestration panel.
- `UI-PARITY-03`: Phase 71 wave-2 operator surfaces and API contracts completed.
- `UI-PARITY-04`: NOC mock/live-data truth reconciled.
- `UI-PARITY-05`: Future phase-close UI representation gate.
