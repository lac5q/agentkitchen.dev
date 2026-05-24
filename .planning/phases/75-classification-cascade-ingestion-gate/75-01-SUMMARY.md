# Phase 75 Summary — Classification Cascade + Ingestion Gate

## Status

Complete locally on 2026-05-24.

## Changed

- Added `classification_reviews` with proposed labels, evidence spans, reviewer decisions, and linked HIL escalation ids.
- Added `lib/classification/cascade.ts` and types for fail-closed artifact classification.
- Reused `content-scanner.ts` signals and metadata gates to classify PII, credentials, payment, legal, finance, HR, personal, client, engineering, and public-promotion cases.
- Hooked Claude/Hermes/Qwen/Codex session ingestion so every newly written vault artifact is classified immediately.
- Added reviewer APIs:
  - `GET /api/classification/reviews`
  - `POST /api/classification/reviews/[reviewId]/decision`
- Reviewer decisions append a new `artifact_labels` version, stamp source `messages` rows, resolve the linked HIL escalation, and write `classification_review_decided` to `audit_log`.

## Verification

- `npm --prefix apps/memroos run test -- src/lib/vault/__tests__/vault.test.ts src/app/api/admin/vault/__tests__/route.test.ts 'src/app/api/admin/vault/[artifactId]/replay/__tests__/route.test.ts' src/lib/classification/__tests__/cascade.test.ts src/app/api/classification/reviews/__tests__/route.test.ts 'src/app/api/classification/reviews/[reviewId]/decision/__tests__/route.test.ts' --run`
- `npm --prefix apps/memroos run typecheck`
- `npm --prefix apps/memroos run lint`
- `git diff --check`

## Known Follow-Up

- The current cascade abstains into human review instead of invoking an external LLM adjudicator. That preserves the fail-closed boundary for Phase 76 retrieval gates and avoids unreviewed promotion of sensitive content.
- Presidio-style NER is not a runtime dependency yet; scanner + metadata gates cover the phase fixtures and review queue path. Add external NER only behind an async, timeout-bounded, fail-closed classifier worker.
