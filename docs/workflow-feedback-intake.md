# Workflow Feedback Intake

MemroOS launch feedback should turn concrete agent workflow pain into either a docs fix, a product issue, or a roadmap signal. The pinned GitHub issue and workflow feedback template are the canonical intake paths for v0.9 launch feedback.

## Intake links

- Pinned issue: https://github.com/lac5q/memroos/issues/11
- New workflow feedback form: https://github.com/lac5q/memroos/issues/new?template=workflow_feedback.yml
- v0.9.0 release: https://github.com/lac5q/memroos/releases/tag/v0.9.0

## Labels

Use these labels consistently so repeated patterns are easy to find:

- `feedback`: Any workflow-specific report from a builder.
- `needs-triage`: New feedback that has not been classified yet.
- `setup`: Install, first-run, environment, or local startup friction.
- `docs`: Missing, confusing, or outdated documentation.
- `integration`: Runtime, framework, MCP, A2A, or external tool integration feedback.
- `memory`: Memory capture, recall, source grounding, or context-pack feedback.
- `governance`: Approvals, audit trail, permissions, policy, or operator controls.
- `a2a`: Agent-to-agent card, dispatch, or protocol feedback.
- `converted-to-issue`: Feedback that has already been split into a concrete follow-up issue.
- `priority:launch`: Feedback that blocks or materially weakens the launch funnel.

## Response SLA

During launch week:

1. Acknowledge new workflow feedback within 24 hours.
2. Ask for only the missing detail needed to reproduce or classify the workflow.
3. Apply one or more area labels.
4. Remove `needs-triage` once the feedback is classified.
5. Convert actionable feedback into a focused GitHub issue or a docs patch.
6. Link the derived issue or docs PR back to the original feedback.

## First response template

```md
Thanks for the concrete workflow. I am classifying this as `<area>`.

What I heard:
- Runtime or stack: <runtime>
- Context gap: <gap>
- Proof or approval gap: <gap>

Next step: <docs fix | product issue | needs one more detail>.
```

## Conversion rules

Convert feedback into a new issue when any of these are true:

- Two or more builders report the same missing context source, setup failure, or integration gap.
- A single report includes clear reproduction steps or a missing docs path.
- The feedback blocks the v0.9 quickstart, demo path, or workflow feedback loop.
- The report names a concrete runtime or protocol gap, such as A2A card shape, MCP registration, Codex, Claude Code, Google ADK, LangGraph, CrewAI, AutoGen, Hermes, or OpenClaw behavior.

Turn the feedback into docs when the fix is explanatory rather than functional. Examples: quickstart clarification, architecture explanation, security model clarification, or sample runtime context pack.

## Weekly synthesis

At the end of launch week, review all open `feedback` issues and summarize:

- Top repeated context gaps.
- Top repeated proof or approval gaps.
- Setup friction that caused abandonment.
- Runtimes or frameworks most frequently mentioned.
- Issues created and docs changed from feedback.

Use that summary to update the roadmap and the pinned issue comment thread.
