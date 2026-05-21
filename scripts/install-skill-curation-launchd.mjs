#!/usr/bin/env node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const label = "com.memroos.skill-curation";
const plistPath = path.join(os.homedir(), "Library", "LaunchAgents", `${label}.plist`);

const plist = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>${label}</string>
  <key>ProgramArguments</key>
  <array>
    <string>/opt/homebrew/bin/node</string>
    <string>${path.join(root, "scripts", "curate-agent-skills.mjs")}</string>
  </array>
  <key>StartCalendarInterval</key>
  <dict>
    <key>Hour</key>
    <integer>4</integer>
    <key>Minute</key>
    <integer>15</integer>
  </dict>
  <key>StandardOutPath</key>
  <string>${path.join(root, "services", "memory", "logs", "skill-curation.log")}</string>
  <key>StandardErrorPath</key>
  <string>${path.join(root, "services", "memory", "logs", "skill-curation-error.log")}</string>
</dict>
</plist>
`;

if (process.argv.includes("--check")) {
  console.log(plist);
  process.exit(0);
}

fs.mkdirSync(path.dirname(plistPath), { recursive: true });
fs.writeFileSync(plistPath, plist);
console.log(`Installed ${label} at ${plistPath}. Load with: launchctl bootstrap gui/${process.getuid()} ${plistPath}`);
