#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { checkOptionalCapabilities, printOptionalCapabilityReport } from "./optional-capabilities.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const configPath = path.join(root, "agents.config.json");
const requiredAgentFields = ["id", "name", "role", "platform", "location", "host", "port", "healthEndpoint"];

function fail(message) {
  console.error(message);
  process.exitCode = 1;
}

function readAgentsConfig() {
  try {
    return JSON.parse(fs.readFileSync(configPath, "utf8"));
  } catch (error) {
    fail(`Unable to read agents.config.json: ${error instanceof Error ? error.message : String(error)}`);
    return null;
  }
}

function checkAgentsConfig(config) {
  if (!config || !Array.isArray(config.remoteAgents)) {
    fail("agents.config.json must contain a remoteAgents array.");
    return;
  }

  const seen = new Set();
  for (const agent of config.remoteAgents) {
    for (const field of requiredAgentFields) {
      if (!(field in agent)) fail(`Agent ${agent.id ?? "<unknown>"} missing required field: ${field}`);
    }
    if (typeof agent.id === "string") {
      if (seen.has(agent.id)) fail(`Duplicate agent id: ${agent.id}`);
      seen.add(agent.id);
    }
    if (!Number.isInteger(agent.port) || agent.port < 1 || agent.port > 65535) {
      fail(`Agent ${agent.id ?? "<unknown>"} has invalid port: ${agent.port}`);
    }
    if (typeof agent.healthEndpoint !== "string" || !agent.healthEndpoint.startsWith("/")) {
      fail(`Agent ${agent.id ?? "<unknown>"} healthEndpoint must start with "/".`);
    }
  }

  console.log(`Agent registry check passed: ${config.remoteAgents.length} configured remote agents.`);
}

checkAgentsConfig(readAgentsConfig());
printOptionalCapabilityReport(checkOptionalCapabilities({ root }));
