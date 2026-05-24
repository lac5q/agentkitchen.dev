---
title: Memory Security and Raw Storage Spike
date: 2026-05-23
status: backlog spike
backlog_requirements: MEMSEC-01..08
source_context: Juan meeting follow-up
---

# Memory Security and Raw Storage Spike

## Prompt

MemRoOS needs to preserve original agentic conversations and imported context
without turning the primary database into an unwieldy raw-data store. It also
needs enough enterprise access control for legal, finance, HR, confidential, and
public-promotion boundaries before memory recall can be trusted in customer or
multi-user environments.

## Working Recommendation

Use a raw evidence vault plus governed derived indexes. Do not treat full
database encryption as the primary leak-prevention mechanism. Encryption is
required defense-in-depth, but the core security boundary is classification at
ingestion and authorization at retrieval/use.

## Raw Conversation Storage Pattern

- Store original conversations as append-only compressed artifacts, not as large
  plaintext database rows. Use per-session or per-day `ndjson.zst` artifacts
  containing message, tool call, tool result, file reference, decision,
  approval, and checkpoint events.
- Keep the hot database focused on metadata: artifact URI, content hash, source,
  actor, tenant/project, timestamps, classification labels, retention policy,
  compression type, size, encryption key id, and replay state.
- Use content-addressed deduplication and hash chaining so raw evidence can be
  verified, replayed, archived, and deleted by retention policy.
- Keep summaries, chunks, FTS rows, embeddings, graph facts, and evidence bundles
  as derived projections that can be regenerated from the raw artifact when
  policy allows.

## Multimodal Embedding Boundary

- Treat text, image, audio, and video embeddings as derived indexes tied to raw
  artifact ids and source spans. Embeddings are not a replacement for the source
  and must carry model name, model version, dimension, modality, label version,
  and creation timestamp.
- For the MVP, start with text embeddings from transcripts, OCR, captions, and
  normalized text chunks. Store original binary media in the raw vault rather
  than SQLite.
- Do not embed sensitive raw content by default. Legal, finance, HR, credentials,
  payment, health, privileged, and sealed/private material should either remain
  unindexed or use redacted summaries explicitly marked as safe to index.

## Two-Gateway Security Model

1. **Ingestion and classification gate**
   - Default raw meetings, emails, DMs, browser history, files, finance, legal,
     HR, personal, and client material to private.
   - Apply deterministic detectors before model adjudication: regex, NER,
     source path, MIME type, sender domain, calendar attendees, Drive folder,
     Gmail label, Slack channel, attachment type, and secret/credential scans.
   - Allow LLM classification only as constrained adjudication over enumerated
     labels with confidence, reason codes, evidence span ids, and abstention.
   - Require human review for public promotion, low confidence, conflicting
     rules, or legal/finance/HR/credential/payment/privileged content.

2. **Retrieval and use gate**
   - Every memory search, context pack, ChatGPT action, export, summarization,
     agent dispatch, and derived-index write must check actor, role, capability,
     tenant/project, purpose, source freshness, and security labels.
   - Deny by default. Return redacted snippets or omit restricted items instead
     of relying on downstream prompts to behave safely.
   - Log allow, deny, redact, and human-review decisions with enough evidence for
     audit and regression tests.

## Label Dimensions

- `visibility`: `private`, `internal`, `public_safe`, `public_approved`
- `domain`: `legal`, `finance`, `hr`, `sales`, `client`, `engineering`,
  `personal`
- `sensitivity`: `pii`, `secret`, `credential`, `privileged`, `contract`,
  `payment`, `health`
- `policy`: `indexable`, `agent_visible`, `requires_redaction`,
  `requires_human_review`, `sealed`

## Encryption Decision

- Enable OS or volume encryption in every deployment profile.
- Add app-level envelope encryption for raw artifacts and sensitive JSON/detail
  fields before they are written to disk or copied into audit/recall stores.
- Treat Qdrant/vector stores, Neo4j/graph stores, FTS indexes, and backups as
  sensitive derived stores. Sensitive content must be filtered or redacted before
  it reaches those systems.
- Evaluate SQLCipher or another encrypted SQLite build later if whole-database
  page encryption is needed, but do not let it delay ingestion/retrieval policy
  enforcement. Whole-database encryption does not prevent app-layer or recall
  leaks after the process has decrypted the database.

## Spike Deliverables

- Raw artifact manifest schema and storage path convention.
- Security-label schema and migration path for messages, raw artifacts, audit
  rows, recall logs, memory writes, vector metadata, and graph facts.
- Policy-decision function contract for memory add/search/multi-search/context
  assembly/export.
- Redaction and indexing rules for FTS, Qdrant/vector, Neo4j/graph, qmd, and
  evidence bundles.
- Envelope encryption helper design, key id metadata, rotation plan, and backup
  restore test.
- Golden negative tests proving legal, finance, HR, credential, payment,
  privileged, and confidential memories cannot leak through recall or generated
  context.

## Non-Goals

- No blanket freeform LLM classifier for enterprise security labels.
- No raw binary media stored directly in SQLite as the long-term source of truth.
- No claim that database encryption alone makes memory recall safe.
- No public promotion from emails, meetings, DMs, finance, legal, HR, or client
  sources without positive approval evidence.
