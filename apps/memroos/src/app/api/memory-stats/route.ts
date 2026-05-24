import type { NextRequest } from 'next/server';

import { getDb } from '@/lib/db';
import { authenticateUser } from '@/lib/auth/session';
import { requireRole } from '@/lib/auth/middleware-roles';
import { LOCAL_NOC_AGENT_IDS, normalizeNocWorkspace, type NocWorkspace } from '@/lib/noc-filters';

export const dynamic = 'force-dynamic';

const VALID_WINDOWS = ['day', 'week', 'month'] as const;
type StatsWindow = (typeof VALID_WINDOWS)[number];

function normalizeWindow(value: string | null): StatsWindow | null {
  return VALID_WINDOWS.includes(value as StatsWindow) ? (value as StatsWindow) : null;
}

function sinceForWindow(window: StatsWindow | null): string | null {
  if (!window) return null;
  const days = window === 'day' ? 1 : window === 'week' ? 7 : 30;
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
}

function messageScope(alias: string, since: string | null, workspace: NocWorkspace) {
  const conditions: string[] = [];
  const params: unknown[] = [];
  if (since) {
    conditions.push(`${alias}.timestamp >= ?`);
    params.push(since);
  }
  if (workspace !== 'all') {
    const localPlaceholders = LOCAL_NOC_AGENT_IDS.map(() => '?').join(', ');
    conditions.push(
      workspace === 'local'
        ? `LOWER(${alias}.agent_id) IN (${localPlaceholders})`
        : `LOWER(${alias}.agent_id) NOT IN (${localPlaceholders})`
    );
    params.push(...LOCAL_NOC_AGENT_IDS);
  }
  return {
    clause: conditions.length ? `WHERE ${conditions.join(' AND ')}` : '',
    params,
  };
}

export async function GET(req: NextRequest) {
  const session = await authenticateUser(req);
  if (!session) {
    return Response.json({ error: 'authentication required' }, { status: 401 });
  }
  const roleError = requireRole(session.role, 'operator');
  if (roleError) return roleError;

  const db = getDb();
  const url = req.nextUrl ?? new URL(req.url);
  const window = normalizeWindow(url.searchParams.get('window'));
  const workspace = normalizeNocWorkspace(url.searchParams.get('workspace'));
  const since = sinceForWindow(window);
  const scopedMessages = messageScope('m', since, workspace);

  const lastRunRow = db
    .prepare(
      'SELECT started_at, completed_at, batch_size, insights_written, status, error_message FROM memory_consolidation_runs ORDER BY id DESC LIMIT 1'
    )
    .get() as {
      started_at: string;
      completed_at: string | null;
      batch_size: number;
      insights_written: number;
      status: string;
      error_message: string | null;
    } | undefined;

  const pendingRow = db
    .prepare(
      `SELECT COUNT(*) AS cnt FROM messages m ${
        scopedMessages.clause
          ? `${scopedMessages.clause} AND m.consolidated = 0`
          : 'WHERE m.consolidated = 0'
      }`
    )
    .get(...scopedMessages.params) as { cnt: number };

  const tierStats = db
    .prepare(
      `SELECT ms.tier, COUNT(*) AS count, AVG(ms.salience_score) AS avg_score
       FROM memory_salience ms
       JOIN messages m ON m.id = ms.message_id
       ${scopedMessages.clause}
       GROUP BY ms.tier`
    )
    .all(...scopedMessages.params) as { tier: string; count: number; avg_score: number }[];

  // Source breakdown — count distinct agent_ids so the panel can show what was ingested
  const sourcesRows = db
    .prepare(`SELECT m.agent_id, COUNT(*) AS cnt FROM messages m ${scopedMessages.clause} GROUP BY m.agent_id ORDER BY cnt DESC`)
    .all(...scopedMessages.params) as { agent_id: string; cnt: number }[];

  const recentFailures = db
    .prepare(
      "SELECT COUNT(*) AS cnt FROM memory_consolidation_runs WHERE status='failed' AND started_at >= datetime('now', '-24 hours')"
    )
    .get() as { cnt: number };

  const consolidationModel = process.env.CONSOLIDATION_MODEL ?? 'claude-haiku-4-5-20251001';

  return Response.json({
    lastRun: lastRunRow ?? null,
    pendingUnconsolidated: pendingRow.cnt,
    tierStats,
    consolidationModel,
    sources: sourcesRows,
    recentFailures24h: recentFailures.cnt,
    timestamp: new Date().toISOString(),
  });
}
