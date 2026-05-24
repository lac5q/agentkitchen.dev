# Phase 84 Summary — Competitive Memory Target Architecture

Completed: 2026-05-24

## Requirement

Implemented `MEMTARGET-01`: MemRoOS now has a reproducible competitive memory target architecture that compares current/target MemRoOS against public alternatives and verifies the live local recall path.

## What Shipped

- Added a public-evidence marketplace benchmark dataset and runner:
  - `evals/marketplace-agentic-memory/providers.json`
  - `scripts/run-marketplace-memory-evals.mjs`
  - `scripts/run-marketplace-memory-evals.test.mjs`
  - root script `eval:marketplace-memory`
- Added latest persisted benchmark output under `evals/marketplace-agentic-memory/results/latest.json`.
- Added the market/architecture writeup at `docs/marketplace/agentic-memory-benchmark-2026-05-24.md`.
- Hardened memory recall evals:
  - vector fixture identity can match backend-normalized metadata ids
  - episodic fixtures are seeded as `internal/indexable`
  - FTS projection is rebuilt after episodic eval fixture seeding
  - episodic recall fans out across expected facts to avoid brittle phrase-order failures
  - vector eval write timeout is configurable with a safer 15s default

## Verification

- `node --test scripts/run-marketplace-memory-evals.test.mjs`
- `npm --prefix apps/memroos run test -- memory-recall-evals`
- `npm run eval:marketplace-memory`
- `npm run build`
- `launchctl kickstart -k gui/$(id -u)/com.memroos`
- Authenticated live full memory eval:
  - `totalCases`: 8
  - `passedCases`: 8
  - `passRate`: 1
  - `p95LatencyMs`: 336
  - `tierFailures`: []

## Competitive Result

- MemRoOS current ranked ahead of the scored alternatives on the public-evidence architecture benchmark.
- MemRoOS target ranked first with the planned architecture profile.
- The recommendation is constrained: claim public-evidence architecture leadership plus live MemRoOS recall pass, not black-box API superiority over closed vendors.
