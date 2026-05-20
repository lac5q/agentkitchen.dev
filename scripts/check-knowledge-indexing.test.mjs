import { describe, it } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";

import {
  buildExpectedUris,
  buildExpectedUriVariants,
  parseCollectionPath,
  selectRecentMarkdownFiles,
  selectDatePrefixedMarkdownFiles,
} from "./check-knowledge-indexing.mjs";

describe("knowledge indexing contract helpers", () => {
  it("selects recent markdown files by date-prefixed basename", () => {
    const files = [
      "/knowledge/emails/2026-05-19-thread.md",
      "/knowledge/journals/2026-05-19.md",
      "/knowledge/emails/2026-05-18-thread.md",
      "/knowledge/emails/not-dated.md",
      "/knowledge/emails/2026-05-19-thread.txt",
    ];

    assert.deepEqual(selectDatePrefixedMarkdownFiles(files, ["2026-05-19"]), [
      "/knowledge/emails/2026-05-19-thread.md",
      "/knowledge/journals/2026-05-19.md",
    ]);
  });

  it("selects recently modified markdown files even without date-prefixed names", () => {
    const files = [
      { path: "/knowledge/slack/channel-export.md", mtimeMs: 2000 },
      { path: "/knowledge/slack/old-channel-export.md", mtimeMs: 100 },
      { path: "/knowledge/slack/raw.json", mtimeMs: 2000 },
    ];

    assert.deepEqual(selectRecentMarkdownFiles(files, [], 1000), [
      "/knowledge/slack/channel-export.md",
    ]);
  });

  it("builds collection-root URIs for dedicated collections", () => {
    const sourceRoot = path.join("/knowledge", "emails");
    const files = [path.join(sourceRoot, "2026-05-19-thread.md")];

    assert.deepEqual(buildExpectedUris(files, sourceRoot, "emails", false), [
      "qmd://emails/2026-05-19-thread.md",
    ]);
  });

  it("builds knowledge-relative URIs for recursive knowledge collections", () => {
    const knowledgeRoot = "/knowledge";
    const sourceRoot = path.join(knowledgeRoot, "projects");
    const files = [path.join(sourceRoot, "general", "meetings", "2026-05-19-sami.md")];

    assert.deepEqual(buildExpectedUris(files, knowledgeRoot, "knowledge", true), [
      "qmd://knowledge/projects/general/meetings/2026-05-19-sami.md",
    ]);
  });

  it("includes QMD-slugged URI variants for Drive-style filenames", () => {
    const knowledgeRoot = "/knowledge";
    const files = [
      path.join(knowledgeRoot, "gdrive", "meet-recordings", "2026-05-08-17N0uGlAT73Tvz-.md"),
      path.join(knowledgeRoot, "gdrive", "meet-recordings", "2026-04-29-1JjV__FWyjWYkUx.md"),
    ];

    assert.deepEqual(buildExpectedUriVariants(files, knowledgeRoot, "knowledge"), [
      [
        "qmd://knowledge/gdrive/meet-recordings/2026-05-08-17N0uGlAT73Tvz-.md",
        "qmd://knowledge/gdrive/meet-recordings/2026-05-08-17N0uGlAT73Tvz.md",
      ],
      [
        "qmd://knowledge/gdrive/meet-recordings/2026-04-29-1JjV__FWyjWYkUx.md",
        "qmd://knowledge/gdrive/meet-recordings/2026-04-29-1JjV-FWyjWYkUx.md",
      ],
    ]);
  });

  it("parses qmd collection source paths", () => {
    const output = [
      "Collection: emails",
      "Path: /Users/example/github/knowledge/emails",
      "Pattern: **/*.md",
    ].join("\n");

    assert.equal(parseCollectionPath(output), "/Users/example/github/knowledge/emails");
  });
});
