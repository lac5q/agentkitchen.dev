#!/usr/bin/env node
/**
 * MemroOS Dependency Checker
 * Detects prerequisites and suggests installation commands.
 * Usage: node scripts/check-dependencies.mjs [--fix]
 */

import { execSync } from 'node:child_process';
import process from 'node:process';

const PLATFORM = process.platform;
const FIX = process.argv.includes('--fix');

const deps = [
  {
    name: 'Node.js',
    minVersion: '20.0.0',
    check: () => {
      try {
        const v = execSync('node --version', { encoding: 'utf8' }).trim();
        return { ok: true, version: v };
      } catch {
        return { ok: false };
      }
    },
    install: {
      darwin: 'brew install node  # or: nvm install 22',
      linux: 'curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash - && sudo apt-get install -y nodejs',
      win32: 'Download from https://nodejs.org/',
    },
  },
  {
    name: 'npm',
    check: () => {
      try {
        const v = execSync('npm --version', { encoding: 'utf8' }).trim();
        return { ok: true, version: v };
      } catch {
        return { ok: false };
      }
    },
    install: {
      darwin: 'Comes with Node.js',
      linux: 'Comes with Node.js',
      win32: 'Comes with Node.js',
    },
  },
  {
    name: 'Python 3',
    minVersion: '3.10.0',
    check: () => {
      // Try python3.11, then python3.10, then python3 (macOS ships 3.9)
      const cmds = ['python3.11 --version', 'python3.10 --version', 'python3 --version'];
      for (const cmd of cmds) {
        try {
          const v = execSync(cmd, { encoding: 'utf8' }).trim();
          return { ok: true, version: v, cmd };
        } catch { /* try next */ }
      }
      return { ok: false };
    },
    install: {
      darwin: 'brew install python@3.11',
      linux: 'sudo apt-get install python3 python3-venv python3-pip',
      win32: 'Download from https://python.org/',
    },
  },
  {
    name: 'Docker',
    check: () => {
      try {
        execSync('docker --version', { encoding: 'utf8' });
        return { ok: true };
      } catch {
        return { ok: false };
      }
    },
    install: {
      darwin: 'brew install --cask docker  # or: https://docs.docker.com/desktop/install/mac-install/',
      linux: 'curl -fsSL https://get.docker.com | sh',
      win32: 'https://docs.docker.com/desktop/install/windows-install/',
    },
  },
  {
    name: 'Docker Compose',
    check: () => {
      try {
        execSync('docker compose version', { encoding: 'utf8' });
        return { ok: true };
      } catch {
        return { ok: false };
      }
    },
    install: {
      darwin: 'Included with Docker Desktop',
      linux: 'sudo apt-get install docker-compose-plugin',
      win32: 'Included with Docker Desktop',
    },
  },
  {
    name: 'Ollama',
    optional: true,
    check: () => {
      try {
        execSync('ollama --version', { encoding: 'utf8' });
        return { ok: true };
      } catch {
        return { ok: false };
      }
    },
    install: {
      darwin: 'brew install ollama  # or: https://ollama.com/download/mac',
      linux: 'curl -fsSL https://ollama.com/install.sh | sh',
      win32: 'https://ollama.com/download/windows',
    },
  },
];

function compareVersions(a, b) {
  const pa = a.replace(/^v/, '').split('.');
  const pb = b.replace(/^v/, '').split('.');
  for (let i = 0; i < 3; i++) {
    const na = parseInt(pa[i] || '0', 10);
    const nb = parseInt(pb[i] || '0', 10);
    if (na > nb) return 1;
    if (na < nb) return -1;
  }
  return 0;
}

function printBox(lines) {
  const width = Math.max(...lines.map(l => l.length));
  console.log('┌' + '─'.repeat(width + 2) + '┐');
  for (const line of lines) {
    console.log('│ ' + line.padEnd(width) + ' │');
  }
  console.log('└' + '─'.repeat(width + 2) + '┘');
}

let allOk = true;
const missing = [];
const warnings = [];

for (const dep of deps) {
  const result = dep.check();
  if (result.ok) {
    const versionStr = result.version ? ` (${result.version})` : '';
    console.log(`✓ ${dep.name}${versionStr}`);
    if (dep.minVersion && result.version) {
      const cleanVersion = result.version.replace(/^v/, '');
      if (compareVersions(cleanVersion, dep.minVersion) < 0) {
        warnings.push(`${dep.name} ${cleanVersion} < ${dep.minVersion}`);
      }
    }
  } else {
    if (dep.optional) {
      console.log(`⚠ ${dep.name} — optional, not installed`);
    } else {
      console.log(`✗ ${dep.name} — REQUIRED`);
      allOk = false;
      missing.push(dep);
    }
  }
}

if (warnings.length) {
  console.log('\n⚠ Version warnings:');
  for (const w of warnings) console.log(`  - ${w}`);
}

if (!allOk) {
  console.log('\n❌ Missing required dependencies:\n');
  for (const dep of missing) {
    const cmd = dep.install[PLATFORM] || dep.install.linux;
    console.log(`${dep.name}:`);
    console.log(`  ${cmd}\n`);
  }

  if (FIX) {
    console.log('Run the commands above, then re-run this script.\n');
  } else {
    console.log('Run with --fix to see install commands.\n');
  }

  printBox([
    'Quick install (macOS):',
    '  brew install node python@3.11 docker',
    '',
    'Quick install (Ubuntu):',
    '  sudo apt-get install nodejs python3 docker.io docker-compose-plugin',
  ]);

  process.exit(1);
}

console.log('\n✅ All dependencies satisfied');
process.exit(0);
