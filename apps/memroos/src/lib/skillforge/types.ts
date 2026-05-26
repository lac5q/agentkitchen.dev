/**
 * SkillForge types — Phase 85: SkillForge Foundation
 * Governed skill optimization infrastructure for MemroOS v6.0
 */

import type { EvalLayerBreakdown, EvalRunResult } from "@/lib/evals/types";

/** Security label dimensions used by the intake pipeline */
export interface SecurityLabel {
  visibility: "private" | "internal" | "public_safe" | "public_approved";
  domain?: string;
  sensitivity?: string;
  policy: "indexable" | "agent_visible" | "requires_redaction" | "requires_human_review" | "sealed";
}

export interface SkillForgeConfig {
  /** Cron schedule expression (e.g., "0 2 * * *" for 2am daily) */
  cronSchedule: string;
  /** Maximum proposals generated per run */
  batchSize: number;
  /** Textual learning rate: 0.1 (conservative) to 1.0 (aggressive) */
  textualLearningRate: number;
  /** Enable privacy redaction gates */
  redactionEnabled: boolean;
  /** Skill names to include in optimization scope (empty = all) */
  skillScopeFilter: string[];
  /** Minimum trace age in hours before inclusion */
  minTraceAgeHours: number;
  /** Maximum trace age in days before exclusion */
  maxTraceAgeDays: number;
}

export const DEFAULT_SKILLFORGE_CONFIG: SkillForgeConfig = {
  cronSchedule: "0 2 * * *",
  batchSize: 5,
  textualLearningRate: 0.3,
  redactionEnabled: true,
  skillScopeFilter: [],
  minTraceAgeHours: 1,
  maxTraceAgeDays: 30,
};

export interface SkillForgeIntakeEntry {
  id: string;
  skillId: string;
  skillName: string;
  traceType: "dispatch" | "eval" | "failure" | "telemetry";
  payload: Record<string, unknown>;
  securityLabels: SecurityLabel[];
  timestamp: Date;
}

export interface ValidationResult {
  triggerRoutingAccuracy: number;
  contractCompleteness: number;
  resolverReachability: number;
  overallScore: number;
}

export interface HeldOutResult {
  passRate: number;
  tasksRun: number;
  tasksPassed: number;
  avgLatencyMs: number;
  behavioralW: number;
}

export interface RejectedEdit {
  editHash: string;
  reason: string;
  rejectedAt: Date;
}

export interface SkillRevisionPayload {
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

export interface SkillForgeProposal {
  id: string;
  sealProposalId: string | null;
  sourceSkillId: string;
  sourceVersion: string;
  proposedDiff: string;
  status: SkillForgeProposalStatus;
  trainSplitId: string | null;
  validationResults: ValidationResult | null;
  heldOutResults: HeldOutResult | null;
  wDelta: number | null;
  rejectedEdits: RejectedEdit[];
  residualRisks: string[];
  createdAt: Date;
  updatedAt: Date;
}

export type SkillForgeProposalStatus =
  | "pending"
  | "analyzing"
  | "eval_running"
  | "gated"
  | "pending_approval"
  | "approved"
  | "rejected"
  | "applied"
  | "exported";

export interface SkillForgeRunResult {
  runId: string;
  startedAt: Date;
  completedAt: Date;
  status: "success" | "partial" | "failure";
  entriesProcessed: number;
  proposalsCreated: number;
  proposalsSubmitted: number;
  errors: string[];
}

export interface SkillForgeSplit {
  id: string;
  skillId: string;
  splitType: "train" | "validation" | "held_out";
  taskSamples: string[];
  createdAt: Date;
}

export interface SkillForgeFailureLog {
  id: string;
  operation: string;
  input: string;
  deterministicResult: string | null;
  llmResult: string | null;
  pattern: string;
  skillId: string;
  timestamp: Date;
}

export interface SkillForgeAnalysisResult {
  skillId: string;
  patterns: SkillForgePattern[];
  testCases: SkillForgeTestCase[];
  confidence: number;
}

export interface SkillForgePattern {
  id: string;
  pattern: string;
  frequency: number;
  examples: string[];
  suggestedFix: string | null;
}

export interface SkillForgeTestCase {
  id: string;
  input: string;
  expectedOutput: string;
  patternId: string;
  source: "deterministic" | "llm_fallback";
}
