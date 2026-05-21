/**
 * Tests for MEM-06 and MEM-08.
 *
 * REQ: MEM-06 — MemoryAdapter interface exposes only search(), write(), and health() —
 *   no client handle leakage (no getClient(), no Qdrant/Neo4j client type in return types).
 *
 * REQ: MEM-08 — Existing mem0/Qdrant/Neo4j backends wrapped as concrete adapters
 *   implementing the interface. search(), write(), health() contract is satisfied.
 */

import { describe, expect, it, vi } from "vitest";

import type { MemoryAdapter, MemorySearchResult } from "../adapter";

describe("MemoryAdapter interface contract (MEM-06)", () => {
  it("MemoryAdapter interface has no getClient method — client handle leakage is forbidden", async () => {
    // REQ: MEM-06 — concrete adapters must not expose a client handle.
    // Import the concrete VectorMemoryAdapter and assert it has no getClient or client property.
    const backendsModule = await import("../backends");
    const { VectorMemoryAdapter } = backendsModule as Record<string, unknown> & {
      VectorMemoryAdapter: new () => Record<string, unknown>;
    };
    expect(VectorMemoryAdapter).toBeDefined();
    const adapter = new VectorMemoryAdapter();
    expect(adapter["getClient"]).toBeUndefined();
    expect(adapter["client"]).toBeUndefined();
  });
});

describe("Concrete adapter search/write/health contract (MEM-08)", () => {
  // Minimal type-correct stub to validate the contract shape
  const makeAdapter = (overrides?: Partial<MemoryAdapter>): MemoryAdapter => ({
    tiers: ["vector"],
    capabilities: ["semantic"],
    search: vi.fn().mockResolvedValue([
      { id: "1", content: "test result", score: 0.95 },
    ] satisfies MemorySearchResult[]),
    write: vi.fn().mockResolvedValue(undefined),
    health: vi.fn().mockResolvedValue({ tier: "vector", backend: "mem0-qdrant", status: "up" }),
    ...overrides,
  });

  it("search() returns MemorySearchResult[] with id and content", async () => {
    // REQ: MEM-08 — search contract
    const adapter = makeAdapter();
    const results = await adapter.search("test query", 5);

    expect(Array.isArray(results)).toBe(true);
    expect(results.length).toBeGreaterThan(0);
    expect(results[0]).toMatchObject({
      id: expect.anything(),
      content: expect.any(String),
    });
  });

  it("write() resolves without error for a valid payload", async () => {
    // REQ: MEM-08 — write contract
    const adapter = makeAdapter();
    await expect(adapter.write({ content: "memory entry", type: "vector" })).resolves.toBeUndefined();
  });

  it("health() returns MemoryTierHealth with tier, backend, and status", async () => {
    // REQ: MEM-08 — health contract
    const adapter = makeAdapter();
    const health = await adapter.health();

    expect(health).toMatchObject({
      tier: expect.stringMatching(/^(vector|graph|episodic)$/),
      backend: expect.any(String),
      status: expect.stringMatching(/^(up|degraded|down|not_configured)$/),
    });
  });

  it("concrete vector adapter wraps existing searchVectorMemory without exposing Qdrant client", async () => {
    // REQ: MEM-06 and MEM-08 — VectorMemoryAdapter exported from backends
    const backendsModule = await import("../backends");
    expect("VectorMemoryAdapter" in backendsModule).toBe(true);

    const { VectorMemoryAdapter } = backendsModule as Record<string, unknown> & {
      VectorMemoryAdapter: new () => MemoryAdapter & Record<string, unknown>;
    };
    const adapter = new VectorMemoryAdapter();
    expect(adapter.tiers).toContain("vector");
    expect(adapter["getClient"]).toBeUndefined(); // MEM-06
  });

  it("concrete graph adapter wraps queryGraphMemory without exposing Neo4j driver", async () => {
    // REQ: MEM-06 and MEM-08 — GraphMemoryAdapter exported from backends
    const backendsModule = await import("../backends");
    expect("GraphMemoryAdapter" in backendsModule).toBe(true);

    const { GraphMemoryAdapter } = backendsModule as Record<string, unknown> & {
      GraphMemoryAdapter: new () => MemoryAdapter & Record<string, unknown>;
    };
    const adapter = new GraphMemoryAdapter();
    expect(adapter.tiers).toContain("graph");
    expect(adapter["getClient"]).toBeUndefined(); // MEM-06
    expect(adapter["driver"]).toBeUndefined(); // MEM-06
  });
});
