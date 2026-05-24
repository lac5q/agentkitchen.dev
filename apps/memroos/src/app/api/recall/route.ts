import type { NextRequest } from 'next/server';
import { getDb } from '@/lib/db';
import { recallByKeyword, type RecallResult } from '@/lib/db-ingest';
import { embedText } from '@/lib/embeddings/provider';
import { hybridRecall, semanticRecall } from '@/lib/embeddings/recall';
import { filterAuthorizedMessageRows, type MemoryUseActor } from '@/lib/memory/policy-gate';
import { authorizeRegistryWrite } from '@/lib/operator-auth';

export const dynamic = 'force-dynamic';

type RecallMode = 'bm25' | 'semantic' | 'hybrid';
type RecallScope = 'single' | 'cross';

function normalizeMode(mode: string | null): RecallMode {
  return mode === 'semantic' || mode === 'hybrid' ? mode : 'bm25';
}

function safeLimit(value: number): number {
  return Number.isFinite(value) ? Math.min(Math.max(1, value), 100) : 20;
}

function recallActor(agentId: string | null, authorized: boolean): MemoryUseActor {
  if (authorized && agentId) return { id: `agent:${agentId}`, role: "agent", capability: "recall" };
  if (authorized) return { id: "system:recall", role: "operator", capability: "recall" };
  return { id: "anonymous", role: "anonymous", capability: "recall" };
}

/**
 * Parse cross-project scope parameters from request URL.
 *
 * Contract (RECALL-03):
 *   - crossProject=true + allowed_project_ids=a,b,c → scope "cross", allowlist [a,b,c]
 *   - crossProject=true + no/empty allowed_project_ids → validation error (caller must be explicit)
 *   - crossProject absent/false → scope "single", no project filter (backward compat)
 */
function parseCrossProjectScope(url: URL): {
  scope: RecallScope;
  allowedProjectIds: string[] | undefined;
  validationError: string | null;
} {
  const crossProjectParam = url.searchParams.get('crossProject');
  const isCrossProject = crossProjectParam === 'true';

  if (!isCrossProject) {
    return { scope: 'single', allowedProjectIds: undefined, validationError: null };
  }

  // crossProject=true requires explicit allowed_project_ids
  const rawAllowlist = url.searchParams.get('allowed_project_ids');
  if (rawAllowlist === null || rawAllowlist.trim() === '') {
    return {
      scope: 'cross',
      allowedProjectIds: undefined,
      validationError:
        'crossProject=true requires an explicit allowed_project_ids parameter (comma-separated project IDs). ' +
        'Pass allowed_project_ids=project-a,project-b to explicitly scope the recall.',
    };
  }

  const allowedProjectIds = rawAllowlist
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  if (allowedProjectIds.length === 0) {
    return {
      scope: 'cross',
      allowedProjectIds: undefined,
      validationError:
        'crossProject=true requires at least one project in allowed_project_ids. ' +
        'Pass allowed_project_ids=project-a to explicitly scope the recall.',
    };
  }

  return { scope: 'cross', allowedProjectIds, validationError: null };
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

  // Only loopback callers or those presenting the operator API key may assume an agent identity.
  // Unauthenticated callers are treated as anonymous — policy-gate denies non-public content.
  const authorized = authorizeRegistryWrite(req);

  // Parse cross-project scope (RECALL-03)
  const { scope, allowedProjectIds, validationError } = parseCrossProjectScope(url);

  // Return 400 for invalid explicit cross-project requests only (not for default single-project)
  if (validationError !== null) {
    return Response.json({ error: validationError, recall_scope: scope }, { status: 400 });
  }

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
    const results = filterAuthorizedMessageRows(db, rows, recallActor(agentId, authorized), "recall");
    return Response.json({ results, agent_id: agentId, timestamp, recall_scope: scope });
  }

  // Return empty results for blank query (no agent_id filter either)
  if (!q.trim()) {
    return Response.json({ results: [], timestamp, recall_scope: scope });
  }

  const db = getDb();
  const limit = safeLimit(limitParam);
  const actor = recallActor(agentId, authorized);

  const bm25Results = (): Array<RecallResult & { source_project: string }> => {
    const rawResults = recallByKeyword(db, q, limit);
    let filtered: RecallResult[] = agentId
      ? rawResults.filter((r: RecallResult) => r.agent_id === agentId)
      : rawResults;
    // Apply project allowlist filter for cross-project BM25 results
    if (allowedProjectIds !== undefined) {
      filtered = filtered.filter((r: RecallResult) =>
        allowedProjectIds.includes(r.project)
      );
    }
    const allowed = filterAuthorizedMessageRows(db, filtered, actor, "recall");
    // Annotate with source_project for consistent cross-project response shape (RECALL-04)
    return allowed.map((r: RecallResult) => ({
      ...r,
      source_project: r.project,
    }));
  };

  if (mode === 'bm25') {
    const results = bm25Results();
    recordRecallSideEffects(db, q, results);
    return Response.json({
      results,
      query: q,
      mode,
      degraded: false,
      timestamp,
      recall_scope: scope,
      ...(scope === 'cross' ? { allowed_project_ids: allowedProjectIds } : {}),
    });
  }

  const embedding = await embedText(q);
  if (embedding.degraded) {
    const results = bm25Results();
    recordRecallSideEffects(db, q, results);
    return Response.json({
      results,
      query: q,
      mode,
      degraded: true,
      timestamp,
      recall_scope: scope,
      ...(scope === 'cross' ? { allowed_project_ids: allowedProjectIds } : {}),
    });
  }

  const rawResults =
    mode === 'semantic'
      ? semanticRecall(db, embedding.embedding, limit, allowedProjectIds)
      : hybridRecall(db, q, embedding.embedding, limit, allowedProjectIds);
  const results = agentId
    ? rawResults.filter((r: { agent_id: string }) => r.agent_id === agentId)
    : rawResults;
  const allowedResults = filterAuthorizedMessageRows(db, results, actor, "recall");

  recordRecallSideEffects(db, q, allowedResults);
  return Response.json({
    results: allowedResults,
    query: q,
    mode,
    degraded: false,
    timestamp,
    recall_scope: scope,
    ...(scope === 'cross' ? { allowed_project_ids: allowedProjectIds } : {}),
  });
}
