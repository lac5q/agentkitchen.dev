#!/usr/bin/env bash
set -euo pipefail

PROFILE="${MEMROOS_A2A_PROFILE:-local-dev}"
START_SERVICES="${START_SERVICES:-1}"
ENV_FILE="${ENV_FILE:-.env}"
ENV_CREATED=0
INSTALL_MEMORY_RESILIENCE_OVERRIDE="${INSTALL_MEMORY_RESILIENCE:-}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.yml}"
DEMO_MODE=0

# Parse arguments
for arg in "$@"; do
  case "$arg" in
    --wizard)
      node scripts/first-run-wizard.mjs
      exit 0
      ;;
    --demo)
      DEMO_MODE=1
      COMPOSE_FILE="docker-compose.demo.yml"
      echo "🎯 Demo mode: local memory only, no cloud accounts needed"
      ;;
    --status)
      node scripts/show-status.mjs
      exit 0
      ;;
    --check)
      node scripts/check-dependencies.mjs
      exit 0
      ;;
    --help|-h)
      echo "MemroOS Setup"
      echo ""
      echo "Usage: ./setup.sh [options]"
      echo ""
      echo "Options:"
      echo "  --wizard    Run interactive first-run configuration"
      echo "  --demo      Start in demo mode (no cloud services)"
      echo "  --status    Show running services"
      echo "  --check     Check dependencies only"
      echo "  --help      Show this help"
      echo ""
      echo "Examples:"
      echo "  ./setup.sh --demo              # Quick local demo"
      echo "  ./setup.sh --wizard            # Configure then start"
      echo "  ./setup.sh                     # Full production setup"
      exit 0
      ;;
  esac
done

# Check dependencies first
echo "🔍 Checking dependencies..."
node scripts/check-dependencies.mjs || {
  echo ""
  echo "❌ Please install missing dependencies and try again."
  echo ""
  echo "Quick install:"
  echo "  macOS:   brew install node python@3.11 docker"
  echo "  Ubuntu:  sudo apt-get install nodejs python3 docker.io docker-compose-plugin"
  exit 1
}

copy_env_if_missing() {
  if [[ ! -f "$ENV_FILE" ]]; then
    cp .env.example "$ENV_FILE"
    ENV_CREATED=1
    echo "✅ Created $ENV_FILE from .env.example"
  fi
}

load_env() {
  set -a
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  set +a
}

require_env() {
  local key="$1"
  local value="${!key:-}"
  if [[ -z "$value" || "$value" == your-* || "$value" == change-me ]]; then
    echo "⚠️  $key is not configured in $ENV_FILE" >&2
    return 1
  fi
  return 0
}

validate_profile() {
  node scripts/validate-operating-profiles.mjs
  if ! node -e "const p=require('./config/operating-profiles.json'); process.exit(p.profiles['$PROFILE'] ? 0 : 1)"; then
    echo "Unknown MEMROOS_A2A_PROFILE=$PROFILE" >&2
    exit 1
  fi
}

validate_qdrant() {
  if [[ "$DEMO_MODE" == "1" ]]; then
    echo "🎯 Demo mode: skipping Qdrant validation"
    return 0
  fi

  require_env QDRANT_URL || {
    echo ""
    echo "❌ QDRANT_URL not configured. Options:"
    echo "   1. Run ./setup.sh --demo for local-only mode"
    echo "   2. Run ./setup.sh --wizard to configure Qdrant Cloud"
    echo "   3. Edit $ENV_FILE with your Qdrant credentials"
    echo ""
    exit 1
  }
  require_env QDRANT_API_KEY || {
    echo ""
    echo "❌ QDRANT_API_KEY not configured"
    exit 1
  }

  if [[ "${SKIP_QDRANT_CHECK:-0}" == "1" ]]; then
    echo "⏭️  SKIP_QDRANT_CHECK=1, skipping live validation"
    return
  fi

  echo "🔌 Testing Qdrant Cloud connection..."
  python3 - <<'PY'
import os
import sys
import urllib.request

url = os.environ["QDRANT_URL"].rstrip("/") + "/collections"
req = urllib.request.Request(url, headers={"api-key": os.environ["QDRANT_API_KEY"]})
try:
    with urllib.request.urlopen(req, timeout=5) as response:
        if response.status >= 400:
            raise RuntimeError(f"HTTP {response.status}")
    print("✅ Qdrant Cloud connected")
except Exception as exc:
    print(f"❌ Qdrant Cloud validation failed: {exc}", file=sys.stderr)
    print("   Check QDRANT_URL and QDRANT_API_KEY in your env file.", file=sys.stderr)
    sys.exit(1)
PY
}

validate_optional_capabilities() {
  if [[ -z "${MEMROOS_OPTIONAL_CAPABILITIES:-}" ]]; then
    return
  fi
  node scripts/optional-capabilities.mjs
}

install_memory_service_deps() {
  if [[ "${INSTALL_MEMORY_SERVICE_DEPS:-1}" == "0" ]]; then
    echo "⏭️  INSTALL_MEMORY_SERVICE_DEPS=0, skipping Python dependencies"
    return
  fi

  if [[ ! -d ".venv" ]]; then
    echo "🐍 Creating Python virtual environment..."
    python3 -m venv .venv
  fi

  echo "📦 Installing memory service dependencies..."
  .venv/bin/python3 -m pip install -q --upgrade pip
  .venv/bin/python3 -m pip install -q -r services/memory/requirements.txt
}

install_memory_resilience() {
  if [[ "${INSTALL_MEMORY_RESILIENCE:-1}" == "0" ]]; then
    echo "⏭️  INSTALL_MEMORY_RESILIENCE=0, skipping memory resilience monitors"
    return
  fi
  if [[ "$(uname -s)" != "Darwin" ]]; then
    echo "⏭️  Memory resilience launchd jobs are macOS-only; skipping"
    return
  fi
  echo "🛡️  Installing memory resilience monitors..."
  node scripts/install-memory-resilience.mjs install
}

start_services() {
  if [[ "$START_SERVICES" == "0" ]]; then
    echo "⏭️  START_SERVICES=0, skipping docker compose up"
    return
  fi

  echo "🚀 Starting MemroOS services..."
  echo "   Using: $COMPOSE_FILE"
  docker compose -f "$COMPOSE_FILE" up -d
}

show_next_steps() {
  echo ""
  echo "✅ MemroOS setup complete!"
  echo ""

  if [[ "$DEMO_MODE" == "1" ]]; then
    echo "🎯 DEMO MODE — no cloud services required"
    echo ""
    echo "   Web UI:     http://localhost:3000"
    echo "   Neo4j:      http://localhost:7474  (neo4j/demo)"
    echo "   mem0 API:   http://localhost:3201"
    echo ""
    echo "   Memory is stored locally. No data leaves this machine."
  else
    echo "   Web UI:     http://localhost:3000"
    echo "   Neo4j:      http://localhost:7474"
    echo "   mem0 API:   http://localhost:3201"
    echo "   Orchestration: http://localhost:3210"
    echo ""
  fi

  echo "   Check status anytime: ./setup.sh --status"
  echo ""
}

main() {
  copy_env_if_missing

  if [[ "$ENV_CREATED" == "1" ]]; then
    echo ""
    echo "📝 First time setup detected."
    echo ""
    if [[ "$DEMO_MODE" == "1" ]]; then
      echo "Demo mode will use default credentials. No configuration needed."
    else
      echo "Tip: run ./setup.sh --wizard for guided configuration"
      echo "     or edit $ENV_FILE with your API keys"
    fi
    echo ""
  fi

  load_env

  if [[ -n "$INSTALL_MEMORY_RESILIENCE_OVERRIDE" ]]; then
    INSTALL_MEMORY_RESILIENCE="$INSTALL_MEMORY_RESILIENCE_OVERRIDE"
  fi

  PROFILE="${MEMROOS_A2A_PROFILE:-$PROFILE}"

  validate_profile
  validate_optional_capabilities
  validate_qdrant
  install_memory_service_deps
  install_memory_resilience
  start_services

  # Wait a moment for services to start
  sleep 2

  show_next_steps
  node scripts/show-status.mjs
}

main "$@"
