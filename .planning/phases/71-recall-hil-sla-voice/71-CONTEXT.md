# Phase 71 Context: Recall + HIL SLA + Voice

*Created: 2026-05-21*

Phase 71 extends the v4.0 orchestration substrate with three independent feature
groups, all unblocked once Phase 70 landed (`MemoryAdapter` interface + WAL
pragma stable):

1. **LLM Semantic Recall** (RECALL-01, RECALL-02) — local-embedding-ranked recall
   over `conversations.db` messages.
2. **HIL SLA Timers** (HIL-04, HIL-05, HIL-06) — per-interrupt-type SLA deadlines,
   a background escalation scheduler, and a live-countdown dashboard.
3. **Daily.co Meeting Bot** (VOICE-06, VOICE-07, VOICE-08) — a Pipecat bot that
   joins Daily.co rooms as a listener and writes meeting memory.

The three groups touch disjoint file sets and can execute in parallel.

---

<decisions>

These decisions are LOCKED. Plans MUST implement them exactly. Each is tagged
with a decision ID for traceability.

- **D-01 — Embeddings via Ollama `nomic-embed-text` only.** Semantic recall
  embeds queries and messages with the local Ollama `nomic-embed-text` model.
  NOT Voyage AI, NOT Anthropic, NOT OpenAI. The provider is gated behind the
  `MEMROOS_EMBEDDING_PROVIDER` env flag (`ollama` | `null`); `null` disables
  embedding compute and forces BM25-only behavior.

- **D-02 — New `message_embeddings` table in `conversations.db`.** Message
  embeddings live in a dedicated SQLite table in the existing
  `conversations.db` (`SQLITE_DB_PATH`). Qdrant remains EXCLUSIVELY for mem0
  vector memory — no message embeddings are written to Qdrant. The table is
  created additively via `initSchema()` (`CREATE TABLE IF NOT EXISTS`).

- **D-03 — BM25 is the default recall mode.** `GET /api/recall` accepts
  `mode=semantic|bm25|hybrid`. When `mode` is absent or unrecognized, BM25
  (the existing `recallByKeyword` FTS5 path) is used. `semantic` and `hybrid`
  are strictly opt-in.

- **D-04 — Hybrid mode fuses semantic + BM25 via Reciprocal Rank Fusion (RRF).**
  Hybrid runs the BM25 query and the semantic query, then merges the two ranked
  lists with RRF (`score = sum(1 / (k + rank_i))`, `k = 60`). RRF is chosen
  because it needs no score normalization across heterogeneous scorers.

- **D-05 — Graceful degradation on embedding outage.** When the embedding
  provider is unreachable or `MEMROOS_EMBEDDING_PROVIDER=null`, `semantic` and
  `hybrid` requests fall back to BM25 results and the response includes
  `degraded: true`. The endpoint NEVER returns a 5xx because of an embedding
  outage.

- **D-06 — Background embedding job: 50 messages/cycle, 5-minute interval.** A
  background job precomputes embeddings for messages lacking an embedding row,
  processing at most 50 messages per cycle on a 5-minute interval. It registers
  through the existing `instrumentation.ts` scheduler-singleton pattern.

- **D-07 — Per-interrupt-type SLA deadlines stored as ISO timestamps.** Each HIL
  interrupt/escalation type has a configurable SLA duration. The absolute
  `sla_deadline` is stored as an ISO-8601 timestamp on the `hil_escalations`
  row (the column already exists from Phase 64). SLA durations per type live in
  a config module, not hardcoded at call sites.

- **D-08 — `instrumentation.ts` scheduler polls expired HIL tasks every 60s.**
  A scheduler registered via `instrumentation.ts` runs every 60 seconds, finds
  open HIL escalations past their `sla_deadline`, and triggers the configured
  escalation action: `notify`, `auto-resolve`, or `abandon`.

- **D-09 — Dashboard shows live countdown + SLA traffic-light.** The escalations
  dashboard renders each pending HIL item with a live client-side countdown
  timer and a traffic-light status: green (>50% SLA remaining), amber
  (<50% remaining), red (overdue / breached).

- **D-10 — Pipecat upgraded to `pipecat-ai[daily]>=1.2,<2.0`.** The voice
  server `requirements.txt` is upgraded from `pipecat-ai[...]==1.0.0` to
  `pipecat-ai[daily]>=1.2,<2.0` so the `DailyTransport` is available. Existing
  cascade/Gemini pipeline imports must continue to resolve after the upgrade.

- **D-11 — Daily.co meeting bot is a listener.** The bot joins a Daily.co room
  via `DailyTransport` with room URL + token sourced from env/API. It is a
  passive listener — single-participant, no TTS reply into the meeting. Voice
  is an ingestion channel for organizational memory, not a standalone product.

- **D-12 — Per-speaker transcripts → `messages`; highlights → `hive_actions`.**
  Each speaker's utterances are written to the `messages` table
  (`agent_id='voice'`, `project='memroos'`, speaker identity captured in
  content/metadata). Meeting highlights are surfaced to `hive_actions`.

- **D-13 — Meeting URL/tokens NEVER written to `audit_log` or `audit_entries`.**
  The Daily.co room URL and join tokens are secrets. They MUST NOT appear in
  `audit_log`, `audit_entries`, or any persisted audit record. Audit entries
  for meeting join events reference an opaque `meeting_id` only.

- **D-14 — Recording-consent UI shown BEFORE joining.** A consent UI is
  presented and explicit consent recorded before the bot joins any room. The
  bot does not connect to the Daily.co transport until consent is confirmed.

- **D-15 — Daily.co is the only supported meeting transport.** Recall.ai
  bridge for Zoom/Teams/Meet is explicitly out of scope (see `<deferred>`).

</decisions>

---

<constraints>

- **Two-DB boundary.** `conversations.db` (`SQLITE_DB_PATH`) is the message /
  episodic store. `orchestration.db` is the LangGraph checkpoint store. Phase 71
  recall and embeddings work touches `conversations.db` only. HIL SLA work
  touches `conversations.db` (`hil_escalations` already lives there).

- **Additive schema only.** New tables/columns go through `initSchema()` with
  `CREATE TABLE IF NOT EXISTS` / guarded `ALTER TABLE` — never a destructive
  migration. Follow the existing `db-schema.ts` additive-migration pattern.

- **Next.js from `node_modules/next/dist/docs/`.** This is not the Next.js of
  training data. Before writing route handlers or `instrumentation.ts` changes,
  read the relevant guide under `node_modules/next/dist/docs/`. Heed
  deprecation notices.

- **GitNexus impact analysis.** Per `CLAUDE.md`, run `gitnexus_impact` before
  editing any existing symbol and `gitnexus_detect_changes()` before committing.
  If the GitNexus MCP is unavailable, fall back to `npx gitnexus impact <sym>`
  or grep-based caller analysis and document it in the SUMMARY.

- **Scheduler singleton.** Background jobs must register via the existing
  `tryAcquireSchedulerLock()` path in `instrumentation.ts` so only one Memroos
  process owns schedulers. Do not start raw `setInterval` jobs outside this.

- **mem0/Qdrant untouched.** No Phase 71 plan modifies mem0 or Qdrant config.
  `message_embeddings` is a separate SQLite table; the vector memory tier is
  unchanged.

- **Voice server is a separate Python service.** `services/voice-server` has its
  own `requirements.txt` and `pytest` suite. Voice plans must keep the existing
  cascade/Gemini pipeline tests green after the pipecat upgrade.

- **Embedding outage is non-fatal.** Any recall path that depends on embeddings
  must fail closed to BM25 with `degraded: true`, never a 5xx.

- **No new external services for HIL SLA.** The scheduler uses the Node runtime
  + SQLite only — no Redis/Celery/cron.

</constraints>

---

<deferred>

These ideas are explicitly OUT OF SCOPE for Phase 71. Plans MUST NOT implement
them.

- **Recall.ai bridge for Zoom/Teams/Meet.** Daily.co only in v4.0 (v4.1+
  candidate). Platform anti-bot measures make native Zoom/Teams transport
  unsupported.
- **Multi-participant meeting bot.** The Phase 71 bot is listener-only.
- **Voyage AI `voyage-4-large` embedding upgrade.** Ollama local in v4.0; the
  `MEMROOS_EMBEDDING_PROVIDER` flag is the future swap point.
- **Cross-project recall.** `crossProject` / `allowed_project_ids` (RECALL-03,
  RECALL-04) is Phase 72 scope. Phase 71 recall is single-project only.
- **Qdrant for message embeddings.** Message embeddings stay in SQLite; Qdrant
  remains exclusively mem0.
- **Recursive readdir for recall.** Not applicable in Phase 71; noted for
  completeness.
- **TTS reply into the meeting.** The bot does not speak; ingestion only.

</deferred>
