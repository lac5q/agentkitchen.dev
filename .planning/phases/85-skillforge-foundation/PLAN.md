# Plan: Phase 85 — SkillForge Foundation

**Phase**: 85
**Name**: SkillForge Foundation
**Milestone**: v6.0 SkillForge — Governed Skill Optimization
**Requirement**: SKILLFORGE-01
**Depends on**: Phase 58 (SEAL), Phase 72 (skill registry), Phase 57 (eval engine)
**Status**: In Progress
**Created**: 2026-05-26
**Agent**: Alba

---

## Goal

Build the SkillForge worker infrastructure, intake pipeline, and SEAL `skill_revision` proposal type so skill optimization proposals are governed from the first byte.

## Verification Strategy

1. **Unit tests**: Worker scheduling, proposal creation, intake redaction
2. **Integration tests**: End-to-end worker run with real skill_registry data
3. **Negative fixtures**: Restricted memory never reaches optimizer
4. **Cron health**: Worker appears in registry with heartbeat

---

## Tasks

### Task 1: Create `lib/skillforge/` directory structure

**Files**:
- `apps/memroos/src/lib/skillforge/index.ts` — public API
- `apps/memroos/src/lib/skillforge/worker.ts` — SkillForgeWorker class
- `apps/memroos/src/lib/skillforge/intake.ts` — intake pipeline
- `apps/memroos/src/lib/skillforge/proposal.ts` — proposal generation
- `apps/memroos/src/lib/skillforge/types.ts` — shared types

**Verification**: Directory exists, all files compile

### Task 2: Define types and interfaces

**Types**:
```typescript
interface SkillForgeConfig {
  cronSchedule: string;           // e.g., "0 2 * * *"
  batchSize: number;              // max proposals per run
  textualLearningRate: number;    // 0.1 - 1.0
  redactionEnabled: boolean;      // privacy gate
  skillScopeFilter: string[];     // skill names to optimize
}

interface SkillForgeIntakeEntry {
  id: string;
  skillId: string;
  skillName: string;
  traceType: 'dispatch' | 'eval' | 'failure' | 'telemetry';
  payload: Record<string, unknown>;
  securityLabels: SecurityLabel[];
  timestamp: Date;
}

interface SkillRevisionProposal {
  sourceSkillId: string;
  sourceVersion: string;
  proposedDiff: string;           // unified diff
  trainSplitId: string;
  validationResults: ValidationResult;
  heldOutResults: HeldOutResult | null;
  wDelta: number;
  rejectedEdits: RejectedEdit[];
  residualRisks: string[];
}
```

**Verification**: TypeScript compiles, types are exported

### Task 3: Implement SkillForgeWorker

**Class**: `SkillForgeWorker`

**Methods**:
- `constructor(config: SkillForgeConfig)`
- `async run(): Promise<SkillForgeRunResult>` — main entry point
- `async intake(): Promise<SkillForgeIntakeEntry[]>` — consume telemetry
- `async analyze(entries: SkillForgeIntakeEntry[]): Promise<AnalysisResult>` — pattern detection (stub for Phase 86)
- `async propose(analysis: AnalysisResult): Promise<SkillRevisionProposal[]>` — generate proposals (stub for Phase 87)
- `async submitToSeal(proposals: SkillRevisionProposal[]): Promise<string[]>` — create SEAL proposals

**Verification**: Worker runs without errors on empty data

### Task 4: Implement intake pipeline

**Pipeline stages**:
1. **Collect**: Query `skill_registry`, `eval_candidates`, SEAL evidence bundles
2. **Filter**: Apply `skillScopeFilter`, exclude non-optimizable skills
3. **Redact**: Run security label check, strip restricted content (reuse Phase 74-77)
4. **Normalize**: Convert traces to `SkillForgeIntakeEntry` format
5. **Deduplicate**: Hash-based dedup within 24h window

**Verification**: Negative fixture — restricted memory is redacted

### Task 5: Add `skill_revision` to SEAL proposal types

**Changes**:
- Update `SealProposalType` enum in `lib/seal/types.ts`
- Add `skill_revision` variant with `SkillRevisionPayload`
- Update `SealProposal` schema with new fields

**Fields**:
```typescript
interface SkillRevisionPayload {
  sourceSkillId: string;
  sourceVersion: string;
  proposedDiff: string;
  trainSplitId: string;
  validationResults: ValidationResult;
  heldOutResults: HeldOutResult | null;
  wDelta: number;
  rejectedEdits: RejectedEdit[];
  residualRisks: string[];
}
```

**Verification**: SEAL proposal creation works, schema validates

### Task 6: Database migrations

**Tables**:
```sql
-- skillforge_proposals
CREATE TABLE skillforge_proposals (
  id TEXT PRIMARY KEY,
  seal_proposal_id TEXT REFERENCES seal_proposals(id),
  source_skill_id TEXT NOT NULL,
  source_version TEXT NOT NULL,
  proposed_diff TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, analyzing, eval_running, gated, approved, rejected
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- skillforge_splits
CREATE TABLE skillforge_splits (
  id TEXT PRIMARY KEY,
  skill_id TEXT NOT NULL,
  split_type TEXT NOT NULL, -- train, validation, held_out
  task_samples JSON NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- skillforge_rejected_edits
CREATE TABLE skillforge_rejected_edits (
  id TEXT PRIMARY KEY,
  skill_id TEXT NOT NULL,
  edit_hash TEXT NOT NULL UNIQUE,
  reason TEXT NOT NULL,
  rejected_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  expires_at DATETIME NOT NULL -- 30 days
);
```

**Verification**: Migrations run, tables are queryable

### Task 7: Wire into cron health registry

**Changes**:
- Register worker in cron health registry (Phase 80)
- Emit heartbeat on run start
- Report success/failure, items processed

**Verification**: Worker appears in `/api/cron/health` response

### Task 8: API routes

**Routes**:
- `POST /api/skillforge/trigger` — manual trigger (operator only)
- `GET /api/skillforge/status` — current run status
- `GET /api/skillforge/proposals` — list proposals

**Verification**: Routes return 200, auth enforced

### Task 9: Tests

**Test files**:
- `test/skillforge/worker.test.ts` — worker scheduling, intake, proposal creation
- `test/skillforge/intake.test.ts` — redaction, filtering, deduplication
- `test/skillforge/proposal.test.ts` — SEAL integration, schema validation

**Coverage targets**:
- Worker: 80% line coverage
- Intake: 90% line coverage (security-critical)
- Proposal: 80% line coverage

---

## Dependencies

- Phase 58 (SEAL): proposal types, audit loop
- Phase 72 (skill registry): skill definitions, telemetry
- Phase 57 (eval engine): W scoring (stub for now)
- Phase 74-77 (security): redaction gates
- Phase 80 (cron health): registry integration

---

## Risks

| Risk | Mitigation |
|------|-----------|
| SEAL schema changes break existing proposals | Additive only, backward-compatible enum variant |
| Intake redaction misses restricted content | Reuse proven Phase 74-77 gates, negative fixtures |
| Worker runs too frequently, consumes API budget | Configurable schedule, batch size limits |
| Database migrations fail on large tables | Additive columns only, no data migration needed |

---

## Rollback

- Drop `skillforge_*` tables
- Remove `skill_revision` from SEAL enum
- Delete `lib/skillforge/` directory
- No impact on existing SEAL proposals (additive only)

---

## Acceptance Criteria

1. `SkillForgeWorker` runs on schedule and produces no errors on empty/intake-only runs.
2. `skill_revision` proposals are created as SEAL proposals with correct metadata and audit trail.
3. Intake pipeline redacts sensitive traces before analysis (negative fixture: restricted memory never reaches optimizer).
4. Worker appears in cron health registry with last-run, success/failure, and items-processed.
5. All tests pass with ≥80% coverage.
6. No existing functionality is broken (full test suite passes).
