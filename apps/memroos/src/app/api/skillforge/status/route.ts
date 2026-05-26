/**
 * GET /api/skillforge/status
 * Current SkillForge worker status.
 */

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { SkillForgeWorker, DEFAULT_SKILLFORGE_CONFIG } from "@/lib/skillforge";
import { authorizeRegistryWrite } from "@/lib/operator-auth";

export async function GET(_req: NextRequest): Promise<NextResponse> {
  if (!authorizeRegistryWrite(_req)) {
    return NextResponse.json({ error: "authentication required" }, { status: 401 });
  }
  try {
    const db = getDb();
    const worker = new SkillForgeWorker(db, DEFAULT_SKILLFORGE_CONFIG);
    const status = worker.getStatus();

    return NextResponse.json({
      ...status,
      config: {
        cronSchedule: DEFAULT_SKILLFORGE_CONFIG.cronSchedule,
        batchSize: DEFAULT_SKILLFORGE_CONFIG.batchSize,
        redactionEnabled: DEFAULT_SKILLFORGE_CONFIG.redactionEnabled,
      },
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
