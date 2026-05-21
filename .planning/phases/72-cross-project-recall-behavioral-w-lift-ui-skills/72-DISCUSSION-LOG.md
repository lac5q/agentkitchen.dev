# Phase 72: Cross-Project Recall + Behavioral W-lift + UI + Skills - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md - this log preserves the alternatives considered.

**Date:** 2026-05-21
**Phase:** 72-cross-project-recall-behavioral-w-lift-ui-skills
**Areas discussed:** Cross-project recall boundaries, behavioral eval sandbox, async SEAL eval jobs, QMD update/freshness UI, cross-harness skill registry

---

## Cross-Project Recall Boundaries

| Option | Description | Selected |
|--------|-------------|----------|
| Explicit allowlist | Caller passes `crossProject: true` plus `allowed_project_ids`; single-project remains default. | yes |
| Implicit all projects | Search any project/repo available to the server. | |
| Let the agent decide | Planner chooses scope behavior during implementation. | |

**User's choice:** `/goal 72 all` approved discussing and capturing all Phase 72 areas; roadmap already locked explicit allowlist behavior.
**Notes:** This aligns with the product goal of permission-aware context packs and avoids recursive repo discovery.

---

## Behavioral Eval Sandbox

| Option | Description | Selected |
|--------|-------------|----------|
| Strict sandbox | Re-execute via A2A with no-op side-effect tool stubs and full evidence capture. | yes |
| Live tools | Re-execute proposals against live tools. | |
| Mode-specific | Let each proposal choose sandbox vs live execution. | |

**User's choice:** `/goal 72 all`; roadmap prerequisite already names sandboxed eval profile as a design prerequisite.
**Notes:** Live state mutation during behavioral eval is a critical pitfall and must be blocked by design.

---

## Async SEAL Eval Jobs

| Option | Description | Selected |
|--------|-------------|----------|
| Async job | `applyProposal()` returns `job_id`; UI polls job status and evidence. | yes |
| Blocking apply | Request waits for all held-out behavioral eval tasks to finish. | |
| Manual external run | Operator runs eval outside the product and pastes results. | |

**User's choice:** `/goal 72 all`; roadmap success criteria require immediate `job_id`.
**Notes:** Evidence bundles become the visible proof of what changed, what ran, and what can be replayed or rolled back.

---

## QMD Update And Library Freshness UI

| Option | Description | Selected |
|--------|-------------|----------|
| SSE progress | Operator triggers `qmd update`; progress streams to the UI. | yes |
| Polling only | Operator triggers update and polls status periodically. | |
| CLI only | Keep `qmd update` out of the UI. | |

**User's choice:** `/goal 72 all`; roadmap success criteria require UI trigger with SSE progress.
**Notes:** This is context freshness evidence, not a search-admin feature.

---

## Cross-Harness Skill Registry

| Option | Description | Selected |
|--------|-------------|----------|
| Manual import + governed contract | Import SKILL.md, normalize fields, show source harness and contract completeness. | yes |
| Auto-sync directories | Automatically scan agent directories and register skills. | |
| UI catalog only | Display skills but do not affect dispatch. | |

**User's choice:** `/goal 72 all`; requirements lock manual import, dispatch lookup, and UI completeness.
**Notes:** Cross-harness auto-sync and file-system skill generation are deferred unless a later plan adds isolated staging/rollback.

---

## the agent's Discretion

- Exact Phase 72 wave split.
- Exact table names, job runner shape, and route names, provided they follow existing MemroOS patterns and additive schema rules.
- Whether SEAL job status adds SSE in addition to required polling.

## Deferred Ideas

- Operations NOC live-data replacement outside Phase 72 evidence surfaces.
- Full Harness Control Plane for every task.
- Cross-harness skill auto-sync from agent directories.
- File-system skill generation without isolated staging/snapshot/rollback.
- Recall.ai bridge, Voyage embeddings, LiteLLM model gateway, and public eval API v2.
