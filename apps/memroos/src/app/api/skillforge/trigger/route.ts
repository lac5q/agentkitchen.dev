/**
 * POST /api/skillforge/trigger
 * Manual trigger for SkillForge worker (operator only).
 */

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { SkillForgeWorker, DEFAULT_SKILLFORGE_CONFIG } from "@/lib/skillforge";
import { authorizeRegistryWrite } from "@/lib/operator-auth";

export async function POST(_req: NextRequest): Promise<NextResponse> {
  if (!authorizeRegistryWrite(_req)) {
    return NextResponse.json({ error: "authentication required" }, { status: 401 });
  }
  try {
    const db = getDb();
    const worker = new SkillForgeWorker(db, DEFAULT_SKILLFORGE_CONFIG);
    const result = await worker.run();

    return NextResponse.json({
      success: result.status !== "failure",
      runId: result.runId,
      status: result.status,
      entriesProcessed: result.entriesProcessed,
      proposalsCreated: result.proposalsCreated,
      proposalsSubmitted: result.proposalsSubmitted,
      errors: result.errors,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
