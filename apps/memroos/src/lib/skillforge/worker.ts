/**
 * SkillForge Worker — Phase 85: SkillForge Foundation
 * Cron/event-driven worker that consumes skill telemetry and emits SEAL proposals.
 */

import type Database from "better-sqlite3";
import type {
  SkillForgeConfig,
  SkillForgeRunResult,
  SkillForgeProposal,
  SkillForgeAnalysisResult,
} from "./types";
import { runIntakePipeline } from "./intake";
import { generateProposals, persistProposals, buildSealPayload } from "./proposal";

/**
 * Stub analyzer for Phase 85.
 * Phase 86 will implement real pattern detection and fail-improve loop.
 */
function stubAnalyze(
  entries: import("./types").SkillForgeIntakeEntry[]
): SkillForgeAnalysisResult[] {
  const bySkill = new Map<string, import("./types").SkillForgeIntakeEntry[]>();
  for (const entry of entries) {
    const list = bySkill.get(entry.skillId) ?? [];
    list.push(entry);
    bySkill.set(entry.skillId, list);
  }

  const results: SkillForgeAnalysisResult[] = [];
  for (const [skillId, skillEntries] of bySkill) {
    const failures = skillEntries.filter((e) => e.traceType === "failure");
    results.push({
      skillId,
      patterns: failures.length > 0
        ? [
            {
              id: `pat-${skillId}-1`,
              pattern: failures[0].payload["query"] as string || "unknown",
              frequency: failures.length,
              examples: failures.slice(0, 3).map((f) => f.payload["query"] as string || ""),
              suggestedFix: "Review trigger matching for this query pattern",
            },
          ]
        : [],
      testCases: [],
      confidence: failures.length > 0 ? 0.3 : 0.1,
    });
  }

  return results;
}

export class SkillForgeWorker {
  private db: Database.Database;
  private config: SkillForgeConfig;

  constructor(db: Database.Database, config: SkillForgeConfig) {
    this.db = db;
    this.config = config;
  }

  /**
   * Main entry point. Runs the full SkillForge pipeline:
   * intake → analyze → propose → submit to SEAL.
   */
  async run(): Promise<SkillForgeRunResult> {
    const runId = `sf-run-${Date.now()}`;
    const startedAt = new Date();
    const errors: string[] = [];
    let entriesProcessed = 0;
    let proposalsCreated = 0;
    let proposalsSubmitted = 0;

    try {
      // 1. Intake
      const intakeResult = runIntakePipeline(this.db, this.config);
      entriesProcessed = intakeResult.entries.length;

      if (intakeResult.entries.length === 0) {
        // Still log the run even if no entries were found
        const completedAt = new Date();
        this.db.prepare(
          `INSERT INTO skillforge_run_log (run_id, started_at, completed_at, status, entries_processed, proposals_created, proposals_submitted, errors)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
        ).run(
          runId,
          startedAt.toISOString(),
          completedAt.toISOString(),
          "success",
          0,
          0,
          0,
          "[]"
        );

        return {
          runId,
          startedAt,
          completedAt,
          status: "success",
          entriesProcessed: 0,
          proposalsCreated: 0,
          proposalsSubmitted: 0,
          errors: [],
        };
      }

      // 2. Analyze (stub for Phase 85)
      const analyses = stubAnalyze(intakeResult.entries);

      // 3. Generate proposals
      const proposals = generateProposals(analyses, this.config);
      proposalsCreated = proposals.length;

      // 4. Persist proposals
      persistProposals(this.db, proposals);

      // 5. Submit to SEAL (Phase 85: stub — will integrate with SealService in Phase 89)
      // For now, proposals are persisted to skillforge_proposals and await manual promotion
      proposalsSubmitted = proposals.length;

    } catch (err) {
      errors.push(err instanceof Error ? err.message : String(err));
    }

    const completedAt = new Date();
    const status = errors.length === 0
      ? "success"
      : proposalsCreated > 0
        ? "partial"
        : "failure";

    // Log run result for cron health
    try {
      this.db.prepare(
        `INSERT INTO skillforge_run_log (run_id, started_at, completed_at, status, entries_processed, proposals_created, proposals_submitted, errors)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(
        runId,
        startedAt.toISOString(),
        completedAt.toISOString(),
        status,
        entriesProcessed,
        proposalsCreated,
        proposalsSubmitted,
        JSON.stringify(errors)
      );
    } catch {
      // run_log table may not exist yet — safe to skip
    }

    return {
      runId,
      startedAt,
      completedAt,
      status,
      entriesProcessed,
      proposalsCreated,
      proposalsSubmitted,
      errors,
    };
  }

  /**
   * Get the current status of the worker (last run info).
   */
  getStatus(): { lastRun: string | null; status: string | null; entriesProcessed: number } {
    try {
      const row = this.db
        .prepare("SELECT run_id, status, entries_processed FROM skillforge_run_log ORDER BY completed_at DESC LIMIT 1")
        .get() as { run_id: string; status: string; entries_processed: number } | undefined;
      return {
        lastRun: row?.run_id ?? null,
        status: row?.status ?? null,
        entriesProcessed: row?.entries_processed ?? 0,
      };
    } catch {
      return { lastRun: null, status: null, entriesProcessed: 0 };
    }
  }
}
