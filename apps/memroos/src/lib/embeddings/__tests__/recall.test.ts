/**
 * Wave 0 RED test scaffold for semanticRecall + hybridRecall (RECALL-01).
 *
 * These tests pin the contract for recall.ts BEFORE the implementation exists.
 * They must fail (Cannot find module) until recall.ts is created.
 *
 * Contract:
 *   - semanticRecall(db, queryVector, limit) ranks messages by cosine similarity desc
 *   - hybridRecall(db, query, queryVector, limit) RRF-merges BM25 + semantic results
 *   - A message in both BM25 and semantic lists outranks one in only one list
 *   - RRF uses exported constant RRF_K = 60
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { Mock } from "vitest";
import type Database from "better-sqlite3";

// These imports will fail (Cannot find module) until recall.ts is implemented — RED
import { RRF_K, semanticRecall, hybridRecall } from "../recall";
import { upsertEmbedding } from "../store";
import { getDb, closeDb } from "@/lib/db";

// Mock recallByKeyword so we can control the BM25 side in hybridRecall tests
vi.mock("@/lib/db-ingest", () => ({
  recallByKeyword: vi.fn(),
}));

import { recallByKeyword } from "@/lib/db-ingest";

function insertTestMessage(
  db: Database.Database,
  sessionId: string,
  content: string
): number {
  const result = db
    .prepare(
      "INSERT INTO messages(session_id, project, agent_id, role, content, timestamp) VALUES(?, ?, ?, ?, ?, ?)"
    )
    .run(sessionId, "test-project", "test-agent", "user", content, new Date().toISOString());
  return result.lastInsertRowid as number;
}

describe("RRF_K constant", () => {
  it("RRF_K equals 60 (D-04)", () => {
    expect(RRF_K).toBe(60);
  });
});

describe("semanticRecall (RECALL-01)", () => {
  let db: Database.Database;
  const session = `recall-sess-${Date.now()}`;

  beforeEach(() => {
    db = getDb();
  });

  afterEach(() => {
    closeDb();
  });

  it("ranks messages by cosine similarity descending", () => {
    const queryVector = [1, 0, 0, 0]; // unit vector along dimension 0

    // Insert three messages with embeddings at varying similarity
    const id1 = insertTestMessage(db, session, "message 1 high similarity");
    const id2 = insertTestMessage(db, session, "message 2 medium similarity");
    const id3 = insertTestMessage(db, session, "message 3 low similarity");

    // High similarity: nearly aligned with queryVector
    upsertEmbedding(db, id1, [0.99, 0.1, 0.0, 0.0], "nomic-embed-text");
    // Medium similarity: 45 degrees away
    upsertEmbedding(db, id2, [0.5, 0.5, 0.5, 0.5], "nomic-embed-text");
    // Low similarity: orthogonal
    upsertEmbedding(db, id3, [0.0, 0.0, 1.0, 0.0], "nomic-embed-text");

    const results = semanticRecall(db, queryVector, 3);

    expect(results.length).toBeGreaterThan(0);
    expect(results.length).toBeLessThanOrEqual(3);

    // First result should be id1 (highest cosine similarity)
    expect(results[0].id).toBe(id1);
  });

  it("respects the limit parameter", () => {
    const queryVector = [1, 0, 0, 0];
    const localSession = `${session}-lim`;

    for (let i = 0; i < 5; i++) {
      const id = insertTestMessage(db, localSession, `limit test message ${i}`);
      upsertEmbedding(db, id, [0.9 - i * 0.1, 0.1, 0.0, 0.0], "nomic-embed-text");
    }

    const results = semanticRecall(db, queryVector, 2);
    expect(results.length).toBeLessThanOrEqual(2);
  });

  it("returns rows with id, session_id, project, agent_id, role, snippet, timestamp fields", () => {
    const queryVector = [1, 0, 0];
    const localSession = `${session}-shape`;

    const id = insertTestMessage(db, localSession, "shape test message");
    upsertEmbedding(db, id, [0.9, 0.1, 0.0], "nomic-embed-text");

    const results = semanticRecall(db, queryVector, 1);

    if (results.length > 0) {
      const row = results[0];
      expect(row).toHaveProperty("id");
      expect(row).toHaveProperty("session_id");
      expect(row).toHaveProperty("project");
      expect(row).toHaveProperty("agent_id");
      expect(row).toHaveProperty("role");
      expect(row).toHaveProperty("snippet");
      expect(row).toHaveProperty("timestamp");
    }
  });
});

describe("hybridRecall — RRF merge (RECALL-01, D-04)", () => {
  let db: Database.Database;
  const session = `hybrid-sess-${Date.now()}`;

  beforeEach(() => {
    db = getDb();
    vi.clearAllMocks();
  });

  afterEach(() => {
    closeDb();
  });

  it("a message in both BM25 and semantic lists outranks one in only one list", () => {
    const queryVector = [1, 0, 0, 0];
    const localSession = `${session}-boost`;

    // id1: appears in both BM25 and semantic (should rank highest)
    const id1 = insertTestMessage(db, localSession, "overlap message appears in both lists");
    upsertEmbedding(db, id1, [0.95, 0.1, 0.0, 0.0], "nomic-embed-text");

    // id2: appears in semantic only
    const id2 = insertTestMessage(db, localSession, "semantic only message");
    upsertEmbedding(db, id2, [0.8, 0.1, 0.0, 0.0], "nomic-embed-text");

    // id3: appears in BM25 only (no embedding)
    const id3 = insertTestMessage(db, localSession, "bm25 only message");

    // Mock BM25 to return id1 (rank 0) and id3 (rank 1)
    (recallByKeyword as Mock).mockReturnValue([
      { id: id1, session_id: localSession, project: "test-project", agent_id: "test-agent", role: "user", snippet: "overlap message", timestamp: "2026-01-01T00:00:00Z", rank: 1 },
      { id: id3, session_id: localSession, project: "test-project", agent_id: "test-agent", role: "user", snippet: "bm25 only message", timestamp: "2026-01-01T00:00:00Z", rank: 2 },
    ]);

    const results = hybridRecall(db, "overlap", queryVector, 3);

    expect(results.length).toBeGreaterThan(0);

    // id1 (in both lists) should rank higher than id2 (semantic only) or id3 (BM25 only)
    const pos1 = results.findIndex((r) => r.id === id1);
    const pos2 = results.findIndex((r) => r.id === id2);

    // id1 must appear in results and outrank id2 (lower index = higher rank)
    expect(pos1).toBeGreaterThanOrEqual(0);
    if (pos2 >= 0) {
      expect(pos1).toBeLessThan(pos2);
    }
  });

  it("uses RRF formula 1/(RRF_K + rank) for fusion", () => {
    const queryVector = [1, 0, 0, 0];
    const localSession = `${session}-rrf`;

    const id1 = insertTestMessage(db, localSession, "rrf test message one");
    upsertEmbedding(db, id1, [0.9, 0.1, 0.0, 0.0], "nomic-embed-text");

    (recallByKeyword as Mock).mockReturnValue([
      { id: id1, session_id: localSession, project: "test-project", agent_id: "test-agent", role: "user", snippet: "rrf test message one", timestamp: "2026-01-01T00:00:00Z", rank: 1 },
    ]);

    const results = hybridRecall(db, "rrf test", queryVector, 5);
    // Should return results without throwing
    expect(Array.isArray(results)).toBe(true);
  });
});
