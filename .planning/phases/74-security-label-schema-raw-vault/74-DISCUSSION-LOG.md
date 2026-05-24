# Phase 74: Security Label Schema + Raw Vault - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-24
**Phase:** 74-security-label-schema-raw-vault
**Areas discussed:** Vault artifact granularity, Label storage design, Ingest wire-up scope, Admin endpoint

---

## Vault Artifact Granularity

| Option | Description | Selected |
|--------|-------------|----------|
| Per-session | One `<session_id>.ndjson.zst` artifact per conversation session. Clean replay semantics, natural hash boundary, simple admin list view. | ✓ |
| Per-day | One artifact batches all sessions in a day. Better for archival compression, harder to replay a specific session. | |

**User's choice:** Per-session (default recommendation accepted)
**Notes:** Per-session aligns with SC-3 ("replay a specific artifact id") — one artifact id maps to one session unambiguously.

---

## Label Storage Design

| Option | Description | Selected |
|--------|-------------|----------|
| Hybrid (columns + artifact_labels) | 4 label columns directly on each existing table (hot write path), `artifact_labels` table for raw_artifacts label versioning only. | ✓ |
| Normalized (artifact_labels only) | All labels in a separate table with FK references. Enables label versioning everywhere but requires JOIN for every security-check query. | |
| Columns only | 4 columns on every table, no `artifact_labels`. Simplest queries, no label versioning for vault artifacts. | |

**User's choice:** Hybrid (default recommendation accepted)
**Notes:** Keeps hot write paths (message insert) free of FK lookups. Later phases (75–76) query label columns directly without joins.

---

## Ingest Wire-Up Scope

| Option | Description | Selected |
|--------|-------------|----------|
| Infrastructure + message ingest | Create vault module + schema, wire `db-ingest.ts` message writes as SC-1 proof. Other ingest paths deferred to Phase 75. | ✓ |
| Full ingest wiring | Wire all ingest paths (messages, email, A2A, files) in Phase 74. | |
| Infrastructure only | Schema + vault module only, zero ingest wiring. Phase 75 wires everything. | |

**User's choice:** Infrastructure + message ingest proof-of-concept (default recommendation accepted)
**Notes:** Message ingest is the highest-volume path and proves the vault foundation. Email/A2A/file wiring belongs in Phase 75 where classification labels are assigned at ingestion.

---

## Admin Endpoint

| Option | Description | Selected |
|--------|-------------|----------|
| `/api/admin/vault` with operator JWT + admin role | Consistent with other admin routes. Uses existing `operator-auth.ts` pattern. | ✓ |
| `/api/vault` with operator JWT | Accessible to all operators, not just admins. | |
| Separate admin service | Outside Next.js, separate auth mechanism. More complex, no benefit at this scale. | |

**User's choice:** `/api/admin/vault` with operator JWT + admin role (default recommendation accepted)
**Notes:** Replay is a sensitive operation — admin-only is appropriate. Pagination required (`limit`/`cursor`) for large vaults.

---

## Claude's Discretion

- Vault writer concurrency model (synchronous vs async queue)
- `raw_artifacts` index selection beyond required fields
- Whether `artifact_labels` needs composite unique index
- Retention policy enforcement mechanism (deferred scope)

## Deferred Ideas

- Email/A2A/meeting transcript/file vault wiring → Phase 75
- Envelope encryption for vault artifacts → Phase 77
- Retention policy background sweep → post-Phase 74
- SQLCipher/whole-DB encryption → Phase 77
- Label versioning UI → Phase 79+
- Qdrant/Neo4j label filtering → Phase 77
