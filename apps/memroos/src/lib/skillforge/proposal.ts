/**
 * SkillForge proposal generation — Phase 85: SkillForge Foundation
 * Creates skill_revision SEAL proposals from analysis results.
 */

import { createHash } from "crypto";
import type Database from "better-sqlite3";
import type {
  SkillForgeConfig,
  SkillForgeAnalysisResult,
  SkillForgeProposal,
  SkillRevisionPayload,
  ValidationResult,
} from "./types";

/**
 * Generate a deterministic diff from analysis results.
 * This is a stub for Phase 87 (full edit generation).
 * In Phase 85, it creates a placeholder diff with improvement suggestions.
 */
function generateDiff(
  skillId: string,
  analysis: SkillForgeAnalysisResult,
  _config: SkillForgeConfig
): string {
  const suggestions = analysis.patterns
    .filter((p) => p.suggestedFix)
    .map((p) => `- Pattern "${p.pattern}" (${p.frequency}x): ${p.suggestedFix}`)
    .join("\n");

  return `--- SKILL.md (skill ${skillId})
+++ SKILL.md (proposed)
@@ -1,5 +1,10 @@
 # Skill Optimization Proposal
 
+## Identified Patterns
+${suggestions || "No specific patterns identified in this analysis."}
+
+## Confidence
+${(analysis.confidence * 100).toFixed(1)}%
+
 ## Test Cases Generated
 ${analysis.testCases.length} test case(s) from failure patterns.
`;
}

/**
 * Compute a stub validation result.
 * Phase 88 will implement real validation scoring.
 */
function computeValidationResult(
  _analysis: SkillForgeAnalysisResult
): ValidationResult {
  // Stub: return neutral scores until Phase 88
  return {
    triggerRoutingAccuracy: 0.5,
    contractCompleteness: 0.5,
    resolverReachability: 0.5,
    overallScore: 0.5,
  };
}

/**
 * Generate proposals from analysis results.
 * Returns proposals ready for SEAL submission.
 */
export function generateProposals(
  analyses: SkillForgeAnalysisResult[],
  config: SkillForgeConfig
): SkillForgeProposal[] {
  const proposals: SkillForgeProposal[] = [];

  for (const analysis of analyses.slice(0, config.batchSize)) {
    const id = `sf-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const diff = generateDiff(analysis.skillId, analysis, config);
    const validation = computeValidationResult(analysis);

    proposals.push({
      id,
      sealProposalId: null,
      sourceSkillId: analysis.skillId,
      sourceVersion: "1.0.0", // Will be resolved from skill_registry in Phase 86
      proposedDiff: diff,
      status: "pending",
      trainSplitId: null,
      validationResults: validation,
      heldOutResults: null,
      wDelta: null,
      rejectedEdits: [],
      residualRisks: [
        "Phase 85 stub: validation scores are placeholders",
        "Phase 85 stub: no held-out behavioral eval yet",
        "Phase 85 stub: diff is suggestion-only, not executable",
      ],
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  return proposals;
}

/**
 * Persist proposals to the skillforge_proposals table.
 */
export function persistProposals(
  db: Database.Database,
  proposals: SkillForgeProposal[]
): void {
  const insert = db.prepare(
    `INSERT INTO skillforge_proposals (
      id, seal_proposal_id, source_skill_id, source_version,
      proposed_diff, status, train_split_id, validation_results,
      held_out_results, w_delta, rejected_edits, residual_risks,
      created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );

  for (const p of proposals) {
    insert.run(
      p.id,
      p.sealProposalId,
      p.sourceSkillId,
      p.sourceVersion,
      p.proposedDiff,
      p.status,
      p.trainSplitId,
      JSON.stringify(p.validationResults),
      JSON.stringify(p.heldOutResults),
      p.wDelta,
      JSON.stringify(p.rejectedEdits),
      JSON.stringify(p.residualRisks),
      p.createdAt.toISOString(),
      p.updatedAt.toISOString()
    );
  }
}

/**
 * Build the SEAL proposal payload from a SkillForge proposal.
 */
export function buildSealPayload(
  proposal: SkillForgeProposal
): SkillRevisionPayload {
  return {
    sourceSkillId: proposal.sourceSkillId,
    sourceVersion: proposal.sourceVersion,
    proposedDiff: proposal.proposedDiff,
    trainSplitId: proposal.trainSplitId ?? "",
    validationResults: proposal.validationResults ?? {
      triggerRoutingAccuracy: 0,
      contractCompleteness: 0,
      resolverReachability: 0,
      overallScore: 0,
    },
    heldOutResults: proposal.heldOutResults,
    wDelta: proposal.wDelta ?? 0,
    rejectedEdits: proposal.rejectedEdits,
    residualRisks: proposal.residualRisks,
  };
}
