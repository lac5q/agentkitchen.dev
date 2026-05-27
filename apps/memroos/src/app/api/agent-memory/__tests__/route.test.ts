// @vitest-environment node
import crypto from "crypto";
import fs from "fs";
import os from "os";
import path from "path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const TEST_ROOT = path.join(os.tmpdir(), `agent-memory-route-${crypto.randomUUID()}`);
const TEST_DB_PATH = path.join(TEST_ROOT, "routes.db");
const TEST_VAULT_ROOT = path.join(TEST_ROOT, "vault");

async function loadRoutes() {
  process.env.SQLITE_DB_PATH = TEST_DB_PATH;
  process.env.MEMROOS_VAULT_ROOT = TEST_VAULT_ROOT;
  vi.resetModules();
  const captureRoute = await import("../capture/route");
  const handoffRoute = await import("../handoff/route");
  const dbModule = await import("@/lib/db");
  return {
    capturePost: captureRoute.POST,
    handoffPost: handoffRoute.POST,
    closeDb: dbModule.closeDb,
    getDb: dbModule.getDb,
  };
}

describe("/api/agent-memory capture and handoff", () => {
  beforeEach(() => {
    fs.rmSync(TEST_ROOT, { recursive: true, force: true });
    fs.mkdirSync(TEST_ROOT, { recursive: true });
  });

  afterEach(async () => {
    const { closeDb } = await loadRoutes();
    closeDb();
    fs.rmSync(TEST_ROOT, { recursive: true, force: true });
    delete process.env.SQLITE_DB_PATH;
    delete process.env.MEMROOS_VAULT_ROOT;
  });

  it("accepts a loopback capture and returns a generated handoff pack", async () => {
    const { capturePost, handoffPost } = await loadRoutes();
    const captureRes = await capturePost(
      new Request("http://localhost/api/agent-memory/capture", {
        method: "POST",
        body: JSON.stringify({
          sourceAgentId: "codex",
          runtime: "codex",
          sessionId: "route-session",
          taskId: "route-task",
          summary: "Route test captured task state.",
          decisionIntent: { decision: "Use MemRoOS handoff packs", intent: "agent switching" },
          verification: [{ command: "vitest", status: "passed" }],
        }),
      })
    );
    expect(captureRes.status).toBe(201);
    expect(await captureRes.json()).toMatchObject({
      ok: true,
      capture: { sourceAgentId: "codex", taskId: "route-task", captureHealth: "ok" },
    });

    const handoffRes = await handoffPost(
      new Request("http://localhost/api/agent-memory/handoff", {
        method: "POST",
        body: JSON.stringify({ taskId: "route-task", toAgentId: "claude-code" }),
      })
    );
    expect(handoffRes.status).toBe(201);
    const body = await handoffRes.json();
    expect(body).toMatchObject({
      ok: true,
      handoff: {
        taskId: "route-task",
        toAgentId: "claude-code",
        redactionState: "none",
      },
    });
    expect(body.handoff.contextPack.captures[0].summary).toBe("Route test captured task state.");
  });
});
