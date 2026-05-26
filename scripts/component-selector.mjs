#!/usr/bin/env node
/**
 * MemroOS Component Selector
 * Interactive CLI for choosing which services to start.
 * Usage: node scripts/component-selector.mjs
 */

import readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';

const PRESETS = {
  demo: {
    name: 'Demo Mode',
    description: 'Local memory only. No cloud accounts needed.',
    compose: 'docker-compose.demo.yml',
    services: ['memroos', 'mem0', 'neo4j', 'orchestration'],
    needsQdrant: false,
    needsOllama: false,
  },
  local: {
    name: 'Full Local',
    description: 'Local LLM embeddings with Ollama. Still no cloud.',
    compose: 'docker-compose.demo.yml',
    services: ['memroos', 'mem0', 'neo4j', 'orchestration'],
    needsQdrant: false,
    needsOllama: true,
  },
  production: {
    name: 'Production',
    description: 'Qdrant Cloud for vector memory + all services.',
    compose: 'docker-compose.yml',
    services: ['memroos', 'mem0', 'neo4j', 'orchestration', 'voice', 'knowledge-mcp'],
    needsQdrant: true,
    needsOllama: false,
  },
  custom: {
    name: 'Custom',
    description: 'Pick individual services.',
    compose: null,
    services: [],
    needsQdrant: null,
    needsOllama: null,
  },
};

const ALL_SERVICES = [
  { id: 'memroos', name: 'MemroOS Web UI', required: true },
  { id: 'mem0', name: 'Memory Service (mem0)', required: true },
  { id: 'neo4j', name: 'Graph Database (Neo4j)', required: true },
  { id: 'orchestration', name: 'Orchestration Engine', required: true },
  { id: 'voice', name: 'Voice Server', required: false },
  { id: 'knowledge-mcp', name: 'Knowledge MCP', required: false },
];

async function prompt(rl, question) {
  const answer = await rl.question(question + ' ');
  return answer.trim();
}

async function selectPreset(rl) {
  console.log('\n📦 MemroOS Setup\n');
  console.log('Choose your starting point:\n');

  const keys = Object.keys(PRESETS);
  for (let i = 0; i < keys.length; i++) {
    const p = PRESETS[keys[i]];
    console.log(`  ${i + 1}. ${p.name}`);
    console.log(`     ${p.description}`);
    if (p.needsQdrant) console.log('     ⚠️  Requires Qdrant Cloud account');
    if (p.needsOllama) console.log('     ⚠️  Requires Ollama running locally');
    console.log();
  }

  const choice = await prompt(rl, 'Select [1-4]:');
  const idx = parseInt(choice, 10) - 1;

  if (idx < 0 || idx >= keys.length) {
    console.log('Invalid selection');
    process.exit(1);
  }

  const presetKey = keys[idx];
  const preset = PRESETS[presetKey];

  if (presetKey === 'custom') {
    return await selectCustom(rl);
  }

  return preset;
}

async function selectCustom(rl) {
  console.log('\n🔧 Custom Service Selection\n');
  const selected = [];

  for (const svc of ALL_SERVICES) {
    if (svc.required) {
      console.log(`✓ ${svc.name} (required)`);
      selected.push(svc.id);
      continue;
    }
    const answer = await prompt(rl, `Include ${svc.name}? [y/N]:`);
    if (answer.toLowerCase() === 'y') {
      selected.push(svc.id);
    }
  }

  const needsQdrant = await prompt(rl, 'Use Qdrant Cloud for vector memory? [y/N]:');
  const needsOllama = await prompt(rl, 'Use Ollama for local LLM? [y/N]:');

  return {
    name: 'Custom',
    description: 'User-selected services',
    compose: needsQdrant.toLowerCase() === 'y' ? 'docker-compose.yml' : 'docker-compose.demo.yml',
    services: selected,
    needsQdrant: needsQdrant.toLowerCase() === 'y',
    needsOllama: needsOllama.toLowerCase() === 'y',
  };
}

async function main() {
  const rl = readline.createInterface({ input, output });

  try {
    const preset = await selectPreset(rl);

    console.log('\n📋 Configuration Summary\n');
    console.log(`  Mode:      ${preset.name}`);
    console.log(`  Compose:   ${preset.compose}`);
    console.log(`  Services:  ${preset.services.join(', ')}`);
    if (preset.needsQdrant) console.log('  Qdrant:    required');
    if (preset.needsOllama) console.log('  Ollama:    required');
    console.log();

    const confirm = await prompt(rl, 'Start MemroOS with this configuration? [Y/n]:');
    if (confirm.toLowerCase() === 'n') {
      console.log('Cancelled');
      process.exit(0);
    }

    // Output JSON for the setup script to consume
    console.log('\n' + JSON.stringify(preset, null, 2));
  } finally {
    rl.close();
  }
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
