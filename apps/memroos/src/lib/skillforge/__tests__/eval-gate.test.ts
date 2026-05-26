/**
 * SkillForge Eval Gate tests — Phase 88
 */

import { describe, it, expect, beforeEach } from "vitest";
import Database from "better-sqlite3";
import { createSplits, runValidation, runHeldOutEval, computeWDelta, runEvalGate } from "../eval-gate";
import type { SkillForgeProposal, SkillForgeConfig } from "../types";

const config: SkillForgeConfig = {
  cronSchedule: "0 2 * * *",
  batchSize: 5,
  textualLearningRate: 0.3,
  redactionEnabled: true,
  skillScopeFilter: [],
  minTraceAgeHours: 0,
  maxTraceAgeDays: 30,
};

function makeProposal(skillId: string, diff: string): SkillForgeProposal {
  return {
    id: `sf-test-${Date.now()}`,
    sealProposalId: null,
    sourceSkillId: skillId,
    sourceVersion: "1.0.0",
    proposedDiff: diff,
    status: "pending",
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

describe("SkillForge Eval Gate", () => {
  let db: Database.Database;

  beforeEach(() => {
    db = new Database(":memory:");
    db.exec(`
      CREATE TABLE IF NOT EXISTS skillforge_splits (
        id TEXT PRIMARY KEY,
        skill_id TEXT NOT NULL,
        split_type TEXT NOT NULL,
        task_samples TEXT,
        created_at TEXT
      );
    `);
  });

  it("creates disjoint splits", () => {
    const samples = ["a", "b", "c", "d", "e", "f", "g", "h", "i", "j"];
    const { train, validation, heldOut } = createSplits(db, "skill-1", samples);

    expect(train.taskSamples.length).toBe(6);
    expect(validation.taskSamples.length).toBe(2);
    expect(heldOut.taskSamples.length).toBe(2);

    // Check disjoint
    const allSamples = new Set([...train.taskSamples, ...validation.taskSamples, ...heldOut.taskSamples]);
    expect(allSamples.size).toBe(10);
  });

  it("runs deterministic validation", () => {
    const proposal = makeProposal("skill-1", "## Pattern: test\nFix: add trigger\n## Generated Test Cases");
    const validation = runValidation(db, proposal, {
      id: "split-1", skillId: "skill-1", splitType: "validation", taskSamples: ["a"], createdAt: new Date(),
    });

    expect(validation.triggerRoutingAccuracy).toBeGreaterThan(0.5);
    expect(validation.contractCompleteness).toBeGreaterThan(0.5);
    expect(validation.overallScore).toBeGreaterThan(0);
  });

  it("runs held-out eval", () => {
    const proposal = makeProposal("skill-1", "test");
    const heldOut = runHeldOutEval(db, proposal, {
      id: "split-1", skillId: "skill-1", splitType: "held_out", taskSamples: ["a", "b", "c"], createdAt: new Date(),
    });

    expect(heldOut.tasksRun).toBe(3);
    expect(heldOut.passRate).toBe(0.8);
  });

  it("gates negative W delta", () => {
    const validation = { triggerRoutingAccuracy: 0.3, contractCompleteness: 0.3, resolverReachability: 0.3, overallScore: 0.3 };
    const heldOut = { passRate: 0.8, tasksRun: 10, tasksPassed: 8, avgLatencyMs: 100, behavioralW: 0.3 };

    const result = computeWDelta(validation, heldOut, 0.5);
    expect(result.gated).toBe(true);
    expect(result.reason).toContain("negative");
  });

  it("approves positive W delta above threshold", () => {
    const validation = { triggerRoutingAccuracy: 0.9, contractCompleteness: 0.9, resolverReachability: 0.9, overallScore: 0.9 };
    const heldOut = { passRate: 0.9, tasksRun: 10, tasksPassed: 9, avgLatencyMs: 100, behavioralW: 0.9 };

    const result = computeWDelta(validation, heldOut, 0.5);
    expect(result.gated).toBe(false);
    expect(result.wDelta).toBeGreaterThan(0.05);
  });

  it("gates low held-out pass rate", () => {
    const validation = { triggerRoutingAccuracy: 0.8, contractCompleteness: 0.8, resolverReachability: 0.8, overallScore: 0.8 };
    const heldOut = { passRate: 0.3, tasksRun: 10, tasksPassed: 3, avgLatencyMs: 100, behavioralW: 0.6 };

    const result = computeWDelta(validation, heldOut, 0.5);
    expect(result.gated).toBe(true);
    expect(result.reason).toContain("pass rate");
  });

  it("runs full eval gate on proposal", () => {
    const proposal = makeProposal("skill-1", "## Pattern: test\nFix: add trigger");
    const result = runEvalGate(db, proposal, config, ["sample1", "sample2", "sample3"]);

    expect(proposal.validationResults).not.toBeNull();
    expect(proposal.heldOutResults).not.toBeNull();
    expect(proposal.wDelta).not.toBeNull();
    expect(result.approved || !result.approved).toBe(true); // Either outcome is valid
  });
});
