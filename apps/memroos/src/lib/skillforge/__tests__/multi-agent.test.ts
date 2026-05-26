/**
 * SkillForge Multi-Agent tests — Phase 93
 */

import { describe, it, expect, beforeEach } from "vitest";
import Database from "better-sqlite3";
import { exportSkillPackage, importSkillPackage, syncSkillsWithAgent } from "../multi-agent";

function setupDb(): Database.Database {
  const db = new Database(":memory:");
  db.exec(`
    CREATE TABLE skill_registry (
      id INTEGER PRIMARY KEY, name TEXT NOT NULL, content TEXT NOT NULL,
      version TEXT, author TEXT, tags TEXT, imported_at TEXT
    );
    CREATE TABLE eval_receipts (
      id INTEGER PRIMARY KEY, skill_id TEXT, provider TEXT, model TEXT,
      dimensions TEXT, timestamp TEXT
    );
    CREATE TABLE skill_sync_log (
      id INTEGER PRIMARY KEY, skill_id TEXT, target_agent TEXT,
      package_id TEXT, status TEXT, timestamp TEXT
    );
  `);
  return db;
}

describe("multi-agent", () => {
  let db: Database.Database;

  beforeEach(() => {
    db = setupDb();
  });

  it("exports a skill package", () => {
    db.prepare("INSERT INTO skill_registry (id, name, content, version, author, tags, imported_at) VALUES (?, ?, ?, ?, ?, ?, ?)")
      .run(1, "Test Skill", "content", "1.0", "author", "[]", new Date().toISOString());

    const result = exportSkillPackage(db, "1");
    expect(result.success).toBe(true);
    expect(result.package).toBeTruthy();
    expect(result.package!.skillId).toBe("1");
    expect(result.package!.compatibility).toContain("memroos");
  });

  it("imports a valid skill package", () => {
    const pkg = {
      id: "pkg-1", skillId: "s1", name: "Imported", content: "test",
      metadata: { version: "1.0", author: "a", tags: [], evalReceipts: [{ provider: "cloud", model: "gpt-4", dimensions: { goal: 0.8, depth: 0.8, specificity: 0.8, safety: 0.8, correctness: 0.8 }, timestamp: new Date().toISOString() }] },
      compatibility: ["memroos"], exportedAt: new Date().toISOString(),
    };

    const result = importSkillPackage(db, pkg as any);
    expect(result.success).toBe(true);
    expect(result.validationPassed).toBe(true);
  });

  it("rejects incompatible skill package", () => {
    const pkg = {
      id: "pkg-1", skillId: "s1", name: "Imported", content: "test",
      metadata: { version: "1.0", author: "a", tags: [], evalReceipts: [] },
      compatibility: ["codex"], exportedAt: new Date().toISOString(),
    };

    const result = importSkillPackage(db, pkg);
    expect(result.success).toBe(false);
    expect(result.errors.some((e) => e.includes("not compatible"))).toBe(true);
  });

  it("syncs skills with agent", () => {
    db.prepare("INSERT INTO skill_registry (id, name, content, version, author, tags, imported_at) VALUES (?, ?, ?, ?, ?, ?, ?)")
      .run(1, "Test", "content", "1.0", "a", "[]", new Date().toISOString());

    const result = syncSkillsWithAgent(db, "http://agent-2.local", ["1"]);
    expect(result.synced).toBe(1);
    expect(result.errors).toHaveLength(0);
  });
});
