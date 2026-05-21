import { execFileSync } from "child_process";
import { stat as fsStat } from "fs/promises";
import path from "path";
import { MEM0_URL, AGENT_CONFIGS_PATH } from "@/lib/constants";
import { getRepoRoot } from "@/lib/paths";
import type { HealthStatus } from "@/types";

export const dynamic = "force-dynamic";

type ServiceCheckResult = {
  status?: HealthStatus["status"];
  detail?: string;
};

type KnowledgeIndexReport = {
  ok?: boolean;
  pendingEmbeddings?: number | null;
  failures?: string[];
  warnings?: string[];
};

let knowledgeIndexCache:
  | { checkedAt: number; result: ServiceCheckResult }
  | null = null;

async function checkService(
  name: string,
  checkFn: () => Promise<void | ServiceCheckResult>
): Promise<HealthStatus> {
  const start = Date.now();
  try {
    const result = await checkFn();
    return {
      service: name,
      status: result?.status ?? "up",
      latencyMs: Date.now() - start,
      lastCheck: new Date().toISOString(),
      detail: result?.detail,
    };
  } catch {
    return {
      service: name,
      status: "down",
      latencyMs: null,
      lastCheck: new Date().toISOString(),
    };
  }
}

async function checkMem0(): Promise<ServiceCheckResult> {
  const response = await fetch(`${MEM0_URL}/health`, { signal: AbortSignal.timeout(2000) });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  const body = await response.json().catch(() => ({}));
  const details: string[] = [];
  const queue = body.queue as { queued?: number | null } | undefined;
  const queued = typeof queue?.queued === "number" ? queue.queued : 0;
  const vectorStore = typeof body.vector_store === "string" ? body.vector_store : "unknown";
  const runtime = body.memory_runtime as { status?: string; error?: string } | undefined;

  if (body.status === "degraded") {
    details.push("mem0 reports degraded");
  }
  if (queued > 0) {
    details.push(`${queued} queued memory saves`);
  }
  if (vectorStore !== "connected") {
    details.push(`vector store ${vectorStore}`);
  }
  if (runtime?.status && runtime.status !== "available") {
    details.push(`runtime ${runtime.status}${runtime.error ? `: ${runtime.error}` : ""}`);
  }

  return details.length > 0
    ? { status: "degraded", detail: details.join("; ") }
    : { status: "up" };
}

async function checkKnowledgeIndexing(): Promise<ServiceCheckResult> {
  const now = Date.now();
  const ttlMs = Number(process.env.KNOWLEDGE_INDEX_HEALTH_TTL_MS ?? 5 * 60 * 1000);
  if (
    knowledgeIndexCache &&
    Number.isFinite(ttlMs) &&
    ttlMs > 0 &&
    now - knowledgeIndexCache.checkedAt < ttlMs
  ) {
    return knowledgeIndexCache.result;
  }

  const repoRoot = getRepoRoot();
  const scriptPath = path.join(repoRoot, "scripts", "check-knowledge-indexing.mjs");
  const days = process.env.MEMORY_INDEX_DAYS ?? "2";
  const maxPending = process.env.QMD_MAX_PENDING_EMBEDDINGS ?? "10000";

  try {
    const output = execFileSync(
      process.execPath,
      [
        scriptPath,
        `--days=${days}`,
        `--max-pending-embeddings=${maxPending}`,
        "--json",
      ],
      {
        cwd: repoRoot,
        encoding: "utf8",
        timeout: Number(process.env.KNOWLEDGE_INDEX_HEALTH_TIMEOUT_MS ?? 45_000),
        env: {
          ...process.env,
          QMD_FORCE_CPU: process.env.QMD_FORCE_CPU ?? "1",
        },
      }
    );
    const report = JSON.parse(output) as KnowledgeIndexReport;
    const detailParts: string[] = [];
    if (typeof report.pendingEmbeddings === "number") {
      detailParts.push(`${report.pendingEmbeddings} pending embeddings`);
    }
    if (report.failures?.length) {
      detailParts.push(report.failures.slice(0, 3).join("; "));
    }
    if (report.warnings?.length) {
      detailParts.push(report.warnings.slice(0, 2).join("; "));
    }

    const result: ServiceCheckResult = report.ok
      ? { status: "up", detail: detailParts[0] }
      : { status: "degraded", detail: detailParts.join("; ") || "knowledge indexing contract failed" };
    knowledgeIndexCache = { checkedAt: now, result };
    return result;
  } catch (error) {
    const detail = error instanceof Error ? error.message : "knowledge indexing check failed";
    const result: ServiceCheckResult = { status: "down", detail };
    knowledgeIndexCache = { checkedAt: now, result };
    return result;
  }
}

export async function GET() {
  const services = await Promise.all([
    checkService("RTK", async () => {
      execFileSync("rtk", ["--version"], { timeout: 2000 });
    }),
    checkService("mem0", async () => {
      return checkMem0();
    }),
    checkService("QMD", async () => {
      execFileSync("which", ["qmd"], { timeout: 2000 });
    }),
    checkService("Knowledge Index", async () => {
      return checkKnowledgeIndexing();
    }),
    checkService("Agents", async () => {
      await fsStat(AGENT_CONFIGS_PATH);
    }),
    checkService("APO", async () => {
      const { stat } = await import("fs/promises");
      await stat(`${process.env.HOME}/.openclaw/skills/proposals`);
    }),
  ]);

  return Response.json({ services, timestamp: new Date().toISOString() });
}
