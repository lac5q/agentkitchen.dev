---
phase: 71-recall-hil-sla-voice
plan: "06"
subsystem: voice-consent
tags: [daily, consent, audit, auth, ui, vitest]
requirements_completed: [VOICE-08]
key_files:
  created:
    - apps/memroos/src/lib/voice/meeting-consent.ts
    - apps/memroos/src/lib/voice/__tests__/meeting-consent.test.ts
    - apps/memroos/src/app/api/meeting/join/route.ts
    - apps/memroos/src/app/api/meeting/join/__tests__/route.test.ts
    - apps/memroos/src/components/voice/consent-dialog.tsx
    - apps/memroos/src/app/meetings/page.tsx
  modified:
    - apps/memroos/src/lib/db-schema.ts
    - apps/memroos/src/lib/audit/event-types.ts
verification:
  - npx vitest run src/lib/voice/__tests__/meeting-consent.test.ts src/app/api/meeting/join/__tests__/route.test.ts
  - npm run typecheck
  - npm run build
  - browser check on http://localhost:3012/meetings
completed: 2026-05-21
---

# Phase 71 Plan 06: Recording Consent Gate + Meeting Join UI Summary

## What Shipped

- Added additive `meeting_consents` schema with opaque `meeting_id`, `operator_id`, `meeting_label`, `consented`, and `consented_at`.
- `recordConsent()` mints an opaque UUID meeting ID; `hasConsent()` checks persisted consent.
- `POST /api/meeting/join` requires operator auth and `consentConfirmed: true`, writes a `meeting.joined` audit entry, and returns `{ meeting_id, status: "joining" }`.
- Audit metadata includes only the opaque meeting ID, meeting label, and operator ID. Room URL and token are used transiently and never persisted to consent or audit rows.
- `/meetings` page includes an explicit consent dialog; the Join button remains disabled until consent is confirmed.

## Verification

- `npx vitest run src/lib/voice/__tests__/meeting-consent.test.ts src/app/api/meeting/join/__tests__/route.test.ts` — 8/8 tests PASS.
- `npm run typecheck` — PASS.
- `npm run build` — PASS with pre-existing Turbopack NFT warnings from `next.config.ts` import tracing.
- Browser check: `/meetings` authenticated locally, Join button disabled before consent, consent dialog confirmed, join returned a meeting ID, and the page did not echo the room URL or token.
- SQLite audit check after browser join: one `meeting.joined` row found; room URL match count `0`; token match count `0`.
- GitNexus pre-edit checks: `initSchema` impact CRITICAL because it bootstraps most DB flows; change was additive only. `writeAuditEntry` impact CRITICAL; the shared function was not modified, only called. `AUDIT_EVENT_TYPES` and `ENTITY_TYPES` impact LOW.

## Notes

- Added closed enum entries `AUDIT_EVENT_TYPES.MEETING_JOINED` and `ENTITY_TYPES.MEETING` so audit writes remain type-safe.
- The route does not launch an embedded bot process directly; it preserves the existing env/secret hand-off boundary from 71-05.
