# Meeting Recordings Integration

Memroos has a provider-agnostic `meet-recordings` context source slot. This guide uses
**Circleback** as the reference implementation. The same pattern works for Fireflies,
Otter, Zoom, Fathom, or any meeting tool with a CLI or API.

## How It Works

1. Your provider exports transcripts as JSON or Markdown
2. A private ingest script (never committed) transforms them to dated Markdown files in `data/context/meet-recordings/`
3. `qmd` indexes them → searchable via `knowledge_search("meeting about X")`

The connection is wired through environment variables so the public repo stays provider-agnostic.

## Quick Start

### Step 1 — Enable the source

The `meet-recordings` source is already in `context-sources.config.json` (disabled by default).
Enable it in your private overlay:

**`~/.memroos/context-sources.local.json`** (create from `context-sources.local.json.example`):
```json
{
  "sources": [
    {
      "id": "meet-recordings",
      "enabled": true
    }
  ]
}
```

### Step 2 — Create your ingest script

Create `~/.memroos/integrations/my-meetings-ingest.sh`:
```bash
#!/usr/bin/env bash
set -euo pipefail
OUTPUT_DIR="${MEMROOS_ROOT:-$HOME/github/memroos}/data/context/meet-recordings"
mkdir -p "$OUTPUT_DIR"
# Your provider CLI command here → transform to Markdown → write to $OUTPUT_DIR
```

### Step 3 — Wire the env var

In `~/.memroos/memroos-runtime.env`:
```bash
MEETINGS_INGEST_COMMAND=$HOME/.memroos/integrations/my-meetings-ingest.sh
```

### Step 4 — Schedule nightly sync (optional)

Copy `~/Library/LaunchAgents/com.memroos.circleback-sync.plist` from the Circleback
reference below and adapt the ingest script path.

---

## Circleback Reference Implementation

[Circleback](https://circleback.ai) provides a CLI with `--json` output — the cleanest
integration path for memroos.

### Install the CLI

```bash
npm install -g @circleback/cli
circleback login
```

### Create the ingest script

```bash
mkdir -p ~/.memroos/integrations
cat > ~/.memroos/integrations/circleback-ingest.sh << 'EOF'
#!/usr/bin/env bash
set -euo pipefail
OUTPUT_DIR="${MEMROOS_ROOT:-$HOME/github/memroos}/data/context/meet-recordings"
mkdir -p "$OUTPUT_DIR"
circleback meetings list --json | python3 ~/.memroos/integrations/circleback-transform.py --output-dir "$OUTPUT_DIR"
EOF
chmod +x ~/.memroos/integrations/circleback-ingest.sh
```

### Wire the env var

```bash
echo 'MEETINGS_INGEST_COMMAND=$HOME/.memroos/integrations/circleback-ingest.sh' \
  >> ~/.memroos/memroos-runtime.env
```

### Run a manual sync

```bash
source ~/.memroos/memroos-runtime.env
$MEETINGS_INGEST_COMMAND
qmd index meet-recordings
```

### Verify

```bash
knowledge_search("last meeting with [person]")
# Should return your circleback transcripts
```

---

## Other Providers

The same pattern works for any meeting tool:

| Provider | Export command |
|----------|----------------|
| Fireflies | `fireflies export --json` |
| Otter.ai | `otter export --format json` |
| Zoom | Zoom API `/meetings/{id}/recordings` |
| Fathom | Fathom export API |

Write a transform script that reads JSON from stdin and writes dated `.md` files
to `$OUTPUT_DIR`. The `circleback-transform.py` script in `~/.memroos/integrations/`
is a good starting point.

---

## Troubleshooting

**`knowledge_health()` shows meet-recordings as disabled**
→ Check `~/.memroos/context-sources.local.json` has `"enabled": true`

**No meetings appear after running ingest**
→ Run `qmd index meet-recordings` manually after the ingest script
→ Check `data/context/meet-recordings/` for `.md` files

**`MEETINGS_INGEST_COMMAND: command not found`**
→ Verify `source ~/.memroos/memroos-runtime.env` sets the variable
→ Check script path and permissions: `chmod +x ~/.memroos/integrations/circleback-ingest.sh`
