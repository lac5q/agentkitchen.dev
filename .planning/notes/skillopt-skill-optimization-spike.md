# SkillOpt Skill Optimization Spike

Date: 2026-05-25
Priority: P1
Status: backlog spike

## Source

- SkillOpt project: https://microsoft.github.io/SkillOpt/
- Paper: https://arxiv.org/abs/2605.23904
- Repository: https://github.com/microsoft/SkillOpt

## Recommendation

Integrate SkillOpt as an optional governed optimizer for MemRoOS skills, not as an autonomous runtime mutator.

SkillOpt's loop fits MemRoOS because it can turn scored rollouts, reflections, bounded `SKILL.md` edits, held-out validation, and rejected-edit buffers into candidate skill revisions. MemRoOS should own the governance plane: trace intake, privacy gates, train/validation/test splits, W scoring, evidence bundles, SEAL proposal lifecycle, operator approval, promotion, rollback, and cross-harness runtime export.

## Proposed Spike Scope

1. Design a `SkillOptAdapter` worker that consumes MemRoOS traces, `/api/skills/report` telemetry, golden sets, and SEAL evidence bundles.
2. Define a `skill_revision` or `skill_version_patch` SEAL proposal type for candidate edits to existing governed skills.
3. Persist optimization metadata: source skill version, train/validation/test split ids, model/prompt versions, accepted edit diff, rejected edits, W deltas, residual risks, replay handle, and rollback handle.
4. Import SkillOpt output into `skill_registry` as inert data first; never execute optimizer-produced skill text during import.
5. Add an operator-visible Skills UI path that shows the candidate diff, evidence, W delta, held-out pass/fail, rejected-edit summary, and promotion gate.
6. Export approved versions to Codex/Claude/OpenClaw runtime projections only after the SEAL proposal passes and an operator approves.

## Guardrails

- No direct mutation of active runtime skills, `AGENTS.md`, security policy, governance policy, or owner-protection instructions.
- No auto-apply for high-risk skills; low-risk auto-apply may be considered only after repeated non-regression history and tenant/operator opt-in.
- Training, validation, and held-out proof sets must be separate to avoid reward hacking.
- Sensitive traces must pass memory retrieval authorization and redaction gates before optimizer use.
- All optimizer-produced content is data, not instruction, until approved and exported.
- SkillOpt remains an optional worker dependency until the upstream project has enough maturity for production use.

## Acceptance Criteria

- A phase plan can identify 2-3 low-risk skills with existing eval coverage for the first prototype.
- Candidate skill revisions are represented as SEAL proposals with audit entries and rollback handles.
- A held-out behavioral eval shows non-regression before any runtime export.
- The operator can compare baseline skill, candidate skill, evidence, and residual risks before approval.
- No optimizer path can mutate active files or runtime projections without an explicit promotion gate.
