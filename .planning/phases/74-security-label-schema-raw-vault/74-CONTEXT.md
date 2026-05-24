# Phase 74: Security Label Schema + Raw Vault - Context

**Gathered:** 2026-05-24
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 74 delivers the security infrastructure foundation that every v5.0 phase (75–82) reads from:

1. **Additive label migrations** — Add `visibility`, `domain`, `sensitivity`, `policy` columns to `messages`, `audit_log`, `hive_actions`, `agent_memory_writes`, `recall_log` using the established try/catch ALTER TABLE pattern with safe defaults (`visibility='private'`, `policy='sealed'`).
2. **New SQLite tables** — `raw_artifacts` (vault metadata: URI, content hash, tenant, source, timestamps, key id, compression type, size, replay state) and `artifact_labels` (label rows tied to raw artifacts, enabling label versioning).
3. **Filesystem vault layout** — `~/.memroos/vault/<tenant>/<YYYY>/<MM>/<DD>/` directory structure.
4. **`lib/vault/` module** — writer, reader, hash/replay metadata, retention policy, zstd compression using `node:zlib` (Node 22+ native zstd).
5. **Message ingest wire-up** — `db-ingest.ts` message writes are routed through the vault writer to prove the foundation works (satisfy SC-1). Other ingest paths — email, A2A task payloads, meeting transcripts, files — are wired in Phase 75 alongside the classification cascade.
6. **Admin endpoint** — `/api/admin/vault` in Next.js for listing vault artifacts by tenant and replaying a specific artifact id (decompressed, hash-verified).

Phase 74 is infrastructure-first. It does not implement classification logic (Phase 75), retrieval authorization (Phase 76), or encryption (Phase 77).

</domain>

<decisions>
## Implementation Decisions

### Vault Artifact Granularity
- **D-01:** Use **per-session** vault artifacts — one `<session_id>.ndjson.zst` file per conversation session. This gives clean replay semantics (one artifact id = one replayed session), a natural content hash boundary, and a simple admin list view.

### Label Storage Design
- **D-02:** **Hybrid approach.** Add the 4 label columns (`visibility TEXT NOT NULL DEFAULT 'private'`, `domain TEXT`, `sensitivity TEXT`, `policy TEXT NOT NULL DEFAULT 'sealed'`) directly to each existing label-bearing table (`messages`, `audit_log`, `hive_actions`, `agent_memory_writes`, `recall_log`) via additive try/catch ALTER TABLE migrations. The `artifact_labels` table is for `raw_artifacts` only — it enables full label versioning on vault artifacts without FK lookups on hot write paths. Later phases read security labels from columns on existing tables (direct query, no join).
- **D-03:** Default values: `visibility = 'private'`, `policy = 'sealed'`. `domain` and `sensitivity` default to NULL (unclassified by default — classification happens in Phase 75).

### Ingest Wire-Up Scope
- **D-04:** Phase 74 wires **message ingest only** (`db-ingest.ts` → vault writer) as the proof-of-concept for SC-1. Every new message written to `messages` also gets a vault artifact written to disk, with the `raw_artifacts` row pointing to it. Other ingest paths (A2A task payloads, meeting transcripts, email imports, file imports) are wired in Phase 75 when the classification cascade is built.

### Admin Endpoint
- **D-05:** Admin endpoint lives at **`/api/admin/vault`** in Next.js (consistent with other admin routes). Gate it behind the **operator JWT + admin role check** using the existing `operator-auth.ts` pattern. Two sub-routes: `GET /api/admin/vault?tenant=<id>` (list artifacts) and `GET /api/admin/vault/<artifact_id>/replay` (decompress + verify hash + return content).

### Compression
- **D-06:** Use **`node:zlib` with zstd** (native Node 22+ zstd — Node 26 confirmed). No external zstd dependency. Artifacts compressed as `.ndjson.zst` per the spike spec.

### Migration Safety
- **D-07:** All migrations follow the established try/catch additive ALTER TABLE pattern in `db-schema.ts`. New table creations use `CREATE TABLE IF NOT EXISTS`. No locking or table rebuilds — only additive column additions with safe defaults.

### Claude's Discretion
- Vault writer concurrency model (synchronous vs async queue) — planner decides based on db.ts WAL mode
- `raw_artifacts` schema field ordering and index selection beyond what ROADMAP specifies
- Whether `artifact_labels` needs a composite unique index or just a FK
- Retention policy enforcement mechanism (lazy on read vs background sweep) — defer to Phase 74 plan, not needed for initial vault proof

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements
- `.planning/REQUIREMENTS.md` §MEMSEC-01, §MEMSEC-02 — Full requirement text for Phase 74

### Spike/Design Documents
- `.planning/notes/memory-security-storage-spike.md` — Working recommendation: raw evidence vault pattern, label dimensions, two-gateway security model, encryption decision, artifact schema design. **Primary design reference for this phase.**

### Existing Schema and Database
- `apps/memroos/src/lib/db-schema.ts` — All existing table DDL + established try/catch additive migration pattern. **Must read before adding any migrations.** Tables needing label columns: `messages` (line ~12), `audit_log` (line ~243), `hive_actions` (line ~70), `agent_memory_writes` (line ~363), `recall_log` (line ~259).
- `apps/memroos/src/lib/db.ts` — DB singleton, WAL mode setup, how `initSchema` is invoked.
- `apps/memroos/src/lib/db-ingest.ts` — Message ingest path; the write entrypoint to be wired through the vault.

### Auth Pattern (for admin endpoint)
- `apps/memroos/src/lib/operator-auth.ts` — JWT auth helper used by all admin routes.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- Additive try/catch migration pattern — established in `db-schema.ts`, use exactly this for all 5 tables x 4 label columns
- `getDb()` singleton from `db.ts` — vault writer should call this (no new DB connection needed)
- `operator-auth.ts` JWT verify helper — use for admin endpoint auth gate

### Established Patterns
- `initSchema(db)` is the single entrypoint for all DDL; vault schema additions go here
- Admin routes in `apps/memroos/src/app/api/admin/` follow the JWT-gated pattern
- WAL mode + `busy_timeout = 5000` — safe for concurrent reads during vault writes

### Integration Points
- `db-ingest.ts` → vault writer call (new): after writing to `messages`, call vault writer with session id, messages, and default labels
- `apps/memroos/src/app/api/admin/vault/` → new Next.js route files
- `apps/memroos/src/lib/vault/` → new module directory (writer.ts, reader.ts, hash.ts, types.ts)

</code_context>

<specifics>
## Specific Ideas

- Vault path convention from ROADMAP: `~/.memroos/vault/<tenant>/<YYYY>/<MM>/<DD>/<session_id>.ndjson.zst`
- `raw_artifacts` must store: `id`, `artifact_uri` (vault path), `content_hash` (SHA-256), `tenant_id`, `source_type` (messages/a2a/email/file), `session_id`, `compressed_size`, `key_id` (placeholder for Phase 77 encryption), `replay_state` (pending/complete/failed), `created_at`, `retention_until`
- `artifact_labels` stores: `id`, `artifact_id` (FK to raw_artifacts), `visibility`, `domain`, `sensitivity`, `policy`, `labeled_at`, `label_version`
- Replay endpoint must: decompress zstd, verify SHA-256 hash against `raw_artifacts.content_hash`, return original ndjson content. If hash mismatch return 409 with corruption signal.
- Admin list endpoint should support pagination (`limit` + `cursor`) — vault can grow large

</specifics>

<deferred>
## Deferred Ideas

- Email, A2A task payload, meeting transcript, file import vault wiring → Phase 75 (classification cascade gate)
- Envelope encryption for vault artifacts → Phase 77 (MEMSEC-07)
- Retention policy sweep (background job to delete expired artifacts) → Phase 74 vault module can define the policy field, but enforcement deferred
- SQLCipher / whole-DB encryption evaluation → Phase 77
- Label versioning UI for operators → future phase (NOC / Phase 79+)
- Qdrant/vector + Neo4j/graph label filtering → Phase 77 (MEMSEC-05)

</deferred>

---

*Phase: 74-security-label-schema-raw-vault*
*Context gathered: 2026-05-24*
