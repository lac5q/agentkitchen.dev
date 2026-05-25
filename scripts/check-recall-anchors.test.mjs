import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  anchorMatchesText,
  buildAnchorQmdUris,
  mergeUnique,
  normalizeText,
  parseArgs,
  resolveDefaultFixturePath,
} from "./check-recall-anchors.mjs";

describe("recall anchor contract helpers", () => {
  const anchor = {
    id: "example-client-decision-2026-01-15",
    path: "/Users/example/github/knowledge/projects/example/meetings/2026-01-15-decision.md",
    qmdCollections: [
      { collection: "knowledge", root: "/Users/example/github/knowledge" },
      { collection: "example", root: "/Users/example/github/knowledge/projects/example" },
    ],
    requiredTerms: ["Example Client", "billing workflow", "human approval"],
  };

  it("normalizes punctuation and case for stable term checks", () => {
    assert.equal(normalizeText("API Intent / Payment-Clearing"), "api intent payment clearing");
  });

  it("checks every required term against normalized text", () => {
    const text = "Example Client kept the billing workflow draft-only unless it receives human approval.";

    assert.equal(anchorMatchesText(anchor, text).ok, true);
    assert.deepEqual(anchorMatchesText(anchor, "Example Client only").missingTerms, ["billing workflow", "human approval"]);
  });

  it("supports compact vector-memory term sets separate from source terms", () => {
    const sourceText = "Example Client approved a billing workflow that requires human approval.";
    const vectorText = "Example Client billing workflow stays draft-only.";

    assert.equal(anchorMatchesText({ requiredTerms: ["human approval"] }, sourceText).ok, true);
    assert.equal(anchorMatchesText({ requiredTerms: ["human approval"] }, vectorText).ok, false);
    assert.equal(anchorMatchesText({ requiredTerms: ["billing workflow"] }, vectorText).ok, true);
  });

  it("builds qmd URIs for each declared collection root", () => {
    assert.deepEqual(buildAnchorQmdUris(anchor), [
      "qmd://knowledge/projects/example/meetings/2026-01-15-decision.md",
      "qmd://example/meetings/2026-01-15-decision.md",
    ]);
  });

  it("deduplicates values while preserving order", () => {
    assert.deepEqual(mergeUnique(["a", "b"], ["b", "c"]), ["a", "b", "c"]);
  });

  it("parses fixture and mem0 options", () => {
    assert.deepEqual(parseArgs(["--fixture=anchors.json", "--require-mem0", "--json"]), {
      fixturePath: "anchors.json",
      json: true,
      qmdBin: "qmd",
      requireMem0: true,
      skipMem0: false,
      mem0Url: "http://localhost:3201",
    });
  });

  it("uses an explicit env fixture before the example", () => {
    assert.equal(
      resolveDefaultFixturePath({ MEMROOS_RECALL_ANCHORS_PATH: "/tmp/client-anchors.json" }),
      "/tmp/client-anchors.json"
    );
  });
});
