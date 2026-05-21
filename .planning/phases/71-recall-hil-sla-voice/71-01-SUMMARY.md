---
phase: 71-recall-hil-sla-voice
plan: "01"
subsystem: embeddings
tags: [sqlite, embeddings, ollama, recall, tdd]
dependency_graph:
  requires: []
  provides:
    - message_embeddings SQLite table (conversations.db)
    - apps/memroos/src/lib/embeddings/store.ts
    - apps/memroos/src/lib/embeddings/provider.ts
  affects:
    - apps/memroos/src/lib/db-schema.ts (initSchema additive DDL)
    - apps/memroos/src/lib/constants.ts (OLLAMA_URL, EMBEDDING_PROVIDER)
tech_stack:
  added:
    - nomic-embed-text (Ollama model, no npm package added)
  patterns:
    - Float32 BLOB vector packing (4 bytes/element)
    - Degraded-result pattern (EmbedResult discriminated union)
    - INSERT ON CONFLICT upsert semantics
    - AbortSignal.timeout(5000) for network calls
key_files:
  created:
    - apps/memroos/src/lib/embeddings/store.ts
    - apps/memroos/src/lib/embeddings/provider.ts
    - apps/memroos/src/lib/embeddings/__tests__/provider.test.ts
    - apps/memroos/src/lib/embeddings/__tests__/store.test.ts
  modified:
    - apps/memroos/src/lib/db-schema.ts
    - apps/memroos/src/lib/constants.ts
decisions:
  - D-01: Embeddings via Ollama nomic-embed-text only; gated by MEMROOS_EMBEDDING_PROVIDER
  - D-02: message_embeddings table in conversations.db; Qdrant untouched
  - D-05: Embedding outage returns degraded result, never throws or causes 5xx
metrics:
  duration: "~5 minutes"
  completed: "2026-05-21"
  tasks_completed: 3
  tasks_total: 3
  files_created: 4
  files_modified: 2
  tests_added: 18
---

# Phase 71 Plan 01: Message Embeddings Schema + Ollama Embedding Provider Summary

**One-liner:** SQLite `message_embeddings` table (Float32 BLOB) + Ollama `nomic-embed-text` client with typed degraded-result fallback, gated by `MEMROOS_EMBEDDING_PROVIDER`.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Wave 0 RED scaffolds — provider + store tests | 2c8ee08 | embeddings/__tests__/provider.test.ts, store.test.ts |
| 2 | message_embeddings table + embeddings store module | 8a04e8a | db-schema.ts, embeddings/store.ts |
| 3 | Ollama nomic-embed-text provider with degraded fallback | 91e2da8 | embeddings/provider.ts, constants.ts |

## Verification Results

- `npx vitest run src/lib/embeddings/__tests__/` — 18/18 tests PASS (2 suites)
- `message_embeddings` table added additively to `initSchema()` via `CREATE TABLE IF NOT EXISTS`
- `embedText()` returns `{ embedding: null, degraded: true }` without fetch when `MEMROOS_EMBEDDING_PROVIDER` is unset
- `upsertEmbedding` / `getEmbedding` / `messagesNeedingEmbedding` all verified in store.test.ts
- gitnexus_detect_changes confirmed scope matches expected files only

## TDD Gate Compliance

- RED gate: `test(71-01)` commit `2c8ee08` — both test files failed (Cannot find module)
- GREEN gate:
  - `feat(71-01)` commit `8a04e8a` — store.test.ts: 6/6 GREEN
  - `feat(71-01)` commit `91e2da8` — provider.test.ts: 12/12 GREEN
- REFACTOR gate: not needed (implementation was clean on first pass)

## Deviations from Plan

None — plan executed exactly as written.

Notes:
- gitnexus impact analysis on `initSchema` returned CRITICAL (124 impacted symbols, 47 processes). This is expected since `initSchema` is called by `getDb()` which bootstraps the entire app. The change is strictly additive (CREATE TABLE IF NOT EXISTS) with no schema mutation, so the risk is contained per D-02.
- Security hook warnings about db.exec() calls — false positive (SQL API, not child_process usage).

## Threat Surface Scan

No new threat surface introduced beyond what the plan's threat model covers:
- T-71-01 (DoS via embedText): mitigated with AbortSignal.timeout(5000) + degraded fallback
- T-71-02 (Tampering via DDL): mitigated with CREATE TABLE IF NOT EXISTS + FK ON DELETE CASCADE
- T-71-03 (Info disclosure): accepted — BLOB is derived from already-stored messages.content
- T-71-SC (npm installs): no new packages added; better-sqlite3 and fetch already in stack

## Known Stubs

None — all exports are fully implemented and tested.

## Self-Check: PASSED

Files created:
- apps/memroos/src/lib/embeddings/store.ts: FOUND
- apps/memroos/src/lib/embeddings/provider.ts: FOUND
- apps/memroos/src/lib/embeddings/__tests__/provider.test.ts: FOUND
- apps/memroos/src/lib/embeddings/__tests__/store.test.ts: FOUND

Commits verified:
- 2c8ee08: FOUND
- 8a04e8a: FOUND
- 91e2da8: FOUND
