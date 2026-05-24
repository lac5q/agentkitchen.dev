# Technology Stack — v5.0 Additions

**Project:** Memroos v5.0 Memory Trust + Operational Intelligence
**Researched:** 2026-05-23
**Scope:** NEW additions and changes ONLY. Existing validated stack (Next.js 16.2.4, LangGraph >=1.2, Pipecat, mem0, Qdrant Cloud, Neo4j, better-sqlite3, React Flow, Vitest, Playwright, jose, bcryptjs, Tailwind, @tanstack/react-query) is NOT re-listed.

---

## Feature Group 1: Memory Security Vault (MEMSEC-01..08)

### Envelope Encryption — TypeScript Side

**Verdict: Use `node:crypto` built-ins only. Zero new npm dependency.**

Node 26 (the runtime in use) ships `crypto.subtle` with stable support for:
- `AES-GCM` — authenticated encryption for raw artifacts and sensitive JSON fields
- `AES-KW` — key wrapping (wrapping a DEK under a KEK)
- `crypto.getRandomValues()` — secure nonce/IV generation
- `crypto.subtle.importKey / exportKey / wrapKey / unwrapKey` — full KEK/DEK lifecycle

The envelope encryption pattern is: generate a 256-bit DEK per artifact, encrypt artifact with AES-GCM (96-bit random nonce), wrap the DEK with a KEK using AES-KW, persist `{ key_id, wrapped_dek, nonce, ciphertext, tag }`. No external library is needed or justified — `@node-forge/crypto` and similar packages add surface area for a problem the standard library solves.

**KEK Provider interface (design decision for STACK):**

```typescript
interface KeyProvider {
  id(): string;                                  // key_id stored in metadata
  wrapDek(dek: CryptoKey): Promise<Uint8Array>;  // AES-KW or equivalent
  unwrapDek(wrapped: Uint8Array): Promise<CryptoKey>;
}
```

Ship two concrete providers:
- `LocalFileKeyProvider` — KEK in `~/.memroos/keys/<id>.key`, permissions 0600. Default for all profiles.
- `EnvKeyProvider` — KEK from `MEMROOS_KEK_<id>` env var. Default for `cloud-https` / CI.

Do NOT introduce AWS KMS SDK, GCP KMS SDK, or HashiCorp Vault client in v5.0. Document the interface so a cloud KMS adapter can be added in v5.1 without touching callsites.

**Key rotation path:** New KEK id is provisioned, old artifacts are re-wrapped lazily on access (background rotation job), `encryption_key_id` column drives which KEK unwraps each artifact.

### Envelope Encryption — Python Side

**Verdict: `cryptography` >=46 (already installed, version 46.0.5 confirmed).**

```python
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives.keywrap import aes_key_wrap, aes_key_unwrap
```

`AESGCM` handles authenticated encryption. `aes_key_wrap` / `aes_key_unwrap` handle DEK wrapping. Both are in `cryptography.hazmat` — no additional install. The Python service already lists `cryptography` (transitively from FastAPI/httpx); bump the pin to `>=46,<47` in memory service `requirements.txt`.

**Do NOT introduce:** PyCryptodome, PyNaCl, or any other crypto library. `cryptography` is the PyCA canonical library and is already present.

### Compression for Raw Vault

**Verdict: `node:zlib` (built-in, zstd stable in Node 22+). Python: `zstandard` 0.25.0.**

Node 26 ships `node:zlib` with stable zstd via `zlib.createZstdCompress()` / `zlib.createZstdDecompress()`. No npm package needed. Use level 3 (fast) for interactive ingestion paths, level 10 (high) for archival.

Python vault writer uses `zstandard` 0.25.0 — Python 3.14 wheels confirmed available on PyPI (uploaded September 2025). Pin: `zstandard>=0.25,<1.0`.

**Do NOT add:** `@mongodb-js/zstd`, `fzstd`, `zstd-napi`, or any native npm module. The project already has one native-module incident (node-llama-cpp arm64); do not create another. Node's built-in is the correct choice.

### Raw Artifact Storage Layout

**Verdict: Content-addressed local filesystem + SQLite metadata index. No object storage SDK.**

```
~/.memroos/vault/<YYYY>/<MM>/<sha256-prefix-2>/<sha256-full>.ndjson.zst.enc
```

Each file is an AES-GCM-encrypted zstd-compressed NDJSON stream. The SQLite table `raw_artifacts` holds: `id`, `sha256`, `artifact_path`, `source`, `actor`, `tenant_id`, `classification_labels`, `encryption_key_id`, `wrapped_dek`, `nonce`, `size_bytes`, `compression_type`, `retention_policy`, `created_at`, `chain_hash`. No new library needed — `fs.createWriteStream`, `node:zlib`, and `crypto.subtle` compose the full write path.

### Classification Cascade (MEMSEC-02..03, CTX-FOLLOWUP-03)

**Layer 1 — Deterministic detectors: Extend existing `content-scanner.ts` + `iris-scanner.ts`**

The existing 18-pattern scanner (SEC-01, v1.5) and Iris pre-flight scanner (v2.1) already run regex + heuristic detection. Extend these TypeScript modules — do not replace them with a new library. Add:
- Source-path classifier (Drive folder prefix, Gmail label, Slack channel → domain label)
- MIME type gate (PDF/DOCX/audio → binary vault; plain text → inline)
- Sender domain allowlist/denylist for `visibility` promotion

**Layer 2 — NER/PII detection: `presidio-analyzer` 2.2.362 as a Python service endpoint**

Presidio is a Python library (not a Node one). The correct integration is a thin FastAPI endpoint in the `services/memory/` service that accepts a text payload and returns detected entities with spans and confidence. Do not try to run Presidio in Node.js.

```
npm package: none
Python: presidio-analyzer>=2.2.362,<3.0
Python: presidio-anonymizer>=2.2.362,<3.0
Python: spacy>=3.7,<4.0  (en_core_web_lg model for NER)
```

Install the spaCy model at service startup: `python -m spacy download en_core_web_lg`

The TypeScript side calls `/internal/classify` via `fetch` to the memory service, exactly like the existing mem0 HTTP-only pattern. This keeps the NER heavy lifting in Python where the ecosystem is strongest.

**Layer 3 — Constrained LLM adjudication: Extend existing Anthropic SDK usage**

Use the existing `@anthropic-ai/sdk` (0.94.0) to call the adjudicator prompt. No new library. The adjudicator must: accept enumerated labels only, output strict JSON with `confidence`, `reason_code`, `evidence_span_ids`, and `abstain: true` when uncertain. Wire into the classification cascade after Presidio.

**Do NOT add:** Guardrails AI, Rebuff, or any LLM output validation library. Strict JSON + Zod validation (already used in the codebase) is sufficient.

---

## Feature Group 2: Auth Hardening (AUTH-FOLLOWUP-01..03)

### Decision: Keep Custom Auth Stack — Do NOT migrate to Better Auth or Auth.js

**Rationale:**
- v3.0 shipped RBAC (jose, bcryptjs, custom session, refresh-token rotation, RBAC middleware, tenant model).
- v3.1 fixed 8 critical security findings in this exact code (HttpOnly cookies, 5 missing auth guards, TOCTOU race, x-forwarded-host spoofing).
- Migration to Better Auth means schema migration on a security-critical layer that was just hardened. Better Auth v1.6 has Next.js 16 support (confirmed via Context7: `proxy.ts` pattern), but migration risk far exceeds the benefit when the gap is only email delivery + OAuth providers.
- The `team_invitations` table, refresh tokens, and RBAC roles are all already in SQLite — the primitive is there, just missing the email delivery wire.

**What needs to be added:**

**Email delivery:**

Add a pluggable `Mailer` interface to the auth layer, not a hard dependency:

```typescript
interface Mailer {
  send(to: string, subject: string, html: string): Promise<void>;
}
```

Two concrete implementations (selected by env/profile):
- `ResendMailer` — uses `resend` SDK. Primary for cloud-https profile.
- `SmtpMailer` — uses `nodemailer`. Fallback for single-host/private-network with existing SMTP server.

| Library | Version | Why |
|---------|---------|-----|
| `resend` | 6.12.3 | Fastest path for cloud-https; native Next.js App Router integration; 45KB bundle; automatic bounce suppression |
| `nodemailer` | 8.0.8 | SMTP fallback for self-hosted; 15M weekly downloads; stable; needed for non-Resend SMTP |
| `@react-email/components` | 1.0.12 | React-based email templates; renders to HTML for both Resend and nodemailer; avoids raw HTML strings |
| `react-email` | 6.3.2 | Dev preview server for email templates |

Profile mapping: `MEMROOS_MAILER=resend|smtp`. If unset and `RESEND_API_KEY` is present, use Resend. If unset and `SMTP_HOST` is present, use SMTP. If both absent, log and no-op (invite URL still returned for manual delivery in local-dev).

**What needs to be built (routes, no new libs):**
- `POST /api/auth/password-reset/request` — same pattern as `invite/route.ts` (token_hash in `password_reset_tokens` table, email delivery)
- `POST /api/auth/password-reset/confirm` — validate token, allow bcrypt re-hash
- OAuth callback routes: `GET /api/auth/oauth/[provider]/authorize` and `GET /api/auth/oauth/[provider]/callback`

**OAuth providers:**

| Library | Version | Why |
|---------|---------|-----|
| `arctic` | 3.7.0 | Pure TypeScript, runtime-agnostic, Fetch-based; no DB opinion; handles Google/GitHub/Microsoft OIDC + PKCE + state; pairs cleanly with existing jose JWT session pattern |

Arctic generates state + PKCE verifier, the callback validates the code, and the existing `signAccessToken` / `generateRefreshToken` session primitives handle session creation. The OAuth identity is stored as a new `oauth_accounts` table linking `provider`, `provider_user_id`, and `users.id`.

**Defer enterprise SAML / WorkOS to v5.1+.** "OAuth/SSO" in the milestone means Google/GitHub OIDC. No SAML infrastructure is warranted at this stage.

**Role-aware navigation gating:** No new library. Add `requireRole()` middleware (already in `middleware-roles.ts`) calls to navigation-level middleware/proxy. Next.js 16 proxy pattern is: `proxy.ts` (renamed from `middleware.ts`) uses `getSessionCookie` for optimistic redirect. Full session validation stays in route handlers.

---

## Feature Group 3: Cron Health + Schedules Console (CRON-HEALTH-01..05, UX-FOLLOWUP-03)

**Verdict: Extend existing `instrumentation.ts` + `scheduler-singleton.ts` pattern. No new scheduler library.**

The project has a working in-process scheduler (consolidation 15m, decay, HIL SLA 60s, embedding job) behind a cross-process lock singleton. The gap is: no observable health state, no declarative job registry, no pause/resume controls.

**Add to SQLite schema (`db-schema.ts`):**
```sql
CREATE TABLE IF NOT EXISTS cron_jobs (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  schedule_ms INTEGER NOT NULL,
  status TEXT DEFAULT 'running',  -- running|paused|stopped|error
  last_tick_at TEXT,
  last_success_at TEXT,
  last_error TEXT,
  error_count INTEGER DEFAULT 0,
  next_tick_at TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);
```

Each scheduler registers itself in this table at startup and updates `last_tick_at` + `last_success_at` on each tick. A watchdog check (added to the existing scheduler lock process) marks jobs as `warning` if `last_tick_at` is more than 2× the expected interval.

**New API endpoint:** `GET /api/cron-health` — reads the table, computes `status`, `caught_up`, and `lag_ms` per job. No new library.

**Controls:** `POST /api/cron-health/[id]/pause` and `/resume` — write `status` to the DB; each scheduler reads its status at tick start and skips the work body if `paused`. Pause/resume do not restart the interval timer; they gate the work, not the tick.

**Do NOT add:** `node-cron`, `croner`, `cron-parser`, BullMQ, or any scheduler library. The existing `setInterval` pattern is sufficient and avoids Redis dependency.

---

## Feature Group 4: NOC Real-Data Wiring (NOC-01..14)

**Verdict: No new libraries. Extend existing SSE + React Query patterns.**

The NOC real-data work is a wiring exercise: connect existing `/api/*` endpoints to the panels that currently import `noc-mock-data.ts`. The existing architecture already has all the primitives.

**SSE telemetry streams (efficiency signals — NOC-10):**

New streams needed: retrieval-call counts, source re-read events, token ingest share, operator re-ask events. Pattern: `GET /api/telemetry/stream` — Next.js Route Handler returning `text/event-stream`. Matches the existing `/api/orchestration` SSE route from v4.0 (qmd flow trigger). Use `export const dynamic = "force-dynamic"` on all SSE routes.

**Client reconnect:** Native `EventSource` auto-reconnects; add 15-second heartbeat events from the server to detect stale connections (standard SSE practice).

**Telemetry event store:** Add `efficiency_events` table to SQLite (same `db-schema.ts` pattern):
```sql
CREATE TABLE IF NOT EXISTS efficiency_events (
  id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,  -- retrieval_call|source_reread|token_ingest|user_reask|rediscovery
  task_id TEXT,
  agent_id TEXT,
  payload TEXT,  -- JSON
  created_at TEXT DEFAULT (datetime('now'))
);
```

**Provenance metadata:** Add a `SourcedResponse<T>` TypeScript type:
```typescript
interface SourcedResponse<T> {
  data: T;
  source: string;       // e.g. "/api/memory-stats"
  lastUpdated: string;  // ISO timestamp
  window: string;       // e.g. "24h"
  status: 'live' | 'empty' | 'degraded' | 'missing';
  warnings?: string[];
}
```

Wrap every NOC panel's API response in this type. No library needed.

**Do NOT add:** WebSocket library, Socket.io, Redis pub/sub, Pusher, or any external streaming infrastructure. SSE scales to single-host deployments without Redis and matches the existing qmd/HIL SSE patterns.

---

## Feature Group 5: Harness Evidence Bundles

**Verdict: No new libraries. CAS local filesystem + SQLite metadata.**

Evidence bundles (Plan-Execute-Verify timelines, source/memory/tool read-write sets) are stored as content-addressed NDJSON files — the same vault pattern as raw artifacts, without encryption (unless they contain classified content, in which the classification gate applies).

**Storage path:**
```
~/.memroos/evidence/<task_id>/<phase>-<sha256-prefix-8>.ndjson.zst
```

**SQLite metadata table:**
```sql
CREATE TABLE IF NOT EXISTS harness_evidence (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL,
  phase TEXT NOT NULL,   -- plan|execute|verify
  artifact_path TEXT NOT NULL,
  sha256 TEXT NOT NULL,
  read_set TEXT,   -- JSON array of memory/tool/source ids read
  write_set TEXT,  -- JSON array of memory/tool/source ids written
  assumptions TEXT, -- JSON
  residual_risks TEXT, -- JSON
  replay_handle TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);
```

Serialization: plain `JSON.stringify` per event, `\n`-joined, then `node:zlib` zstd compressed. No separate NDJSON library — the format is trivial. Read path uses a streaming line splitter (`readline.createInterface`).

**Replay handles:** Store enough state (thread_id + checkpoint_id from LangGraph SqliteSaver) so any harness state can be restarted. No new infrastructure.

---

## What NOT to Add

| Category | Library | Reason |
|----------|---------|--------|
| Auth migration | Better Auth, Auth.js/NextAuth | v3.0/v3.1 custom stack just hardened; migration risk >> benefit |
| Auth migration | WorkOS | Deferred to v5.1+; no SAML needed now |
| Database encryption | SQLCipher | Spike explicitly defers; app-layer encryption is the boundary, not page encryption |
| Cache/queue | Redis, BullMQ, node-cron | v2.4 decision: no Redis; in-process scheduler sufficient |
| Node compression | @mongodb-js/zstd, fzstd, zstd-napi | Native modules; Node 26 built-in zstd is the answer |
| Streaming | Socket.io, Pusher | SSE is sufficient and simpler for single-host profile |
| PII detection (Node) | Any Node.js NER lib | Presidio in Python service is the correct boundary |
| OCR / multimodal | Tesseract, pdf-parse | Out of scope for v5.0; spike says "text-first MVP" |
| Cloud KMS | @aws-sdk/client-kms, @google-cloud/kms | LocalFileKeyProvider is sufficient; plug in v5.1+ |
| Python crypto | PyCryptodome, PyNaCl | `cryptography` 46 already installed and sufficient |

---

## Version Pin Summary (New Dependencies Only)

### TypeScript / npm

| Package | Version | Purpose | Profile |
|---------|---------|---------|---------|
| `arctic` | `^3.7.0` | OAuth 2.0 PKCE clients (Google, GitHub, Microsoft) | Auth hardening |
| `resend` | `^6.12.3` | Transactional email delivery (cloud-https profile) | Auth hardening |
| `nodemailer` | `^8.0.8` | SMTP email fallback (single-host profile) | Auth hardening |
| `@types/nodemailer` | `^6` | TypeScript types for nodemailer | Auth hardening dev dep |
| `@react-email/components` | `^1.0.12` | React email templates | Auth hardening |
| `react-email` | `^6.3.2` | Email template dev preview | Auth hardening dev dep |

**No other npm packages.** All encryption, compression, telemetry SSE, evidence bundles, and cron health use Node.js built-ins or existing dependencies.

### Python

| Package | Version | Purpose | Service |
|---------|---------|---------|---------|
| `presidio-analyzer` | `>=2.2.362,<3.0` | PII/NER detection layer 2 of cascade | memory service |
| `presidio-anonymizer` | `>=2.2.362,<3.0` | Redaction output | memory service |
| `spacy` | `>=3.7,<4.0` | NER model backing Presidio | memory service |
| `zstandard` | `>=0.25,<1.0` | Zstd compression for Python vault writer | memory service |

**Pin tightening (existing):** `cryptography>=46,<47` in memory service (currently unpinned transitively).

**spaCy model installation** (not a pip package — add to service startup or Dockerfile):
```bash
python -m spacy download en_core_web_lg
```

---

## Integration Points

| Feature | TypeScript Entry Point | Python Entry Point |
|---------|----------------------|-------------------|
| Envelope encryption | `src/lib/crypto/envelope.ts` (new) | `services/memory/crypto.py` (new) |
| KEK provider | `src/lib/crypto/key-provider.ts` (new) | — |
| Classification cascade | `src/lib/classification/cascade.ts` (new) → `fetch('/internal/classify')` | `services/memory/classify.py` FastAPI route (new) |
| Presidio NER | — | `services/memory/presidio_service.py` (new) |
| Raw vault write | `src/lib/vault/writer.ts` (new) | `services/memory/vault.py` (new) |
| Email delivery | `src/lib/auth/mailer.ts` (new) | — |
| OAuth callback | `src/app/api/auth/oauth/[provider]/` (new) | — |
| Cron health | `src/lib/scheduler/cron-registry.ts` (new) | — |
| Cron health API | `src/app/api/cron-health/route.ts` (new) | — |
| NOC telemetry SSE | `src/app/api/telemetry/stream/route.ts` (new) | — |
| Evidence bundles | `src/lib/harness/evidence.ts` (new) | — |

---

## Sources

- Better Auth Next.js 16 proxy support: [Context7 /better-auth/better-auth docs](https://github.com/better-auth/better-auth)
- Better Auth SQLite adapter: [Context7 /better-auth/better-auth SQLite docs](https://github.com/better-auth/better-auth/blob/main/docs/content/docs/adapters/sqlite.mdx)
- Arctic OAuth clients: [Context7 /pilcrowonpaper/arctic](https://github.com/pilcrowonpaper/arctic), version 3.7.0 confirmed via npm
- Resend Next.js App Router: [Context7 /websites/resend](https://resend.com/docs/send-with-nextjs), version 6.12.3 confirmed via npm
- nodemailer version 8.0.8: [npm](https://www.npmjs.com/package/nodemailer)
- @react-email/components 1.0.12: confirmed via npm
- presidio-analyzer 2.2.362: [PyPI](https://pypi.org/project/presidio-analyzer/)
- zstandard 0.25.0 Python 3.14 wheels: [PyPI](https://pypi.org/project/zstandard/) + [GitHub issue #286](https://github.com/indygreg/python-zstandard/issues/286)
- Node.js zlib zstd stability: [Node.js v26 docs](https://nodejs.org/api/zlib.html), stability 2-Stable
- cryptography 46.0.5: `pip show cryptography` (installed)
- Microsoft Presidio: [GitHub](https://github.com/microsoft/presidio), [docs](https://microsoft.github.io/presidio/analyzer/)
- PEP 784 (zstd in Python stdlib, future): [peps.python.org](https://peps.python.org/pep-0784/)
