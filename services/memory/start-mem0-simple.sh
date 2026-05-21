#!/bin/bash
#
# Simple Mem0 Server Starter
# Use this for manual starts or with launchd
#

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

LOG_FILE="$SCRIPT_DIR/logs/mem0-server.log"
mkdir -p "$SCRIPT_DIR/logs"

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Starting Mem0 server..." | tee -a "$LOG_FILE"

# Load environment variables
if [ -f "$SCRIPT_DIR/.env" ]; then
    set -a
    source "$SCRIPT_DIR/.env"
    set +a
fi

# Activate virtual environment — prefer memroos venv, fall back to knowledge venv for backward compat
if [ -f "$SCRIPT_DIR/../../.venv/bin/activate" ]; then
    source "$SCRIPT_DIR/../../.venv/bin/activate"
elif [ -f "${KNOWLEDGE_VENV:-$HOME/github/knowledge/.venv}/bin/activate" ]; then
    source "${KNOWLEDGE_VENV:-$HOME/github/knowledge/.venv}/bin/activate"
fi

PYTHON_BIN="${PYTHON_BIN:-$(command -v python3 || command -v python)}"

if ! "$PYTHON_BIN" - <<'PY' >> "$LOG_FILE" 2>&1
import importlib
import sys

missing = []
for module in ("fastapi", "uvicorn", "yaml", "qdrant_client", "httpx", "mem0"):
    try:
        importlib.import_module(module)
    except Exception as exc:
        missing.append(f"{module}: {exc}")

if missing:
    print("Mem0 service dependency check failed:")
    for item in missing:
        print(f"- {item}")
    sys.exit(1)
PY
then
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] ERROR: memory service dependencies missing." | tee -a "$LOG_FILE"
    echo "Run: cd \"$SCRIPT_DIR/../..\" && .venv/bin/python3 -m pip install -r services/memory/requirements.txt" | tee -a "$LOG_FILE"
    exit 1
fi

# Start uvicorn (will run in foreground)
exec "$PYTHON_BIN" -m uvicorn mem0-server:app \
    --host 0.0.0.0 \
    --port 3201 \
    --log-level info \
    >> "$LOG_FILE" 2>&1
