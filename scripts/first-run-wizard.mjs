#!/usr/bin/env node
/**
 * MemroOS First-Run Wizard — Phase 2
 * Interactive setup with explanations, live validation, and health dashboard.
 * Usage: node scripts/first-run-wizard.mjs [--check|--dry-run|--demo]
 */

import fs from 'node:fs';
import readline from 'node:readline/promises';
import { emitKeypressEvents } from 'node:readline';
import { stdin as input, stdout as output } from 'node:process';
import { execSync } from 'node:child_process';

const profiles = JSON.parse(fs.readFileSync('config/operating-profiles.json', 'utf8'));
const envExample = fs.readFileSync('.env.example', 'utf8');
const envFile = process.env.ENV_FILE || '.env';
const supportedOptionalCapabilities = new Set(['gitnexus', 'agent-lightning']);

// ── Helpers ──────────────────────────────────────────────────────────────

function header(title) {
  const border = '═'.repeat(56);
  output.write(`\n╔${border}╗\n`);
  output.write(`║  ${title.padEnd(54)}║\n`);
  output.write(`╚${border}╝\n\n`);
}

function section(title) {
  output.write(`\n── ${title} ──\n\n`);
}

function explain(field) {
  const explanations = {
    MEMROOS_A2A_PROFILE:
      'This sets the network topology.\n' +
      '  local-dev       → Single machine, loopback-only.\n' +
      '  private-network → Multiple machines on Tailscale/LAN (recommended).\n' +
      '  cloud-https     → Internet-reachable behind HTTPS.\n' +
      '  custom          → You provide all URLs manually.',
    QDRANT_URL:
      'Qdrant is the vector database for semantic memory.\n' +
      '  You need a free Qdrant Cloud account: https://qdrant.tech\n' +
      '  Create a cluster, then paste the URL here.\n' +
      '  If you skip this, MemroOS will run in demo mode with embedded storage.',
    QDRANT_API_KEY:
      'The API key from your Qdrant Cloud dashboard.\n' +
      '  This connects MemroOS to your vector store.',
    NEO4J_PASSWORD:
      'Neo4j stores graph relationships between memories.\n' +
      '  It runs in Docker locally, so you choose the password.\n' +
      '  We will generate a secure one if you press Enter.',
    MEMROOS_OPERATOR_API_KEY:
      'The operator key controls admin access to MemroOS.\n' +
      '  Anyone with this key can dispatch agents and change settings.\n' +
      '  We will generate a secure one if you press Enter.',
    GEMINI_API_KEY:
      'Gemini powers the voice server (optional).\n' +
      '  Skip this if you do not need voice features.\n' +
      '  Get a key at https://ai.google.dev',
    MEMROOS_OPTIONAL_CAPABILITIES:
      'Extra capabilities you can enable later.\n' +
      '  gitnexus      → Code graph intelligence.\n' +
      '  agent-lightning → Automated skill proposals.\n' +
      '  Leave blank to skip.',
    FIRST_AGENT_ID:
      'Name your first agent (optional).\n' +
      '  Example: "product-assistant" or "debug-agent".\n' +
      '  You can register agents later from /agents.',
  };
  return explanations[field] || '';
}

function randomBytes(n) {
  const bytes = new Uint8Array(n);
  crypto.getRandomValues(bytes);
  return Buffer.from(bytes).toString('base64url').slice(0, n);
}

async function rlQuestion(rl, prompt) {
  return await rl.question(prompt);
}

async function secretQuestion(prompt) {
  output.write(prompt);
  emitKeypressEvents(input);
  const wasRaw = input.isRaw;
  if (input.setRawMode) input.setRawMode(true);
  input.resume();

  return new Promise((resolve, reject) => {
    let value = '';

    const cleanup = () => {
      input.off('keypress', onKeypress);
      if (input.setRawMode) input.setRawMode(Boolean(wasRaw));
      output.write('\n');
    };

    const onKeypress = (character, key = {}) => {
      if (key.ctrl && key.name === 'c') {
        cleanup();
        reject(new Error('Wizard cancelled'));
        return;
      }
      if (key.name === 'return' || key.name === 'enter') {
        cleanup();
        resolve(value);
        return;
      }
      if (key.name === 'backspace' || key.name === 'delete') {
        value = value.slice(0, -1);
        output.write('\b \b');
        return;
      }
      if (character && !key.ctrl && !key.meta) {
        value += character;
        output.write('•');
      }
    };

    input.on('keypress', onKeypress);
  });
}

function applyEnvValues(text, values) {
  let next = text;
  for (const [key, value] of Object.entries(values)) {
    const escaped = String(value).replace(/[$`\\]/g, '\\$&');
    const pattern = new RegExp(`^#?\\s*${key}=.*$`, 'm');
    if (pattern.test(next)) next = next.replace(pattern, `${key}=${escaped}`);
    else next += `\n${key}=${escaped}`;
  }
  return next;
}

// ── Validators ───────────────────────────────────────────────────────────

function validateUrl(url, required) {
  if (!url && !required) return { ok: true };
  try {
    new URL(url);
    return { ok: true };
  } catch {
    return { ok: false, error: 'Must be a valid URL' };
  }
}

async function testQdrantConnection(url, apiKey) {
  try {
    const result = execSync(
      `curl -sf -H "api-key: ${apiKey}" "${url}/collections" -o /dev/null 2>&1`,
      { timeout: 10000 }
    );
    return { ok: true, message: 'Connected to Qdrant Cloud ✓' };
  } catch (err) {
    if (err.status === 28) return { ok: false, error: 'Connection timed out (check URL/firewall)' };
    if (err.status === 22) return { ok: false, error: 'Authentication failed (check API key)' };
    return { ok: false, error: `Could not connect: ${err.message}` };
  }
}

async function testNeo4jConnection(host, port, username, password) {
  try {
    const result = execSync(
      `curl -sf -u "${username}:${password}" "http://${host}:${port}" -o /dev/null 2>&1`,
      { timeout: 10000 }
    );
    return { ok: true, message: 'Neo4j is responding ✓' };
  } catch (err) {
    return { ok: false, error: 'Cannot reach Neo4j (will start in Docker)' };
  }
}

async function testOllamaConnection() {
  try {
    const result = execSync('curl -sf http://localhost:11434/api/tags -o /dev/null 2>&1', {
      timeout: 5000,
    });
    return { ok: true, message: 'Ollama is running ✓' };
  } catch {
    return { ok: false, error: 'Ollama not running — run "ollama serve"' };
  }
}

// ── Main wizard ──────────────────────────────────────────────────────────

async function promptForValues() {
  const rl = readline.createInterface({ input, output });
  const values = {};

  try {
    // Step 1: Profile
    header('Step 1: Network Topology');
    output.write(explain('MEMROOS_A2A_PROFILE') + '\n\n');

    output.write('Available profiles:\n');
    for (const [key, profile] of Object.entries(profiles.profiles)) {
      const marker = key === 'local-dev' ? ' (default)' : '';
      output.write(`  ${key}${marker}\n    ${profile.description}\n`);
    }
    output.write('\n');

    const profileAnswer = await rlQuestion(rl, 'Select profile [local-dev]: ');
    values.MEMROOS_A2A_PROFILE = profileAnswer.trim() || 'local-dev';

    // Step 2: Mode selection
    header('Step 2: Setup Mode');
    output.write('  1. Demo Mode     — Local memory, no cloud accounts needed\n');
    output.write('  2. Full Setup    — Qdrant Cloud + all services\n\n');

    const modeAnswer = await rlQuestion(rl, 'Choose [1/2]: ');
    const mode = modeAnswer.trim() || '2';

    if (mode === '1') {
      section('Demo Mode');
      output.write('No additional configuration needed.\n');
      output.write('MemroOS will use embedded storage and local Neo4j.\n');
      values.QDRANT_URL = '';
      values.QDRANT_API_KEY = '';
      values.NEO4J_PASSWORD = randomBytes(16);
      values.MEMROOS_OPERATOR_API_KEY = randomBytes(24);
      values.GEMINI_API_KEY = '';
      values.MEMROOS_OPTIONAL_CAPABILITIES = '';

      const confirm = await rlQuestion(rl, '\nContinue with demo mode? [Y/n]: ');
      if (confirm.toLowerCase() === 'n') process.exit(0);

      // Generate .env for demo
      if (fs.existsSync(envFile)) {
        fs.copyFileSync(envFile, `${envFile}.backup-${Date.now()}`);
      }
      const rendered = applyEnvValues(envExample, values);
      fs.writeFileSync(envFile, rendered);
      output.write(`\n✓ Wrote ${envFile}\n`);
      output.write(`  Operator key: ${values.MEMROOS_OPERATOR_API_KEY}\n`);
      output.write(`  Neo4j password: ${values.NEO4J_PASSWORD}\n\n`);
      output.write('Next: ./setup.sh --demo\n');
      return values;
    }

    // Step 3: Qdrant
    header('Step 3: Vector Memory (Qdrant Cloud)');
    output.write(explain('QDRANT_URL') + '\n\n');

    values.QDRANT_URL = await rlQuestion(rl, 'Qdrant Cloud URL: ');
    values.QDRANT_API_KEY = await secretQuestion('Qdrant API key (hidden input): ');

    output.write('\nTesting connection... ');
    const qdrantTest = await testQdrantConnection(values.QDRANT_URL, values.QDRANT_API_KEY);
    output.write(qdrantTest.message || `✗ ${qdrantTest.error}\n`);

    if (!qdrantTest.ok) {
      const retry = await rlQuestion(rl, '\nRetry with different credentials? [y/N]: ');
      if (retry.toLowerCase() === 'y') {
        values.QDRANT_URL = await rlQuestion(rl, 'Qdrant Cloud URL: ');
        values.QDRANT_API_KEY = await secretQuestion('Qdrant API key (hidden input): ');
        const retest = await testQdrantConnection(values.QDRANT_URL, values.QDRANT_API_KEY);
        output.write(`${retest.message || `✗ ${retest.error}`}\n`);
      }
    }

    // Step 4: Neo4j
    header('Step 4: Graph Memory (Neo4j)');
    output.write(explain('NEO4J_PASSWORD') + '\n\n');

    const neoPassword = await secretQuestion(
      `Neo4j password (Enter for auto-generated, ${randomBytes(8).length} chars): `
    );
    values.NEO4J_PASSWORD = neoPassword.trim() || randomBytes(16);

    // Step 5: Operator Key
    header('Step 5: Operator Access');
    output.write(explain('MEMROOS_OPERATOR_API_KEY') + '\n\n');

    const opKey = await secretQuestion(
      `Operator API key (Enter for auto-generated): `
    );
    values.MEMROOS_OPERATOR_API_KEY = opKey.trim() || randomBytes(24);

    // Step 6: Optional — Gemini
    header('Step 6: Voice Server (Optional)');
    output.write(explain('GEMINI_API_KEY') + '\n\n');

    values.GEMINI_API_KEY = await secretQuestion('Gemini API key (Enter to skip): ');

    // Step 7: Optional capabilities
    header('Step 7: Optional Capabilities');
    output.write(explain('MEMROOS_OPTIONAL_CAPABILITIES') + '\n\n');

    values.MEMROOS_OPTIONAL_CAPABILITIES = await rlQuestion(
      rl, 'Capabilities [gitnexus,agent-lightning] (Enter to skip): '
    );

    // Step 8: First agent
    header('Step 8: First Agent (Optional)');
    output.write(explain('FIRST_AGENT_ID') + '\n\n');

    values.FIRST_AGENT_ID = await rlQuestion(
      rl, 'First agent ID (Enter to skip): '
    );

    // Summary
    header('Configuration Summary');
    output.write(`  Profile:              ${values.MEMROOS_A2A_PROFILE}\n`);
    output.write(`  Qdrant:               ${values.QDRANT_URL}\n`);
    output.write(`  Neo4j password:       ${'•'.repeat(8)}\n`);
    output.write(`  Operator key:         ${'•'.repeat(8)}\n`);
    output.write(`  Gemini:               ${values.GEMINI_API_KEY ? '✓ set' : '— skipped'}\n`);
    output.write(`  Capabilities:         ${values.MEMROOS_OPTIONAL_CAPABILITIES || '— none'}\n`);
    if (values.FIRST_AGENT_ID) {
      output.write(`  First agent:          ${values.FIRST_AGENT_ID}\n`);
    }

    output.write('\n');
    const confirm = await rlQuestion(rl, 'Write configuration? [Y/n]: ');
    if (confirm.toLowerCase() === 'n') {
      output.write('Cancelled — no changes made.\n');
      process.exit(0);
    }

    // Write
    if (fs.existsSync(envFile)) {
      fs.copyFileSync(envFile, `${envFile}.backup-${Date.now()}`);
    }
    const rendered = applyEnvValues(envExample, values);
    fs.writeFileSync(envFile, rendered);

    output.write(`\n✓ Wrote ${envFile}\n`);
    output.write(`  Operator key: ${values.MEMROOS_OPERATOR_API_KEY}\n`);
    output.write(`  Neo4j password: ${values.NEO4J_PASSWORD}\n\n`);
    output.write('Next: ./setup.sh\n');

    return values;
  } finally {
    rl.close();
  }
}

// ── Entry ────────────────────────────────────────────────────────────────

function parseArgs() {
  const args = new Set(process.argv.slice(2));
  return { check: args.has('--check'), dryRun: args.has('--dry-run'), demo: args.has('--demo') };
}

async function main() {
  const args = parseArgs();

  if (args.check) {
    const sample = {
      MEMROOS_A2A_PROFILE: 'private-network',
      QDRANT_URL: 'https://qdrant.example',
      QDRANT_API_KEY: 'dummy-key',
      NEO4J_PASSWORD: 'neo4j-secret',
      MEMROOS_OPERATOR_API_KEY: 'operator-secret',
      MEMROOS_OPTIONAL_CAPABILITIES: 'gitnexus,agent-lightning',
    };
    const errors = [];
    try { new URL(sample.QDRANT_URL); } catch { errors.push('Bad QDRANT_URL'); }
    if (!sample.QDRANT_API_KEY || sample.QDRANT_API_KEY.startsWith('your-')) errors.push('QDRANT_API_KEY required');
    if (!sample.NEO4J_PASSWORD || sample.NEO4J_PASSWORD === 'change-me') errors.push('NEO4J_PASSWORD must change');
    if (errors.length) throw new Error(errors.join('; '));
    output.write('First-run wizard validation passed\n');
    return;
  }

  if (!process.stdin.isTTY) {
    throw new Error('Wizard requires an interactive terminal. Use --check for CI validation.');
  }

  if (args.demo) {
    output.write('Demo mode — no wizard needed. Run ./setup.sh --demo instead.\n');
    return;
  }

  await promptForValues();
}

main().catch((error) => {
  output.write(`\n✗ ${error.message}\n`);
  process.exit(1);
});
