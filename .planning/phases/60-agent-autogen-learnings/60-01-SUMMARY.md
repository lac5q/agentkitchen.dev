---
phase: 60
plan: 01
title: Agent Autogen Learnings
status: partial
completed: 2026-05-16
requirements: [AGENTGEN-01, AGENTGEN-02, AGENTGEN-03, AGENTGEN-04, AGENTGEN-05, AGENTGEN-06]
---

# Phase 60 Plan 01 — Agent Autogen Learnings: Summary

> Reconstructed during the 2026-05-16 reconciliation (see 57-01-SUMMARY.md note).
> This is the **least complete** v2.5 phase.

## Outcome

Proposal types (`agent_instruction_patch`, `skill_addition`,
`tool_routing_update`), trajectory scorer, and weight presets are implemented
and tested. Per-role golden sets are populated to the minimal viable bar. The
shared SEAL dogfood W-lift gap is closed for Tier 1 modeled memory/config-style
proposal classes; true behavioral lift for instruction/skill proposals remains
v3 scope.

## What Was Done

- Registry entries for the 3 agent proposal types; `lib/evals/trajectory-scorer.ts`;
  weight presets in `memroos.eval.yaml` and `presets.ts`.
- Per-role golden-set files (`sales/support/finance/ops`) scaffolded.
- Shared SEAL apply path now supports deterministic modeled post-apply
  re-scoring through `lib/seal/rescore.ts` and `EvalService.rescoreForProposal`.
- Reconciliation fix: sidebar nav had duplicate labels — `/agent-autogen` and
  `/memory-autogen` both rendered as "Agents"/"Memory", colliding with existing
  nav. Relabeled to "Agent Autogen" / "Memory Autogen".

## Gaps / Deferred

- **Golden sets populated to minimal viable (2026-05-16):** sales/support/
  finance/ops each 15 rows (11 positive + 4 policy-leak negative). Verified
  against the real judge: drift agreement ≥0.85 with both classes exercised
  (criterion 2 met at minimal-viable bar; full ~50-row sets still a follow-up).
  Reproducible via `golden-sets/.generate.mjs`.
- **Tier 1 dogfood W-lift is now capturable for modeled memory/config-style
  proposal classes.** The shared Phase 58 re-score path produces deterministic
  post-apply W movement through the real eval engine and records audit metadata
  that labels it as modeled.
- **Instruction/skill behavioral W-lift is intentionally not claimed.**
  `agent_instruction_patch` and `skill_addition` change future behavior only if
  the agent re-executes the task; v2.5 marks those as `wLiftModeled:false` and
  carries true behavioral lift to v3.

> Tier 1 closure path completed via `.planning/phases/58-seal-self-improvement/58-02-PLAN.md`. Tier 2 (instruction/skill behavioral W-lift) remains v3 scope.
