import type { NextRequest } from "next/server";

import { authenticateUser } from "@/lib/auth/session";
import { requireRole } from "@/lib/auth/middleware-roles";
import { getDb } from "@/lib/db";
import { listVaultArtifacts } from "@/lib/vault/writer";

export const dynamic = "force-dynamic";

async function requireAdmin(req: NextRequest | Request) {
  const session = await authenticateUser(req);
  if (!session) {
    return { response: Response.json({ error: "authentication required" }, { status: 401 }) };
  }
  const roleError = requireRole(session.role, "admin");
  if (roleError) return { response: roleError };
  return { response: null };
}

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (auth.response) return auth.response;

  const url = new URL(req.url);
  const tenantId = url.searchParams.get("tenant") || "default-tenant";
  const cursor = url.searchParams.get("cursor");
  const limitParam = Number(url.searchParams.get("limit") ?? "50");
  const limit = Number.isFinite(limitParam) ? limitParam : 50;
  const result = listVaultArtifacts(getDb(), { tenantId, limit, cursor });

  return Response.json({
    tenantId,
    artifacts: result.artifacts,
    nextCursor: result.nextCursor,
    timestamp: new Date().toISOString(),
  });
}
