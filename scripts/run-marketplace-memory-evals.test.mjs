import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  calculateProviderScore,
  normalizeWeights,
  rankProviders,
} from "./run-marketplace-memory-evals.mjs";

describe("marketplace memory eval scoring", () => {
  it("normalizes criteria weights to a full 100 point scale", () => {
    const criteria = [
      { id: "quality", weight: 30 },
      { id: "governance", weight: 20 },
      { id: "latency", weight: 10 },
    ];

    assert.equal(normalizeWeights(criteria).totalWeight, 60);
    assert.deepEqual(
      normalizeWeights(criteria).criteria.map((criterion) => criterion.normalizedWeight),
      [50, 33.3333, 16.6667]
    );
  });

  it("applies confidence as a mild penalty instead of erasing public evidence", () => {
    const criteria = [{ id: "quality", weight: 100 }];
    const provider = {
      scores: {
        quality: { score: 5, confidence: 0.5, rationale: "documented but not independently verified" },
      },
    };

    const result = calculateProviderScore(provider, criteria);

    assert.equal(result.weightedScore, 80);
    assert.equal(result.scoreOutOf5, 4);
    assert.equal(result.coverage, 1);
  });

  it("ranks providers by weighted score and breaks ties by evidence coverage", () => {
    const criteria = [
      { id: "quality", weight: 50 },
      { id: "governance", weight: 50 },
    ];
    const providers = [
      {
        name: "partial",
        scores: { quality: { score: 5, confidence: 1, rationale: "strong" } },
      },
      {
        name: "complete",
        scores: {
          quality: { score: 5, confidence: 1, rationale: "strong" },
          governance: { score: 5, confidence: 1, rationale: "strong" },
        },
      },
    ];

    const ranked = rankProviders(providers, criteria);

    assert.equal(ranked[0].name, "complete");
    assert.equal(ranked[1].name, "partial");
  });
});
