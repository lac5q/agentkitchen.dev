import type { NextRequest } from "next/server";

import { authenticateUser } from "@/lib/auth/session";
import { requireRole } from "@/lib/auth/middleware-roles";
import { decideClassificationReview } from "@/lib/classification/cascade";
import type { ClassificationDecision } from "@/lib/classification/types";
import { getDb } from "@/lib/db";
import type { VaultLabel } from "@/lib/vault/types";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ reviewId: string }> };

function isDecision(value: unknown): value is ClassificationDecision {
  return value === "approve" || value === "deny" || value === "redact";
}

export async function POST(req: NextRequest, ctx: Ctx) {
  const session = await authenticateUser(req);
  if (!session) return Response.json({ error: "authentication required" }, { status: 401 });

  const roleError = requireRole(session.role, "reviewer");
  if (roleError) return roleError;

  const { reviewId } = await ctx.params;
  if (!reviewId) return Response.json({ error: "review id is required" }, { status: 400 });

  let body: { decision?: unknown; label?: VaultLabel; note?: string | null };
  try {
    body = await req.json() as { decision?: unknown; label?: VaultLabel; note?: string | null };
  } catch {
    return Response.json({ error: "invalid json body" }, { status: 400 });
  }

  if (!isDecision(body.decision)) {
    return Response.json({ error: "decision must be approve, deny, or redact" }, { status: 400 });
  }

  try {
    const result = decideClassificationReview(getDb(), reviewId, {
      decision: body.decision,
      reviewerId: session.userId,
      label: body.label,
      note: body.note,
    });
    return Response.json({ ...result, timestamp: new Date().toISOString() });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const status = message.includes("not found") ? 404 : 409;
    return Response.json({ error: message }, { status });
  }
}
