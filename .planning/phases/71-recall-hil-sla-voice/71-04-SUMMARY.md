---
phase: 71-recall-hil-sla-voice
plan: "04"
subsystem: hil-dashboard
tags: [react, hil, sla, countdown, vitest, ui]
requirements_completed: [HIL-06]
key_files:
  created:
    - apps/memroos/src/lib/hil/sla-status.ts
    - apps/memroos/src/components/escalations/sla-countdown.tsx
    - apps/memroos/src/components/escalations/__tests__/sla-countdown.test.tsx
    - apps/memroos/src/lib/hil/__tests__/sla-status.test.ts
  modified:
    - apps/memroos/src/app/escalations/page.tsx
verification:
  - npx vitest run src/lib/hil/__tests__/sla-status.test.ts src/components/escalations/__tests__/sla-countdown.test.tsx
  - npm run typecheck
  - npm run build
  - browser check on http://localhost:3012/escalations
completed: 2026-05-21
---

# Phase 71 Plan 04: HIL Dashboard Countdown + SLA Traffic Light Summary

## What Shipped

- `slaTrafficLight(deadline, slaSeconds, status)` returns `green`, `amber`, or `red`.
- `sla_breached` and overdue rows are always red.
- `SlaCountdown` is a client component that ticks once per second, formats remaining time, and exposes `data-sla-light` for verification.
- The escalations page now renders `SlaCountdown` in each unresolved escalation card.

## Verification

- `npx vitest run src/lib/hil/__tests__/sla-status.test.ts src/components/escalations/__tests__/sla-countdown.test.tsx` — 7/7 tests PASS.
- `npm run typecheck` — PASS.
- `npm run build` — PASS with pre-existing Turbopack NFT warnings from `next.config.ts` import tracing.
- Browser check: `/escalations` authenticated locally, loads without error. The current local DB had no open escalations, so the page showed the empty state; countdown behavior is covered by the component test with fake timers.
- GitNexus pre-edit check: `EscalationCard` impact LOW.

## Notes

- The existing 30-second `useEscalations` refresh remains unchanged; the countdown handles per-second display between server refreshes.
- No data contract changed for `/api/escalations`.
