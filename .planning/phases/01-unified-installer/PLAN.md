# Phase 1: Unified Installer — Progressive Onboarding

**Goal:** New user goes from "git clone" to "MemroOS running" in under 5 minutes with minimal friction.

**Approach:** Progressive disclosure. Start with a minimal local demo. Let users opt into cloud-backed features.

---

## Plan 1.1: Dependency Detection & Helpful Errors

Replace hard-fail `need()` with detect-and-help:
- Check Node.js version (need 20+, suggest nvm/fnm)
- Check npm
- Check Python 3 (need 3.10+, suggest pyenv)
- Check Docker + Docker Compose
- Check Ollama (optional, warn if missing)
- For each missing dependency: print OS-specific install command

**Files:**
- `scripts/check-dependencies.mjs` — new
- `setup.sh` — replace `need()` with `check-dependencies.mjs --fix`

---

## Plan 1.2: Local Demo Mode (No Cloud Required)

Create a `docker-compose.demo.yml` that runs:
- memroos (Next.js app)
- neo4j (graph memory)
- mem0 with SQLite-only mode (no Qdrant)

This gives users a working memory loop without any cloud accounts.

**Files:**
- `docker-compose.demo.yml` — new
- `services/memory/mem0-config.demo.yaml` — SQLite-only config
- `setup.sh` — add `--demo` flag

---

## Plan 1.3: Interactive Component Selection

Replace the all-or-nothing `docker compose up` with:
```
What do you want to run?
[1] Demo mode — local memory only, no cloud accounts
[2] Full local — + Ollama for local LLM embeddings
[3] Production — + Qdrant Cloud for vector memory
[4] Custom — pick components
```

**Files:**
- `scripts/component-selector.mjs` — new interactive selector
- `setup.sh` — integrate selector before `docker compose up`

---

## Plan 1.4: Enhanced First-Run Wizard

Improve `first-run-wizard.mjs`:
- Explain what each config value does
- Validate credentials as they're entered (test Qdrant connection)
- Generate secure random passwords for Neo4j/operator keys
- Show summary before writing .env
- Option to skip cloud setup for demo mode

**Files:**
- `scripts/first-run-wizard.mjs` — enhance

---

## Plan 1.5: Health Dashboard (Minimal)

After setup completes, show a simple status page:
```
MemroOS Status
==============
✓ Web UI        http://localhost:3000
✓ Neo4j         http://localhost:7474
✓ mem0 API      http://localhost:3201
⚠ Ollama        not running (optional)
✓ Health        http://localhost:3000/api/health
```

**Files:**
- `scripts/show-status.mjs` — new
- `setup.sh` — call after services start

---

## Verification

1. Fresh macOS VM: `git clone && ./setup.sh --demo` → works in <5 min
2. Fresh Ubuntu VM: same
3. With Qdrant: `./setup.sh --wizard` → validates credentials → starts
4. Missing Docker: helpful error with install link

---

## Deployment

Commit to `main`, tag `v1.0.0-beta.3`.
