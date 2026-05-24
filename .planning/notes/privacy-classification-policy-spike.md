---
title: Privacy Classification Policy Spike
date: 2026-05-23
status: backlog spike
backlog_requirement: CTX-FOLLOWUP-03
---

# Privacy Classification Policy Spike

## Prompt

MemRoOS needs to classify meetings, emails, and imported data as private, public,
finance, legal, and related labels with high outcome accuracy and minimal
hallucination risk. The initial idea is to use AI agents to generate
markdown-based rules and decision trees, similar to agent-authored classifiers
for error triage, fraud detection, traffic analysis, email labeling, or
transaction categorization.

## Working Recommendation

Use agent-generated markdown rules and decision trees, but only as one layer in
a governed policy classifier cascade. Do not let an LLM freely decide privacy,
legal, finance, or public-safety labels.

The durable design should be:

1. **Default private.** Raw meetings, emails, DMs, browser history, jobhunt,
   finance, and legal data enter as private unless a stricter policy explicitly
   promotes them.
2. **Separate label dimensions.** Avoid one overloaded enum. Track independent
   dimensions:
   - `visibility`: `private`, `internal`, `public_safe`, `public_approved`
   - `domain`: `finance`, `legal`, `sales`, `client`, `personal`, `engineering`
   - `sensitivity`: `pii`, `secret`, `credential`, `privileged`, `contract`,
     `health`, `payment`
   - `policy`: `indexable`, `agent_visible`, `requires_redaction`,
     `requires_human_review`
3. **Hard deterministic gates first.** Use regex, NER, metadata, source-path,
   MIME type, sender domain, calendar attendee, Drive folder, Gmail label, and
   attachment detectors before model adjudication.
4. **Markdown rules are inspectable policy.** Agents can draft and maintain
   decision rules, but rules need versioning, tests, review, and replay against
   golden examples.
5. **LLM as constrained adjudicator only.** Model output must be strict JSON
   over enumerated labels, confidence, reason code, evidence span ids, and
   `abstain=true` when uncertain. No evidence span means no label.
6. **Public is the strictest promotion.** `public_safe` and `public_approved`
   require positive proof, not absence of detected risk. Meeting/email material
   should not become public without explicit promotion evidence.
7. **Eval-gated promotion.** Maintain a sensitivity-classification golden set
   and optimize public/approval labels for near-zero false positives. Prefer
   over-classifying as private to leaking sensitive material.
8. **Human review queue.** Low confidence, conflicting rules, legal, finance,
   credential, and public-promotion cases route to human review with evidence
   spans and policy reason codes.

## Spike Questions

- What metadata is available at ingestion time for Gmail, Spark, calendar,
  Drive, local files, qmd, mem0, Slack, and meeting transcripts?
- Which deterministic detectors already exist in MemRoOS and which need to be
  generalized beyond agent output scanning?
- What schema should represent multi-dimensional labels, confidence, evidence
  spans, source provenance, redaction status, and review state?
- Where should classification run: ingestion, indexing, retrieval, public
  export, or all four with staged promotion?
- What is the minimum golden set needed to validate private/public/legal/finance
  behavior before this is allowed to affect agent visibility or public output?

## Spike Deliverables

- Proposed label schema and migration path.
- Policy rule format for markdown-authored classifier rules.
- Deterministic detector inventory and gap list.
- Constrained LLM adjudicator contract with abstention behavior.
- Golden-set plan with per-label precision/recall targets.
- Human-review and promotion workflow for public/legal/finance conflicts.

## Non-Goals

- No automatic public promotion from emails, meetings, DMs, or finance/legal
  sources.
- No freeform LLM-only classifier for sensitive labels.
- No broad rewrite of context-source ingestion before the source contract gaps
  in `CTX-FOLLOWUP-01` and runtime-health gaps in `CTX-FOLLOWUP-02` are
  understood.
