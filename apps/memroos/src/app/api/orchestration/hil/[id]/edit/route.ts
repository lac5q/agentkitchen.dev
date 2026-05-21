import { authorizeRegistryWrite, registryWriteUnauthorizedResponse } from "@/lib/operator-auth";

export const dynamic = "force-dynamic";

interface RouteContext {
  params: Promise<{ id: string }>;
}

function orchestrationServiceUrl(): string {
  return (process.env.ORCHESTRATION_SERVICE_URL || "http://localhost:3210").replace(/\/$/, "");
}

export async function PATCH(request: Request, context: RouteContext) {
  // T-70-14: auth guard is MANDATORY — omitting it creates an open endpoint
  // reachable through the Cloudflare tunnel (RESEARCH.md Pitfall 5, CC-5)
  if (!authorizeRegistryWrite(request)) {
    return registryWriteUnauthorizedResponse();
  }

  const params = await context.params;
  const body = await request.json().catch(() => null);

  // Forward x-operator-id for audit actor identity (Plan 02 contract)
  const operatorId = request.headers.get("x-operator-id");
  const forwardHeaders: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (operatorId) {
    forwardHeaders["x-operator-id"] = operatorId;
  }

  const upstream = await fetch(
    `${orchestrationServiceUrl()}/hil/${encodeURIComponent(params.id)}/edit`,
    {
      method: "PATCH",
      headers: forwardHeaders,
      body: JSON.stringify(body ?? {}),
    }
  );

  // Pass through 422 unchanged so the client can surface field-level validation errors
  const upstreamBody = await upstream.json().catch(() => null);
  return Response.json(upstreamBody, { status: upstream.status });
}
