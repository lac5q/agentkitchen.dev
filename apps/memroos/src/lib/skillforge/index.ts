/**
 * SkillForge — Phase 85: SkillForge Foundation
 * Governed skill optimization for MemroOS v6.0
 *
 * Public API exports.
 */

export { SkillForgeWorker } from "./worker";
export { runIntakePipeline } from "./intake";
export { generateProposals, persistProposals, buildSealPayload } from "./proposal";
export { DEFAULT_SKILLFORGE_CONFIG } from "./types";
export type {
  SkillForgeConfig,
  SkillForgeIntakeEntry,
  SkillForgeProposal,
  SkillForgeRunResult,
  SkillForgeAnalysisResult,
  SkillForgePattern,
  SkillForgeTestCase,
  SkillRevisionPayload,
  ValidationResult,
  HeldOutResult,
  RejectedEdit,
  SecurityLabel,
  SkillForgeSplit,
  SkillForgeFailureLog,
} from "./types";
