---
title: Integration Modernization Spike
date: 2026-05-21
status: backlog triage
---

# Integration Modernization Spike

## Decision Summary

Add dedicated backlog coverage for the risky upgrades, but keep routine patch bumps inside one verification sweep.

- **Add as dedicated migration work:** `mem0ai` 2.x and FastMCP v3.x.
- **Add as protocol/spec audit work:** A2A/ADK, especially agent-card discovery, message methods, streaming/cancel semantics, and legacy aliases.
- **Add as framework-boundary audit work:** Next.js proxy/middleware conventions, because the app uses auth and routing at that boundary.
- **Add as staged major-toolchain audit:** `jose` 6, shadcn CLI 4, ESLint 10, and TypeScript 6.
- **Keep as patch sweep unless tests fail:** Pipecat/Daily and LangGraph 1.2.x.

## Findings

### mem0ai

- Local evidence: `services/memory/requirements.txt` pins `mem0ai>=0.1,<1.0`; the local environment has used `0.1.118`.
- Current upstream evidence: Mem0 released Python SDK `v2.0.2` on 2026-05-07 with security hardening and SDK changes.
- Decision: add a dedicated migration requirement. This is the largest integration risk after FastMCP because it sits under vector/graph memory, queue retry behavior, and `/api/memory/*` expectations.
- Verification needed: instantiate `Memory.from_config`, add/search/delete smoke, queued-write retry tests, Qdrant/Neo4j config compatibility, memory health endpoint, and unified MCP `memory_search`/`memory_save` probes.

### A2A / ADK

- Local evidence: `apps/memroos/src/lib/a2a/types.ts` sets `A2A_VERSION = "1.0"` and keeps both canonical `/.well-known/agent-card.json` and legacy `/.well-known/agent.json` paths.
- Local evidence: `examples/adk-a2a-agent/agent.py` references the optional `google-adk[a2a]` runtime, but the main app does not pin an ADK runtime package.
- Current upstream evidence: the A2A spec registers `/.well-known/agent-card.json`; streaming and push-notification operations must return specific unsupported-operation errors when capabilities are absent.
- Current upstream evidence: ADK now documents an A2A extension path using `RemoteA2aAgent(use_legacy=False)` and describes the legacy A2A/ADK executor as having streaming/data-handling limitations.
- Decision: add a spec-drift audit before extending A2A/ADK. The legacy alias can stay temporarily, but it needs a tested compatibility policy and current-spec fixtures.
- Verification needed: generated MemroOS agent card against current schema, inbound `message/send`, `message/stream`, `tasks/get`, `tasks/cancel`, subscribe behavior if supported, JSON-RPC naming, HTTP+JSON route naming, auth metadata, Google ADK fixture interop, and an explicit legacy-vs-extension decision for ADK clients.

### Pipecat / Daily

- Local evidence: `services/voice-server/requirements.txt` allows `pipecat-ai[daily,...]>=1.2,<2.0`; code already imports `DailyTransport` from `pipecat.transports.daily.transport`, but comments still mention Pipecat 1.0-era assumptions.
- Current upstream evidence: the current DailyTransport docs still expose `DailyTransport`/`DailyParams` and Daily-specific params.
- Decision: do not add a standalone major migration. Keep this inside a patch sweep and clean stale comments/import assumptions while running listener/transcript smokes.
- Verification needed: `test_pipeline_daily.py`, real or mocked Daily room join, transcript frame speaker fallback, and secret redaction for room URL/token.

### LangGraph

- Local evidence: `services/orchestration/requirements.txt` allows `langgraph>=1.2,<2.0`; orchestration uses `SqliteSaver.from_conn_string()` and HIL/checkpoint tests exist.
- Local environment evidence: `.venv` has `langgraph==1.2.0`, `langgraph-checkpoint==4.1.0`, and `langgraph-checkpoint-sqlite==3.1.0`; `langgraph-checkpoint-sqlite` is already at the latest PyPI version checked on 2026-05-21.
- Current upstream evidence: LangGraph documents `SqliteSaver`/`AsyncSqliteSaver` as separate checkpointer integrations and emphasizes that graph-code changes apply to resumed checkpoint threads.
- Current upstream evidence: the SQLite checkpointer has had package-specific security advisories below `3.0.1`, so tracking only the `langgraph` package version is insufficient.
- Decision: do not add a standalone migration. Patch from `langgraph` 1.2.0 to 1.2.1 inside the modernization sweep, keep `langgraph-checkpoint-sqlite` explicitly inventoried, and promote only if checkpoint tests expose behavior changes.
- Verification needed: orchestration graph runtime tests, HIL resume/edit tests, retry policy tests, persisted checkpoint resume smoke, and an explicit `langgraph-checkpoint-sqlite>=3.0.1`/latest check.

### Next.js Proxy / Middleware

- Local evidence: app dependency is `next ^16.2.4`; `apps/memroos/src/proxy.ts` is active and auth-sensitive.
- Current upstream evidence: Next.js 16 deprecates `middleware` in favor of `proxy`; the docs provide a codemod and recommend renaming the function/export.
- Decision: add as a framework-boundary audit, not merely a patch bump. Proxy behavior touches auth, tenant routing, and request redirects.
- Verification needed: proxy unit tests, authenticated/unauthenticated page/API smokes, route matcher behavior, host redirect behavior, and confirmation that the project has no stale `middleware` convention.

### SDK / UI / Toolchain Majors

- Local evidence: `apps/memroos/package.json` uses `jose ^5.10.0`, `shadcn ^3.8.3`, `eslint ^9`, and `typescript ^5`.
- Latest npm versions checked on 2026-05-21: `next` 16.2.6, `jose` 6.2.3, `shadcn` 4.8.0, `eslint` 10.4.0, and `typescript` 6.0.3.
- Current upstream evidence:
  - `jose` v6 is the actively maintained major; v5 receives security-policy coverage but not normal bug fixes/features.
  - shadcn CLI v4 adds a new agent-oriented CLI surface, presets, dry-run, templates, and monorepo support.
  - ESLint 10 changes Node support, config lookup, `eslint-env` behavior, and several rule/plugin APIs.
  - TypeScript 6 is a transition release toward TypeScript 7 and changes defaults such as `rootDir`.
- Decision: add a staged audit requirement. These should not be grouped with routine app patch updates because auth crypto, codegen, lint config, and typechecking can fail differently.
- Verification needed: JWT sign/verify/cookie auth tests for `jose`, shadcn dry-run/component registry check, `npm run lint`, `npm run typecheck`, Next build, and representative Playwright auth/navigation smoke.

## Backlog Shape

Use these follow-ups:

- `INT-FOLLOWUP-04`: mem0ai 2.x migration.
- `INT-FOLLOWUP-05`: A2A/ADK current-spec compatibility pass.
- `INT-FOLLOWUP-06`: runtime patch sweep for Pipecat/Daily, LangGraph, and Next 16.2.x proxy behavior.
- `INT-FOLLOWUP-07`: staged major audit for `jose`, shadcn, ESLint, and TypeScript.

## Research Addendum - 2026-05-21

The deeper research keeps the backlog split the same, with two refinements:

- A2A/ADK should explicitly evaluate ADK's non-legacy A2A extension mode instead of only checking generic A2A paths.
- LangGraph should inventory `langgraph-checkpoint-sqlite` separately. The local venv is already on `3.1.0`, but old/vulnerable SQLite checkpointer ranges are exactly the kind of transitive integration drift this sweep should catch.

Priority order:

1. `INT-FOLLOWUP-02` FastMCP v3 and `INT-FOLLOWUP-04` mem0ai 2.x, because they affect core MCP/memory runtime.
2. `INT-FOLLOWUP-05` A2A/ADK, because extension work should not build on stale protocol assumptions.
3. `INT-FOLLOWUP-06` runtime patch sweep, with explicit `langgraph-checkpoint-sqlite` inventory.
4. `INT-FOLLOWUP-07` frontend/toolchain majors, staged behind auth/build/lint/typecheck probes.

## Sources Checked

- Mem0 GitHub releases: https://github.com/mem0ai/mem0/releases
- A2A specification: https://github.com/a2aproject/A2A/blob/main/docs/specification.md
- ADK A2A extension docs: https://adk.dev/a2a/a2a-extension/
- Pipecat DailyTransport docs: https://docs.pipecat.ai/api-reference/server/services/transport/daily
- LangGraph persistence docs: https://docs.langchain.com/oss/python/langgraph/persistence
- LangGraph SQLite checkpointer advisory: https://github.com/langchain-ai/langgraph/security/advisories/GHSA-9rwj-6rc7-p77c
- Next.js proxy file convention: https://nextjs.org/docs/app/api-reference/file-conventions/proxy
- jose npm package support matrix: https://www.npmjs.com/package/jose?activeTab=versions
- shadcn CLI v4 changelog: https://ui.shadcn.com/docs/changelog/2026-03-cli-v4
- ESLint v10 migration guide: https://eslint.org/docs/latest/use/migrate-to-10.0.0
- TypeScript 6.0 release notes: https://www.typescriptlang.org/docs/handbook/release-notes/typescript-6-0.html
