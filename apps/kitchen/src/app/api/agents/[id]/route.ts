import type { NextRequest } from "next/server";
import { deregisterAgent, getRegisteredAgent } from "@/lib/agent-registry";

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const agent = getRegisteredAgent(id);
  if (!agent) {
    return Response.json({ error: `Agent not found: ${id}` }, { status: 404 });
  }
  return Response.json({ agent, timestamp: new Date().toISOString() });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const agent = deregisterAgent(id);
  if (!agent) {
    return Response.json({ error: `Agent not found: ${id}` }, { status: 404 });
  }
  return Response.json({ ok: true, agent, timestamp: new Date().toISOString() });
}
