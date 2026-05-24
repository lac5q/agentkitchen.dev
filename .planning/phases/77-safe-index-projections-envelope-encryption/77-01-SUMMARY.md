# Phase 77 Summary 01 — Safe Index + Envelope Encryption Checkpoint

## Status

Complete as of 2026-05-24.

## Completed

- Added `lib/vault/envelope.ts` with a local file key provider, AES-256-GCM payload encryption, wrapped data keys, and key rewrap support.
- `writeVaultArtifact()` encrypts restricted raw artifacts before zstd compression and records `key_id`.
- `readVaultArtifact()` replays both legacy zstd-only artifacts and new encrypted envelopes with hash verification against original plaintext.
- Approved public/indexable vault artifacts stay plaintext-compressed for performance.
- `message_embeddings` now has provenance columns for artifact id, source span, modality, model version, and label version.
- `upsertEmbedding()` stores provenance without breaking existing callers.
- `messages_fts` now indexes only `policy='indexable'` rows with `internal`, `public_safe`, or `public_approved` visibility.
- FTS update/delete triggers evict only rows that were previously projected, preventing corruption when private rows are later promoted.
- `rebuildMessageFtsProjection()` provides an explicit rebuild path after reclassification and startup migration.
- `cron_health_jobs`, `task_evidence_bundles`, and `skill_suggestions` schemas now support downstream phase contracts without leaking restricted content into derived surfaces.

## Verified

- `npm test -- --run src/lib/vault/__tests__/vault.test.ts src/lib/vault/__tests__/envelope.test.ts src/lib/embeddings/__tests__/store.test.ts`
- `npm test -- --run src/app/api/dispatch/__tests__/route.test.ts src/lib/memory/__tests__/policy-gate.test.ts src/app/api/memory/__tests__/tier-routes.test.ts src/app/api/memory/__tests__/multi-search-route.test.ts src/app/api/chatgpt/actions/__tests__/route.test.ts src/lib/vault/__tests__/vault.test.ts src/lib/vault/__tests__/envelope.test.ts src/lib/embeddings/__tests__/store.test.ts`
- `npm run typecheck`
- `npm run lint -- src/lib/memory/policy-gate.ts src/app/api/memory/search/route.ts src/app/api/memory/multi-search/route.ts src/lib/chatgpt-actions.ts src/app/api/dispatch/route.ts src/lib/vault/writer.ts src/lib/vault/envelope.ts src/lib/embeddings/store.ts src/lib/db-schema.ts src/lib/vault/__tests__/vault.test.ts src/lib/vault/__tests__/envelope.test.ts src/lib/embeddings/__tests__/store.test.ts`
- `npm run build`
- `npm test -- --run src/lib/__tests__/db.test.ts src/lib/__tests__/db-ingest.test.ts`

## Deferred Beyond MVP

- Physical key backup media and fresh-machine restore rehearsal remain an operator runbook task before customer deployment.
- External Qdrant, Neo4j, and qmd backfills should call the same classification gate before future bulk rebuilds; no unrestricted projection writer is considered approved.
