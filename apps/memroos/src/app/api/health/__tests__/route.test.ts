// @vitest-environment node
import { execFileSync } from "child_process";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("child_process", () => ({
  execFileSync: vi.fn(),
}));

vi.mock("fs/promises", () => ({
  stat: vi.fn(async () => ({})),
}));

async function loadRoute() {
  vi.resetModules();
  return import("../route");
}

describe("runtime health route", () => {
  beforeEach(() => {
    process.env.MEM0_URL = "http://mem0.test";
    process.env.KNOWLEDGE_INDEX_HEALTH_TTL_MS = "0";
    vi.mocked(execFileSync).mockImplementation((_command, args) => {
      if (Array.isArray(args) && args.includes("--json")) {
        return JSON.stringify({ ok: true, pendingEmbeddings: 0, failures: [], warnings: [] });
      }
      return "";
    });
  });

  afterEach(() => {
    delete process.env.MEM0_URL;
    delete process.env.KNOWLEDGE_INDEX_HEALTH_TTL_MS;
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it("marks mem0 degraded when the health payload reports queued writes", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json({
          status: "degraded",
          vector_store: "connected",
          queue: { queued: 3 },
        })
      )
    );
    const { GET } = await loadRoute();

    const response = await GET();
    const body = await response.json();
    const mem0 = body.services.find((service: { service: string }) => service.service === "mem0");

    expect(mem0.status).toBe("degraded");
    expect(mem0.detail).toContain("3 queued memory saves");
  });

  it("marks mem0 degraded when Qdrant is not connected through mem0", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json({
          status: "ok",
          vector_store: "unavailable",
          queue: { queued: 0 },
        })
      )
    );
    const { GET } = await loadRoute();

    const response = await GET();
    const body = await response.json();
    const mem0 = body.services.find((service: { service: string }) => service.service === "mem0");

    expect(mem0.status).toBe("degraded");
    expect(mem0.detail).toContain("vector store unavailable");
  });

  it("marks mem0 degraded when the runtime package is unavailable", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json({
          status: "ok",
          vector_store: "connected",
          memory_runtime: { status: "unavailable", error: "No module named 'mem0'" },
          queue: { queued: 0 },
        })
      )
    );
    const { GET } = await loadRoute();

    const response = await GET();
    const body = await response.json();
    const mem0 = body.services.find((service: { service: string }) => service.service === "mem0");

    expect(mem0.status).toBe("degraded");
    expect(mem0.detail).toContain("runtime unavailable: No module named 'mem0'");
  });

  it("includes the source-to-QMD knowledge indexing contract in app health", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json({
          status: "ok",
          vector_store: "connected",
          memory_runtime: { status: "available" },
          queue: { queued: 0 },
        })
      )
    );
    const { GET } = await loadRoute();

    const response = await GET();
    const body = await response.json();
    const knowledge = body.services.find((service: { service: string }) => service.service === "Knowledge Index");

    expect(knowledge.status).toBe("up");
    expect(knowledge.detail).toBe("0 pending embeddings");
  });
});
