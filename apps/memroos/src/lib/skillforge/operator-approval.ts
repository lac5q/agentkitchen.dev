/**
 * SkillForge Operator Approval — Phase 89
 * Queue management, approval actions, and rollback for skill revision proposals.
 */

import type Database from "better-sqlite3";
import type { SkillForgeProposal, SkillForgeProposalStatus } from "./types";

export interface ApprovalAction {
  proposalId: string;
  action: "approve" | "reject" | "request_changes" | "rollback";
  operator: string;
  reasoning?: string;
}

export interface ProposalQueue {
  pending: SkillForgeProposal[];
  gated: SkillForgeProposal[];
  approved: SkillForgeProposal[];
  rejected: SkillForgeProposal[];
}

/**
 * List all proposals grouped by status.
 */
export function listProposals(db: Database.Database): ProposalQueue {
  const rows = db
    .prepare(
      `SELECT id, seal_proposal_id, source_skill_id, source_version, proposed_diff,
              status, train_split_id, validation_results, held_out_results, w_delta,
              rejected_edits, residual_risks, created_at, updated_at
       FROM skillforge_proposals
       ORDER BY created_at DESC`
    )
    .all() as Array<{
    id: string;
    seal_proposal_id: string | null;
    source_skill_id: string;
    source_version: string;
    proposed_diff: string;
    status: string;
    train_split_id: string | null;
    validation_results: string | null;
    held_out_results: string | null;
    w_delta: number | null;
    rejected_edits: string;
    residual_risks: string;
    created_at: string;
    updated_at: string;
  }>;

  const proposals: SkillForgeProposal[] = rows.map((r) => ({
    id: r.id,
    sealProposalId: r.seal_proposal_id,
    sourceSkillId: r.source_skill_id,
    sourceVersion: r.source_version,
    proposedDiff: r.proposed_diff,
    status: r.status as SkillForgeProposalStatus,
    trainSplitId: r.train_split_id,
    validationResults: r.validation_results ? JSON.parse(r.validation_results) : null,
    heldOutResults: r.held_out_results ? JSON.parse(r.held_out_results) : null,
    wDelta: r.w_delta,
    rejectedEdits: JSON.parse(r.rejected_edits),
    residualRisks: JSON.parse(r.residual_risks),
    createdAt: new Date(r.created_at),
    updatedAt: new Date(r.updated_at),
  }));

  return {
    pending: proposals.filter((p) => p.status === "pending" || p.status === "analyzing" || p.status === "eval_running"),
    gated: proposals.filter((p) => p.status === "gated"),
    approved: proposals.filter((p) => p.status === "approved" || p.status === "applied" || p.status === "exported"),
    rejected: proposals.filter((p) => p.status === "rejected"),
  };
}

/**
 * Get a single proposal by ID.
 */
export function getProposal(db: Database.Database, proposalId: string): SkillForgeProposal | null {
  const r = db
    .prepare(
      `SELECT id, seal_proposal_id, source_skill_id, source_version, proposed_diff,
              status, train_split_id, validation_results, held_out_results, w_delta,
              rejected_edits, residual_risks, created_at, updated_at
       FROM skillforge_proposals WHERE id = ?`
    )
    .get(proposalId) as {
    id: string;
    seal_proposal_id: string | null;
    source_skill_id: string;
    source_version: string;
    proposed_diff: string;
    status: string;
    train_split_id: string | null;
    validation_results: string | null;
    held_out_results: string | null;
    w_delta: number | null;
    rejected_edits: string;
    residual_risks: string;
    created_at: string;
    updated_at: string;
  } | undefined;

  if (!r) return null;

  return {
    id: r.id,
    sealProposalId: r.seal_proposal_id,
    sourceSkillId: r.source_skill_id,
    sourceVersion: r.source_version,
    proposedDiff: r.proposed_diff,
    status: r.status as SkillForgeProposalStatus,
    trainSplitId: r.train_split_id,
    validationResults: r.validation_results ? JSON.parse(r.validation_results) : null,
    heldOutResults: r.held_out_results ? JSON.parse(r.held_out_results) : null,
    wDelta: r.w_delta,
    rejectedEdits: JSON.parse(r.rejected_edits),
    residualRisks: JSON.parse(r.residual_risks),
    createdAt: new Date(r.created_at),
    updatedAt: new Date(r.updated_at),
  };
}

/**
 * Apply an operator approval action.
 */
export function applyApprovalAction(
  db: Database.Database,
  action: ApprovalAction
): { success: boolean; error?: string } {
  const proposal = getProposal(db, action.proposalId);
  if (!proposal) {
    return { success: false, error: "Proposal not found" };
  }

  let newStatus: SkillForgeProposalStatus;

  switch (action.action) {
    case "approve":
      if (proposal.status !== "pending_approval" && proposal.status !== "gated") {
        return { success: false, error: `Cannot approve proposal in status ${proposal.status}` };
      }
      newStatus = "approved";
      break;
    case "reject":
      newStatus = "rejected";
      break;
    case "request_changes":
      newStatus = "pending";
      break;
    case "rollback":
      if (proposal.status !== "applied" && proposal.status !== "exported") {
        return { success: false, error: `Cannot rollback proposal in status ${proposal.status}` };
      }
      newStatus = "pending_approval";
      break;
    default:
      return { success: false, error: "Unknown action" };
  }

  try {
    db.prepare(
      `UPDATE skillforge_proposals
       SET status = ?, updated_at = ?
       WHERE id = ?`
    ).run(newStatus, new Date().toISOString(), action.proposalId);

    // Log approval action to SEAL audit (if seal_proposal_id exists)
    if (proposal.sealProposalId) {
      try {
        db.prepare(
          `INSERT INTO seal_audit_log (proposal_id, event, detail, timestamp)
           VALUES (?, ?, ?, ?)`
        ).run(
          proposal.sealProposalId,
          action.action === "approve" ? "approved" : action.action === "reject" ? "rejected" : "rolled_back",
          JSON.stringify({ operator: action.operator, reasoning: action.reasoning }),
          new Date().toISOString()
        );
      } catch {
        // seal_audit_log may not exist
      }
    }

    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * Promote an approved proposal to applied status.
 * This is called after SEAL apply succeeds.
 */
export function markApplied(
  db: Database.Database,
  proposalId: string
): { success: boolean; error?: string } {
  const proposal = getProposal(db, proposalId);
  if (!proposal) {
    return { success: false, error: "Proposal not found" };
  }

  if (proposal.status !== "approved") {
    return { success: false, error: `Proposal must be approved before applying (current: ${proposal.status})` };
  }

  try {
    db.prepare(
      `UPDATE skillforge_proposals
       SET status = 'applied', updated_at = ?
       WHERE id = ?`
    ).run(new Date().toISOString(), proposalId);

    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}
