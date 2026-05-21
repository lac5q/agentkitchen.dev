/**
 * POST /api/library/qmd-update
 *
 * Authenticated operator route that spawns `qmd update` and streams structured
 * SSE events to the caller while the process runs.
 *
 * Auth: requires valid session (authenticateUser) with operator or admin role.
 * Process safety: uses spawn(), never exec/execSync. Cleans up on disconnect.
 *
 * SSE event types (JSON payload in data field):
 *   { type: "started", pid: number }
 *   { type: "stdout", line: string }
 *   { type: "stderr", line: string }
 *   { type: "completed", exitCode: number }
 *   { type: "failed", error: string }
 */

import { spawn } from "child_process";
import type { NextRequest } from "next/server";
import { authenticateUser } from "@/lib/auth/session";
import { requireRole } from "@/lib/auth/middleware-roles";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Maximum runtime for qmd update before we kill it (30 minutes). */
const MAX_RUNTIME_MS = 30 * 60 * 1_000;

function sseEvent(payload: Record<string, unknown>): string {
  return `data: ${JSON.stringify(payload)}\n\n`;
}

export async function POST(req: NextRequest) {
  // Auth gate — operator or admin only
  const session = await authenticateUser(req);
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const roleError = requireRole(session.role, "operator");
  if (roleError) return roleError;

  // Resolve qmd binary from env or fall back to PATH
  const qmdBin = process.env.QMD_BIN ?? "qmd";

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      let finished = false;

      function enqueue(payload: Record<string, unknown>) {
        if (finished) return;
        try {
          controller.enqueue(encoder.encode(sseEvent(payload)));
        } catch {
          // client disconnected — ignore write errors
        }
      }

      function close() {
        if (finished) return;
        finished = true;
        try {
          controller.close();
        } catch {
          // already closed
        }
      }

      let child: ReturnType<typeof spawn> | null = null;

      // Enforce maximum runtime
      const killTimer = setTimeout(() => {
        if (child && !child.killed) {
          child.kill("SIGTERM");
          enqueue({ type: "failed", error: "qmd update exceeded maximum runtime; killed." });
        }
        close();
      }, MAX_RUNTIME_MS);

      // Clean up on client disconnect
      req.signal.addEventListener("abort", () => {
        clearTimeout(killTimer);
        if (child && !child.killed) {
          child.kill("SIGTERM");
        }
        close();
      });

      try {
        child = spawn(qmdBin, ["update"], {
          env: {
            PATH: process.env.PATH ?? "/usr/local/bin:/opt/homebrew/bin:/usr/bin:/bin",
            ...process.env,
          },
          stdio: ["ignore", "pipe", "pipe"],
        });
      } catch (spawnErr) {
        clearTimeout(killTimer);
        enqueue({
          type: "failed",
          error: spawnErr instanceof Error ? spawnErr.message : String(spawnErr),
        });
        close();
        return;
      }

      enqueue({ type: "started", pid: child.pid ?? null });

      child.stdout?.on("data", (chunk: Buffer) => {
        for (const line of chunk.toString("utf8").split("\n")) {
          if (line.trim()) enqueue({ type: "stdout", line: line.trim() });
        }
      });

      child.stderr?.on("data", (chunk: Buffer) => {
        for (const line of chunk.toString("utf8").split("\n")) {
          if (line.trim()) enqueue({ type: "stderr", line: line.trim() });
        }
      });

      child.on("error", (err) => {
        clearTimeout(killTimer);
        enqueue({ type: "failed", error: err.message });
        close();
      });

      child.on("close", (exitCode) => {
        clearTimeout(killTimer);
        if (exitCode === 0) {
          enqueue({ type: "completed", exitCode: 0 });
        } else {
          enqueue({
            type: "failed",
            error: `qmd update exited with code ${exitCode ?? "null"}`,
          });
        }
        close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
