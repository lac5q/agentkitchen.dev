// @vitest-environment node
import { describe, expect, it } from "vitest";

import {
  computeFreshnessState,
  type CollectionFreshness,
  type FreshnessState,
} from "../qmd-freshness";

const NOW = new Date("2026-05-21T12:00:00Z");

function makeRaw(overrides: Partial<Parameters<typeof computeFreshnessState>[0]> = {}): Parameters<typeof computeFreshnessState>[0] {
  return {
    collection: "knowledge",
    sourceMtime: null,
    indexTimestamp: null,
    stalenessThresholdMs: 3_600_000, // 1 hour
    now: NOW,
    ...overrides,
  };
}

describe("computeFreshnessState", () => {
  it("returns 'missing' when both sourceMtime and indexTimestamp are null", () => {
    const result = computeFreshnessState(makeRaw());
    expect(result.state).toBe("missing");
  });

  it("returns 'empty' when sourceMtime is null but indexTimestamp is present", () => {
    const result = computeFreshnessState(makeRaw({ indexTimestamp: NOW }));
    expect(result.state).toBe("empty");
  });

  it("returns 'missing' when sourceMtime is present but indexTimestamp is null", () => {
    const result = computeFreshnessState(
      makeRaw({ sourceMtime: new Date("2026-05-21T11:00:00Z") })
    );
    expect(result.state).toBe("missing");
  });

  it("returns 'live' when index is fresh relative to source within threshold", () => {
    const sourceMtime = new Date("2026-05-21T10:00:00Z");
    const indexTimestamp = new Date("2026-05-21T10:05:00Z"); // 5 min after source
    const result = computeFreshnessState(
      makeRaw({ sourceMtime, indexTimestamp })
    );
    expect(result.state).toBe("live");
  });

  it("returns 'stale' when indexTimestamp is older than sourceMtime + threshold", () => {
    const sourceMtime = new Date("2026-05-21T10:00:00Z");
    // Index was taken 2 hours before the source was last modified
    const indexTimestamp = new Date("2026-05-21T08:00:00Z");
    const result = computeFreshnessState(
      makeRaw({ sourceMtime, indexTimestamp })
    );
    expect(result.state).toBe("stale");
  });

  it("returns 'stale' when index is older than stalenessThreshold from now", () => {
    const sourceMtime = new Date("2026-05-20T10:00:00Z");
    const indexTimestamp = new Date("2026-05-20T10:05:00Z"); // index matches source
    // But both are 26 hours old from NOW, way past 1h threshold
    const result = computeFreshnessState(
      makeRaw({ sourceMtime, indexTimestamp })
    );
    expect(result.state).toBe("stale");
  });

  it("returns 'updating' when isUpdating flag is set", () => {
    const sourceMtime = new Date("2026-05-20T10:00:00Z");
    const indexTimestamp = new Date("2026-05-20T10:05:00Z");
    const result = computeFreshnessState(
      makeRaw({ sourceMtime, indexTimestamp, isUpdating: true })
    );
    expect(result.state).toBe("updating");
  });

  it("returns 'degraded' when isDegraded flag is set", () => {
    const sourceMtime = new Date("2026-05-21T10:00:00Z");
    const indexTimestamp = new Date("2026-05-21T10:05:00Z");
    const result = computeFreshnessState(
      makeRaw({ sourceMtime, indexTimestamp, isDegraded: true })
    );
    expect(result.state).toBe("degraded");
  });

  it("isUpdating takes priority over stale state", () => {
    const sourceMtime = new Date("2026-05-20T10:00:00Z");
    const indexTimestamp = new Date("2026-05-20T10:05:00Z");
    const result = computeFreshnessState(
      makeRaw({ sourceMtime, indexTimestamp, isUpdating: true })
    );
    expect(result.state).toBe("updating");
  });

  it("returns ageMs when timestamps are present", () => {
    const sourceMtime = new Date("2026-05-21T11:00:00Z");
    const indexTimestamp = new Date("2026-05-21T11:05:00Z");
    const result = computeFreshnessState(
      makeRaw({ sourceMtime, indexTimestamp })
    );
    // indexTimestamp is 55 minutes from NOW; well within 1h threshold -> live
    expect(result.ageMs).toBe(NOW.getTime() - indexTimestamp.getTime());
    expect(result.state).toBe("live");
  });

  it("returns collection name in result", () => {
    const result = computeFreshnessState(makeRaw({ collection: "spark" }));
    expect(result.collection).toBe("spark");
  });
});

describe("FreshnessState union", () => {
  it("all six states are representable", () => {
    const states: FreshnessState[] = ["live", "empty", "updating", "stale", "degraded", "missing"];
    expect(states).toHaveLength(6);
  });
});
