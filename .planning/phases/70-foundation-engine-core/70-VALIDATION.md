---
phase: 70
slug: foundation-engine-core
status: in_progress
nyquist_compliant: true
wave_0_complete: true
created: 2026-05-20
last_updated: 2026-05-21
---

# Phase 70 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Python framework** | pytest |
| **Python config** | None — `python -m pytest` from `services/orchestration/` |
| **Python quick run** | `cd services/orchestration && python -m pytest tests/ -x` |
| **Python full suite** | `cd services/orchestration && python -m pytest tests/` |
| **TypeScript framework** | Vitest |
| **TypeScript config** | `apps/memroos/vitest.config.ts` |
| **TypeScript quick run** | `cd apps/memroos && npx vitest run src/lib/memory` |
| **TypeScript full suite** | `cd apps/memroos && npx vitest run` |
| **Estimated runtime** | ~60 seconds (Python) + ~30 seconds (TS) |

---

## Sampling Rate

- **After every task commit:** Run quick run (Python or TS depending on task tier)
- **After every plan wave:** Run both full suites
- **Before `/gsd:verify-work`:** Both full suites must be green
- **Max feedback latency:** 90 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 70-01-01 | 01 | 1 | prereq | — | WAL pragma in OrchestrationStore.__init__ | integration | `python -c "import sqlite3; db=sqlite3.connect(':memory:'); db.execute('PRAGMA journal_mode=WAL'); print(db.execute('PRAGMA journal_mode').fetchone())"` | ✅ | ✅ green |
| 70-01-02 | 01 | 1 | prereq | — | langgraph pin in requirements.txt | unit | `grep -E '^langgraph>=1\.2,<2\.0' services/orchestration/requirements.txt` | ✅ | ✅ green |
| 70-01-03 | 01 | 1 | HIL-01..03, ORCH-08..10, MEM-06..08 | — | RED test scaffolds exist and are collectable | unit | `cd services/orchestration && python -m pytest tests/ -k 'edit or retry_policy or state_edit_audit or compensation_row or rolled_back_status' --co -q` | ✅ | ✅ green |
| 70-02-01 | 02 | 2 | HIL-01 | T-70-01 | PATCH /hil/{id}/edit updates checkpoint state | integration | `cd services/orchestration && python -m pytest tests/test_graph_runtime.py -k edit -x` | ✅ | ✅ green |
| 70-02-02 | 02 | 2 | HIL-02 | T-70-02 | Unknown keys return 422 | unit | `cd services/orchestration && python -m pytest tests/test_app.py -k edit_validation -x` | ✅ | ✅ green |
| 70-02-03 | 02 | 2 | HIL-03 | T-70-03 | Lineage row with hop_type=state_edit | unit | `cd services/orchestration && python -m pytest tests/test_engine.py -k state_edit_audit -x` | ✅ | ✅ green |
| 70-03-01 | 03 | 3 | ORCH-08 | T-70-04 | dispatch retries up to max_attempts | unit | `cd services/orchestration && python -m pytest tests/test_graph_runtime.py -k retry_policy -x` | ❌ Wave 0 | ⬜ pending |
| 70-03-02 | 03 | 3 | ORCH-09 | T-70-05 | compensation_pending row created at dispatch | unit | `cd services/orchestration && python -m pytest tests/test_engine.py -k compensation_row -x` | ❌ Wave 0 | ⬜ pending |
| 70-03-03 | 03 | 3 | ORCH-10 | T-70-06 | orchestration_runs.status = rolled_back | unit | `cd services/orchestration && python -m pytest tests/test_engine.py -k rolled_back_status -x` | ❌ Wave 0 | ⬜ pending |
| 70-04-01 | 04 | 2 | MEM-06 | T-70-10 | MemoryAdapter has no client-handle method | type check | `cd apps/memroos && npx tsc --noEmit --project tsconfig.typecheck.json` | ✅ | ✅ green |
| 70-04-02 | 04 | 2 | MEM-07 | T-70-11 | registerAdapter/getAdapters round-trip | unit | `cd apps/memroos && npx vitest run src/lib/memory/__tests__/registry.test.ts` | ✅ | ✅ green |
| 70-04-03 | 04 | 2 | MEM-08 | T-70-12 | Three concrete adapters pass search/write/health | unit | `cd apps/memroos && npx vitest run src/lib/memory/__tests__/adapters.test.ts` | ✅ | ✅ green |
| 70-05-01 | 05 | 3 | HIL-01 | T-70-01 | editOrchestrationHil client sends PATCH | unit | `cd apps/memroos && npx vitest run src/lib/orchestration` | ✅ | ⬜ pending |
| 70-05-02 | 05 | 3 | HIL-02 | T-70-02 | TS proxy route validates and forwards to Python | unit | `cd apps/memroos && npx vitest run src/app/api/orchestration/hil` | ✅ | ⬜ pending |
| 70-05-03 | 05 | 3 | HIL-01..03 | T-70-01..03 | HilEditPanel renders + submit calls editOrchestrationHil | component | `cd apps/memroos && npx vitest run src/components/orchestration/__tests__/HilEditPanel.test.tsx` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [x] `services/orchestration/tests/test_graph_runtime.py` — extend with HIL edit + retry test methods
- [x] `services/orchestration/tests/test_engine.py` — extend with compensation row + rollback_status test methods
- [x] `services/orchestration/tests/test_app.py` — extend with edit endpoint validation test methods
- [x] `apps/memroos/src/lib/memory/__tests__/registry.test.ts` — new file for adapter registry
- [x] `apps/memroos/src/lib/memory/__tests__/adapters.test.ts` — new file for concrete adapter contracts
- [x] `apps/memroos/src/components/orchestration/__tests__/HilEditPanel.test.tsx` — new file for HIL edit UI component

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Operator edits paused task in Memroos UI, edits reflect after resume | HIL-01 | End-to-end UI flow requires running app | Open paused HIL task, edit a state field, approve, confirm graph resumes with updated state |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] Wave 0 complete
- [x] No watch-mode flags
- [x] Feedback latency < 90s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** in progress — Phase 70 remains open until 70-03 and 70-05 pass their automated checks and summaries are created
