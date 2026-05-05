import { listRegisteredAgents } from "@/lib/agent-registry";

export const dynamic = "force-dynamic";

export function GET() {
  const agents = listRegisteredAgents();
  return Response.json({ agents, timestamp: new Date().toISOString() });
}
