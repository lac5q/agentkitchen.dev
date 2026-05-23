#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const config = JSON.parse(fs.readFileSync(path.join(root, "context-sources.config.json"), "utf8"));
const required = new Set(["qmd", "gmail", "spark", "mem0", "local-folder"]);
const ids = new Set(config.sources.map((source) => source.id));
const missing = [...required].filter((id) => !ids.has(id));
if (missing.length) {
  console.error(`Missing context source contracts: ${missing.join(", ")}`);
  process.exit(1);
}

for (const source of config.sources) {
  for (const key of ["id", "type", "enabled", "requiredTools", "envVars", "sourcePath", "freshnessThresholdMinutes", "safeAnswerPolicy"]) {
    if (!(key in source)) {
      console.error(`Source ${source.id ?? "<unknown>"} missing ${key}`);
      process.exit(1);
    }
  }
}

const spark = config.sources.find((source) => source.id === "spark");
const readiness = spark?.readinessPolicy;
const requiredReadinessKeys = [
  "artifactCompleteMarker",
  "pendingStateKey",
  "ownerIdentitiesEnv",
  "settleMinutesEnv",
];
if (!readiness) {
  console.error("Spark source missing readinessPolicy");
  process.exit(1);
}
for (const key of requiredReadinessKeys) {
  if (!readiness[key]) {
    console.error(`Spark readinessPolicy missing ${key}`);
    process.exit(1);
  }
}
if (readiness.artifactCompleteMarker !== "## Transcript") {
  console.error("Spark readinessPolicy must require transcript-bearing artifacts");
  process.exit(1);
}

console.log("Context source degradation eval passed");
