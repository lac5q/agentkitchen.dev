# Operations NOC Real-Data Requirements

Backlog status: promoted to `.planning/REQUIREMENTS.md` under `Future Requirements (v4.1+ candidates)` as `NOC-01..NOC-11`, and to `.planning/ROADMAP.md` backlog as a corrective Operations NOC Real-Data Wiring phase candidate.

## Current Finding

The Operations NOC home screen is visually complete but not operationally truthful yet. The current `apps/memroos/src/components/operations/*` panels import typed sample constants from `apps/memroos/src/lib/noc-mock-data.ts`. The design handoff explicitly calls those values sample/mock data and says efficiency signals have no API endpoint yet.

The repo does have substantial live data available elsewhere through `apps/memroos/src/lib/api-client.ts`; the missing work is a real Operations NOC data contract, panel wiring, and the few telemetry streams that do not exist yet.

## Existing Live Data To Reuse

- Agent roster, status, current task, local runtime, latency: `/api/agents`, `useAgents()`.
- Service health: `/api/health`, `useHealth()`.
- RTK token usage, command counts, savings: `/api/tokens`, `useTokenStats()`.
- Model usage and routing quality/cost/latency: `/api/model-usage`, `/api/model-routing/telemetry`, `useModelUsage()`, `useModelRoutingDashboard()`.
- Memory consolidation, tier counts, tier health, recall stats/evals: `/api/memory-stats`, `/api/memory/health`, `/api/recall/stats`, `/api/memory/evals/latest`, `useMemoryStats()`, `useMemoryTierHealth()`, `useRecallStats()`, `useMemoryEvalLatest()`.
- Skills inventory, contribution history, coverage gaps, failure aggregates, review state, budget health: `/api/skills`, `useSkills()`.
- Recent activity and work feed: `/api/activity`, `/api/hive`, `/api/agent-peers`, `/api/paperclip`, `useActivity()`, `useHiveFeed()`, `useAgentPeers()`, `usePaperclipFleet()`.
- Governance/control-plane signals: `/api/audit-log`, `/api/orchestration/hil`, `/api/security/report`, `/api/escalations`, `useAuditLog()`, `useOrchestrationHil()`, `useSecurityReport()`.
- Knowledge and time-series metrics: `/api/knowledge`, `/api/time-series`, `useKnowledge()`, `useTimeSeries()`.

## Missing Data / Instrumentation

- A unified Operations NOC endpoint or client hook that normalizes existing live APIs into one dashboard contract.
- Per-panel freshness metadata: `source`, `lastUpdated`, `window`, and `status=live|empty|degraded|missing`.
- Retrieval-efficiency telemetry: number of memory/search calls before useful work begins.
- Source re-read telemetry: same source opened multiple times within one run/task.
- Token ingest-share telemetry: raw-context ingestion tokens vs task/reasoning/output tokens.
- User redundancy telemetry: agent asks the operator for information Memroos already has.
- Rediscovery telemetry: facts learned again that prior memories already established.
- Per-memory read/access telemetry granular enough to identify high-salience memories that are never consumed.
- Real engagement console dispatch/chat binding from the NOC home screen.

## Paste-Ready GSD Requirements

- [ ] **NOC-01**: Operations NOC must not render hardcoded sample values for any panel. All `components/operations/*` panels must consume live data through either a unified `/api/operations/noc` endpoint or existing React Query hooks; mock constants may only remain in tests, Storybook/dev fixtures, or explicitly labeled empty-state demos.
- [ ] **NOC-02**: Operations NOC data contract exposes per-panel provenance: `source`, `lastUpdated`, `window`, `status`, and `warnings`. Panels with missing or degraded telemetry must show an honest empty/degraded state instead of fabricated metrics.
- [ ] **NOC-03**: Pulse strip derives tasks completed, active dispatches, memory reads, spend today, savings vs baseline, and wasted work from live APIs where data exists (`agents`, `hive`, `activity`, `tokens`, `memory`, `model-routing`). Any metric without a live source must display `Telemetry missing` and identify the missing source.
- [ ] **NOC-04**: Memory consumption and "memory not digested" panels derive from memory consolidation, memory tier health, recall stats/evals, and per-memory access telemetry. If per-memory access telemetry is absent, this requirement must add it before claiming high-salience memories are unused.
- [ ] **NOC-05**: Agent workload panel derives agent names, status, current task, heartbeat, dispatch activity, HIL waits, and failure/retry signals from the canonical registry, local runtime detection, hive actions, orchestration/HIL state, and Paperclip fleet data. No fixed agent roster or canned workload values may remain.
- [ ] **NOC-06**: Model utility panel derives model rows from real model usage and model-routing telemetry, including task count, cost, latency, quality score, success rate, and best-fit recommendation. Hardcoded model names, cost totals, and quality scores must be removed.
- [ ] **NOC-07**: Skills lifecycle and behavior signals derive from the skills API, contribution history, coverage telemetry status, failure logs, review state, SEAL proposals, model-routing drift, memory evals, and security/audit events. If a signal is inferred, the panel must identify the source evidence and avoid presenting speculative recommendations as facts.
- [ ] **NOC-08**: Governance strip derives preflight blocks, HIL approvals, tool denials, audit lines, escalations, and recent governance events from live audit, orchestration, security, and escalation APIs.
- [ ] **NOC-09**: Engagement console on the NOC home screen uses the canonical agent registry and real chat/dispatch APIs. Selecting an agent must show its actual current status/task/history when available, and sending a directive must create a real dispatch/chat action or return a visible error; canned messages must be removed.
- [ ] **NOC-10**: Efficiency signals require new telemetry before they can be shown as live: retrieval calls before useful work, same-source re-read count, raw-context ingest token share, operator re-ask redundancy, and rediscovered-fact rate. Until those event streams exist, the efficiency section must render a missing-telemetry checklist, not sample numbers.
- [ ] **NOC-11**: Verification must prove the NOC is real-data backed: automated tests fail if production Operations components import `noc-mock-data`; seeded API tests assert NOC metrics match fixture DB/log inputs; Playwright verifies live, empty, and degraded dashboard states; authenticated local/public smoke checks confirm `/` renders live NOC data after deployment.

## Suggested Phase Boundary

Make this a corrective UI/data phase, not a redesign phase.

Goal: turn the existing Operations NOC scaffold into a truthful live control plane by wiring all panels to available operational data, adding the missing efficiency telemetry streams, and replacing fake values with explicit empty/degraded states.

Out of scope: visual redesign, new navigation, unrelated authenticated page reskin, model-gateway architecture changes, and broad agent-runtime refactors beyond instrumentation needed for NOC metrics.
