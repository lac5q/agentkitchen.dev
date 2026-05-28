import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  buildExpectedUris,
  buildExpectedUriVariants,
  findMeetingRouteIssues,
  inferMeetingRoute,
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

  it("infers Cordant meeting routes from sparse title plus body signals", () => {
    const route = inferMeetingRoute(
      "/knowledge/projects/general/meetings/2026-05-27-strategic-alignment.md",
      "Leor set up Linear and Perplexity. Sagi discussed memory architecture, the VPS, and Eric.",
    );

    assert.equal(route?.expectedProject, "cordant");
    assert.ok(route?.matchedSignals.includes("leor"));
    assert.ok(route?.confidence >= 0.5);
  });

  it("flags recent Cordant-looking meetings filed under general", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "memroos-route-contract-"));
    const meetingDir = path.join(dir, "projects", "general", "meetings");
    const meetingFile = path.join(meetingDir, "2026-05-27-strategic-alignment.md");
    fs.mkdirSync(meetingDir, { recursive: true });
    fs.writeFileSync(
      meetingFile,
      "Juan, Leor, Sagi, and Kanaan discussed Cordant agentic product work and Perplexity setup."
    );

    try {
      const issues = findMeetingRouteIssues([meetingFile], dir);
      assert.equal(issues.length, 1);
      assert.equal(issues[0].type, "misfiled");
      assert.equal(issues[0].actualProject, "general");
      assert.equal(issues[0].expectedProject, "cordant");
    } finally {
      fs.rmSync(dir, { force: true, recursive: true });
    }
  });
});
