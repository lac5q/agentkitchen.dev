import type { NextRequest } from 'next/server';
import { getDb } from '@/lib/db';
import { recallByKeyword } from '@/lib/db-ingest';
import { embedText } from '@/lib/embeddings/provider';
import { hybridRecall, semanticRecall } from '@/lib/embeddings/recall';

export const dynamic = 'force-dynamic';

type RecallMode = 'bm25' | 'semantic' | 'hybrid';

function normalizeMode(mode: string | null): RecallMode {
  return mode === 'semantic' || mode === 'hybrid' ? mode : 'bm25';
}

function safeLimit(value: number): number {
  return Number.isFinite(value) ? Math.min(Math.max(1, value), 100) : 20;
}

function recordRecallSideEffects(
  db: ReturnType<typeof getDb>,
  query: string,
  results: Array<{ id: number }>
) {
  db.prepare("INSERT OR REPLACE INTO meta(key, value) VALUES('last_recall_query', ?)").run(query);

  try {
    db.prepare('INSERT INTO recall_log(query, results) VALUES(?, ?)').run(query, results.length);
  } catch {
    // recall_log may not exist on older DB -- silently ignore
  }

  const ids = results.map((r) => r.id).filter(Boolean);
  if (ids.length > 0) {
    try {
      const placeholders = ids.map(() => '?').join(',');
      db.prepare(`
        UPDATE memory_salience
        SET access_count = access_count + 1,
            last_accessed = strftime('%Y-%m-%dT%H:%M:%SZ','now')
        WHERE message_id IN (${placeholders})
      `).run(...ids);
    } catch {
      // memory_salience table may not exist yet (pre-Phase 23) -- silently ignore
    }
  }
}

export async function GET(req: NextRequest) {
  const url = req.nextUrl ?? new URL(req.url);
  const q = url.searchParams.get('q') ?? '';
  const limitParam = Number(url.searchParams.get('limit') ?? '20');
  const agentId = url.searchParams.get('agent_id');
  const mode = normalizeMode(url.searchParams.get('mode'));
  const timestamp = new Date().toISOString();

  // When agent_id is provided but q is empty, return messages for that agent
  if (agentId && !q.trim()) {
    const db = getDb();
    const limit = safeLimit(limitParam);
    const rows = db.prepare(
      `SELECT id, session_id, project, agent_id, role, content, timestamp
       FROM messages
       WHERE agent_id = ?
       ORDER BY timestamp DESC
       LIMIT ?`
    ).all(agentId, limit) as Array<{
      id: number; session_id: string; project: string; agent_id: string;
      role: string; content: string; timestamp: string;
    }>;
    return Response.json({ results: rows, agent_id: agentId, timestamp });
  }

  // Return empty results for blank query (no agent_id filter either)
  if (!q.trim()) {
    return Response.json({ results: [], timestamp });
  }

  const db = getDb();
  const limit = safeLimit(limitParam);

  const bm25Results = () => {
    const rawResults = recallByKeyword(db, q, limit);
    return agentId
      ? rawResults.filter((r: { agent_id: string }) => r.agent_id === agentId)
      : rawResults;
  };

  if (mode === 'bm25') {
    const results = bm25Results();
    recordRecallSideEffects(db, q, results);
    return Response.json({ results, query: q, mode, degraded: false, timestamp });
  }

  const embedding = await embedText(q);
  if (embedding.degraded) {
    const results = bm25Results();
    recordRecallSideEffects(db, q, results);
    return Response.json({ results, query: q, mode, degraded: true, timestamp });
  }

  const rawResults =
    mode === 'semantic'
      ? semanticRecall(db, embedding.embedding, limit)
      : hybridRecall(db, q, embedding.embedding, limit);
  const results = agentId
    ? rawResults.filter((r: { agent_id: string }) => r.agent_id === agentId)
    : rawResults;

  recordRecallSideEffects(db, q, results);
  return Response.json({ results, query: q, mode, degraded: false, timestamp });
}
