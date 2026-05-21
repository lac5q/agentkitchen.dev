#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "..");

const DEFAULT_MAPPINGS = [
  {
    label: "meet-recordings",
    sourceSubdir: "gdrive/meet-recordings",
    collection: "meet-recordings",
  },
  {
    label: "google-drive",
    sourceSubdir: "gdrive",
    collectionRootSubdir: ".",
    collection: "knowledge",
    checkAllWhenSmall: true,
  },
  {
    label: "spark-recordings",
    sourceSubdir: "spark-recordings",
    collection: "spark-recordings",
  },
  {
    label: "emails",
    sourceSubdir: "emails",
    collection: "emails",
  },
  {
    label: "cordant",
    sourceSubdir: "projects/cordant",
    collectionRootSubdir: "projects/cordant",
    collection: "cordant",
  },
  {
    label: "project-meetings",
    sourceSubdir: "projects",
    collectionRootSubdir: ".",
    collection: "knowledge",
  },
  {
    label: "analysis-content",
    sourceSubdir: "content",
    collectionRootSubdir: ".",
    collection: "knowledge",
  },
  {
    label: "journals",
    sourceSubdir: "journals",
    collectionRootSubdir: ".",
    collection: "knowledge",
  },
  {
    label: "slack",
    sourceSubdir: "slack",
    collectionRootSubdir: ".",
    collection: "knowledge",
    checkAllWhenSmall: true,
  },
];

function toPosix(value) {
  return value.split(path.sep).join("/");
}

function normalizeFsPath(value) {
  return path.resolve(value.replace(/^~/, os.homedir()));
}

function localDateString(date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function dateWindow(days) {
  return Array.from({ length: days }, (_, offset) => {
    const date = new Date();
    date.setDate(date.getDate() - offset);
    return localDateString(date);
  });
}

function localDateStartMs(dateString) {
  const [year, month, day] = dateString.split("-").map(Number);
  if (!year || !month || !day) return Date.now();
  return new Date(year, month - 1, day).getTime();
}

function walkMarkdownFiles(root) {
  const out = [];
  if (!fs.existsSync(root)) return out;
  const entries = fs.readdirSync(root, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(root, entry.name);
    if (entry.isDirectory()) {
      out.push(...walkMarkdownFiles(fullPath));
    } else if (entry.isFile() && entry.name.endsWith(".md")) {
      const stat = fs.statSync(fullPath);
      out.push({ path: fullPath, mtimeMs: stat.mtimeMs });
    }
  }
  return out;
}

export function selectDatePrefixedMarkdownFiles(files, dates) {
  return files
    .map((file) => (typeof file === "string" ? file : file.path))
    .filter((filePath) => {
      if (!filePath.endsWith(".md")) return false;
      const basename = path.basename(filePath);
      return dates.some((date) => basename === `${date}.md` || basename.startsWith(`${date}-`));
    })
    .sort();
}

export function selectRecentMarkdownFiles(files, dates, sinceMs) {
  const byPath = new Map();
  for (const file of files) {
    const filePath = typeof file === "string" ? file : file.path;
    const mtimeMs = typeof file === "string" ? 0 : file.mtimeMs;
    if (!filePath.endsWith(".md")) continue;
    if (selectDatePrefixedMarkdownFiles([filePath], dates).length > 0 || mtimeMs >= sinceMs) {
      byPath.set(filePath, filePath);
    }
  }
  return [...byPath.values()].sort();
}

export function buildExpectedUris(files, uriRoot, collection) {
  const root = normalizeFsPath(uriRoot);
  return files.map((file) => {
    const relativePath = toPosix(path.relative(root, normalizeFsPath(file)));
    return `qmd://${collection}/${relativePath}`;
  });
}

function qmdSlugSegment(segment) {
  const ext = path.extname(segment);
  const base = ext ? segment.slice(0, -ext.length) : segment;
  const slug = base.replace(/[^A-Za-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  if (!slug) return segment;
  return `${slug}${ext}`;
}

function qmdCanonicalRelativePath(relativePath) {
  return relativePath.split("/").map(qmdSlugSegment).join("/");
}

export function buildExpectedUriVariants(files, uriRoot, collection) {
  const root = normalizeFsPath(uriRoot);
  return files.map((file) => {
    const relativePath = toPosix(path.relative(root, normalizeFsPath(file)));
    const original = `qmd://${collection}/${relativePath}`;
    const canonical = `qmd://${collection}/${qmdCanonicalRelativePath(relativePath)}`;
    return [...new Set([original, canonical])];
  });
}

export function parseCollectionPath(output) {
  const match = output.match(/^\s*Path:\s*(.+?)\s*$/m);
  return match ? match[1] : "";
}

function run(command, args, options = {}) {
  const pathPrefix = [
    process.env.QMD_PATH_PREFIX,
    "/opt/homebrew/bin",
    "/usr/local/bin",
  ].filter(Boolean).join(path.delimiter);

  return spawnSync(command, args, {
    cwd: options.cwd ?? repoRoot,
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
    env: {
      ...process.env,
      PATH: pathPrefix ? `${pathPrefix}${path.delimiter}${process.env.PATH || ""}` : process.env.PATH,
      QMD_FORCE_CPU: process.env.QMD_FORCE_CPU ?? "1",
    },
  });
}

function parseArgs(argv) {
  const args = {
    days: Number(process.env.MEMORY_INDEX_DAYS || 2),
    dates: [],
    json: false,
    maxFilesPerMapping: Number(process.env.MEMORY_INDEX_MAX_FILES_PER_MAPPING || 250),
    maxPendingEmbeddings: Number(process.env.QMD_MAX_PENDING_EMBEDDINGS || 10000),
    knowledgeDir: normalizeFsPath(process.env.KNOWLEDGE_DIR || path.join(os.homedir(), "github", "knowledge")),
    qmdBin: process.env.QMD_BIN || "qmd",
  };

  for (const arg of argv) {
    if (arg === "--json") args.json = true;
    else if (arg.startsWith("--days=")) args.days = Number(arg.slice("--days=".length));
    else if (arg.startsWith("--date=")) args.dates.push(arg.slice("--date=".length));
    else if (arg.startsWith("--knowledge-dir=")) args.knowledgeDir = normalizeFsPath(arg.slice("--knowledge-dir=".length));
    else if (arg.startsWith("--qmd-bin=")) args.qmdBin = arg.slice("--qmd-bin=".length);
    else if (arg.startsWith("--max-files-per-mapping=")) {
      args.maxFilesPerMapping = Number(arg.slice("--max-files-per-mapping=".length));
    } else if (arg.startsWith("--max-pending-embeddings=")) {
      args.maxPendingEmbeddings = Number(arg.slice("--max-pending-embeddings=".length));
    } else if (arg === "--help" || arg === "-h") {
      printHelp();
      process.exit(0);
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  if (!Number.isFinite(args.days) || args.days < 1) args.days = 2;
  if (!Number.isFinite(args.maxFilesPerMapping) || args.maxFilesPerMapping < 1) args.maxFilesPerMapping = 250;
  if (!Number.isFinite(args.maxPendingEmbeddings) || args.maxPendingEmbeddings < 0) args.maxPendingEmbeddings = 10000;
  if (args.dates.length === 0) args.dates = dateWindow(args.days);
  args.sinceMs = Math.min(...args.dates.map(localDateStartMs));

  return args;
}

function printHelp() {
  console.log(`Usage: node scripts/check-knowledge-indexing.mjs [options]

Verifies that recent knowledge artifacts exist in QMD, not just on disk.
Recent means date-prefixed markdown for the checked dates or markdown modified since the oldest checked date.

Options:
  --days=N                         Check today plus N-1 previous local days (default: 2)
  --date=YYYY-MM-DD                Check a specific date. Can be repeated.
  --knowledge-dir=PATH             Knowledge repo path (default: ~/github/knowledge)
  --qmd-bin=PATH                   qmd executable (default: qmd)
  --max-files-per-mapping=N        Cap checked files per source mapping (default: 250)
  --max-pending-embeddings=N       Fail if QMD pending embeddings exceeds N (default: 10000)
  --json                           Emit JSON instead of text
`);
}

function qmd(args, options) {
  const result = run(options.qmdBin, args, options);
  if (result.error) {
    return {
      ok: false,
      stdout: "",
      stderr: result.error.message,
      status: 127,
    };
  }
  return {
    ok: result.status === 0,
    stdout: result.stdout || "",
    stderr: result.stderr || "",
    status: result.status,
  };
}

function parsePendingEmbeddings(statusOutput) {
  const match = statusOutput.match(/Pending:\s+([0-9,]+)\s+need embedding/);
  return match ? Number(match[1].replaceAll(",", "")) : null;
}

function checkCollectionPath(mapping, expectedRoot, options, collectionShows) {
  if (!collectionShows.has(mapping.collection)) {
    collectionShows.set(mapping.collection, qmd(["collection", "show", mapping.collection], options));
  }
  const show = collectionShows.get(mapping.collection);
  if (!show.ok) {
    return {
      ok: false,
      message: `${mapping.label}: qmd collection '${mapping.collection}' is missing or unreadable (${show.stderr.trim() || show.stdout.trim() || `exit ${show.status}`})`,
    };
  }

  const actualPath = parseCollectionPath(show.stdout);
  if (!actualPath) {
    return {
      ok: false,
      message: `${mapping.label}: qmd collection '${mapping.collection}' did not report a source path`,
    };
  }

  if (normalizeFsPath(actualPath) !== normalizeFsPath(expectedRoot)) {
    return {
      ok: false,
      message: `${mapping.label}: qmd collection '${mapping.collection}' points at '${actualPath}', expected '${expectedRoot}'`,
    };
  }

  return { ok: true, message: `${mapping.label}: collection path OK` };
}

function checkMapping(mapping, options, collectionLists, collectionShows) {
  const sourceRoot = path.join(options.knowledgeDir, mapping.sourceSubdir);
  const collectionRoot = path.join(options.knowledgeDir, mapping.collectionRootSubdir ?? mapping.sourceSubdir);
  const result = {
    label: mapping.label,
    collection: mapping.collection,
    sourceRoot,
    collectionRoot,
    checkedFiles: 0,
    missing: [],
    skipped: false,
    messages: [],
  };

  if (!fs.existsSync(sourceRoot)) {
    result.skipped = true;
    result.messages.push(`${mapping.label}: skipped; source folder does not exist (${sourceRoot})`);
    return result;
  }

  const collectionPath = checkCollectionPath(mapping, collectionRoot, options, collectionShows);
  result.messages.push(collectionPath.message);
  if (!collectionPath.ok) {
    result.missing.push(collectionPath.message);
    return result;
  }

  const sourceFiles = walkMarkdownFiles(sourceRoot);
  const recentFiles = mapping.checkAllWhenSmall && sourceFiles.length <= options.maxFilesPerMapping
    ? sourceFiles.map((file) => file.path).sort()
    : selectRecentMarkdownFiles(sourceFiles, options.dates, options.sinceMs);
  recentFiles.splice(options.maxFilesPerMapping);
  result.checkedFiles = recentFiles.length;
  if (recentFiles.length === 0) {
    result.skipped = true;
    result.messages.push(`${mapping.label}: no date-prefixed markdown files for ${options.dates.join(", ")}`);
    return result;
  }

  if (!collectionLists.has(mapping.collection)) {
    collectionLists.set(mapping.collection, qmd(["ls", mapping.collection], options));
  }
  const listing = collectionLists.get(mapping.collection);
  if (!listing.ok) {
    result.missing.push(`${mapping.label}: qmd ls '${mapping.collection}' failed (${listing.stderr.trim() || listing.stdout.trim() || `exit ${listing.status}`})`);
    return result;
  }

  const expectedUriGroups = buildExpectedUriVariants(recentFiles, collectionRoot, mapping.collection);
  result.missing.push(
    ...expectedUriGroups
      .filter((variants) => !variants.some((uri) => listing.stdout.includes(uri)))
      .map((variants) => variants[0])
  );

  if (result.missing.length === 0) {
    const sample = expectedUriGroups[0].find((uri) => listing.stdout.includes(uri)) || expectedUriGroups[0][0];
    const get = qmd(["get", sample, "-l", "1"], options);
    if (!get.ok || !get.stdout.trim()) {
      result.missing.push(`${mapping.label}: qmd get failed for indexed sample ${sample}`);
    } else {
      result.messages.push(`${mapping.label}: ${recentFiles.length} recent files indexed; sample retrieval OK (${sample})`);
    }
  }

  return result;
}

function checkIndex(options) {
  const report = {
    ok: true,
    knowledgeDir: options.knowledgeDir,
    dates: options.dates,
    pendingEmbeddings: null,
    mappings: [],
    failures: [],
    warnings: [],
  };

  if (!fs.existsSync(options.knowledgeDir)) {
    report.warnings.push(`Knowledge directory does not exist; skipped indexing contract (${options.knowledgeDir})`);
    return report;
  }

  const status = qmd(["status"], options);
  if (!status.ok) {
    report.ok = false;
    report.failures.push(`qmd status failed (${status.stderr.trim() || status.stdout.trim() || `exit ${status.status}`})`);
    return report;
  }

  report.pendingEmbeddings = parsePendingEmbeddings(status.stdout);
  if (report.pendingEmbeddings !== null && report.pendingEmbeddings > options.maxPendingEmbeddings) {
    report.ok = false;
    report.failures.push(`QMD has ${report.pendingEmbeddings} pending embeddings; threshold is ${options.maxPendingEmbeddings}`);
  }

  const collectionLists = new Map();
  const collectionShows = new Map();
  for (const mapping of DEFAULT_MAPPINGS) {
    const mappingResult = checkMapping(mapping, options, collectionLists, collectionShows);
    report.mappings.push(mappingResult);
    if (mappingResult.missing.length > 0) {
      report.ok = false;
      report.failures.push(...mappingResult.missing.map((item) => `${mapping.label}: missing ${item}`));
    }
  }

  return report;
}

function printReport(report) {
  if (report.warnings.length > 0) {
    for (const warning of report.warnings) console.log(`WARN ${warning}`);
  }

  console.log(`Knowledge indexing contract: ${report.ok ? "OK" : "FAILED"}`);
  console.log(`Knowledge dir: ${report.knowledgeDir}`);
  console.log(`Dates: ${report.dates.join(", ")}`);
  if (report.pendingEmbeddings !== null) {
    console.log(`QMD pending embeddings: ${report.pendingEmbeddings}`);
  }

  for (const mapping of report.mappings) {
    const state = mapping.missing.length > 0 ? "FAIL" : mapping.skipped ? "SKIP" : "OK";
    console.log(`${state} ${mapping.label}: checked ${mapping.checkedFiles} recent files in ${mapping.collection}`);
    for (const message of mapping.messages.slice(-2)) {
      console.log(`  - ${message}`);
    }
    for (const missing of mapping.missing.slice(0, 10)) {
      console.log(`  - missing: ${missing}`);
    }
    if (mapping.missing.length > 10) {
      console.log(`  - ...and ${mapping.missing.length - 10} more missing items`);
    }
  }

  if (report.failures.length > 0) {
    console.log("Failures:");
    for (const failure of report.failures.slice(0, 20)) console.log(`  - ${failure}`);
    if (report.failures.length > 20) console.log(`  - ...and ${report.failures.length - 20} more failures`);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    const options = parseArgs(process.argv.slice(2));
    const report = checkIndex(options);
    if (options.json) {
      console.log(JSON.stringify(report, null, 2));
    } else {
      printReport(report);
    }
    process.exit(report.ok ? 0 : 1);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}
