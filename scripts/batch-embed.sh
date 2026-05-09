#!/bin/bash
#
# Batch Embedding Runner
# Spins up Vast.ai instance, runs embeddings, destroys instance
# Usage: ./batch-embed.sh [options]
#

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
LOG_FILE="$SCRIPT_DIR/logs/batch-embed.log"
PID_FILE="$SCRIPT_DIR/logs/batch-embed.pid"
VAST_API_KEY="${VAST_API_KEY:-$(cat ~/.config/vastai/vast_api_key 2>/dev/null)}"

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

# Cleanup function
cleanup() {
    if [ -n "$INSTANCE_ID" ] && [ "$INSTANCE_ID" != "" ]; then
        log "Destroying Vast.ai instance $INSTANCE_ID..."
        vastai destroy instance "$INSTANCE_ID" --yes 2>/dev/null || true
        log_success "Instance destroyed"
    fi
    # Kill SSH tunnel
    if [ -n "$SSH_PID" ] && [ "$SSH_PID" != "" ]; then
        kill "$SSH_PID" 2>/dev/null || true
    fi
}
trap cleanup EXIT

# Find cheapest RTX 4090 offer
find_offers() {
    log "Searching for cheapest RTX 4090 offers..."
    OFFER_ID=$(vastai search offers 'gpu_name=RTX_4090 num_gpus=1' --limit 10 --raw 2>/dev/null | \
        python3 -c "
import json, sys
data = json.load(sys.stdin)
if data:
    # Sort by price
    data.sort(key=lambda x: x.get('dph_total', 999))
    print(data[0]['id'])
")
    if [ -z "$OFFER_ID" ]; then
        log_error "No offers found"
        exit 1
    fi
    log_success "Found offer: $OFFER_ID"
}

# Create instance
create_instance() {
    log "Creating Vast.ai instance..."
    INSTANCE_RESULT=$(vastai create instance "$OFFER_ID" \
        --image pytorch/pytorch:2.1.0-cuda11.8-cudnn8-runtime \
        --disk 20 \
        --ssh \
        --direct \
        --onstart "$SCRIPT_DIR/vast-startup.sh" \
        2>&1)
    
    # Write to temp file to avoid shell quoting issues
    TEMP_FILE=$(mktemp)
    echo "$INSTANCE_RESULT" > "$TEMP_FILE"
    
    INSTANCE_ID=$(python3 -c "
import json, sys, re
try:
    with open('$TEMP_FILE', 'r') as f:
        data = json.load(f)
    print(data.get('new_contract', ''))
except:
    with open('$TEMP_FILE', 'r') as f:
        output = f.read()
    match = re.search(r'new_contract[\":\'\s]+(\d+)', output)
    if match:
        print(match.group(1))
    else:
        print('')
")
    
    rm -f "$TEMP_FILE"
    
    log "Raw output: $INSTANCE_RESULT"
    log "Debug: INSTANCE_RESULT length: ${#INSTANCE_RESULT}"
    
    if [ -z "$INSTANCE_ID" ]; then
        log_error "Failed to create instance"
        exit 1
    fi
    log_success "Instance created: $INSTANCE_ID"
}

# Wait for instance to be ready
wait_for_instance() {
    log "Waiting for instance to start..."
    MAX_WAIT=600  # 10 minutes
    ELAPSED=0
    
    while [ $ELAPSED -lt $MAX_WAIT ]; do
        STATUS=$(vastai show instances --raw 2>/dev/null | python3 -c "import json, sys; data = json.load(sys.stdin); print(data[0].get('cur_state', 'unknown') if data else 'unknown')" 2>/dev/null)
        
        if [ "$STATUS" = "running" ]; then
            log_success "Instance is running"
            return 0
        fi
        
        sleep 10
        ELAPSED=$((ELAPSED + 10))
        log "Waiting... ($ELAPSED/${MAX_WAIT}s, status: $STATUS)"
    done
    
    log_error "Instance failed to start within ${MAX_WAIT}s"
    exit 1
}

# Get instance details
get_instance_details() {
    log "Getting instance details..."
    INSTANCE_DATA=$(vastai show instances --raw 2>/dev/null)
    
    PUBLIC_IP=$(echo "$INSTANCE_DATA" | python3 -c "import json, sys; print(json.load(sys.stdin)[0].get('public_ipaddr', ''))")
    SSH_HOST=$(echo "$INSTANCE_DATA" | python3 -c "import json, sys; print(json.load(sys.stdin)[0].get('ssh_host', ''))")
    SSH_PORT=$(echo "$INSTANCE_DATA" | python3 -c "import json, sys; print(json.load(sys.stdin)[0].get('ssh_port', ''))")
    
    if [ -z "$PUBLIC_IP" ] || [ -z "$SSH_HOST" ] || [ -z "$SSH_PORT" ]; then
        log_error "Failed to get instance details"
        exit 1
    fi
    
    log_success "Instance details: IP=$PUBLIC_IP, SSH=$SSH_HOST:$SSH_PORT"
}

# Setup direct port access
setup_direct_port() {
    log "Setting up direct port access..."
    
    # Get direct port
    DIRECT_PORT=$(vastai show instances --raw 2>/dev/null | python3 -c "import json, sys; print(json.load(sys.stdin)[0].get('direct_port_start', ''))")
    
    if [ -z "$DIRECT_PORT" ]; then
        log_error "Failed to get direct port"
        exit 1
    fi
    
    log_success "Direct port: $DIRECT_PORT"
    
    # Wait for embedding service to be ready
    MAX_WAIT=600  # 10 minutes
    ELAPSED=0
    
    while [ $ELAPSED -lt $MAX_WAIT ]; do
        if curl -s --connect-timeout 5 "http://$PUBLIC_IP:$DIRECT_PORT/v1/models" >/dev/null 2>&1; then
            log_success "Embedding service ready on http://$PUBLIC_IP:$DIRECT_PORT"
            EMBEDDING_URL="http://$PUBLIC_IP:$DIRECT_PORT/v1"
            return 0
        fi
        
        sleep 10
        ELAPSED=$((ELAPSED + 10))
        log "Waiting for embedding service... ($ELAPSED/${MAX_WAIT}s)"
    done
    
    log_error "Embedding service failed to start within ${MAX_WAIT}s"
    exit 1
}

# Run embeddings
run_embeddings() {
    log "Running QMD embeddings..."
    
    # Update mem0 config to use direct URL
    sed -i '' "s|api_base:.*|api_base: $EMBEDDING_URL|" "$SCRIPT_DIR/mem0-config.yaml"
    
    # Run qmd embed
    if command -v qmd >/dev/null 2>&1; then
        qmd embed -f 2>&1 | tee -a "$LOG_FILE"
        log_success "QMD embeddings complete"
    else
        log_warn "QMD not found, skipping"
    fi
    
    # Test mem0
    log "Testing mem0 embedding..."
    curl -s -X POST http://localhost:3201/v1/memories \
        -H "Content-Type: application/json" \
        -d '{"messages": [{"role": "user", "content": "Batch embedding test"}], "user_id": "batch-test"}' \
        2>/dev/null | python3 -c "import json, sys; print('✓ mem0 test passed' if json.load(sys.stdin) else '✗ mem0 test failed')" 2>/dev/null || log_warn "mem0 not available"
    
    log_success "Embedding URL: $EMBEDDING_URL"
}

# Auto-destroy instance after completion
auto_destroy() {
    log "Auto-destroying instance $INSTANCE_ID in 60 seconds..."
    sleep 60
    if [ -n "$INSTANCE_ID" ] && [ "$INSTANCE_ID" != "" ]; then
        log "Destroying Vast.ai instance $INSTANCE_ID..."
        vastai destroy instance "$INSTANCE_ID" --yes 2>/dev/null || true
        log_success "Instance destroyed"
    fi
}

# Main
main() {
    log "=== Batch Embedding Runner ==="
    log "Starting at $(date)"
    
    find_offers
    create_instance
    wait_for_instance
    get_instance_details
    setup_direct_port
    run_embeddings
    auto_destroy
    
    log "=== Batch Complete ==="
}

main "$@"
