/**
 * Adapter registry — maps MemoryTier to MemoryAdapter[].
 *
 * New backends register via registerAdapter() without touching existing adapter code (MEM-07).
 * clearRegistry() is provided for test isolation only — do not call in production.
 */

import type { MemoryTier } from "./tiers";
import type { MemoryAdapter } from "./adapter";

// Module-level registry — singleton per module instance.
const _registry = new Map<MemoryTier, MemoryAdapter[]>();

/**
 * Register an adapter against every tier it declares.
 * Appends to the existing list — does not replace.
 */
export function registerAdapter(adapter: MemoryAdapter): void {
  for (const tier of adapter.tiers) {
    const existing = _registry.get(tier) ?? [];
    _registry.set(tier, [...existing, adapter]);
  }
}

/**
 * Return all adapters registered for a tier.
 * Returns [] if no adapter is registered — callers should fall back to the direct path.
 */
export function getAdapters(tier: MemoryTier): MemoryAdapter[] {
  return _registry.get(tier) ?? [];
}

/**
 * Clear all registered adapters.
 * Intended for test teardown only — do not call in production code.
 */
export function clearRegistry(): void {
  _registry.clear();
}
