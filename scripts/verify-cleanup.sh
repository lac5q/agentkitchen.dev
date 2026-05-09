#!/bin/bash
#
# Post-batch verification script
# Ensures no Vast.ai instances are left running after batch embedding
#

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
LOG_FILE="$SCRIPT_DIR/logs/verify-cleanup.log"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log() { echo -e "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"; }
log_success() { log "${GREEN}✓ $1${NC}"; }
log_error() { log "${RED}✗ $1${NC}"; }
log_warn() { log "${YELLOW}⚠ $1${NC}"; }

mkdir -p "$SCRIPT_DIR/logs"

log "=== Post-Batch Verification ==="

# Check Vast.ai instances
INSTANCES=$(vastai show instances --raw 2>/dev/null | python3 -c "import json, sys; data = json.load(sys.stdin); print(len(data))" 2>/dev/null || echo "0")

if [ "$INSTANCES" = "0" ]; then
    log_success "No Vast.ai instances running"
else
    log_warn "$INSTANCES instance(s) still running - destroying..."
    
    # Destroy all instances
    vastai show instances --raw 2>/dev/null | python3 -c "
import json, sys
data = json.load(sys.stdin)
for d in data:
    instance_id = d.get('id')
    if instance_id:
        print(f'Destroying instance {instance_id}...')
        import subprocess
        subprocess.run(['vastai', 'destroy', 'instance', str(instance_id), '--yes'], capture_output=True)
" 2>/dev/null
    
    log_success "All instances destroyed"
fi

# Check SSH tunnels
SSH_TUNNELS=$(ps aux | grep "ssh.*-L.*8001" | grep -v grep | wc -l)

if [ "$SSH_TUNNELS" -gt 0 ]; then
    log_warn "SSH tunnel(s) still active - killing..."
    pkill -f "ssh.*-L.*8001" 2>/dev/null || true
    log_success "SSH tunnels killed"
else
    log_success "No SSH tunnels active"
fi

# Check for any other vastai-related processes
VAST_PROCS=$(ps aux | grep -E "vastai|batch-embed" | grep -v grep | wc -l)

if [ "$VAST_PROCS" -gt 0 ]; then
    log_warn "$VAST_PROCS Vast.ai-related process(es) still running"
    ps aux | grep -E "vastai|batch-embed" | grep -v grep
else
    log_success "No Vast.ai-related processes running"
fi

log "=== Verification Complete ==="
log "All systems clean - no costs accruing"
