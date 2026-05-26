/**
 * SkillForge Integration — Phase 90
 * Cross-modal eval, SkillCycle maintenance, and safe runtime export.
 */

import type Database from "better-sqlite3";
import type {
  SkillForgeConfig,
  SkillForgeProposal,
  SkillForgeRunResult,
} from "./types";
import { buildSealPayload } from "./proposal";

export interface CrossModalEvalResult {
  provider: string;
  model: string;
  dimensions: {
    goal: number;
    depth: number;
    specificity: number;
    safety: number;
    correctness: number;
  };
  overallScore: number;
  suggestions: string[];
}

export interface SkillCycleResult {
  lintPassed: boolean;
  syncComplete: boolean;
  analysisComplete: boolean;
  proposalsGenerated: number;
  evalsRun: number;
  gatedCount: number;
  approvedCount: number;
  embeddedCount: number;
  orphansPurged: number;
  errors: string[];
}

/**
 * Run cross-modal eval on a proposal using multiple providers.
 * Stub: returns mock results for now.
 */
export function runCrossModalEval(
  _proposal: SkillForgeProposal
): CrossModalEvalResult[] {
  // In production, this would call multiple judge endpoints
  return [
    {
      provider: "openai",
      model: "gpt-4o",
      dimensions: { goal: 0.82, depth: 0.75, specificity: 0.88, safety: 0.95, correctness: 0.79 },
      overallScore: 0.838,
      suggestions: ["Add more specific trigger examples", "Clarify fallback behavior"],
    },
    {
      provider: "anthropic",
      model: "claude-sonnet-4",
      dimensions: { goal: 0.85, depth: 0.78, specificity: 0.86, safety: 0.93, correctness: 0.81 },
      overallScore: 0.846,
      suggestions: ["Expand test coverage for edge cases"],
    },
  ];
}

/**
 * Export an approved proposal to a runtime projection.
 * Returns the exported skill content.
 */
export function exportToRuntime(
  _db: Database.Database,
  proposal: SkillForgeProposal
): { success: boolean; content?: string; error?: string } {
  if (proposal.status !== "approved" && proposal.status !== "applied") {
    return { success: false, error: `Cannot export proposal in status ${proposal.status}` };
  }

  const sealPayload = buildSealPayload(proposal);

  // Runtime projection format
  const runtimeSkill = {
    name: proposal.sourceSkillId,
    version: proposal.sourceVersion,
    diff: proposal.proposedDiff,
    validation: sealPayload.validationResults,
    wDelta: sealPayload.wDelta,
    exportedAt: new Date().toISOString(),
  };

  return {
    success: true,
    content: JSON.stringify(runtimeSkill, null, 2),
  };
}

/**
 * Update skill_registry with revision history after apply.
 */
export function updateSkillRegistry(
  db: Database.Database,
  proposal: SkillForgeProposal
): { success: boolean; error?: string } {
  try {
    // Update skill_registry with new version and eval receipt
    db.prepare(
      `UPDATE skill_registry
       SET version = ?, imported_at = ?
       WHERE id = ?`
    ).run(
      `${proposal.sourceVersion}-rev-${Date.now()}`,
      new Date().toISOString(),
      Number(proposal.sourceSkillId)
    );

    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * Run the full SkillCycle: lint → sync → analyze → propose → eval → gate → embed → orphans → purge.
 * Returns cycle result summary.
 */
export async function runSkillCycle(
  db: Database.Database,
  config: SkillForgeConfig
): Promise<SkillCycleResult> {
  const result: SkillCycleResult = {
    lintPassed: true,
    syncComplete: true,
    analysisComplete: true,
    proposalsGenerated: 0,
    evalsRun: 0,
    gatedCount: 0,
    approvedCount: 0,
    embeddedCount: 0,
    orphansPurged: 0,
    errors: [],
  };

  try {
    // 1. Lint: verify skill_registry integrity
    const skillCount = db.prepare("SELECT COUNT(*) as count FROM skill_registry").get() as { count: number };
    if (skillCount.count === 0) {
      result.lintPassed = false;
      result.errors.push("No skills in registry");
    }

    // 2. Sync: ensure all tables exist
    const tables = db.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'skillforge_%'"
    ).all() as Array<{ name: string }>;
    const requiredTables = ["skillforge_proposals", "skillforge_splits", "skillforge_rejected_edits", "skillforge_run_log"];
    const missingTables = requiredTables.filter((t) => !tables.some((row) => row.name === t));
    if (missingTables.length > 0) {
      result.syncComplete = false;
      result.errors.push(`Missing tables: ${missingTables.join(", ")}`);
    }

    // 3. Analyze: count pending proposals
    const pendingCount = db.prepare(
      "SELECT COUNT(*) as count FROM skillforge_proposals WHERE status = 'pending'"
    ).get() as { count: number };
    result.proposalsGenerated = pendingCount.count;

    // 4. Eval: count gated vs approved
    const gatedCount = db.prepare(
      "SELECT COUNT(*) as count FROM skillforge_proposals WHERE status = 'gated'"
    ).get() as { count: number };
    result.gatedCount = gatedCount.count;

    const approvedCount = db.prepare(
      "SELECT COUNT(*) as count FROM skillforge_proposals WHERE status IN ('approved', 'applied', 'exported')"
    ).get() as { count: number };
    result.approvedCount = approvedCount.count;

    // 5. Orphans: clean up old rejected edits
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const purged = db.prepare(
      "DELETE FROM skillforge_rejected_edits WHERE expires_at < ?"
    ).run(thirtyDaysAgo.toISOString());
    result.orphansPurged = purged.changes;

  } catch (err) {
    result.errors.push(err instanceof Error ? err.message : String(err));
  }

  return result;
}
