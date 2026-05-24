import { createHash, randomBytes } from "crypto";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let body: { email?: string };
  try {
    body = (await request.json()) as { email?: string };
  } catch {
    return Response.json({ error: "invalid request body" }, { status: 400 });
  }

  const email = body.email?.trim().toLowerCase();
  if (!email) return Response.json({ error: "email is required" }, { status: 400 });

  const db = getDb();
  const user = db.prepare("SELECT id FROM users WHERE email = ?").get(email) as
    | { id: string }
    | undefined;

  const rawToken = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 60 * 60_000).toISOString();
  if (user) {
    db.prepare(
      `INSERT INTO password_reset_tokens (id, user_id, token_hash, expires_at)
       VALUES (?, ?, ?, ?)`
    ).run(randomBytes(8).toString("hex"), user.id, createHash("sha256").update(rawToken).digest("hex"), expiresAt);
    db.prepare(
      "INSERT INTO auth_events (id, user_id, event_type, metadata_json) VALUES (?, ?, ?, ?)"
    ).run(randomBytes(8).toString("hex"), user.id, "password_reset_requested", JSON.stringify({ email }));
  }

  const baseUrl = process.env.MEMROOS_BASE_URL ?? `https://${request.headers.get("host")}`;
  return Response.json({
    ok: true,
    delivery: process.env.MEMROOS_EMAIL_PROVIDER ? "queued" : "manual",
    resetUrl: user ? `${baseUrl}/reset-password/${rawToken}` : null,
  });
}
