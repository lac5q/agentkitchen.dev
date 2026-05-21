#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const skillName = "multica-memroos";
const skillPath = path.join(root, "docs", "integrations", "multica-memroos-skill.md");

function parseArgs(argv) {
  const args = {
    agentId: "",
    dryRun: false,
    output: "text",
  };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--agent-id") args.agentId = argv[++i] ?? "";
    else if (arg === "--dry-run") args.dryRun = true;
    else if (arg === "--json") args.output = "json";
    else if (arg === "--help" || arg === "-h") {
      usage();
      process.exit(0);
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }
  return args;
}

function usage() {
  console.log(`Usage: node scripts/setup-multica-memroos.mjs [--agent-id ID] [--dry-run] [--json]

Creates or updates the Multica skill '${skillName}' from ${path.relative(root, skillPath)}.
When --agent-id is supplied, attaches the skill to that Multica agent while preserving existing skill ids.
`);
}

function runMultica(args, options = {}) {
  const output = execFileSync("multica", args, {
    cwd: root,
    encoding: "utf8",
    stdio: options.stdio ?? ["ignore", "pipe", "pipe"],
    input: options.input,
  });
  return output.trim();
}

function parseJson(raw, fallback) {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw);
  } catch (error) {
    throw new Error(`Unable to parse Multica JSON output: ${error instanceof Error ? error.message : String(error)}`);
  }
}

function ensureMultica() {
  runMultica(["--version"]);
}

function readSkillContent() {
  if (!fs.existsSync(skillPath)) {
    throw new Error(`Missing skill file: ${skillPath}`);
  }
  return fs.readFileSync(skillPath, "utf8");
}

function findSkillByName(name) {
  const skills = parseJson(runMultica(["skill", "list", "--output", "json"]), []);
  return Array.isArray(skills) ? skills.find((skill) => skill?.name === name) : null;
}

function upsertSkill(content, dryRun) {
  const existing = findSkillByName(skillName);
  const description = "Connect Multica agents to MemroOS recall, audited memory writes, and tool outcomes.";
  const config = JSON.stringify({ source: "memroos", localPath: path.relative(root, skillPath) });

  if (dryRun) {
    return {
      id: existing?.id ?? "<new-skill-id>",
      action: existing ? "would-update" : "would-create",
    };
  }

  if (existing?.id) {
    const updated = parseJson(
      runMultica([
        "skill",
        "update",
        existing.id,
        "--description",
        description,
        "--content",
        content,
        "--config",
        config,
        "--output",
        "json",
      ]),
      {}
    );
    return { id: updated.id ?? existing.id, action: "updated" };
  }

  const created = parseJson(
    runMultica([
      "skill",
      "create",
      "--name",
      skillName,
      "--description",
      description,
      "--content",
      content,
      "--config",
      config,
      "--output",
      "json",
    ]),
    {}
  );
  if (!created.id) throw new Error("Multica did not return an id for the created skill.");
  return { id: created.id, action: "created" };
}

function skillIdsFromAgent(agent) {
  const skills = Array.isArray(agent?.skills) ? agent.skills : [];
  return skills
    .map((skill) => {
      if (typeof skill === "string") return skill;
      if (skill && typeof skill.id === "string") return skill.id;
      if (skill && typeof skill.skill_id === "string") return skill.skill_id;
      return "";
    })
    .filter(Boolean);
}

function attachSkill(agentId, skillId, dryRun) {
  if (!agentId) return { action: "skipped", skillIds: [] };
  const agent = parseJson(runMultica(["agent", "get", agentId, "--output", "json"]), {});
  const skillIds = Array.from(new Set([...skillIdsFromAgent(agent), skillId]));
  if (dryRun) return { action: "would-attach", skillIds };
  runMultica(["agent", "skills", "set", agentId, "--skill-ids", skillIds.join(","), "--output", "json"]);
  return { action: "attached", skillIds };
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  ensureMultica();
  const content = readSkillContent();
  const skill = upsertSkill(content, args.dryRun);
  const assignment = attachSkill(args.agentId, skill.id, args.dryRun);
  const result = {
    skillName,
    skillId: skill.id,
    skillAction: skill.action,
    agentId: args.agentId || null,
    assignmentAction: assignment.action,
    assignedSkillIds: assignment.skillIds,
  };
  if (args.output === "json") {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(`[multica-memroos] skill ${skill.action}: ${skill.id}`);
    if (args.agentId) {
      console.log(`[multica-memroos] agent ${assignment.action}: ${args.agentId}`);
    } else {
      console.log("[multica-memroos] no --agent-id supplied; skill was not assigned.");
    }
  }
}

try {
  main();
} catch (error) {
  console.error(`[multica-memroos] ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}
