import { createHash, randomBytes } from "crypto";
import { getDb } from "@/lib/db";
import { hashPassword } from "@/lib/auth/password";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let body: { token?: string; password?: string };
  try {
    body = (await request.json()) as { token?: string; password?: string };
  } catch {
    return Response.json({ error: "invalid request body" }, { status: 400 });
  }

  if (!body.token || !body.password) {
    return Response.json({ error: "token and password are required" }, { status: 400 });
  }
  if (body.password.length < 8) {
    return Response.json({ error: "password must be at least 8 characters" }, { status: 400 });
  }

  const db = getDb();
  const tokenHash = createHash("sha256").update(body.token).digest("hex");
  const token = db
    .prepare(
      `SELECT id, user_id, expires_at, used_at
       FROM password_reset_tokens
       WHERE token_hash = ?`
    )
    .get(tokenHash) as { id: string; user_id: string; expires_at: string; used_at: string | null } | undefined;

  if (!token || token.used_at || new Date(token.expires_at) < new Date()) {
    return Response.json({ error: "invalid or expired token" }, { status: 404 });
  }

  const passwordHash = await hashPassword(body.password);
  const now = new Date().toISOString();
  db.transaction(() => {
    db.prepare("UPDATE users SET password_hash = ? WHERE id = ?").run(passwordHash, token.user_id);
    db.prepare("UPDATE password_reset_tokens SET used_at = ? WHERE id = ?").run(now, token.id);
    db.prepare("UPDATE user_refresh_tokens SET revoked_at = ? WHERE user_id = ? AND revoked_at IS NULL").run(
      now,
      token.user_id
    );
    db.prepare(
      "INSERT INTO auth_events (id, user_id, event_type, metadata_json) VALUES (?, ?, ?, ?)"
    ).run(randomBytes(8).toString("hex"), token.user_id, "password_reset_completed", "{}");
  })();

  return Response.json({ ok: true });
}
