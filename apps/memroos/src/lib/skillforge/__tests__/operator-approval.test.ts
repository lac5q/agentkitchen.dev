/**
 * SkillForge Operator Approval tests — Phase 89
 */

import { describe, it, expect, beforeEach } from "vitest";
import Database from "better-sqlite3";
import { listProposals, getProposal, applyApprovalAction, markApplied } from "../operator-approval";
import type { SkillForgeProposal } from "../types";

function makeProposal(id: string, status: string): SkillForgeProposal {
  return {
    id,
    sealProposalId: null,
    sourceSkillId: "skill-1",
    sourceVersion: "1.0.0",
    proposedDiff: "test diff",
    status: status as any,
    trainSplitId: null,
    validationResults: null,
    heldOutResults: null,
    wDelta: null,
    rejectedEdits: [],
    residualRisks: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

describe("SkillForge Operator Approval", () => {
  let db: Database.Database;

  beforeEach(() => {
    db = new Database(":memory:");
    db.exec(`
      CREATE TABLE skillforge_proposals (
        id TEXT PRIMARY KEY,
        seal_proposal_id TEXT,
        source_skill_id TEXT NOT NULL,
        source_version TEXT NOT NULL,
        proposed_diff TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        train_split_id TEXT,
        validation_results TEXT,
        held_out_results TEXT,
        w_delta REAL,
        rejected_edits TEXT NOT NULL DEFAULT '[]',
        residual_risks TEXT NOT NULL DEFAULT '[]',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `);
  });

  it("lists proposals grouped by status", () => {
    const insert = db.prepare(
      `INSERT INTO skillforge_proposals (id, source_skill_id, source_version, proposed_diff, status, rejected_edits, residual_risks, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );
    insert.run("p1", "skill-1", "1.0.0", "diff1", "pending", "[]", "[]", new Date().toISOString(), new Date().toISOString());
    insert.run("p2", "skill-1", "1.0.0", "diff2", "gated", "[]", "[]", new Date().toISOString(), new Date().toISOString());

    const queue = listProposals(db);
    expect(queue.pending.length).toBe(1);
    expect(queue.gated.length).toBe(1);
  });

  it("gets a proposal by id", () => {
    db.prepare(
      `INSERT INTO skillforge_proposals (id, source_skill_id, source_version, proposed_diff, status, rejected_edits, residual_risks, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run("p1", "skill-1", "1.0.0", "diff1", "pending", "[]", "[]", new Date().toISOString(), new Date().toISOString());

    const proposal = getProposal(db, "p1");
    expect(proposal).not.toBeNull();
    expect(proposal?.id).toBe("p1");
  });

  it("returns null for missing proposal", () => {
    const proposal = getProposal(db, "missing");
    expect(proposal).toBeNull();
  });

  it("approves a pending_approval proposal", () => {
    db.prepare(
      `INSERT INTO skillforge_proposals (id, source_skill_id, source_version, proposed_diff, status, rejected_edits, residual_risks, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run("p1", "skill-1", "1.0.0", "diff1", "pending_approval", "[]", "[]", new Date().toISOString(), new Date().toISOString());

    const result = applyApprovalAction(db, { proposalId: "p1", action: "approve", operator: "test" });
    expect(result.success).toBe(true);

    const updated = getProposal(db, "p1");
    expect(updated?.status).toBe("approved");
  });

  it("rejects a proposal", () => {
    db.prepare(
      `INSERT INTO skillforge_proposals (id, source_skill_id, source_version, proposed_diff, status, rejected_edits, residual_risks, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run("p1", "skill-1", "1.0.0", "diff1", "pending", "[]", "[]", new Date().toISOString(), new Date().toISOString());

    const result = applyApprovalAction(db, { proposalId: "p1", action: "reject", operator: "test" });
    expect(result.success).toBe(true);

    const updated = getProposal(db, "p1");
    expect(updated?.status).toBe("rejected");
  });

  it("fails to approve non-pending_approval proposal", () => {
    db.prepare(
      `INSERT INTO skillforge_proposals (id, source_skill_id, source_version, proposed_diff, status, rejected_edits, residual_risks, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run("p1", "skill-1", "1.0.0", "diff1", "pending", "[]", "[]", new Date().toISOString(), new Date().toISOString());

    const result = applyApprovalAction(db, { proposalId: "p1", action: "approve", operator: "test" });
    expect(result.success).toBe(false);
  });

  it("marks applied after approval", () => {
    db.prepare(
      `INSERT INTO skillforge_proposals (id, source_skill_id, source_version, proposed_diff, status, rejected_edits, residual_risks, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run("p1", "skill-1", "1.0.0", "diff1", "approved", "[]", "[]", new Date().toISOString(), new Date().toISOString());

    const result = markApplied(db, "p1");
    expect(result.success).toBe(true);

    const updated = getProposal(db, "p1");
    expect(updated?.status).toBe("applied");
  });

  it("fails to mark applied if not approved", () => {
    db.prepare(
      `INSERT INTO skillforge_proposals (id, source_skill_id, source_version, proposed_diff, status, rejected_edits, residual_risks, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run("p1", "skill-1", "1.0.0", "diff1", "pending", "[]", "[]", new Date().toISOString(), new Date().toISOString());

    const result = markApplied(db, "p1");
    expect(result.success).toBe(false);
  });
});
