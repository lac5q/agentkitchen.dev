# Domain Pitfalls: v5.0 Memory Trust + Operational Intelligence

**Domain:** Adding memory security vault, fail-closed classification, retrieval authorization, NOC real-data, harness evidence bundles, and auth hardening to MemroOS (A2A agent hub, LangGraph orchestration, Next.js/Python stack)
**Researched:** 2026-05-23
**Confidence:** HIGH — sourced from PROJECT.md, memory-security-storage-spike.md, privacy-classification-policy-spike.md, and direct analysis of existing system components.

---

## Critical Pitfalls

Mistakes that cause data leaks, silent security bypasses, or force rewrites.

---

### Pitfall C-01: Backfill Blindness — Restricted Content Already in FTS5/Qdrant/Neo4j Before the Authz Gate Flips

**What goes wrong:** Classification is shipped and the retrieval authorization gate starts denying restricted content. But content ingested before the gate existed — already embedded in the SQLite FTS5 conversation store, indexed in Qdrant Cloud via the background embedding job, and written into Neo4j graph facts via mem0 — is never reclassified. The gate denies new writes but silently leaks through the old derived indexes.

**Why it happens:** The gate is built as a forward-only control. Teams assume the existing indexes are clean without auditing them.

**Existing components at risk:**
- SQLite FTS5 store (conversations.db) — full plaintext, searchable without classification
- Background embedding job (50 msgs/cycle, 5-min interval) — embeds content before classification runs if ordering is wrong
- Qdrant Cloud vector store (mem0 collection `agent_memory` — read-only from app, written via mem0 HTTP API) — no ingest gate on the HTTP path
- Neo4j graph facts via mem0 — same HTTP bypass applies

**Consequences:** The retrieval authorization gate gives false confidence. Restricted memory (legal, finance, HR, credentials) is accessible via semantic search even after the gate ships.

**Prevention:**
1. Before flipping the gate to enforce, run a backfill classification sweep across all existing FTS5 rows, Qdrant payloads, and Neo4j facts.
2. Remove or quarantine any content that classifies as restricted from all four derived indexes (FTS5, Qdrant, Neo4j, qmd).
3. Gate enforcement must be conditional: only enforce once backfill sweep completes and emits a verified completion event.
4. Write a negative regression test (MEMSEC-08) that queries each index for a known restricted fixture and asserts zero results.

**Detection:** Any restricted content surfacing in recall after the gate is declared live. Failing the MEMSEC-08 negative test fixtures.

**Phase:** Memory Security Foundation (MEMSEC-01..08)

---

### Pitfall C-02: Embedding Before Classification — Background Job Creates Vectors of Restricted Content

**What goes wrong:** The existing background embedding job (50 messages/cycle, 5-minute interval, added in RECALL-01/02) embeds all new messages into Qdrant regardless of classification labels. If classification runs after embedding — or classification is async and the embedding job fires first — restricted content gets vector-indexed.

**Why it happens:** The embedding job was built for semantic recall performance, before security labels existed. Its schedule runs independently of any classification pipeline.

**Existing components at risk:**
- Background embedding job in instrumentation.ts scheduler bootstrap pattern (established in v1.5)
- Qdrant Cloud vector store — write path from the embedding job has no label check
- The 18-pattern content scanner (SEC-01) partially overlaps but is not the same as classification labels

**Consequences:** Semantic recall returns restricted memory even if the FTS5 path is gated. The embedding job acts as a silent classification bypass.

**Prevention:**
1. Classify at write time before the embedding job can access the content. Classification must run synchronously at ingest or stamp a provisional `private` label that the embedding job will not embed.
2. Add a label check in the embedding job: skip embedding any message where `visibility != public_safe AND visibility != public_approved` or where `policy = sealed`.
3. Do not treat the 18-pattern scanner as equivalent to the new classification dimensions — merge detectors rather than running parallel engines (see Pitfall C-05).

**Detection:** Query Qdrant for a fixture message that is known-restricted and assert it has no embedding.

**Phase:** Memory Security Foundation (MEMSEC-01..08)

---

### Pitfall C-03: mem0 HTTP Bypass — Content Written by External Clients Never Passes the Ingest Gate

**What goes wrong:** The `agent_memory` collection in Qdrant is read-only from the Next.js app; all writes go through the mem0 HTTP API. This means any agent writing memories directly via mem0 bypasses MemroOS's new ingestion classification gate entirely. Content entering through A2A-dispatched agents or the Daily.co meeting bot transcript pipeline lands in `agent_memory` without classification labels.

**Why it happens:** The read-only constraint (established in v1.3, "mem0 writes via HTTP only — never direct Qdrant") was a correctness discipline for direct writes, not a security constraint. It now means the classification gate has no leverage over the most common write path.

**Existing components at risk:**
- mem0 HTTP API (external write path)
- Daily.co meeting bot (Pipecat DailyTransport) — writes per-speaker transcripts to `messages` table and meeting highlights to `hive_actions` via the MemroOS-controlled path. But agent tasks dispatched via A2A hub that call mem0 directly are not controlled.
- A2A-dispatched agents using skill registry — may write memories as side effects

**Consequences:** The retrieval authorization gate can only gate on content it can see. Content in `agent_memory` that was never classified is either always allowed (unsafe) or must be treated as untrusted and classified on read (performance cost, double classification).

**Prevention:**
1. Treat `agent_memory` content as untrusted at read time: apply classification on retrieval, not just ingestion.
2. For content MemroOS controls (transcript write path, hive_actions, messages table), classify at write time before the embedding job runs.
3. Document explicitly which paths are and are not governed; do not claim the gate covers the HTTP bypass path.

**Detection:** Insert a known-sensitive fixture via the mem0 HTTP API directly, then confirm it surfaces (and is blocked or labeled) at retrieval.

**Phase:** Memory Security Foundation (MEMSEC-01..08); revisit at Retrieval Authorization Gate.

---

### Pitfall C-04: LangGraph Checkpoint Payload Leak — SqliteSaver Contains Unclassified Task Content

**What goes wrong:** LangGraph uses SqliteSaver for checkpoint persistence. Checkpoints contain the full `OrchestrationState`, including task content, HIL edit payloads (added in Phase 70), and any tool call results. These are serialized to the `checkpoints` SQLite table. Envelope encryption protects raw vault artifacts, but the checkpoint table is not part of the raw vault and has no encryption or classification labels.

**Why it happens:** Checkpoints were designed for fault-tolerance and replay, not as a security boundary. HIL edit-and-continue (HIL-01..03, Phase 70) adds operator-modified fields back into checkpoints, which may now include corrected sensitive values.

**Existing components at risk:**
- LangGraph SqliteSaver checkpoint table in the shared better-sqlite3 WAL singleton
- HIL lineage rows in `orchestration_lineage` (before/after values, Phase 70-02)
- Cross-harness skill registry dispatch calls that embed task context

**Consequences:** Sensitive task content (finance figures, HR notes, legal terms) lives in plaintext checkpoints even if the raw vault is encrypted. Checkpoint replay (for multi-hop retry with declarative rollback, ORCH-08/09) could reconstitute restricted content without authorization.

**Prevention:**
1. Add classification labels and optional encryption to checkpoint rows — at minimum, mark them with the label of the highest-sensitivity content they contain.
2. Apply the retrieval authorization gate to checkpoint reads (task resume, HIL continuation, retry replay).
3. Scope checkpoint retention to the task lifetime — do not retain checkpoints indefinitely.

**Detection:** Insert a task containing a known-sensitive fixture, allow it to checkpoint, then query the checkpoint table directly and assert restricted content is absent or encrypted.

**Phase:** Memory Security Foundation (MEMSEC-01..08)

---

### Pitfall C-05: Detector Sprawl — 18-Pattern Security Scanner and New Deterministic Detectors Diverge

**What goes wrong:** v1.5 shipped an 18-pattern content scanner (SEC-01) with HIGH/MEDIUM/LOW severity tiers and a 4096-char length guard. v5.0 adds new deterministic detectors: regex, NER, source path, MIME type, sender domain, calendar attendees, Drive folder, Gmail label, Slack channel, attachment type, and secret/credential scans. If these are implemented as separate subsystems, coverage gaps between them become security gaps — a pattern not in the old scanner but not yet in the new detectors passes both checks.

**Why it happens:** The old scanner was purpose-built for agent output. The new detectors are for ingestion classification. Different authors, different call sites, different schemas.

**Consequences:** Credential or PII content that triggers the new detectors but not the old scanner (or vice versa) gets inconsistent treatment. Double-firing on the same content wastes compute.

**Prevention:**
1. Consolidate into a single `DetectorPipeline` that the old scanner feeds into as a sub-stage. Do not add the new detectors as a parallel service.
2. Run the 18-pattern scanner as the first stage (fast, already tested, 680+ tests covering it); layer NER and metadata detectors after.
3. Emit a single unified result envelope with label dimensions, confidence, reason codes, and evidence spans regardless of which detector triggered.

**Detection:** Write a fixture that triggers only the old scanner and another that triggers only a new detector — assert both emit the same label envelope format.

**Phase:** Memory Security Foundation / Classification cascade (MEMSEC-03, CTX-FOLLOWUP-03)

---

## Moderate Pitfalls

### Pitfall M-01: Classification Cascade Too Aggressive — Breaks All Recall on Migration

**What goes wrong:** Fail-closed classification defaults to `private`, which is correct. But with no escape hatch for clearly non-sensitive content (engineering notes, skill definitions, benchmark results), every existing memory becomes private by default on migration. Agents cannot recall anything until human review clears each item, freezing the system.

**Existing components at risk:**
- SQLite FTS5 conversation store — all existing messages
- qmd BM25 index — all existing knowledge files
- Cross-project recall (RECALL-03/04) — `allowed_project_ids` parameter becomes useless if caller role fails the new authz gate

**Prevention:**
1. Define source-path auto-promotion rules that deterministically promote from `private` to `internal` or `indexable` on migration (e.g., content from the `engineering` domain with no PII/credential signals). This is a deterministic rule, not an LLM decision.
2. Backfill promotion must run and complete before the gate enforces.
3. Generate a migration report showing how many messages would be blocked before and after backfill promotion.

**Phase:** Memory Security Foundation (MEMSEC-03..05)

---

### Pitfall M-02: Human Review Queue Grows Unbounded Without SLA or Drain Mechanism

**What goes wrong:** The classification cascade routes low-confidence, conflicting, legal/finance/HR/credential, and public-promotion cases to a human review queue. Without an SLA, a timeout, or a drain path, the queue accumulates indefinitely. New ingest is silently blocked while the queue backs up.

**Why it happens:** Review queues feel harmless at low volume. At scale (daily meeting transcripts, Gmail ingestion, Slack imports), ingest rate easily exceeds human review capacity.

**Existing components at risk:**
- Meeting bot transcripts (Daily.co/Pipecat) write at high velocity
- Cron health monitoring (CRON-HEALTH-01..05) — if classification latency spikes, cron health alerts fire but the review queue is the real bottleneck

**Prevention:**
1. Define an SLA per content type (e.g., meeting transcripts: 48h, credentials: 4h).
2. Add a drain path: content that exceeds its SLA without human action auto-promotes to `private` (not blocked forever) with an audit entry.
3. Implement queue depth monitoring as a NOC panel — treat queue depth like a service health metric.

**Phase:** Memory Security Foundation + NOC Real-Data (MEMSEC-03, NOC-01..14)

---

### Pitfall M-03: LLM Classifier Without Abstention Path — Hallucinated Labels and Cost Explosion

**What goes wrong:** An LLM classifier without a strict output schema, confidence floor, and `abstain=true` path will invent labels for ambiguous content. In a security context, hallucinated `public_approved` labels leak sensitive data. Running the LLM classifier on every ingested message (vs. only on deterministic-detector failures/low-confidence cases) drives cost to unsustainable levels at Daily.co meeting volume.

**Why it happens:** The spike notes recommend constrained LLM adjudication, but implementation pressure leads to calling the LLM first as the "easy path" rather than after deterministic detectors.

**Prevention:**
1. Enforce the deterministic-first cascade in code: LLM adjudication is only invoked when the deterministic pipeline returns confidence below a threshold.
2. Require strict JSON output schema: label dimensions, confidence, reason code, evidence span ids, and `abstain` flag. Reject any LLM response that does not conform.
3. Add a cost counter to the classification pipeline and alert when daily LLM classification spend exceeds a threshold.

**Phase:** Classification cascade (MEMSEC-03, CTX-FOLLOWUP-03)

---

### Pitfall M-04: Envelope Encryption Breaks Key Rotation for Vault Replay

**What goes wrong:** Raw vault artifacts encrypted with a rotated (retired) key become unreadable if the old key is removed after rotation. Replay of historical evidence bundles — needed for ORCH-09 rollback compensation and SEAL-06 behavioral eval replay — fails silently or errors after key rotation.

**Existing components at risk:**
- LangGraph multi-hop retry with declarative rollback (ORCH-08/09) needs to replay compensating actions from old vault artifacts
- SEAL-06 evidence bundles carry `replay handle` — if the artifact is encrypted with a rotated key, replay fails
- Operating profiles (local-dev vs. cloud-https) have different key lifecycle expectations

**Prevention:**
1. Key rotation must be additive, not destructive: retired keys remain in the keystore with a `retired` status; the app can decrypt with them but will not encrypt new content with retired keys.
2. Store `key_id` in every encrypted artifact and test decryption with the old key after rotation.
3. Write a rotation test that: encrypts an artifact, rotates the key, decrypts with the old key id, confirms new writes use the new key.

**Phase:** Memory Security Foundation (MEMSEC-07)

---

### Pitfall M-05: NOC Panels Wired to Live Data That Does Not Exist Yet — Zero Masquerades as Clean Metric

**What goes wrong:** NOC-10 requires new telemetry streams before efficiency signals can be shown (retrieval calls before useful work, raw-context ingest token share, rediscovered-fact rate). If panels are wired to live API endpoints that return zero because the telemetry table has not been created yet, the dashboard shows "0 retrieval calls wasted" — which looks correct but is actually missing data masquerading as a clean metric.

**Why it happens:** Wiring the UI to an endpoint is the easy part. The endpoint returning zero vs. returning `{status: "missing-telemetry"}` is a single if-statement easy to skip under time pressure.

**Existing components at risk:**
- All 14 Operations NOC panels (NOC-01..14) on the NOC home
- This exact failure mode was fixed in Phase 73 for previously hardcoded state values — it will reappear for any panel wired before its telemetry source exists

**Prevention:**
1. Enforce the NOC data contract (NOC-02): every panel response must include `status: live|empty|degraded|missing`. Panels render a missing-telemetry checklist, not zeros, when `status=missing`.
2. Write the NOC-11 test that fails if any production Operations component imports `noc-mock-data`.
3. For NOC-10 efficiency signals specifically, do not build the panel UI until the telemetry tables exist and have at least one real row.

**Detection:** The NOC-11 test; and a seeded API test asserting metrics match fixture DB inputs (not zero).

**Phase:** Operations NOC Real-Data (NOC-01..14)

---

### Pitfall M-06: Two-Truth Audit Log — Evidence Bundles Fork From Existing Audit Infrastructure

**What goes wrong:** MemroOS already has: (1) `audit_log` table (AuditLogPanel, SEC-02/03), (2) HIL lineage rows in `orchestration_lineage` (Phase 70), (3) SEAL evidence bundles (SEAL-06, carrying task sample, tools/commands, checks passed, assumptions, residual risks, replay/rollback handle). v5.0 adds a fourth: "universal evidence bundles" for the harness control plane. If these are separate tables with separate schemas, querying the full audit history for a task requires joining across four tables, and any gap between them becomes a compliance blind spot.

**Existing components at risk:**
- AuditLogPanel on the NOC — reads from `audit_log`
- HIL edit panel — reads from `orchestration_lineage`
- SEAL proposal apply flow — reads from SEAL evidence bundle store
- The new "task-level Plan-Execute-Verify timelines" (v5.0 harness requirement)

**Prevention:**
1. Pick one canonical evidence schema. The SEAL-06 evidence bundle fields (task sample, tools, checks, assumptions, risks, replay handle) are the most complete baseline — adopt them as the universal schema.
2. Existing audit_log and lineage rows project into this schema, not the reverse. Older stores are append-only; new writes use the canonical schema.
3. The harness control plane reads from the canonical schema, not by joining legacy tables.

**Phase:** Harness Control Plane + Evidence

---

### Pitfall M-07: OAuth Identity Mapping Creates Duplicate Principals

**What goes wrong:** The existing JWT auth system (HttpOnly cookie, fixed in v3.1 security hardening) carries a `user_id` + role derived from the local user store. When OAuth/SSO is added (AUTH-FOLLOWUP-03), the external IdP returns a `sub` claim. If the mapping between `sub` and `user_id` is not deterministic on first login, a user ends up with two principals — one from OAuth and one from their pre-existing password account — each with different role assignments and different audit trails.

**Existing components at risk:**
- JWT cookie auth (HttpOnly, fixed v3.1)
- Invite token system (v3.0) — invited users create accounts before OAuth is enabled; their identities must merge cleanly
- RBAC role assignments — duplicate principal means role conflicts at the authz gate

**Prevention:**
1. Map OAuth `sub` to `user_id` by email as the canonical merge key. On first OAuth login, look up existing accounts by email before creating a new principal.
2. If an account with that email already exists, bind the OAuth `sub` to the existing `user_id` and retire the password credential (or leave it active per tenant policy). Do not create a new row.
3. Log the identity binding event in `audit_log` with before/after state.

**Phase:** Auth + Team Hardening (AUTH-FOLLOWUP-01..03)

---

### Pitfall M-08: API Key Rotation Breaks In-Flight A2A Tasks

**What goes wrong:** A2A-dispatched agents use API keys (not JWT). The API key rotation feature (AUTH-FOLLOWUP-03) can revoke an active key mid-task. If a long-running LangGraph orchestration is mid-graph when its API key is rotated, the next A2A call from that task fails with 401, leaving the task in a failed state with no recovery path.

**Existing components at risk:**
- A2A task API (Phase 35) — agents authenticate via API key
- LangGraph multi-hop retry (ORCH-08/09) — retry budget is consumed, not the key being rotated
- HIL SLA countdown (Phase 71) — a task waiting at HIL that has its key rotated cannot be resumed by the agent

**Prevention:**
1. API key rotation must have a configurable grace period: old key remains valid for N minutes after rotation to allow in-flight tasks to complete.
2. Issue a deprecation event at rotation time; the A2A task monitor surfaces it as a warning.
3. The key rotation UI must display active tasks using the key being rotated and require confirmation before proceeding.

**Phase:** Auth + Team Hardening (AUTH-FOLLOWUP-01..03)

---

### Pitfall M-09: OAuth Middleware Wraps All Routes and Breaks API-Key Consumers

**What goes wrong:** Adding OAuth/SSO changes how session tokens are issued and validated. If the OAuth middleware is applied globally (a common implementation shortcut), routes that previously accepted API keys or Bearer tokens from A2A agents start requiring OAuth session tokens. MCP clients using the tool gateway, external A2A agents, and the Python LangGraph service are all affected.

**Existing components at risk:**
- A2A v1 task API (`/.well-known/agent.json`, Phase 35) — uses API key headers
- MCP gateway tools (`tool_catalog`, `tool_discover`, `tool_load`, `tool_record_outcome`, `tool_stats`, v1.7) — direct MCP client calls
- Python LangGraph service — calls Next.js APIs via proxy

**Prevention:**
1. Apply OAuth/SSO only to human-facing browser routes. API-key-authenticated routes must remain on a separate middleware chain.
2. Write an integration test that confirms A2A API key auth still works after OAuth middleware is added.
3. Auth middleware must be composable: `withOAuth` for browser routes, `withApiKey` for machine routes — not a global `withAuth` that implicitly prefers one method.

**Phase:** Auth + Team Hardening (AUTH-FOLLOWUP-01..03)

---

### Pitfall M-10: Evidence Bundle Collection Blocks Agent Execution

**What goes wrong:** Universal evidence bundles require capturing sources, memories accessed, tools called, checks run, assumptions, and residual risks. If the harness waits synchronously for evidence collection before completing each step (e.g., flushing the bundle to the vault before returning to the graph), agent execution latency spikes. LangGraph steps that previously completed in milliseconds now wait on vault writes.

**Existing components at risk:**
- LangGraph StateGraph (Phase 36) — each node is synchronous from the graph's perspective
- HIL SLA countdown (Phase 71) — SLA timers are running; added latency delays the time-to-HIL
- SEAL-06 behavioral eval already solved this: `applyProposal()` returns `job_id` immediately, UI polls — apply the same pattern here

**Prevention:**
1. Evidence collection is a side-channel write, not a blocking step in the execution path. The step completes; evidence is queued and written asynchronously.
2. The vault write is fire-and-forget with a retry queue for failures — agent execution does not wait.
3. Evidence bundle completeness is eventually consistent: the bundle is marked `pending` until the async writer flushes all fields.

**Phase:** Harness Control Plane + Evidence

---

### Pitfall M-11: Classification Latency Causes Cron Health False Alarms

**What goes wrong:** CRON-HEALTH-01..05 adds heartbeat and caught-up monitoring to ingest cron jobs. Classification at ingestion adds latency per message. If the classification cascade (deterministic + LLM adjudication path) is slow on large batches, the cron heartbeat misses its window and the health monitor flags the job as degraded or paused — when in fact the job is running but slow due to classification.

**Existing components at risk:**
- LLM consolidation scheduler on 15-minute schedule (instrumentation.ts bootstrap, v1.5)
- Background embedding job (5-minute interval)
- New cron jobs for source ingestion (Drive, Slack, Gmail — CTX-FOLLOWUP-01..02)

**Prevention:**
1. Classification runs asynchronously with a provisional `private` label stamped immediately. The cron job completes with provisional labels and reports `caught_up=true`; classification backfill updates labels as a separate async process.
2. Cron health thresholds must account for classification backfill lag — do not set heartbeat windows tighter than the 95th-percentile classification time for the largest batch expected.

**Phase:** Memory Security Foundation + Cron Job Health (MEMSEC-03, CRON-HEALTH-01..05)

---

## Minor Pitfalls

### Pitfall m-01: Salience Decay Conflicts with Retention Policy for Restricted Memory

**What goes wrong:** The 4-tier salience decay formula (`rate/(1+LOG(1+access_count))`, MEM-02, v1.5) lowers the decay rate for frequently accessed memories — making them persist longer. If a restricted memory (finance, HR, legal) is frequently accessed by agents before the authz gate ships, its salience score resists decay and it persists beyond the intended retention window. Retention policy says delete; salience says keep.

**Prevention:** Retention policy wins over salience for restricted content. Add a retention policy check to the decay/cleanup job that removes restricted items regardless of access count. Retention policy check runs first; salience score is irrelevant for restricted content.

**Phase:** Memory Security Foundation (MEMSEC-01, MEMSEC-04)

---

### Pitfall m-02: Skill Registry Imports Can Contain Secrets

**What goes wrong:** The cross-harness skill registry (SKILL-01..04, Phase 72) imports SKILL.md files from external harnesses. These files can contain API endpoints, token patterns, or environment variable references embedded in skill preconditions or tool definitions. Without classification at import time, a SKILL.md containing credentials lands in `skill_registry` undetected.

**Prevention:** Run the deterministic detector pipeline on SKILL.md imports before writing to `skill_registry`. Flag any content matching credential/secret patterns for human review before the row is written.

**Phase:** Memory Security Foundation (MEMSEC-03)

---

### Pitfall m-03: Password Reset Bypasses Rate Limiting

**What goes wrong:** The password reset flow (AUTH-FOLLOWUP-02) sends a token to an email address. Without rate limiting on the reset request endpoint, an attacker can enumerate user emails (one request per second, checking for 200 vs. 404 responses) or flood a user's inbox.

**Prevention:** Rate-limit reset requests per email per hour. Return the same HTTP 200 response regardless of whether the email exists (constant-time response prevents enumeration). Set reset token expiry to 1 hour maximum at the DB level.

**Phase:** Auth + Team Hardening (AUTH-FOLLOWUP-01..03)

---

### Pitfall m-04: Email Invitation Tokens Without DB-Level Expiry

**What goes wrong:** The invite token system (v3.0) issues tokens. If expiry is enforced only in application logic and not as a database constraint, a code path that bypasses the expiry check (direct DB query, migration, or bug) can accept an expired token.

**Prevention:** Store `expires_at` in the invitations table and add a DB-level check constraint. Reject token use after expiry in the DB query itself, not just in the application layer. Run a periodic cleanup job for expired tokens.

**Phase:** Auth + Team Hardening (AUTH-FOLLOWUP-01..03)

---

### Pitfall m-05: Key Material Committed to .env.example or Operating Profile Defaults

**What goes wrong:** Envelope encryption introduces key material that must be configured per deployment profile. The operating profile pattern uses `.env.example` and operator-supplied `.env` files. If key material is committed to `.env.example` as a convenience default for local-dev (e.g., a sample AES key), it propagates to all OSS installs and the git history.

**Existing components at risk:** Operating profile system (local-dev/single-host/private-network/cloud-https/custom), `.env.example`, SECURITY.md

**Prevention:** Key material must never appear in `.env.example`. The `setup.sh` prereq script must generate a fresh key at first install and store it outside the repo. Add a CI check that scans `.env.example` for key-pattern strings and fails if any are present.

**Phase:** Memory Security Foundation (MEMSEC-07)

---

## Phase-Specific Warnings Summary

| Phase Topic | Specific Component at Risk | Likely Pitfall | Mitigation Required Before Phase Closes |
|-------------|---------------------------|----------------|------------------------------------------|
| Memory Security Foundation | FTS5/Qdrant/Neo4j existing content | Backfill blindness (C-01) | Reclassification sweep + purge + MEMSEC-08 negative tests passing |
| Memory Security Foundation | Background embedding job (instrumentation.ts) | Embeddings before classification (C-02) | Classify-before-embed ordering enforced at write |
| Memory Security Foundation | mem0 HTTP API write path | Ingestion gate bypass (C-03) | Retrieve-time classification of untrusted mem0 content documented and tested |
| Memory Security Foundation | SqliteSaver checkpoints | Checkpoint payload leak (C-04) | Classification labels + authz gate applied to checkpoint reads |
| Memory Security Foundation | 18-pattern scanner + new detectors | Detector sprawl (C-05) | Single DetectorPipeline merging both; old scanner feeds in as sub-stage |
| Memory Security Foundation | LLM classifier | Hallucinated labels + cost (M-03) | Deterministic-first cascade; LLM adjudicates only on low-confidence |
| Memory Security Foundation | Envelope encryption key rotation | Replay breaks post-rotation (M-04) | Additive key rotation; old key retained with `retired` status |
| Memory Security Foundation | Classification review queue | Unbounded queue (M-02) | SLA + drain path defined before first ingest |
| Memory Security Foundation | .env.example | Key material in VCS (m-05) | Key generation in setup.sh; CI scan of .env.example |
| Memory Security Foundation | Salience decay cleanup job | Decay vs. retention conflict (m-01) | Retention policy overrides salience for restricted content |
| Memory Security Foundation | Skill registry import | Secrets in SKILL.md (m-02) | Credential detector runs on import before DB write |
| Classification Cascade | Existing memories | Too-aggressive fail-closed (M-01) | Source-path auto-promotion rules + migration report before gate enforces |
| NOC Real-Data | All 14 NOC panels | Blank-zero vs. missing-telemetry (M-05) | NOC data contract enforced; NOC-11 test; no mock-data imports in production |
| Harness Evidence | audit_log / lineage / SEAL bundles | Two-truth audit (M-06) | Single canonical evidence schema; legacy tables project into it |
| Harness Evidence | LangGraph steps | Evidence collection blocks execution (M-10) | Async side-channel write following SEAL-06 fire-and-forget pattern |
| Cron Job Health | Ingest cron + classification latency | False-alarm degraded state (M-11) | Provisional label strategy; heartbeat thresholds account for backfill lag |
| Auth Hardening | JWT + OAuth | Duplicate principals (M-07) | Email-as-merge-key; bind OAuth sub to existing user_id on first login |
| Auth Hardening | A2A API keys | In-flight task broken by rotation (M-08) | Grace period; active-task display required before rotation confirms |
| Auth Hardening | OAuth middleware | Breaks API-key consumers (M-09) | Separate middleware chains; A2A integration test runs with OAuth active |
| Auth Hardening | Password reset endpoint | Enumeration + rate bypass (m-03) | Rate limit per email/hour + constant-time response |
| Auth Hardening | Invite tokens | Non-expiring tokens (m-04) | DB-level expiry constraint; not just application logic |

---

## Sources

- `/Users/lcalderon/github/memroos/.planning/PROJECT.md` — existing component inventory, tech decisions, constraint list
- `/Users/lcalderon/github/memroos/.planning/notes/memory-security-storage-spike.md` — two-gateway security model, raw vault design, non-goals
- `/Users/lcalderon/github/memroos/.planning/notes/privacy-classification-policy-spike.md` — classification cascade design, abstention requirement, human review workflow
- `/Users/lcalderon/github/memroos/.planning/REQUIREMENTS.md` — v4.0 requirements including SEAL-06 evidence bundle pattern, ORCH-08/09 rollback, RECALL-01/02 embedding job, HIL-01..03 edit payloads
