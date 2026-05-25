#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "..");
const defaultExampleFixturePath = path.join(repoRoot, "evals", "memory-recall", "critical-anchors.example.json");
const defaultLocalFixturePath = path.join(repoRoot, "evals", "memory-recall", "critical-anchors.local.json");

export function normalizeText(value) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function mergeUnique(...groups) {
  return [...new Set(groups.flat().filter(Boolean))];
}

function normalizeFsPath(value) {
  const raw = String(value).replace(/^~/, os.homedir());
  return path.resolve(repoRoot, raw);
}

function toPosix(value) {
  return value.split(path.sep).join("/");
}

export function buildAnchorQmdUris(anchor) {
  return (anchor.qmdCollections ?? []).map(({ collection, root }) => {
    const relativePath = toPosix(path.relative(normalizeFsPath(root), normalizeFsPath(anchor.path)));
    return `qmd://${collection}/${relativePath}`;
  });
}

export function resolveDefaultFixturePath(env = process.env) {
  if (env.MEMROOS_RECALL_ANCHORS_PATH) return normalizeFsPath(env.MEMROOS_RECALL_ANCHORS_PATH);
  if (fs.existsSync(defaultLocalFixturePath)) return defaultLocalFixturePath;
  return defaultExampleFixturePath;
}

export function anchorMatchesText(anchor, text) {
  const normalized = normalizeText(text);
  const missingTerms = (anchor.requiredTerms ?? []).filter((term) => !normalized.includes(normalizeText(term)));
  return { ok: missingTerms.length === 0, missingTerms };
}

export function parseArgs(argv) {
  const options = {
    fixturePath: resolveDefaultFixturePath(),
    json: false,
    qmdBin: process.env.QMD_BIN || "qmd",
    requireMem0: false,
    skipMem0: false,
    mem0Url: process.env.MEM0_URL || "http://localhost:3201",
  };

  for (const arg of argv) {
    if (arg === "--json") options.json = true;
    else if (arg === "--require-mem0") options.requireMem0 = true;
    else if (arg === "--skip-mem0") options.skipMem0 = true;
    else if (arg.startsWith("--fixture=")) options.fixturePath = arg.slice("--fixture=".length);
    else if (arg.startsWith("--qmd-bin=")) options.qmdBin = arg.slice("--qmd-bin=".length);
    else if (arg.startsWith("--mem0-url=")) options.mem0Url = arg.slice("--mem0-url=".length);
    else if (arg === "--help" || arg === "-h") {
      printHelp();
      process.exit(0);
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  if (options.skipMem0 && options.requireMem0) {
    throw new Error("--skip-mem0 and --require-mem0 cannot be used together");
  }

  return options;
}

function printHelp() {
  console.log(`Usage: node scripts/check-recall-anchors.mjs [options]

Verifies critical memory-recall anchors across filesystem, QMD, and optionally mem0.

Options:
  --fixture=PATH       Anchor fixture JSON (default: MEMROOS_RECALL_ANCHORS_PATH, local fixture, then example)
  --qmd-bin=PATH       qmd executable (default: qmd)
  --mem0-url=URL       mem0 service URL (default: http://localhost:3201)
  --require-mem0       Fail if mem0 search is unavailable or missing anchor terms
  --skip-mem0          Skip mem0 checks entirely
  --json               Emit JSON
`);
}

function run(command, args) {
  const pathPrefix = [
    process.env.QMD_PATH_PREFIX,
    "/opt/homebrew/bin",
    "/usr/local/bin",
  ].filter(Boolean).join(path.delimiter);

  const result = spawnSync(command, args, {
    cwd: repoRoot,
    encoding: "utf8",
    maxBuffer: 32 * 1024 * 1024,
    env: {
      ...process.env,
      PATH: pathPrefix ? `${pathPrefix}${path.delimiter}${process.env.PATH || ""}` : process.env.PATH,
      QMD_FORCE_CPU: process.env.QMD_FORCE_CPU ?? "1",
    },
  });

  return {
    ok: result.status === 0,
    status: result.status ?? 127,
    stdout: result.stdout || "",
    stderr: result.stderr || result.error?.message || "",
  };
}

function readAnchors(fixturePath) {
  const fullPath = normalizeFsPath(fixturePath);
  return JSON.parse(fs.readFileSync(fullPath, "utf8"));
}

function checkFile(anchor) {
  const fullPath = normalizeFsPath(anchor.path);
  if (!fs.existsSync(fullPath)) {
    return { ok: false, failures: [`missing file ${fullPath}`], text: "" };
  }

  const text = fs.readFileSync(fullPath, "utf8");
  const match = anchorMatchesText(anchor, text);
  return {
    ok: match.ok,
    failures: match.missingTerms.map((term) => `file ${fullPath} missing term '${term}'`),
    text,
  };
}

function checkSourceArtifacts(anchor) {
  return (anchor.sourceArtifacts ?? [])
    .map(normalizeFsPath)
    .filter((sourcePath) => !fs.existsSync(sourcePath))
    .map((sourcePath) => `missing source artifact ${sourcePath}`);
}

function checkQmd(anchor, options) {
  const failures = [];
  const warnings = [];
  const qmdUris = buildAnchorQmdUris(anchor);

  for (const uri of qmdUris) {
    const get = run(options.qmdBin, ["get", uri, "-l", "5"]);
    if (!get.ok || !get.stdout.trim()) {
      failures.push(`qmd get failed for ${uri}: ${get.stderr.trim() || get.stdout.trim() || `exit ${get.status}`}`);
    }
  }

  for (const query of anchor.searchQueries ?? []) {
    const search = run(options.qmdBin, ["search", query, "-n", "10"]);
    const output = `${search.stdout}\n${search.stderr}`;
    if (!search.ok) {
      failures.push(`qmd search failed for '${query}': ${search.stderr.trim() || search.stdout.trim() || `exit ${search.status}`}`);
      continue;
    }
    if (!qmdUris.some((uri) => output.includes(uri))) {
      warnings.push(`qmd search '${query}' did not return an anchor URI in top 10`);
    }
  }

  return { failures, warnings, qmdUris };
}

async function checkMem0(anchor, options) {
  if (options.skipMem0) return { failures: [], warnings: ["mem0 skipped"], results: [] };

  const failures = [];
  const warnings = [];
  const results = [];
  const required = anchor.mem0RequiredTerms ?? anchor.requiredTerms ?? [];

  for (const query of anchor.mem0Queries ?? anchor.searchQueries ?? []) {
    const url = new URL("/memory/search", options.mem0Url);
    url.searchParams.set("q", query);
    url.searchParams.set("limit", "10");

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);
    try {
      const response = await fetch(url, { signal: controller.signal });
      const body = await response.text();
      if (!response.ok) {
        const message = `mem0 search '${query}' returned HTTP ${response.status}`;
        (options.requireMem0 ? failures : warnings).push(message);
        continue;
      }

      results.push({ query, body });
      const normalized = normalizeText(body);
      const hasAnyRequiredTerm = required.some((term) => normalized.includes(normalizeText(term)));
      if (!hasAnyRequiredTerm) {
        const message = `mem0 search '${query}' did not return any required anchor term`;
        (options.requireMem0 ? failures : warnings).push(message);
      }
    } catch (error) {
      const message = `mem0 search '${query}' failed: ${error instanceof Error ? error.message : String(error)}`;
      (options.requireMem0 ? failures : warnings).push(message);
    } finally {
      clearTimeout(timeout);
    }
  }

  return { failures, warnings, results };
}

export async function checkRecallAnchors(options) {
  const anchors = readAnchors(options.fixturePath);
  const report = {
    ok: true,
    fixturePath: normalizeFsPath(options.fixturePath),
    anchors: [],
    failures: [],
    warnings: [],
  };

  for (const anchor of anchors) {
    const file = checkFile(anchor);
    const sourceFailures = checkSourceArtifacts(anchor);
    const qmd = checkQmd(anchor, options);
    const mem0 = await checkMem0(anchor, options);
    const failures = mergeUnique(file.failures, sourceFailures, qmd.failures, mem0.failures);
    const warnings = mergeUnique(qmd.warnings, mem0.warnings);

    report.anchors.push({
      id: anchor.id,
      ok: failures.length === 0,
      qmdUris: qmd.qmdUris,
      failures,
      warnings,
    });
    report.failures.push(...failures.map((failure) => `${anchor.id}: ${failure}`));
    report.warnings.push(...warnings.map((warning) => `${anchor.id}: ${warning}`));
  }

  report.ok = report.failures.length === 0;
  return report;
}

function printReport(report) {
  console.log(`Recall anchor contract: ${report.ok ? "OK" : "FAILED"}`);
  console.log(`Fixture: ${report.fixturePath}`);
  for (const anchor of report.anchors) {
    console.log(`${anchor.ok ? "OK" : "FAIL"} ${anchor.id}`);
    for (const uri of anchor.qmdUris) console.log(`  - qmd: ${uri}`);
    for (const warning of anchor.warnings) console.log(`  - warn: ${warning}`);
    for (const failure of anchor.failures) console.log(`  - failure: ${failure}`);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    const options = parseArgs(process.argv.slice(2));
    const report = await checkRecallAnchors(options);
    if (options.json) console.log(JSON.stringify(report, null, 2));
    else printReport(report);
    process.exit(report.ok ? 0 : 1);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}
