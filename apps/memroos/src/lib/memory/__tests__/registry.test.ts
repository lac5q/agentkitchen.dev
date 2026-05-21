/**
 * Wave 0 RED test scaffold for MEM-07.
 *
 * REQ: MEM-07 — Adapter registry maps MemoryTier to MemoryAdapter[]; new backends register
 * without touching existing code.
 *
 * These tests are RED until Plan 02/03 ships:
 *   - apps/memroos/src/lib/memory/registry.ts   (new file — registerAdapter, getAdapters, clearRegistry)
 *   - apps/memroos/src/lib/memory/adapter.ts     (new file — MemoryAdapter interface)
 *
 * Import will fail (ModuleNotFoundError) until those files exist.
 */

import { describe, expect, it, beforeEach } from "vitest";

// MEM-07: imports from files that do not exist yet — RED until Plan 02/03 implements them
import { registerAdapter, getAdapters, clearRegistry } from "../registry";
import type { MemoryAdapter } from "../adapter";
import type { MemoryTier } from "../tiers";
import type { MemoryTierHealth } from "../backends";

/** Minimal stub adapter for testing registry round-trip only. */
function makeStubAdapter(tier: MemoryTier): MemoryAdapter {
  return {
    tiers: [tier],
    search: async (_query: string, _limit: number) => [],
    write: async (_payload: Record<string, unknown>) => {},
    health: async (): Promise<MemoryTierHealth> => ({
      tier,
      backend: "stub",
      status: "up",
    }),
  };
}

describe("MemoryAdapter registry (MEM-07)", () => {
  beforeEach(() => {
    // clearRegistry must exist on the registry module to ensure test isolation
    clearRegistry();
  });

  it("registerAdapter stores adapter and getAdapters returns it for the declared tier", () => {
    // REQ: MEM-07 — new backend registers without touching existing code
    const vectorAdapter = makeStubAdapter("vector");
    registerAdapter(vectorAdapter);

    const adapters = getAdapters("vector");
    expect(adapters).toHaveLength(1);
    expect(adapters[0]).toBe(vectorAdapter);
  });

  it("getAdapters returns empty array for unregistered tier", () => {
    // REQ: MEM-07 — safe fallback when no adapter registered
    const adapters = getAdapters("episodic");
    expect(adapters).toEqual([]);
  });

  it("multiple adapters can be registered for the same tier without replacing existing ones", () => {
    // REQ: MEM-07 — registry accumulates adapters (Map<MemoryTier, MemoryAdapter[]>)
    const first = makeStubAdapter("graph");
    const second = makeStubAdapter("graph");

    registerAdapter(first);
    registerAdapter(second);

    const adapters = getAdapters("graph");
    expect(adapters).toHaveLength(2);
    expect(adapters).toContain(first);
    expect(adapters).toContain(second);
  });

  it("an adapter declaring multiple tiers appears in each tier's list", () => {
    // REQ: MEM-07 — adapter.tiers drives multi-tier registration
    const multiTier: MemoryAdapter = {
      tiers: ["vector", "graph"],
      search: async () => [],
      write: async () => {},
      health: async (): Promise<MemoryTierHealth> => ({
        tier: "vector",
        backend: "multi-stub",
        status: "up",
      }),
    };

    registerAdapter(multiTier);

    expect(getAdapters("vector")).toContain(multiTier);
    expect(getAdapters("graph")).toContain(multiTier);
    expect(getAdapters("episodic")).toHaveLength(0);
  });

  it("clearRegistry removes all registered adapters", () => {
    // REQ: MEM-07 — clearRegistry is required for test isolation
    registerAdapter(makeStubAdapter("vector"));
    registerAdapter(makeStubAdapter("graph"));

    clearRegistry();

    expect(getAdapters("vector")).toHaveLength(0);
    expect(getAdapters("graph")).toHaveLength(0);
  });
});
