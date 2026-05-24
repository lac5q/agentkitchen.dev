// @vitest-environment node
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import path from "path";
import Database from "better-sqlite3";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

const testDb = new Database(":memory:");
const knowledgeDir = mkdtempSync(path.join(tmpdir(), "memroos-inventory-"));

vi.mock("@/lib/db", () => ({
  getDb: () => testDb,
  closeDb: () => {},
}));

vi.mock("@/lib/auth/session", () => ({
  authenticateUser: vi.fn().mockResolvedValue({
    userId: "test-user",
    role: "operator",
    email: "",
    displayName: "",
    tenantId: "default",
  }),
}));

vi.mock("@/lib/auth/middleware-roles", () => ({
  requireRole: vi.fn().mockReturnValue(null),
}));

vi.mock("@/lib/knowledge-collections", async () => {
  const actual = await vi.importActual<typeof import("@/lib/knowledge-collections")>("@/lib/knowledge-collections");
  return {
    ...actual,
    loadCollections: () => [{ name: "ops", category: "business", basePath: knowledgeDir }],
  };
});

const { initSchema } = await import("@/lib/db-schema");
initSchema(testDb);

afterAll(() => {
  testDb.close();
  rmSync(knowledgeDir, { recursive: true, force: true });
});

function seedMessage(id: string, consolidated = 0) {
  return testDb
    .prepare(
      `INSERT INTO messages(session_id, project, agent_id, role, content, timestamp, consolidated, visibility, domain, sensitivity, policy)
       VALUES(?,?,?,?,?,?,?,?,?,?,?)`
    )
    .run(
      `session-${id}`,
      "memroos",
      "codex",
      "assistant",
      `inventory message ${id}`,
      "2026-05-24T12:00:00Z",
      consolidated,
      "internal",
      "product",
      "normal",
      "indexable"
    ).lastInsertRowid as number;
}

describe("GET /api/memory-inventory", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          status: "ok",
          memory_count: 11,
          vector_store: "connected",
          last_write: "2026-05-24T10:00:00Z",
        }),
      })
    );
    testDb.exec("DELETE FROM memory_meta_insights");
    testDb.exec("DELETE FROM memory_consolidation_runs");
    testDb.exec("DELETE FROM memory_salience");
    testDb.exec("DELETE FROM agent_memory_writes");
    testDb.exec("DELETE FROM messages");
    rmSync(knowledgeDir, { recursive: true, force: true });
    mkdirSync(knowledgeDir, { recursive: true });
    writeFileSync(path.join(knowledgeDir, "runbook.md"), "# runbook\n");
  });

  it("returns source-backed category counts, definitions, filters, and provenance rows", async () => {
    const messageId = seedMessage("one", 0);
    seedMessage("two", 1);
    testDb.prepare("INSERT INTO memory_salience(message_id, tier, salience_score, access_count) VALUES(?,?,?,?)").run(messageId, "high", 0.82, 4);
    const runId = testDb
      .prepare("INSERT INTO memory_consolidation_runs(status, insights_written, completed_at) VALUES(?,?,?)")
      .run("completed", 1, "2026-05-24T12:05:00Z").lastInsertRowid as number;
    testDb
      .prepare("INSERT INTO memory_meta_insights(run_id, insight_type, content, source_ids, created_at) VALUES(?,?,?,?,?)")
      .run(runId, "summary", "Operators need category-specific inventory counts.", JSON.stringify([messageId]), "2026-05-24T12:06:00Z");
    testDb
      .prepare("INSERT OR IGNORE INTO registered_agents(id, name, role, platform, protocol, status, last_heartbeat_at) VALUES(?,?,?,?,?,?,?)")
      .run("codex", "Codex", "engineer", "codex", "local", "active", "2026-05-24T12:00:00Z");
    testDb
      .prepare("INSERT INTO agent_memory_writes(agent_id, memory_type, content_hash, metadata, result, written_at) VALUES(?,?,?,?,?,?)")
      .run("codex", "episodic", "hash-1", JSON.stringify({ project: "memroos" }), JSON.stringify({ ok: true }), "2026-05-24T12:07:00Z");

    const { GET } = await import("../route");
    const res = await GET(new Request("http://localhost/api/memory-inventory?category=ingested_message") as unknown as import("next/server").NextRequest);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.categories).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "vector_memory", label: "Vector memories", count: 11, backend: "mem0 / Qdrant" }),
        expect.objectContaining({ id: "ingested_message", label: "Ingested messages", count: 2, backend: "SQLite messages" }),
        expect.objectContaining({ id: "consolidated_insight", label: "Consolidated insights", count: 1, backend: "SQLite memory_meta_insights" }),
        expect.objectContaining({ id: "episodic_write", label: "Episodic writes", count: 1, backend: "SQLite agent_memory_writes" }),
        expect.objectContaining({ id: "knowledge_file", label: "Knowledge files", count: 1, backend: "qmd / knowledge collections" }),
      ])
    );
    expect(body.definitions.ingested_message).toContain("Raw messages");
    expect(body.rows).toEqual(expect.arrayContaining([
      expect.objectContaining({
        category: "ingested_message",
        backend: "SQLite messages",
        source: "codex",
        project: "memroos",
        consolidationState: "pending",
        securityLabel: expect.objectContaining({ visibility: "internal", policy: "indexable" }),
        provenance: expect.objectContaining({ sourceTable: "messages", sourceId: messageId }),
      }),
    ]));
    expect(body.rows.every((row: { category: string }) => row.category === "ingested_message")).toBe(true);
    expect(body.filters.categories).toContain("ingested_message");
    expect(JSON.stringify(body)).not.toContain("97 memories");
  });

  it("reports vector inventory as degraded instead of inventing a count when mem0 omits one", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ status: "ok", vector_store: "connected" }),
      })
    );

    const { GET } = await import("../route");
    const res = await GET(new Request("http://localhost/api/memory-inventory") as unknown as import("next/server").NextRequest);
    const body = await res.json();

    expect(body.categories.find((category: { id: string }) => category.id === "vector_memory")).toEqual(
      expect.objectContaining({
        count: null,
        status: "degraded",
        warnings: expect.arrayContaining([expect.stringMatching(/count unavailable/i)]),
      })
    );
  });
});
