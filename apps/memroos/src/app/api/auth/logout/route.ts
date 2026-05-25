import { createHash } from 'crypto';
import { getDb } from '@/lib/db';
import { ACCESS_TOKEN_COOKIE_NAME, REFRESH_TOKEN_COOKIE_NAME } from '@/lib/auth/session-limits';

function parseCookie(cookieHeader: string | null, name: string): string | null {
  if (!cookieHeader) return null;
  const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`));
  return match ? decodeURIComponent(match[1]) : null;
}

export async function POST(req: Request) {
  const rawToken = parseCookie(req.headers.get('cookie'), REFRESH_TOKEN_COOKIE_NAME);

  if (rawToken) {
    const tokenHash = createHash('sha256').update(rawToken).digest('hex');
    const db = getDb();
    db.prepare(
      'UPDATE user_refresh_tokens SET revoked_at = ? WHERE token_hash = ? AND revoked_at IS NULL'
    ).run(new Date().toISOString(), tokenHash);
  }

  const response = Response.json({ ok: true }, { status: 200 });
  response.headers.append('Set-Cookie', `${REFRESH_TOKEN_COOKIE_NAME}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0`);
  response.headers.append('Set-Cookie', `${ACCESS_TOKEN_COOKIE_NAME}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0`);
  return response;
}
