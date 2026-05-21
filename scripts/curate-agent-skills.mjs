#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputPath = path.join(root, "data", "curated-agent-skills.json");
const skillRoots = [
  { id: "agents", path: path.join(root, ".agents", "skills") },
  { id: "claude", path: path.join(root, ".claude", "skills") },
];

function readSkillMetadata(skillPath) {
  const skillFile = path.join(skillPath, "SKILL.md");
  const readmeFile = path.join(skillPath, "README.md");
  const sourceFile = fs.existsSync(skillFile) ? skillFile : fs.existsSync(readmeFile) ? readmeFile : null;
  if (!sourceFile) return null;
  const text = fs.readFileSync(sourceFile, "utf8");
  const name = path.basename(skillPath);
  const description = text.match(/^description:\s*"?([^"\n]+)"?/m)?.[1] ?? text.match(/^#\s+(.+)$/m)?.[1] ?? name;
  return {
    id: name,
    path: path.relative(root, skillPath),
    sourceFile: path.relative(root, sourceFile),
    description,
  };
}

const sources = [];
const skillsById = new Map();

for (const source of skillRoots) {
  if (!fs.existsSync(source.path)) continue;
  sources.push({ id: source.id, path: path.relative(root, source.path) });
  for (const entry of fs.readdirSync(source.path, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const metadata = readSkillMetadata(path.join(source.path, entry.name));
    if (!metadata) continue;
    const existing = skillsById.get(metadata.id);
    skillsById.set(metadata.id, {
      ...metadata,
      runtimes: [...new Set([...(existing?.runtimes ?? []), source.id])].sort(),
    });
  }
}

const payload = {
  generatedAt: new Date().toISOString(),
  sources,
  skills: Array.from(skillsById.values()).sort((a, b) => a.id.localeCompare(b.id)),
};

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, `${JSON.stringify(payload, null, 2)}\n`);
console.log(`Curated ${payload.skills.length} agent skills into ${path.relative(root, outputPath)}.`);
