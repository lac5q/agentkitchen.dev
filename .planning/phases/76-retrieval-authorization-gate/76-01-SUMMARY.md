# Phase 76 Summary 01 — Retrieval Authorization Gate

## Status

Completed as of 2026-05-24.

## Completed

- Added `lib/memory/policy-gate.ts`.
- Default/missing labels now authorize as `private/sealed` and deny use.
- `/api/recall` filters BM25, semantic, hybrid, and agent-history rows before returning them.
- Recall side effects only update for allowed rows.
- Denied memory-use decisions write `memory_policy_decision` rows into `audit_log`.
- `EpisodicMemoryAdapter.search()` uses the same gate.
- The embedding background job only indexes promoted `indexable` messages.
- `/api/memory/search` filters external vector payloads through the same policy gate before returning results.
- `/api/memory/multi-search` gates normalized vector, graph, and episodic results; unlabeled external results fail closed as `private/sealed`.
- ChatGPT Actions search only returns authorized memories, and encoded fetch IDs now carry a label snapshot and fail closed when legacy/unlabeled.
- `/api/dispatch` policy-gates memory context arrays before handing dispatch input to an agent.

## Verified

- `npm test -- --run src/app/api/dispatch/__tests__/route.test.ts src/lib/memory/__tests__/policy-gate.test.ts src/app/api/memory/__tests__/tier-routes.test.ts src/app/api/memory/__tests__/multi-search-route.test.ts src/app/api/chatgpt/actions/__tests__/route.test.ts`
- `npm run typecheck`
- `npm run lint -- src/lib/memory/policy-gate.ts src/app/api/memory/search/route.ts src/app/api/memory/multi-search/route.ts src/lib/chatgpt-actions.ts src/app/api/dispatch/route.ts src/app/api/dispatch/__tests__/route.test.ts src/app/api/memory/__tests__/tier-routes.test.ts src/app/api/memory/__tests__/multi-search-route.test.ts src/app/api/chatgpt/actions/__tests__/route.test.ts`
- `git diff --check`
- `npm run build`

## Notes

- Export, summary, and evidence bundle paths currently expose audit/eval artifacts rather than raw memory rows; MEMSEC-08 regression coverage should keep these in the negative-fixture matrix.
- GSD's earlier plan counter was misleading because this summary existed while the phase was still open; this file now reflects the actual closure work.
