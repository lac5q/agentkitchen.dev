/**
 * POST /api/skillforge/cycle
 * Run the full SkillCycle (Phase 90).
 */

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { authorizeRegistryWrite } from "@/lib/operator-auth";
import { runSkillCycle } from "@/lib/skillforge/integration";
import { DEFAULT_SKILLFORGE_CONFIG } from "@/lib/skillforge";

export async function POST(req: NextRequest): Promise<NextResponse> {
  if (!authorizeRegistryWrite(req)) {
    return NextResponse.json({ error: "authentication required" }, { status: 401 });
  }

  try {
    const db = getDb();
    const result = await runSkillCycle(db, DEFAULT_SKILLFORGE_CONFIG);
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
