import { getDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  const db = getDb();

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
    .prepare('SELECT COUNT(*) AS cnt FROM messages WHERE consolidated = 0')
    .get() as { cnt: number };

  const tierStats = db
    .prepare(
      'SELECT tier, COUNT(*) AS count, AVG(salience_score) AS avg_score FROM memory_salience GROUP BY tier'
    )
    .all() as { tier: string; count: number; avg_score: number }[];

  // Source breakdown — count distinct agent_ids so the panel can show what was ingested
  const sourcesRows = db
    .prepare('SELECT agent_id, COUNT(*) AS cnt FROM messages GROUP BY agent_id ORDER BY cnt DESC')
    .all() as { agent_id: string; cnt: number }[];

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
