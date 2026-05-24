---
phase: 74-security-label-schema-raw-vault
plan: 01
status: complete
requirements_completed: [MEMSEC-01, MEMSEC-02]
completed_at: 2026-05-24
---

# Phase 74 Plan 01 Summary

## What Shipped

- Added fail-closed security label columns to `messages`, `audit_log`, `hive_actions`, `agent_memory_writes`, and `recall_log`: `visibility='private'`, nullable `domain`, nullable `sensitivity`, and `policy='sealed'`.
- Added `raw_artifacts` and `artifact_labels` tables with tenant/source/session metadata, content hashes, compression metadata, replay state, retention/key placeholders, and label versioning.
- Added `apps/memroos/src/lib/vault/` with zstd compression, SHA-256 hash verification, append-only artifact writes, artifact listing, and replay.
- Wired Claude, Hermes, Qwen, and Codex message ingestion paths to write newly inserted message rows into the raw vault.
- Added admin-only routes:
  - `GET /api/admin/vault`
  - `GET /api/admin/vault/[artifactId]/replay`

## Verification

- `npm --prefix apps/memroos run test -- src/lib/vault/__tests__/vault.test.ts src/app/api/admin/vault/__tests__/route.test.ts 'src/app/api/admin/vault/[artifactId]/replay/__tests__/route.test.ts' --run` - PASS, 8 tests.
- `npm --prefix apps/memroos run typecheck` - PASS.
- `npx gitnexus detect-changes --repo memroos` - PASS as analysis command; reported CRITICAL risk because `initSchema` is shared by DB-backed routes. This is expected for additive schema work.

## Risk Notes

- `initSchema` has critical blast radius by design. Changes are limited to `CREATE TABLE IF NOT EXISTS` and additive `ALTER TABLE ... ADD COLUMN` operations.
- Vault files use Node 26 native `node:zlib` zstd APIs. No external compression dependency was added.
- Phase 74 intentionally does not encrypt artifacts yet; `key_id` is metadata-only until Phase 77.

## Follow-Up

- Phase 75 must route non-message ingestion paths through the vault as part of the classification cascade.
- Phase 76 must enforce policy decisions before retrieval/export/dispatch.
- Phase 77 must add envelope encryption and classification-aware derived indexes.
