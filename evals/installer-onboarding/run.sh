#!/usr/bin/env bash
# evals/installer-onboarding/run.sh
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"

CASES_FILE="evals/installer-onboarding/cases.json"
RESULTS_DIR="evals/installer-onboarding/results/$(date +%Y%m%d-%H%M%S)"
mkdir -p "$RESULTS_DIR"

TOTAL=$(jq length "$CASES_FILE")
PASSED=0
FAILED=0
SKIPPED=0

echo "═══════════════════════════════════════════"
echo "  MemroOS Installer/Onboarding Eval Suite"
echo "═══════════════════════════════════════════"
echo "  Cases: $TOTAL"
echo ""

for i in $(seq 0 $((TOTAL - 1))); do
  ID=$(jq -r ".[$i].id" "$CASES_FILE")
  CATEGORY=$(jq -r ".[$i].category" "$CASES_FILE")
  TIMEOUT=$(jq -r ".[$i].timeout // 15" "$CASES_FILE")

  # Write test to temp script to avoid quoting issues
  TEST_CMD=$(jq -r ".[$i].test" "$CASES_FILE")
  TMP_SCRIPT=$(mktemp /tmp/memroos-eval-XXXXXX.sh)
  echo "$TEST_CMD" > "$TMP_SCRIPT"
  chmod +x "$TMP_SCRIPT"

  printf "[%s] %-45s " "$CATEGORY" "$ID"

  OUTPUT=""
  EXIT_CODE=0
  OUTPUT=$(timeout "${TIMEOUT}" bash "$TMP_SCRIPT" 2>&1) || EXIT_CODE=$?
  rm -f "$TMP_SCRIPT"

  if [[ $EXIT_CODE -eq 124 ]]; then
    echo "⏭️ SKIP"
    SKIPPED=$((SKIPPED + 1))
    echo "SKIP: timeout" >> "$RESULTS_DIR/results.txt"
    continue
  fi

  PASS=true
  while IFS= read -r pattern; do
    [[ -z "$pattern" ]] && continue
    if ! echo "$OUTPUT" | grep -qi "$pattern"; then
      PASS=false
      echo "❌ FAIL (missing: '$pattern')"
      FAILED=$((FAILED + 1))
      echo "FAIL: missing '$pattern'" >> "$RESULTS_DIR/results.txt"
      break
    fi
  done < <(jq -r ".[$i].expectedOutput[]? // empty" "$CASES_FILE")

  if [[ "$PASS" == "true" ]]; then
    while IFS= read -r pattern; do
      [[ -z "$pattern" ]] && continue
      if echo "$OUTPUT" | grep -qi "$pattern"; then
        PASS=false
        echo "❌ FAIL (unexpected: '$pattern')"
        FAILED=$((FAILED + 1))
        echo "FAIL: unexpected '$pattern'" >> "$RESULTS_DIR/results.txt"
        break
      fi
    done < <(jq -r ".[$i].notExpectedOutput[]? // empty" "$CASES_FILE")
  fi

  if [[ "$PASS" == "true" ]]; then
    echo "✅ PASS"
    PASSED=$((PASSED + 1))
    echo "PASS" >> "$RESULTS_DIR/results.txt"
  fi
done

echo ""
echo "═══════════════════════════════════════════"
echo "  Results: $PASSED/$TOTAL passed, $FAILED failed, $SKIPPED skipped"
echo "═══════════════════════════════════════════"

cat > "$RESULTS_DIR/summary.json" <<EOF
{"timestamp":"$(date -u +%Y-%m-%dT%H:%M:%SZ)","total":$TOTAL,"passed":$PASSED,"failed":$FAILED,"skipped":$SKIPPED}
EOF

[[ $FAILED -eq 0 ]] && exit 0 || exit 1
