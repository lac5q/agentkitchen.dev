#!/usr/bin/env bash
# launchd entrypoint for agent-kitchen.
# Exits 0 (without launching) if :3002 is already held by another process,
# so launchd's KeepAlive does not pile up duplicate kitchens during a respawn storm.

set -u
PORT="${PORT:-3002}"
REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LOG_DIR="$REPO_DIR/logs"
mkdir -p "$LOG_DIR"

# Preflight: if something already listens on $PORT, log and exit 1.
# Exit 1 (error) so launchd's ThrottleInterval=60 kicks in and retries after 60s,
# by which time the old socket's TIME_WAIT will have expired and the port will be free.
# Do NOT exit 0 — that tells launchd it was a clean exit and it won't retry.
if existing_pid=$(lsof -ti "tcp:$PORT" -sTCP:LISTEN 2>/dev/null | head -1); then
  if [ -n "$existing_pid" ]; then
    cmd=$(ps -o command= -p "$existing_pid" 2>/dev/null | head -1)
    printf '[%s] preflight: port %s already held by pid %s (%s) — exiting 1 (retry in 60s)\n' \
      "$(date '+%Y-%m-%dT%H:%M:%S%z')" "$PORT" "$existing_pid" "$cmd" \
      | tee -a "$LOG_DIR/launchd.log" >&2
    exit 1
  fi
fi

cd "$REPO_DIR"
exec /opt/homebrew/bin/npm start
