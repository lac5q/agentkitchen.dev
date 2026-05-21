/**
 * Phase 72-03: GET /api/seal/jobs/[id]
 *
 * Returns the current status of a behavioral eval job.
 * Operators poll this endpoint after applyProposal() returns kind='job'.
 *
 * 200: { job: EvalJob, timestamp }
 * 404: { error: "Job not found" }
 * 401: Unauthorized
 */
import type { NextRequest } from "next/server";

import { authenticateUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { getJobStatus } from "@/lib/seal/behavioral-runner";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await authenticateUser(req);
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const db = getDb();
  const job = getJobStatus(db, id);

  if (!job) {
    return Response.json({ error: "Job not found" }, { status: 404 });
  }

  return Response.json({ job, timestamp: new Date().toISOString() });
}
