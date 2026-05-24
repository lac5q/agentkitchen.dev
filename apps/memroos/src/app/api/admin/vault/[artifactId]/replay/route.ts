import type { NextRequest } from "next/server";

import { authenticateUser } from "@/lib/auth/session";
import { requireRole } from "@/lib/auth/middleware-roles";
import { getDb } from "@/lib/db";
import { readVaultArtifact, VaultHashMismatchError } from "@/lib/vault/writer";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ artifactId: string }> };

async function requireAdmin(req: NextRequest | Request) {
  const session = await authenticateUser(req);
  if (!session) {
    return { response: Response.json({ error: "authentication required" }, { status: 401 }) };
  }
  const roleError = requireRole(session.role, "admin");
  if (roleError) return { response: roleError };
  return { response: null };
}

export async function GET(req: NextRequest, ctx: Ctx) {
  const auth = await requireAdmin(req);
  if (auth.response) return auth.response;

  const { artifactId } = await ctx.params;
  try {
    const replay = readVaultArtifact(getDb(), artifactId);
    return Response.json({
      artifact: {
        id: replay.id,
        tenantId: replay.tenantId,
        artifactUri: replay.artifactUri,
        contentHash: replay.contentHash,
        replayMetadata: replay.replayMetadata,
      },
      hashVerified: replay.hashVerified,
      body: replay.body,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    if (err instanceof VaultHashMismatchError) {
      return Response.json(
        { error: "vault artifact hash mismatch", artifactId },
        { status: 409 }
      );
    }
    const message = err instanceof Error ? err.message : String(err);
    const status = message.includes("not found") ? 404 : 500;
    return Response.json({ error: message }, { status });
  }
}
