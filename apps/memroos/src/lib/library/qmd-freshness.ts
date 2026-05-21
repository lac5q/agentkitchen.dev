/**
 * QMD freshness contract.
 *
 * Computes per-collection freshness from source mtime and index timestamp.
 * States: live | empty | updating | stale | degraded | missing
 *
 * Priority rules:
 *  1. isUpdating  → "updating"  (operation in progress, defer final state)
 *  2. isDegraded  → "degraded"  (index operational but known-bad data)
 *  3. missing timestamp combos → "missing" | "empty"
 *  4. compare timestamps + staleness threshold → "live" | "stale"
 */

export type FreshnessState = "live" | "empty" | "updating" | "stale" | "degraded" | "missing";

export interface CollectionFreshnessInput {
  /** QMD collection identifier */
  collection: string;
  /** Latest mtime of any source file in the collection; null when unreadable */
  sourceMtime: Date | null;
  /** Timestamp written by `qmd update` when it last completed; null when unknown */
  indexTimestamp: Date | null;
  /** Milliseconds before index is considered stale relative to now */
  stalenessThresholdMs: number;
  /** True while `qmd update` is actively running */
  isUpdating?: boolean;
  /** True when the index exists but is known to be corrupt or incomplete */
  isDegraded?: boolean;
  /** Reference "now" for age calculations; defaults to Date.now() */
  now?: Date;
}

export interface CollectionFreshness {
  collection: string;
  state: FreshnessState;
  /** Age of the index in ms relative to now; null when indexTimestamp is unknown */
  ageMs: number | null;
  sourceMtime: Date | null;
  indexTimestamp: Date | null;
}

/**
 * Compute the freshness state for a single QMD collection.
 */
export function computeFreshnessState(input: CollectionFreshnessInput): CollectionFreshness {
  const now = input.now ?? new Date();
  const { collection, sourceMtime, indexTimestamp, stalenessThresholdMs } = input;

  // Priority 1: actively updating — defer final state
  if (input.isUpdating) {
    return {
      collection,
      state: "updating",
      ageMs: indexTimestamp != null ? now.getTime() - indexTimestamp.getTime() : null,
      sourceMtime,
      indexTimestamp,
    };
  }

  // Priority 2: index is degraded
  if (input.isDegraded) {
    return {
      collection,
      state: "degraded",
      ageMs: indexTimestamp != null ? now.getTime() - indexTimestamp.getTime() : null,
      sourceMtime,
      indexTimestamp,
    };
  }

  // Priority 3: missing timestamp combos
  if (indexTimestamp == null) {
    // No index at all — truly missing regardless of whether sources exist
    return { collection, state: "missing", ageMs: null, sourceMtime, indexTimestamp };
  }

  if (sourceMtime == null) {
    // Index exists but no source files found — collection is empty/orphaned
    return {
      collection,
      state: "empty",
      ageMs: now.getTime() - indexTimestamp.getTime(),
      sourceMtime,
      indexTimestamp,
    };
  }

  // Priority 4: compare timestamps and staleness
  const ageMs = now.getTime() - indexTimestamp.getTime();

  // Stale if index predates the most recent source modification
  if (indexTimestamp < sourceMtime) {
    return { collection, state: "stale", ageMs, sourceMtime, indexTimestamp };
  }

  // Stale if index itself is older than the threshold from now
  if (ageMs > stalenessThresholdMs) {
    return { collection, state: "stale", ageMs, sourceMtime, indexTimestamp };
  }

  return { collection, state: "live", ageMs, sourceMtime, indexTimestamp };
}
