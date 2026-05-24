import type { NextRequest } from "next/server";

import { authenticateUser } from "@/lib/auth/session";
import { requireRole } from "@/lib/auth/middleware-roles";
import { buildMemoryInventory } from "@/lib/memory-inventory";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = await authenticateUser(req);
  if (!session) {
    return Response.json({ error: "authentication required" }, { status: 401 });
  }
  const roleError = requireRole(session.role, "operator");
  if (roleError) return roleError;

  const url = req.nextUrl ?? new URL(req.url);
  return Response.json(await buildMemoryInventory(url));
}
