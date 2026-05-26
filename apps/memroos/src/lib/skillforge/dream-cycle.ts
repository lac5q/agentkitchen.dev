/**
 * SkillForge Dream Cycle — Phase 91
 * Automated nightly skill optimization with risk-based auto-approval.
 */

import type Database from "better-sqlite3";
import type { SkillForgeConfig, SkillForgeProposal } from "./types";
import { SkillForgeWorker } from "./worker";
import { listProposals, applyApprovalAction, markApplied } from "./operator-approval";
import { exportToRuntime, updateSkillRegistry } from "./integration";

export interface DreamCycleResult {
  runId: string;
  startedAt: Date;
  completedAt: Date;
  proposalsCreated: number;
  autoApproved: number;
  escalated: number;
  rejected: number;
  applied: number;
  errors: string[];
  report: string;
}

const AUTO_APPROVE_W_DELTA_THRESHOLD = 0.15;
const AUTO_APPROVE_MAX_RESIDUAL_RISKS = 0;
const MAX_AUTO_APPROVE_PER_SKILL_PER_WEEK = 1;

/**
 * Run the Dream Cycle: worker → auto-approve low-risk → escalate high-risk → apply approved.
 */
export async function runDreamCycle(
  db: Database.Database,
  config: SkillForgeConfig
): Promise<DreamCycleResult> {
  const runId = `dream-${Date.now()}`;
  const startedAt = new Date();
  const errors: string[] = [];
  let autoApproved = 0;
  let escalated = 0;
  let rejected = 0;
  let applied = 0;

  try {
    // 1. Run SkillForge worker
    const worker = new SkillForgeWorker(db, config);
    const workerResult = await worker.run();

    // 2. Process proposals
    const queue = listProposals(db);
    const pending = queue.pending.filter((p) => p.status === "pending_approval" || p.status === "gated");

    for (const proposal of pending) {
      const risk = assessRisk(proposal);

      if (risk.canAutoApprove) {
        // Auto-approve low-risk
        const approval = applyApprovalAction(db, {
          proposalId: proposal.id,
          action: "approve",
          operator: "dream-cycle",
          reasoning: `Auto-approved: W delta ${proposal.wDelta?.toFixed(3) ?? "N/A"}, ${proposal.residualRisks.length} residual risks`,
        });

        if (approval.success) {
          autoApproved++;
          // Apply to runtime
          const exportResult = exportToRuntime(db, proposal);
          if (exportResult.success) {
            markApplied(db, proposal.id);
            updateSkillRegistry(db, proposal);
            applied++;
          }
        }
      } else {
        // Escalate to operator queue
        escalated++;
      }
    }

    // 3. Reject stale gated proposals (>7 days)
    const staleCutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    try {
      const stale = db.prepare(
        "SELECT id FROM skillforge_proposals WHERE status = 'gated' AND updated_at < ?"
      ).all(staleCutoff) as Array<{ id: string }>;

      for (const row of stale) {
        applyApprovalAction(db, {
          proposalId: row.id,
          action: "reject",
          operator: "dream-cycle",
          reasoning: "Stale gated proposal (>7 days)",
        });
        rejected++;
      }
    } catch {
      // Table may not exist
    }

  } catch (err) {
    errors.push(err instanceof Error ? err.message : String(err));
  }

  const completedAt = new Date();
  const report = generateNightlyReport(runId, startedAt, completedAt, autoApproved, escalated, rejected, applied, errors);

  return {
    runId,
    startedAt,
    completedAt,
    proposalsCreated: autoApproved + escalated + rejected,
    autoApproved,
    escalated,
    rejected,
    applied,
    errors,
    report,
  };
}

function assessRisk(proposal: SkillForgeProposal): { canAutoApprove: boolean; reason: string } {
  // Check W delta
  if (proposal.wDelta === null || proposal.wDelta < AUTO_APPROVE_W_DELTA_THRESHOLD) {
    return { canAutoApprove: false, reason: `W delta ${proposal.wDelta ?? "N/A"} below threshold ${AUTO_APPROVE_W_DELTA_THRESHOLD}` };
  }

  // Check residual risks
  if (proposal.residualRisks.length > AUTO_APPROVE_MAX_RESIDUAL_RISKS) {
    return { canAutoApprove: false, reason: `${proposal.residualRisks.length} residual risks > ${AUTO_APPROVE_MAX_RESIDUAL_RISKS}` };
  }

  // Check weekly limit (simplified — would need historical tracking)
  // For now, always allow if above checks pass

  return { canAutoApprove: true, reason: "Low risk" };
}

function generateNightlyReport(
  runId: string,
  startedAt: Date,
  completedAt: Date,
  autoApproved: number,
  escalated: number,
  rejected: number,
  applied: number,
  errors: string[]
): string {
  const duration = Math.round((completedAt.getTime() - startedAt.getTime()) / 1000);

  return [
    `🌙 SkillForge Dream Cycle Report — ${runId}`,
    ``,
    `Started: ${startedAt.toISOString()}`,
    `Completed: ${completedAt.toISOString()}`,
    `Duration: ${duration}s`,
    ``,
    `| Metric | Count |`,
    `|--------|-------|`,
    `| Auto-approved | ${autoApproved} |`,
    `| Escalated | ${escalated} |`,
    `| Rejected (stale) | ${rejected} |`,
    `| Applied to runtime | ${applied} |`,
    ``,
    errors.length > 0 ? `Errors:\n${errors.map((e) => `- ${e}`).join("\n")}` : "No errors.",
  ].join("\n");
}
