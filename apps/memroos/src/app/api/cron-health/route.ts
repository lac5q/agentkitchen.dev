import { getDb } from "@/lib/db";
import {
  listCronHealthJobs,
  updateCronJobStatus,
  upsertCronHealthJob,
  type CronJobStatus,
} from "@/lib/cron-health";
import { authorizeRegistryWrite, registryWriteUnauthorizedResponse } from "@/lib/operator-auth";

export const dynamic = "force-dynamic";

function isStatus(value: unknown): value is CronJobStatus {
  return value === "active" || value === "paused" || value === "stopped";
}

export async function GET() {
  const jobs = listCronHealthJobs(getDb());
  const summary = {
    total: jobs.length,
    healthy: jobs.filter((job) => job.health === "healthy").length,
    warning: jobs.filter((job) => job.health === "warning").length,
    paused: jobs.filter((job) => job.health === "paused").length,
    stopped: jobs.filter((job) => job.health === "stopped").length,
    unknown: jobs.filter((job) => job.health === "unknown").length,
  };
  return Response.json({ ok: true, jobs, summary, timestamp: new Date().toISOString() });
}

export async function POST(request: Request) {
  if (!authorizeRegistryWrite(request)) return registryWriteUnauthorizedResponse();

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return Response.json({ ok: false, error: "invalid JSON body" }, { status: 400 });
  }

  if (
    typeof body.id !== "string" ||
    typeof body.name !== "string" ||
    typeof body.sourceFamily !== "string" ||
    typeof body.schedule !== "string"
  ) {
    return Response.json(
      { ok: false, error: "id, name, sourceFamily, and schedule are required" },
      { status: 400 }
    );
  }

  const job = upsertCronHealthJob(getDb(), {
    id: body.id,
    name: body.name,
    sourceFamily: body.sourceFamily,
    schedule: body.schedule,
    owner: typeof body.owner === "string" ? body.owner : undefined,
    status: isStatus(body.status) ? body.status : undefined,
    healthEndpoint: typeof body.healthEndpoint === "string" ? body.healthEndpoint : null,
    expectedIntervalMinutes:
      typeof body.expectedIntervalMinutes === "number" ? body.expectedIntervalMinutes : undefined,
    lastRunAt: typeof body.lastRunAt === "string" ? body.lastRunAt : null,
    lastSuccessAt: typeof body.lastSuccessAt === "string" ? body.lastSuccessAt : null,
    lastFailureAt: typeof body.lastFailureAt === "string" ? body.lastFailureAt : null,
    itemsProcessed: typeof body.itemsProcessed === "number" ? body.itemsProcessed : undefined,
    warning: typeof body.warning === "string" ? body.warning : null,
    metadata:
      body.metadata && typeof body.metadata === "object" && !Array.isArray(body.metadata)
        ? (body.metadata as Record<string, unknown>)
        : undefined,
  });

  return Response.json({ ok: true, job }, { status: 201 });
}

export async function PATCH(request: Request) {
  if (!authorizeRegistryWrite(request)) return registryWriteUnauthorizedResponse();

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return Response.json({ ok: false, error: "invalid JSON body" }, { status: 400 });
  }

  if (typeof body.id !== "string" || !isStatus(body.status)) {
    return Response.json(
      { ok: false, error: "id and status(active|paused|stopped) are required" },
      { status: 400 }
    );
  }

  const job = updateCronJobStatus(getDb(), body.id, body.status);
  if (!job) return Response.json({ ok: false, error: "job not found" }, { status: 404 });
  return Response.json({ ok: true, job });
}
