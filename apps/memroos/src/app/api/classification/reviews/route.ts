import type { NextRequest } from "next/server";

import { authenticateUser } from "@/lib/auth/session";
import { requireRole } from "@/lib/auth/middleware-roles";
import { listClassificationReviews } from "@/lib/classification/cascade";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = await authenticateUser(req);
  if (!session) return Response.json({ error: "authentication required" }, { status: 401 });

  const roleError = requireRole(session.role, "reviewer");
  if (roleError) return roleError;

  const url = new URL(req.url);
  const status = url.searchParams.get("status") === "all" ? "all" : "open";
  const limitParam = Number(url.searchParams.get("limit") ?? "50");
  const limit = Number.isFinite(limitParam) ? limitParam : 50;
  const tenantId = url.searchParams.get("tenant") || session.tenantId || "default-tenant";

  const reviews = listClassificationReviews(getDb(), { tenantId, status, limit });
  return Response.json({ reviews, timestamp: new Date().toISOString() });
}
