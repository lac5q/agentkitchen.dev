/**
 * Phase 72-03: GET /api/seal/jobs/[id]/evidence
 *
 * Returns the evidence bundle for a behavioral eval job, if available.
 * Evidence is only present after the runner has completed (pass/fail/rollback).
 *
 * 200: { evidence: EvidenceBundle, timestamp }
 * 404: { error: "Evidence not yet available" } — bundle not yet persisted
 * 404: { error: "Job not found" } — job id unknown
 * 401: Unauthorized
 *
 * Missing fields within the bundle (taskSampleId, replayHandle, promotionMetadata, etc.)
 * render as null — never fabricated (per D-14, D-19).
 */
import type { NextRequest } from "next/server";

import { authenticateUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { getJobEvidence, getJobStatus } from "@/lib/seal/behavioral-runner";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await authenticateUser(req);
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const db = getDb();

  // Confirm job exists before checking evidence
  const job = getJobStatus(db, id);
  if (!job) {
    return Response.json({ error: "Job not found" }, { status: 404 });
  }

  const evidence = getJobEvidence(db, id);
  if (!evidence) {
    return Response.json({ error: "Evidence not yet available" }, { status: 404 });
  }

  return Response.json({ evidence, timestamp: new Date().toISOString() });
}
