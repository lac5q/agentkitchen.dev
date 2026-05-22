// @vitest-environment node
import Database from 'better-sqlite3';
import { describe, it, expect, vi, beforeEach, afterAll } from 'vitest';

const testDb = new Database(':memory:');

vi.mock('@/lib/db', () => ({
  getDb: () => testDb,
  closeDb: () => {},
}));

vi.mock('@/lib/auth/session', () => ({
  authenticateUser: vi.fn().mockResolvedValue({ userId: 'test-user', role: 'operator', email: '', displayName: '', tenantId: 'default' }),
}));

vi.mock('@/lib/auth/middleware-roles', () => ({
  requireRole: vi.fn().mockReturnValue(null),
}));

const { initSchema } = await import('@/lib/db-schema');
initSchema(testDb);

afterAll(() => {
  testDb.close();
});

function seedMessage(sessionSuffix: string, consolidated = 0) {
  const id = testDb.prepare(
    "INSERT INTO messages(session_id, project, agent_id, role, content, timestamp, consolidated) VALUES(?,?,?,?,?,?,?)"
  ).run(`sess-${sessionSuffix}`, 'p1', 'agent', 'user', `msg ${sessionSuffix}`, '2024-01-01T00:00:00Z', consolidated).lastInsertRowid as number;
  testDb.prepare('INSERT OR IGNORE INTO memory_salience(message_id, tier) VALUES(?, ?)').run(id, 'mid');
  return id;
}

describe('GET /api/memory-stats', () => {
  beforeEach(() => {
    vi.resetModules();
    testDb.exec('DELETE FROM memory_meta_insights');
    testDb.exec('DELETE FROM memory_consolidation_runs');
    testDb.exec('DELETE FROM memory_salience');
    testDb.exec('DELETE FROM messages');
  });

  it('returns lastRun, pendingUnconsolidated, and tierStats', async () => {
    seedMessage('s1', 0);
    seedMessage('s2', 1);
    // Insert a completed run
    testDb.prepare(
      "INSERT INTO memory_consolidation_runs(batch_size, insights_written, status, completed_at) VALUES(1, 1, 'completed', '2024-01-01T00:00:00Z')"
    ).run();

    const { GET } = await import('../route');
    const req = new Request('http://localhost/api/memory-stats');
    const res = await GET(req as unknown as import('next/server').NextRequest);
    const body = await res.json();

    expect(body).toHaveProperty('lastRun');
    expect(body.lastRun).not.toBeNull();
    expect(body).toHaveProperty('pendingUnconsolidated');
    expect(body.pendingUnconsolidated).toBe(1);
    expect(body).toHaveProperty('tierStats');
    expect(Array.isArray(body.tierStats)).toBe(true);
    expect(body.lastRun).toHaveProperty('started_at');
    expect(body.lastRun).toHaveProperty('error_message');
    expect(body).toHaveProperty('recentFailures24h');
    expect(body).toHaveProperty('timestamp');
  });

  it('returns null lastRun when no consolidation runs exist', async () => {
    const { GET } = await import('../route');
    const req = new Request('http://localhost/api/memory-stats');
    const res = await GET(req as unknown as import('next/server').NextRequest);
    const body = await res.json();

    expect(body.lastRun).toBeNull();
  });

  it('pendingUnconsolidated decreases after marking messages consolidated', async () => {
    seedMessage('d1', 0);
    seedMessage('d2', 0);

    const { GET } = await import('../route');
    const req1 = new Request('http://localhost/api/memory-stats');
    const res1 = await GET(req1 as unknown as import('next/server').NextRequest);
    const body1 = await res1.json();
    expect(body1.pendingUnconsolidated).toBe(2);

    testDb.exec('UPDATE messages SET consolidated = 1');
    vi.resetModules();
    const { GET: GET2 } = await import('../route');
    const req2 = new Request('http://localhost/api/memory-stats');
    const res2 = await GET2(req2 as unknown as import('next/server').NextRequest);
    const body2 = await res2.json();
    expect(body2.pendingUnconsolidated).toBe(0);
  });

  it('returns recent failure count and latest error message', async () => {
    testDb.prepare(
      "INSERT INTO memory_consolidation_runs(started_at, batch_size, insights_written, status, error_message) VALUES(strftime('%Y-%m-%dT%H:%M:%SZ','now'), 0, 0, 'failed', ?)"
    ).run('429 usage limit exceeded');

    const { GET } = await import('../route');
    const res = await GET(new Request('http://localhost/api/memory-stats') as unknown as import('next/server').NextRequest);
    const body = await res.json();

    expect(body.lastRun.status).toBe('failed');
    expect(body.lastRun.error_message).toContain('429');
    expect(body.recentFailures24h).toBe(1);
  });
});
