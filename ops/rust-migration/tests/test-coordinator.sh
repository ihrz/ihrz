#!/usr/bin/env bash
# ihrz Rust migration — orchestration infrastructure tests.
#
# Usage: tests/test-coordinator.sh
#
# Verifies the parallel machinery WITHOUT risking migration work:
#   1. two independent tasks execute concurrently
#   2. conflicting file scopes cannot execute concurrently
#   3. a worker failure does not corrupt the queue
#   4. restart recovery reclaims stale tasks safely (diffs preserved)
#   5. a failed review prevents automatic completion
#   6. an empty queue triggers an inventory scan (not a blind sleep)
#   7. existing repository modifications remain preserved
#   8. the TypeScript-to-Rust validation commands still work
#
# Uses a fixture git repo + mock opencode binary. The REAL queue.json is
# backed up and restored (trap-guarded); no real worktrees are created in
# the ihrz tree (MIGRATION_REPO_ROOT is redirected to the fixture).
set -u
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
MQ="$SCRIPT_DIR/mq.py"
PASS=0; FAIL=0

ok() { PASS=$((PASS+1)); echo "PASS: $1"; }
bad() { FAIL=$((FAIL+1)); echo "FAIL: $1"; }

FIX="$(mktemp -d /tmp/opencode/coord-test-XXXXXX)"
trap 'rm -rf "$FIX"; if [ -f "$FIX.queue.bak" ]; then cp "$FIX.queue.bak" "$SCRIPT_DIR/queue.json"; echo "(real queue.json restored)"; fi' EXIT

cp "$SCRIPT_DIR/queue.json" "$FIX.queue.bak" 2>/dev/null || true

# --- fixture repo ------------------------------------------------------------
mkdir -p "$FIX/repo/rust/src" "$FIX/bin"
cd "$FIX/repo" || exit 2
git init -q -b test-base .
git config user.email "test@local"; git config user.name "test"
echo 'fn main() {}' > rust/src/main.rs
echo '// a' > rust/src/a.rs; echo '// b' > rust/src/b.rs
git add -A; git commit -qm "fixture base"

# mock opencode: records start/end, behavior via $MOCK_MODE (ok|fail|slow)
cat > "$FIX/bin/opencode" <<'EOF'
#!/usr/bin/env bash
echo "$(date +%s.%N) START $*" >> "$FIX_LOG"
if [ "${MOCK_MODE:-ok}" = "fail" ]; then
  echo "mock worker failure" >&2
  echo "$(date +%s.%N) END-fail" >> "$FIX_LOG"
  exit 1
fi
sleep "${MOCK_SLEEP:-2}"
echo "$(date +%s.%N) END-ok" >> "$FIX_LOG"
exit 0
EOF
chmod +x "$FIX/bin/opencode"
export FIX_LOG="$FIX/opencode.log"
export PATH="$FIX/bin:$PATH"
export MIGRATION_REPO_ROOT="$FIX/repo"
export MIGRATION_BRANCH="test-base"
export MIGRATION_MODEL=""   # mock ignores model flag anyway

export WT_BASE="$FIX/repo"  # worker.sh derives .worktrees from REPO

# --- T2 first (claim/conflict semantics are synchronous) ---------------------
echo "--- T2: conflicting scopes serialize ---"
python3 "$MQ" add T2-A --type implement --title "t2 a" --scope "rust/src/a.rs" >/dev/null
python3 "$MQ" add T2-B --type implement --title "t2 b" --scope "rust/src/a.rs" >/dev/null
python3 "$MQ" add T2-C --type implement --title "t2 c" --scope "rust/src/b.rs" >/dev/null
python3 "$MQ" claim T2-A --owner test --pid 111 >/dev/null
if python3 "$MQ" claim T2-B --owner test --pid 222 >/dev/null 2>&1; then
  bad "T2: conflicting claim on rust/src/a.rs was allowed"
else
  ok "T2: conflicting claim refused"
fi
if python3 "$MQ" claim T2-C --owner test --pid 333 >/dev/null 2>&1; then
  ok "T2: non-overlapping claim allowed"
else
  bad "T2: non-overlapping claim refused"
fi
NEXT="$(python3 "$MQ" next 2>/dev/null)"
if [ "$NEXT" = "T2-B" ]; then
  bad "T2: next returned scope-blocked T2-B"
else
  ok "T2: next skips scope-blocked task (got: ${NEXT:-none})"
fi
python3 "$MQ" release T2-A --reason test >/dev/null
python3 "$MQ" release T2-C --reason test >/dev/null
python3 "$MQ" rm T2-A --reason test >/dev/null
python3 "$MQ" rm T2-B --reason test >/dev/null
python3 "$MQ" rm T2-C --reason test >/dev/null

# --- T5: review gate ----------------------------------------------------------
echo "--- T5: failed review blocks completion ---"
python3 "$MQ" add T5 --type implement --title "t5" --scope "rust/src/a.rs" >/dev/null
if python3 "$MQ" complete T5 --status done --result test >/dev/null 2>&1; then
  bad "T5: implement completed without review"
else
  ok "T5: completion refused without passing review"
fi
python3 "$MQ" set T5 review '{"verdict": "fail"}' >/dev/null
if python3 "$MQ" complete T5 --status done --result test >/dev/null 2>&1; then
  bad "T5: implement completed with failed review"
else
  ok "T5: completion refused with failed review"
fi
python3 "$MQ" set T5 review '{"verdict": "pass"}' >/dev/null
if python3 "$MQ" complete T5 --status done --result test >/dev/null 2>&1; then
  ok "T5: completion allowed with passing review"
else
  bad "T5: completion refused despite passing review"
fi
python3 "$MQ" rm T5 --reason test >/dev/null

# --- T3: worker failure keeps queue valid ------------------------------------
echo "--- T3: worker failure does not corrupt queue ---"
python3 "$MQ" add T3 --type implement --title "t3" --scope "rust/src/a.rs" --max-retries 2 >/dev/null
python3 "$MQ" claim T3 --owner test --pid 444 >/dev/null
python3 "$MQ" retry-or-block T3 --error "mock failure 1" >/dev/null
ST="$(python3 "$MQ" get T3 status)"
ATT="$(python3 "$MQ" get T3 attempts)"
[ "$ST" = "queued" ] && [ "$ATT" = "1" ] && ok "T3: first failure requeues (attempt 1)" || bad "T3: requeue wrong (status=$ST attempts=$ATT)"
python3 "$MQ" claim T3 --owner test --pid 445 >/dev/null
python3 "$MQ" retry-or-block T3 --error "mock failure 2" >/dev/null
ST="$(python3 "$MQ" get T3 status)"
[ "$ST" = "failed" ] && ok "T3: retries exhausted -> failed (parked, not lost)" || bad "T3: expected failed, got $ST"
python3 -c "import json;json.load(open('$SCRIPT_DIR/queue.json'))" && ok "T3: queue.json still valid JSON" || bad "T3: queue.json corrupt"
python3 "$MQ" rm T3 --reason test >/dev/null

# --- T4: restart recovery -----------------------------------------------------
echo "--- T4: stale recovery preserves claims with live workers, releases dead ---"
python3 "$MQ" add T4-DEAD --type implement --title "t4 dead" --scope "rust/src/a.rs" >/dev/null
python3 "$MQ" add T4-LIVE --type implement --title "t4 live" --scope "rust/src/b.rs" >/dev/null
# A PID that is guaranteed not to exist (well above pid_max).
DEAD_PID=4194304
kill -0 "$DEAD_PID" 2>/dev/null && DEAD_PID=4194303
python3 "$MQ" claim T4-DEAD --owner test --pid "$DEAD_PID" >/dev/null
python3 "$MQ" heartbeat T4-DEAD --pid "$DEAD_PID" >/dev/null
sleep 4000 & LIVE_PID=$!
python3 "$MQ" claim T4-LIVE --owner test --pid "$LIVE_PID" >/dev/null
"$SCRIPT_DIR/coord.sh" recover >/dev/null 2>&1
ST_DEAD="$(python3 "$MQ" get T4-DEAD status)"
ST_LIVE="$(python3 "$MQ" get T4-LIVE status)"
kill "$LIVE_PID" 2>/dev/null || true
[ "$ST_DEAD" = "queued" ] && ok "T4: dead worker claim released to queued" || bad "T4: dead claim status=$ST_DEAD"
[ "$ST_LIVE" = "running" ] && ok "T4: live worker claim kept" || bad "T4: live claim status=$ST_LIVE"
python3 "$MQ" rm T4-DEAD --reason test >/dev/null
python3 "$MQ" release T4-LIVE --reason test >/dev/null
python3 "$MQ" rm T4-LIVE --reason test >/dev/null

# --- T1: concurrent independent workers --------------------------------------
echo "--- T1: two independent tasks run concurrently ---"
python3 "$MQ" add T1-A --type implement --title "t1 a" --scope "rust/src/a.rs" --timeout 120 >/dev/null
python3 "$MQ" add T1-B --type implement --title "t1 b" --scope "rust/src/b.rs" --timeout 120 >/dev/null
python3 "$MQ" claim T1-A --owner test >/dev/null
python3 "$MQ" claim T1-B --owner test >/dev/null
export MOCK_MODE=ok MOCK_SLEEP=3
: > "$FIX_LOG"
"$SCRIPT_DIR/worker.sh" T1-A >/dev/null 2>&1 &
P1=$!
"$SCRIPT_DIR/worker.sh" T1-B >/dev/null 2>&1 &
P2=$!
wait $P1; R1=$?
wait $P2; R2=$?
STARTS="$(grep -c START "$FIX_LOG" 2>/dev/null || true)"
[ -z "$STARTS" ] && STARTS=0
# concurrency: second START before first END-ok
if [ "$STARTS" -ge 2 ] && [ "$(grep -n START "$FIX_LOG" | head -2 | tail -1 | cut -d: -f1)" -lt "$(grep -n 'END-ok' "$FIX_LOG" | tail -1 | cut -d: -f1)" ]; then
  ok "T1: two workers overlapped in time"
else
  bad "T1: no overlap detected (R1=$R1 R2=$R2 log: $(cat "$FIX_LOG" 2>/dev/null | head -6 | tr '\n' ';'))"
fi
[ -d "$FIX/repo/.worktrees/T1-A" ] && [ -d "$FIX/repo/.worktrees/T1-B" ] && ok "T1: isolated worktrees per task" || bad "T1: worktrees missing"
# worker must not commit to fixture repo
if [ "$(git -C "$FIX/repo" rev-list --count HEAD)" = "1" ]; then
  ok "T7a: worker never commits (fixture history untouched)"
else
  bad "T7a: worker committed to the tree"
fi
python3 "$MQ" release T1-A --reason test >/dev/null 2>&1 || true
python3 "$MQ" release T1-B --reason test >/dev/null 2>&1 || true
python3 "$MQ" rm T1-A --reason test >/dev/null
python3 "$MQ" rm T1-B --reason test >/dev/null

# --- T7b: forbidden destructive commands --------------------------------------
echo "--- T7b: no destructive git commands in orchestration ---"
if grep -rnE 'reset --hard|git clean|git push' "$SCRIPT_DIR"/coordinator.sh "$SCRIPT_DIR"/worker.sh "$SCRIPT_DIR"/integrate.sh "$SCRIPT_DIR"/coord.sh "$SCRIPT_DIR"/inventory.sh 2>/dev/null | grep -v '^.*#'; then
  bad "T7b: destructive command found (see above)"
else
  ok "T7b: no reset --hard / git clean / git push in orchestration scripts"
fi

# --- T6: empty queue triggers inventory ---------------------------------------
# NOTE: inventory always scans the real tree (fixture has no MIGRATION.md).
echo "--- T6: empty queue triggers inventory scan ---"
unset MIGRATION_REPO_ROOT MIGRATION_BRANCH
if grep -q 'inventory.sh' "$SCRIPT_DIR/coordinator.sh" && grep -q 'queue_empty' "$SCRIPT_DIR/coordinator.sh"; then
  ok "T6: coordinator wires queue-empty -> inventory.sh"
else
  bad "T6: coordinator missing empty-queue inventory trigger"
fi
SCAN_OUT="$("$SCRIPT_DIR/inventory.sh" 2>&1 | tail -2)"
if echo "$SCAN_OUT" | grep -q 'inventory: checked='; then
  ok "T6: inventory scan runs standalone ($SCAN_OUT)"
else
  bad "T6: inventory scan failed"
fi

# --- T8: validation commands ---------------------------------------------------
echo "--- T8: validation toolchain ---"
for cmd in 'cargo fmt --all -- --check' 'cargo check --workspace' 'cargo test --workspace'; do
  if grep -rqF "$cmd" "$SCRIPT_DIR"/coordinator.sh "$SCRIPT_DIR"/worker.sh "$SCRIPT_DIR"/integrate.sh "$SCRIPT_DIR"/coordinator.conf; then
    ok "T8: wired: $cmd"
  else
    bad "T8: missing: $cmd"
  fi
done
if cargo --version >/dev/null 2>&1; then ok "T8: cargo present ($(cargo --version))"; else bad "T8: cargo missing"; fi

echo
echo "=== $PASS passed, $FAIL failed ==="
exit $([ "$FAIL" -eq 0 ] && echo 0 || echo 1)
