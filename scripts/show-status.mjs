#!/usr/bin/env node
/**
 * MemroOS Status Dashboard
 * Shows what's running and how to access it.
 * Usage: node scripts/show-status.mjs
 */

import { execSync } from 'node:child_process';

const SERVICES = [
  { name: 'MemroOS Web UI', url: 'http://localhost:3000', port: 3000 },
  { name: 'Neo4j Browser', url: 'http://localhost:7474', port: 7474 },
  { name: 'mem0 API', url: 'http://localhost:3201', port: 3201 },
  { name: 'Orchestration API', url: 'http://localhost:3210', port: 3210 },
  { name: 'Voice Server', url: 'http://localhost:7860', port: 7860, optional: true },
];

function isPortOpen(port) {
  try {
    execSync(`lsof -ti :${port} >/dev/null 2>&1`);
    return true;
  } catch {
    return false;
  }
}

function checkHealth(url) {
  try {
    execSync(`curl -sf ${url}/api/health >/dev/null 2>&1 || curl -sf ${url}/health >/dev/null 2>&1`);
    return true;
  } catch {
    return false;
  }
}

console.log('\n┌─────────────────────────────────────────┐');
console.log('│         MemroOS Status                │');
console.log('└─────────────────────────────────────────┘\n');

let allHealthy = true;

for (const svc of SERVICES) {
  const running = isPortOpen(svc.port);
  const healthy = running && checkHealth(svc.url);
  const icon = healthy ? '✅' : running ? '⚠️ ' : svc.optional ? '⬜' : '❌';
  const status = healthy ? 'healthy' : running ? 'starting' : svc.optional ? 'not running' : 'down';

  console.log(`${icon} ${svc.name}`);
  console.log(`   ${svc.url} (${status})`);

  if (!healthy && !svc.optional) allHealthy = false;
}

console.log('\n─────────────────────────────────────────');

if (allHealthy) {
  console.log('✅ MemroOS is running. Open http://localhost:3000');
} else {
  console.log('⚠️  Some services are still starting. Check again in 30 seconds.');
}

console.log();
