import type { NextRequest } from "next/server";

import { authenticateUser } from "@/lib/auth/session";
import { requireRole } from "@/lib/auth/middleware-roles";
import { updateSkillReviewState } from "@/lib/skill-workflow";

export const dynamic = "force-dynamic";

interface SkillReviewBody {
  skillName?: string;
  action?: "save-draft" | "request-changes" | "approve-general" | "promote-enterprise";
  notes?: string;
  draftBody?: string;
  changeReason?: string;
}

export async function POST(req: NextRequest) {
  const session = await authenticateUser(req);
  if (!session) {
    return Response.json({ error: "authentication required" }, { status: 401 });
  }

  const roleError = requireRole(session.role, "operator");
  if (roleError) return roleError;

  const body = (await req.json().catch(() => null)) as SkillReviewBody | null;
  if (!body?.skillName || !body.action) {
    return Response.json({ error: "skillName and action are required" }, { status: 400 });
  }

  try {
    const review = await updateSkillReviewState({
      skillName: body.skillName,
      action: body.action,
      notes: typeof body.notes === "string" ? body.notes : undefined,
      draftBody: typeof body.draftBody === "string" ? body.draftBody : undefined,
      changeReason: typeof body.changeReason === "string" ? body.changeReason : undefined,
      actor: session.email || session.userId,
    });

    return Response.json({
      ok: true,
      skillName: body.skillName,
      review,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Unable to update skill review" },
      { status: 400 }
    );
  }
}
