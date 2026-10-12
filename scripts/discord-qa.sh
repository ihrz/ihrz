#!/usr/bin/env bash
# discord-qa.sh — single QA launcher for the iHorizon bot tree.
#
# Usage:
#   ./scripts/discord-qa.sh --functional   Rust unit suite + parity comparators + licence check
#   ./scripts/discord-qa.sh --security     pytest secret/gate scan (no live Discord)
#   ./scripts/discord-qa.sh --load          local load harness (explicit only, capped, in-process)
#   ./scripts/discord-qa.sh --all           functional + security (+ load only with QA_LOAD=1)
#
# Never touches a live Discord guild. Reports go to qa-reports/QA-<ts>.md.
# Exit non-zero on any failure.
set -u
cd "$(dirname "$0")/.."

MODE="${1:---all}"
TS="$(date -u +%Y%m%dT%H%M%SZ)"
REPORT="qa-reports/QA-${TS}.md"
mkdir -p qa-reports
PASS=0; FAIL=0; SKIP=0
LOG="$(mktemp)"

section() { echo -e "\n## $1" | tee -a "$LOG"; }
record() { # record <name> <status> <detail>
  echo "- [$2] $1 — $3" | tee -a "$LOG"
  case "$2" in PASS) PASS=$((PASS+1));; FAIL) FAIL=$((FAIL+1));; SKIP) SKIP=$((SKIP+1));; esac
}

prereqs() {
  local ok=1
  for c in cargo bun python3; do command -v "$c" >/dev/null 2>&1 || { echo "missing: $c"; ok=0; }; done
  python3 -c "import pytest" 2>/dev/null || { echo "missing: pytest (pip install pytest)"; ok=0; }
  [ "$ok" = 1 ]
}

functional() {
  section "Functional"
  local out
  out="$(cd rust && cargo test 2>&1 | grep -E "test result:|FAILED|^error" | head -n 8)"
  echo "$out" | tee -a "$LOG"
  if echo "$out" | grep -qE "0 failed" && ! echo "$out" | grep -q "^error"; then
    record "cargo test (Rust suite)" PASS "$(echo "$out" | grep -oE "[0-9]+ passed" | head -n 1)"
  else
    record "cargo test (Rust suite)" FAIL "see log"
  fi
  for tool in ParityCompare SerialParity; do
    out="$(bun run "tools/${tool}.ts" 2>&1 | tail -n 2)"
    echo "$out" | tee -a "$LOG"
    if echo "$out" | grep -qE "divergent=0 .* (ts_only=0 rust_only=0|rust_only=0)|match=[0-9]+ divergent=0" && ! echo "$out" | grep -qE "divergent=[1-9]|ts_only=[1-9]|rust_only=[1-9]"; then
      record "$tool" PASS "$(echo "$out" | tail -n 1)"
    else
      record "$tool" FAIL "$(echo "$out" | tail -n 1)"
    fi
  done
  if bun run check:licence 2>&1 | tail -n 3 | tee -a "$LOG" | grep -qiE "error|missing|invalid"; then
    record "check:licence" FAIL "see log"
  else
    record "check:licence" PASS "headers ok"
  fi
}

security() {
  section "Security"
  local out
  out="$(python3 -m pytest qa/test_security.py -q 2>&1 | tail -n 5)"
  echo "$out" | tee -a "$LOG"
  if echo "$out" | grep -qE "passed"; then
    record "pytest qa/test_security.py" PASS "$(echo "$out" | grep -oE "[0-9]+ passed.*")"
  else
    record "pytest qa/test_security.py" FAIL "see log"
  fi
}

load() {
  section "Load (local, capped)"
  local n="${QA_LOAD_N:-2000}"
  local out
  out="$(cd rust && QA_LOAD_N="$n" cargo test qa_load -- --nocapture 2>&1 | grep -E "qa_load|test result:|^error" | head -n 12)"
  echo "$out" | tee -a "$LOG"
  if echo "$out" | grep -qE "0 failed" && ! echo "$out" | grep -q "^error"; then
    record "cargo test qa_load (N=$n)" PASS "ceilings held"
  else
    record "cargo test qa_load (N=$n)" FAIL "see log"
  fi
}

prereqs || { echo "prereqs missing"; exit 2; }
echo "# QA report — $TS" > "$LOG"
echo "env: $(uname -srm), $(cargo --version), $(bun --version), $(python3 --version)" >> "$LOG"

case "$MODE" in
  --functional) functional;;
  --security) security;;
  --load) load;;
  --all) functional; security; [ "${QA_LOAD:-0}" = 1 ] && load || record "load (opt-in, QA_LOAD=1)" SKIP "not requested";;
  *) echo "usage: $0 [--functional|--security|--load|--all]"; exit 2;;
esac

section "Summary"
echo "PASS=$PASS FAIL=$FAIL SKIP=$SKIP" | tee -a "$LOG"
cp "$LOG" "$REPORT"
echo "report: $REPORT"
[ "$FAIL" = 0 ]
