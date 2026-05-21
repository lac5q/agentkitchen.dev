import type Database from "better-sqlite3";
import { recallByKeyword, type RecallResult } from "@/lib/db-ingest";
import { cosineSimilarity } from "./provider";

export const RRF_K = 60;

export interface SemanticRecallResult extends RecallResult {
  score: number;
}

export interface HybridRecallResult extends RecallResult {
  rrf: number;
  sources: Array<"bm25" | "semantic">;
  score?: number;
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

export function semanticRecall(
  db: Database.Database,
  queryVector: number[],
  limit: number
): SemanticRecallResult[] {
  const safeLimit = Math.min(Math.max(1, limit), 100);
  const rows = db
    .prepare(
      `SELECT m.id, m.session_id, m.project, m.agent_id, m.role, m.content, m.timestamp, e.vector
       FROM message_embeddings e
       JOIN messages m ON m.id = e.message_id
       ORDER BY m.id DESC
       LIMIT ?`
    )
    .all(Math.max(safeLimit * 10, 100)) as EmbeddingRow[];

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
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, safeLimit)
    .map((row, index) => ({ ...row, rank: index + 1 }));
}

export function hybridRecall(
  db: Database.Database,
  query: string,
  queryVector: number[],
  limit: number
): HybridRecallResult[] {
  const safeLimit = Math.min(Math.max(1, limit), 100);
  const bm25 = recallByKeyword(db, query, safeLimit * 2);
  const semantic = semanticRecall(db, queryVector, safeLimit * 2);
  const merged = new Map<number, HybridRecallResult>();

  function add(row: RecallResult | SemanticRecallResult, source: "bm25" | "semantic", rank: number) {
    const existing = merged.get(row.id);
    const contribution = 1 / (RRF_K + rank);

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
    });
  }

  bm25.forEach((row, index) => add(row, "bm25", index + 1));
  semantic.forEach((row, index) => add(row, "semantic", index + 1));

  return Array.from(merged.values())
    .sort((a, b) => b.rrf - a.rrf)
    .slice(0, safeLimit)
    .map((row, index) => ({ ...row, rank: index + 1 }));
}
