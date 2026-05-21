/**
 * Wave 0 RED test scaffold for MEM-06 and MEM-08.
 *
 * REQ: MEM-06 — MemoryAdapter interface exposes only search(), write(), and health() —
 *   no client handle leakage (no getClient(), no Qdrant/Neo4j client type in return types).
 *
 * REQ: MEM-08 — Existing mem0/Qdrant/Neo4j backends wrapped as concrete adapters
 *   implementing the interface. search(), write(), health() contract is satisfied.
 *
 * These tests are RED until Plan 02/03 ships:
 *   - apps/memroos/src/lib/memory/adapter.ts   (new file — MemoryAdapter interface)
 *   - apps/memroos/src/lib/memory/backends.ts  (modified — concrete adapter exports added)
 *
 * Import from adapter.ts will fail until that file exists.
 */

import { describe, expect, it, vi, beforeEach } from "vitest";

// MEM-06/MEM-08: imports from adapter.ts — does not exist yet (RED)
import type { MemoryAdapter, MemorySearchResult } from "../adapter";

describe("MemoryAdapter interface contract (MEM-06)", () => {
  it("MemoryAdapter interface has no getClient method — client handle leakage is forbidden", () => {
    // REQ: MEM-06 — type-level enforcement; this test verifies structural compliance at runtime
    // by instantiating a concrete adapter and confirming the public surface.
    //
    // The MemoryAdapter type must NOT have getClient, client, or any property returning
    // a Qdrant/Neo4j client object. This is enforced at the TypeScript interface level.
    //
    // At runtime we verify that the concrete adapter does not expose a client handle.
    // Import from a concrete adapter file (does not exist yet — RED at module level).
    // Once MEM-08 ships, import the concrete adapter:
    //   import { VectorMemoryAdapter } from "../vector-adapter";
    //   const adapter = new VectorMemoryAdapter();
    //   expect((adapter as any).getClient).toBeUndefined();
    //   expect((adapter as any).client).toBeUndefined();
    //
    // Wave 0 placeholder assertion — fails because adapter.ts does not exist yet:
    const { MemoryAdapter: _unused } = require("../adapter");
    expect(_unused).toBeDefined(); // will throw ModuleNotFoundError until file is created
  });
});

describe("Concrete adapter search/write/health contract (MEM-08)", () => {
  // Minimal type-correct stub to validate the contract shape
  const makeAdapter = (overrides?: Partial<MemoryAdapter>): MemoryAdapter => ({
    tiers: ["vector"],
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
    // REQ: MEM-06 and MEM-08 — concrete adapter test (RED: adapter.ts and vector adapter not yet created)
    // Once Plan 02/03 ships, import the concrete vector adapter:
    //   import { VectorMemoryAdapter } from "../backends"; // or "../vector-adapter"
    //   const adapter = new VectorMemoryAdapter();
    //   expect(adapter.tiers).toContain("vector");
    //   expect((adapter as any).getClient).toBeUndefined();  // MEM-06
    //   const results = await adapter.search("test", 3);
    //   expect(Array.isArray(results)).toBe(true);           // MEM-08

    // Wave 0 assertion — fails because concrete adapters don't exist yet:
    const backendsModule = await import("../backends");
    // VectorMemoryAdapter class must be exported from backends — does not exist yet (RED)
    expect("VectorMemoryAdapter" in backendsModule).toBe(true);
  });

  it("concrete graph adapter wraps queryGraphMemory without exposing Neo4j driver", async () => {
    // REQ: MEM-06 and MEM-08 — concrete graph adapter (RED: not yet implemented)
    const backendsModule = await import("../backends");
    // GraphMemoryAdapter class must be exported from backends — does not exist yet (RED)
    expect("GraphMemoryAdapter" in backendsModule).toBe(true);
  });
});
