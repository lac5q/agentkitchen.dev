// @vitest-environment node
import Database from "better-sqlite3";
import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { initSchema } from "@/lib/db-schema";
import { SkillForgeWorker } from "../worker";
import { DEFAULT_SKILLFORGE_CONFIG } from "../types";

let db: Database.Database;

beforeEach(() => {
  db = new Database(":memory:");
  initSchema(db);
});

afterEach(() => {
  db.close();
});

describe("SkillForge Worker", () => {
  it("runs successfully with no data", async () => {
    const worker = new SkillForgeWorker(db, DEFAULT_SKILLFORGE_CONFIG);
    const result = await worker.run();

    expect(result.status).toBe("success");
    expect(result.entriesProcessed).toBe(0);
    expect(result.proposalsCreated).toBe(0);
    expect(result.proposalsSubmitted).toBe(0);
    expect(result.errors).toHaveLength(0);
  });

  it("processes skill_registry entries and creates proposals", async () => {
    db.prepare(
      `INSERT INTO skill_registry (name, source_harness, dispatch_status, version, imported_by, imported_at)
       VALUES (?, ?, ?, ?, ?, ?)`
    ).run("test-skill", "codex", "enabled", "1.0.0", "test", new Date().toISOString());

    const config = { ...DEFAULT_SKILLFORGE_CONFIG, minTraceAgeHours: 0 };
    const worker = new SkillForgeWorker(db, config);
    const result = await worker.run();

    expect(result.status).toBe("success");
    expect(result.entriesProcessed).toBeGreaterThan(0);
    expect(result.proposalsCreated).toBeGreaterThan(0);
    expect(result.proposalsSubmitted).toBeGreaterThan(0);
  });

  it("respects batch size limit", async () => {
    const now = new Date().toISOString();
    for (let i = 0; i < 10; i++) {
      db.prepare(
        `INSERT INTO skill_registry (name, source_harness, dispatch_status, version, imported_by, imported_at)
         VALUES (?, ?, ?, ?, ?, ?)`
      ).run(`skill-${i}`, "codex", "enabled", "1.0.0", "test", now);
    }

    const config = { ...DEFAULT_SKILLFORGE_CONFIG, batchSize: 3, minTraceAgeHours: 0 };
    const worker = new SkillForgeWorker(db, config);
    const result = await worker.run();

    expect(result.proposalsCreated).toBeLessThanOrEqual(3);
  });

  it("logs run to skillforge_run_log", async () => {
    const config = { ...DEFAULT_SKILLFORGE_CONFIG, minTraceAgeHours: 0 };
    const worker = new SkillForgeWorker(db, config);
    await worker.run();

    const log = db
      .prepare("SELECT * FROM skillforge_run_log ORDER BY id DESC LIMIT 1")
      .get() as { run_id: string; status: string } | undefined;

    expect(log).toBeTruthy();
    expect(log?.status).toBe("success");
  });

  it("getStatus returns last run info", async () => {
    const config = { ...DEFAULT_SKILLFORGE_CONFIG, minTraceAgeHours: 0 };
    const worker = new SkillForgeWorker(db, config);
    await worker.run();

    const status = worker.getStatus();
    expect(status.lastRun).toBeTruthy();
    expect(status.status).toBe("success");
  });

  it("getStatus returns empty when no runs", () => {
    const worker = new SkillForgeWorker(db, DEFAULT_SKILLFORGE_CONFIG);
    const status = worker.getStatus();
    expect(status.lastRun).toBeNull();
    expect(status.status).toBeNull();
  });
});
