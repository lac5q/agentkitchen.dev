import type Database from "better-sqlite3";
import { recallByKeyword, type RecallResult } from "@/lib/db-ingest";
import { cosineSimilarity } from "./provider";

export const RRF_K = 60;

export interface SemanticRecallResult extends RecallResult {
  score: number;
  /** Source project annotation required for cross-project recall (RECALL-04) */
  source_project: string;
}

export interface HybridRecallResult extends RecallResult {
  rrf: number;
  sources: Array<"bm25" | "semantic">;
  score?: number;
  /** Source project annotation required for cross-project recall (RECALL-04) */
  source_project: string;
}

type EmbeddingRow = {
  id: number;
  session_id: string;
  project: string;
  agent_id: string;
  role: string;
  content: string;
  timestamp: string;
  vector: Buffer;
};

function unpackVector(buf: Buffer): number[] {
  const float32 = new Float32Array(buf.buffer, buf.byteOffset, buf.byteLength / 4);
  return Array.from(float32);
}

function toSnippet(content: string): string {
  return content.length > 300 ? `${content.slice(0, 297)}...` : content;
}

/**
 * Build the project-scope WHERE clause fragment and bind params.
 *
 * - No allowedProjectIds (undefined): no filter — backward compat
 * - Empty allowedProjectIds ([]): impossible condition (returns zero rows)
 * - Non-empty allowedProjectIds: IN clause constraining m.project
 *
 * Performance note: filter is SQL-level, not JS post-filter, to avoid
 * fetching excess rows when allowed projects are sparse (Phase 72 perf note).
 */
function projectScopeClause(allowedProjectIds?: string[]): {
  clause: string;
  params: string[];
} {
  if (allowedProjectIds === undefined) {
    return { clause: "", params: [] };
  }
  if (allowedProjectIds.length === 0) {
    // Empty allowlist: return impossible condition (1=0) so query returns 0 rows
    return { clause: "AND 1=0", params: [] };
  }
  const placeholders = allowedProjectIds.map(() => "?").join(",");
  return { clause: `AND m.project IN (${placeholders})`, params: allowedProjectIds };
}

/**
 * Semantic recall ranked by cosine similarity.
 *
 * @param allowedProjectIds - Optional project allowlist for cross-project scope (RECALL-03).
 *   Undefined = default single-project behavior (no filter, backward compat).
 *   Empty array = no results (unauthorized/empty allowlist).
 *   Non-empty = only rows from those projects are returned (SQL-level filter).
 */
export function semanticRecall(
  db: Database.Database,
  queryVector: number[],
  limit: number,
  allowedProjectIds?: string[]
): SemanticRecallResult[] {
  const safeLimit = Math.min(Math.max(1, limit), 100);
  const { clause, params } = projectScopeClause(allowedProjectIds);

  const rows = db
    .prepare(
      `SELECT m.id, m.session_id, m.project, m.agent_id, m.role, m.content, m.timestamp, e.vector
       FROM message_embeddings e
       JOIN messages m ON m.id = e.message_id
       WHERE 1=1 ${clause}
       ORDER BY m.id DESC
       LIMIT ?`
    )
    .all(...params, Math.max(safeLimit * 10, 100)) as EmbeddingRow[];

  return rows
    .map((row) => ({
      id: row.id,
      session_id: row.session_id,
      project: row.project,
      agent_id: row.agent_id,
      role: row.role,
      snippet: toSnippet(row.content),
      timestamp: row.timestamp,
      rank: 0,
      score: cosineSimilarity(queryVector, unpackVector(row.vector)),
      source_project: row.project,
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, safeLimit)
    .map((row, index) => ({ ...row, rank: index + 1 }));
}

/**
 * Hybrid RRF recall merging BM25 + semantic.
 *
 * @param allowedProjectIds - Optional project allowlist for cross-project scope (RECALL-03).
 *   Filters both BM25 and semantic candidates before RRF merge.
 */
export function hybridRecall(
  db: Database.Database,
  query: string,
  queryVector: number[],
  limit: number,
  allowedProjectIds?: string[]
): HybridRecallResult[] {
  const safeLimit = Math.min(Math.max(1, limit), 100);

  // Get BM25 results and apply project filter in JS (recallByKeyword has no project param)
  const bm25Raw = recallByKeyword(db, query, safeLimit * 2);
  const bm25 = allowedProjectIds !== undefined
    ? bm25Raw.filter((r: RecallResult) =>
        allowedProjectIds.length > 0 && allowedProjectIds.includes(r.project)
      )
    : bm25Raw;

  // Semantic candidates get SQL-level project filtering for performance
  const semantic = semanticRecall(db, queryVector, safeLimit * 2, allowedProjectIds);

  // Empty allowlist: short-circuit before map allocation
  if (allowedProjectIds !== undefined && allowedProjectIds.length === 0) {
    return [];
  }

  const merged = new Map<number, HybridRecallResult>();

  function add(row: RecallResult | SemanticRecallResult, source: "bm25" | "semantic", rank: number) {
    const existing = merged.get(row.id);
    const contribution = 1 / (RRF_K + rank);
    const sourceProject = "source_project" in row ? row.source_project : row.project;

    if (existing) {
      existing.rrf += contribution;
      if (!existing.sources.includes(source)) existing.sources.push(source);
      if ("score" in row && typeof row.score === "number") existing.score = row.score;
      return;
    }

    merged.set(row.id, {
      ...row,
      rrf: contribution,
      sources: [source],
      score: "score" in row && typeof row.score === "number" ? row.score : undefined,
      source_project: sourceProject,
    });
  }

  bm25.forEach((row, index) => add(row, "bm25", index + 1));
  semantic.forEach((row, index) => add(row, "semantic", index + 1));

  return Array.from(merged.values())
    .sort((a, b) => b.rrf - a.rrf)
    .slice(0, safeLimit)
    .map((row, index) => ({ ...row, rank: index + 1 }));
}
