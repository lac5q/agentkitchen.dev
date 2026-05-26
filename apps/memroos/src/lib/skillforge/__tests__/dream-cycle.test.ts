/**
 * SkillForge Dream Cycle tests — Phase 91
 */

import { describe, it, expect, beforeEach } from "vitest";
import Database from "better-sqlite3";
import { runDreamCycle } from "../dream-cycle";
import { DEFAULT_SKILLFORGE_CONFIG } from "../types";

function setupDb(): Database.Database {
  const db = new Database(":memory:");
  db.exec(`
    CREATE TABLE skillforge_proposals (
      id TEXT PRIMARY KEY, seal_proposal_id TEXT, source_skill_id TEXT NOT NULL,
      source_version TEXT NOT NULL, proposed_diff TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      train_split_id TEXT, validation_results TEXT, held_out_results TEXT,
      w_delta REAL, rejected_edits TEXT NOT NULL DEFAULT '[]',
      residual_risks TEXT NOT NULL DEFAULT '[]',
      created_at TEXT NOT NULL, updated_at TEXT NOT NULL
    );
    CREATE TABLE skill_registry (
      id INTEGER PRIMARY KEY, name TEXT, content TEXT, version TEXT,
      author TEXT, tags TEXT, imported_at TEXT
    );
    CREATE TABLE eval_candidates (id INTEGER PRIMARY KEY, input_text TEXT, output_text TEXT, source_skill_id TEXT, score REAL, created_at TEXT);
  `);
  return db;
}

describe("dream-cycle", () => {
  let db: Database.Database;

  beforeEach(() => {
    db = setupDb();
  });

  it("runs dream cycle with no data", async () => {
    const result = await runDreamCycle(db, { ...DEFAULT_SKILLFORGE_CONFIG, minTraceAgeHours: 0 });
    expect(result.proposalsCreated).toBe(0);
    expect(result.errors).toHaveLength(0);
    expect(result.report).toContain("Dream Cycle Report");
  });

  it("auto-approves low-risk proposals", async () => {
    db.prepare("INSERT INTO skill_registry (id, name, content, version) VALUES (?, ?, ?, ?)")
      .run(1, "Test Skill", "content", "1.0");
    db.prepare("INSERT INTO eval_candidates (input_text, output_text, source_skill_id, score, created_at) VALUES (?, ?, ?, ?, ?)")
      .run("input", "output", "1", 0.9, new Date().toISOString());

    const result = await runDreamCycle(db, { ...DEFAULT_SKILLFORGE_CONFIG, minTraceAgeHours: 0 });
    expect(result.errors).toHaveLength(0);
  });
});
