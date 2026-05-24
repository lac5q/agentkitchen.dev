import { getDb } from "@/lib/db";
import {
  buildSkillSuggestionAudit,
  persistSkillSuggestions,
} from "@/lib/skills/activity-suggestions";
import { authorizeRegistryWrite, registryWriteUnauthorizedResponse } from "@/lib/operator-auth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const days = Number(url.searchParams.get("days") ?? 30);
  const suggestions = buildSkillSuggestionAudit({
    days: Number.isFinite(days) && days > 0 ? Math.min(days, 90) : 30,
  });

  if (url.searchParams.get("persist") === "1") {
    persistSkillSuggestions(getDb(), suggestions);
  }

  return Response.json({
    ok: true,
    windowDays: Number.isFinite(days) && days > 0 ? Math.min(days, 90) : 30,
    suggestions,
    timestamp: new Date().toISOString(),
  });
}

export async function PATCH(request: Request) {
  if (!authorizeRegistryWrite(request)) return registryWriteUnauthorizedResponse();

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return Response.json({ ok: false, error: "invalid JSON body" }, { status: 400 });
  }

  const id = typeof body.id === "string" ? body.id : "";
  const status =
    body.status === "approved" ||
    body.status === "promoted" ||
    body.status === "dismissed" ||
    body.status === "proposed"
      ? body.status
      : null;
  if (!id || !status) {
    return Response.json({ ok: false, error: "id and valid status are required" }, { status: 400 });
  }

  const db = getDb();
  const result = db
    .prepare(
      `UPDATE skill_suggestions
       SET status = ?, promoted_at = CASE WHEN ? = 'promoted' THEN ? ELSE promoted_at END
       WHERE id = ?`
    )
    .run(status, status, new Date().toISOString(), id);

  if (result.changes === 0) return Response.json({ ok: false, error: "suggestion not found" }, { status: 404 });
  return Response.json({ ok: true });
}
