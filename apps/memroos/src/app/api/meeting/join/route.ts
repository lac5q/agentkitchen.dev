import type { NextRequest } from "next/server";
import { getDb } from "@/lib/db";
import { authenticateUser } from "@/lib/auth/session";
import { requireRole } from "@/lib/auth/middleware-roles";
import { writeAuditEntry } from "@/lib/audit/write";
import { AUDIT_EVENT_TYPES, ENTITY_TYPES } from "@/lib/audit/event-types";
import { hasConsent, recordConsent } from "@/lib/voice/meeting-consent";

export const dynamic = "force-dynamic";

interface JoinRequestBody {
  meetingLabel?: unknown;
  roomUrl?: unknown;
  token?: unknown;
  consentConfirmed?: unknown;
}

export async function POST(req: NextRequest) {
  const session = await authenticateUser(req);
  const roleError = requireRole(session?.role, "operator");
  if (roleError) return roleError;
  if (!session) return Response.json({ error: "authentication required" }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as JoinRequestBody;
  if (body.consentConfirmed !== true) {
    return Response.json({ error: "recording consent required" }, { status: 403 });
  }

  const meetingLabel =
    typeof body.meetingLabel === "string" && body.meetingLabel.trim()
      ? body.meetingLabel.trim()
      : "Untitled meeting";
  const roomUrl = typeof body.roomUrl === "string" ? body.roomUrl : "";
  const token = typeof body.token === "string" ? body.token : "";

  if (!roomUrl.trim() || !token.trim()) {
    return Response.json({ error: "roomUrl and token are required" }, { status: 400 });
  }

  const db = getDb();
  const meetingId = recordConsent(db, {
    operatorId: session.userId,
    meetingLabel,
  });

  if (!hasConsent(db, meetingId)) {
    return Response.json({ error: "recording consent required" }, { status: 403 });
  }

  writeAuditEntry(
    {
      tenant_id: session.tenantId,
      actor_id: session.userId,
      actor_role: session.role,
      event_type: AUDIT_EVENT_TYPES.MEETING_JOINED,
      entity_type: ENTITY_TYPES.MEETING,
      entity_id: `meeting:${meetingId}`,
      reason: "Daily.co meeting bot join requested after recording consent",
      metadata_json: {
        meeting_id: meetingId,
        meeting_label: meetingLabel,
        operator_id: session.userId,
      },
    },
    db
  );

  // Room URL and token are intentionally used only transiently. The process
  // launch path reads these from environment/secret hand-off outside SQLite.
  void roomUrl;
  void token;

  return Response.json({ meeting_id: meetingId, status: "joining" });
}
