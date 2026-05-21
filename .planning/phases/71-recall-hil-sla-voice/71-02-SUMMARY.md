---
phase: 71-recall-hil-sla-voice
plan: "02"
subsystem: recall
tags: [sqlite, embeddings, hybrid-recall, rrf, scheduler, vitest]
requirements_completed: [RECALL-01, RECALL-02]
key_files:
  created:
    - apps/memroos/src/lib/embeddings/recall.ts
    - apps/memroos/src/lib/embeddings/embedding-job.ts
    - apps/memroos/src/lib/embeddings/__tests__/embedding-job.test.ts
  modified:
    - apps/memroos/src/app/api/recall/route.ts
    - apps/memroos/src/instrumentation.ts
    - apps/memroos/src/lib/embeddings/__tests__/recall.test.ts
verification:
  - npx vitest run src/lib/embeddings/__tests__/recall.test.ts src/lib/embeddings/__tests__/embedding-job.test.ts
  - npm run typecheck
  - npm run build
completed: 2026-05-21
---

# Phase 71 Plan 02: Semantic/Hybrid Recall Endpoint + Embedding Job Summary

## What Shipped

- `semanticRecall()` ranks `message_embeddings` rows by cosine similarity and returns the existing recall row shape plus `score`.
- `hybridRecall()` fuses BM25 and semantic lists with Reciprocal Rank Fusion using `RRF_K = 60`.
- `/api/recall` now accepts `mode=bm25|semantic|hybrid`; absent or unknown modes default to BM25.
- Embedding outages and disabled providers fall back to BM25 with `degraded: true` and HTTP 200.
- `runEmbeddingCycle()` embeds up to 50 unembedded messages per cycle; `startEmbeddingJob()` registers a 5-minute scheduler inside the existing scheduler singleton.

## Verification

- `npx vitest run src/lib/embeddings/__tests__/recall.test.ts src/lib/embeddings/__tests__/embedding-job.test.ts` — 9/9 tests PASS.
- `npm run typecheck` — PASS.
- `npm run build` — PASS with pre-existing Turbopack NFT warnings from `next.config.ts` import tracing.
- GitNexus pre-edit checks: `/api/recall` impact LOW (one direct consumer, `useVoiceTranscript`, reads `results` only); `instrumentation.register` impact LOW.

## Notes

- The recall route preserves `results`, `query`, and `timestamp`, while adding `mode` and `degraded`.
- Existing side effects remain centralized for all query modes: `last_recall_query`, `recall_log`, and `memory_salience.access_count`.
- No new npm packages were added.
