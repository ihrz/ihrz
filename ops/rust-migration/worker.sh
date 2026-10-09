#!/usr/bin/env bash
# ihrz Rust migration — single-task worker.
# Runs ONE queue task inside an isolated git worktree + branch, then reports.
#
# Usage: worker.sh <task-id>
#
# Protocol:
#   1. task must already be claimed (status=running, owner set) by coordinator.
#   2. creates (or reuses, after orphan check) worktree .worktrees/<id>,
#      branch wt/<id> based on MIGRATION_BRANCH.
#   3. dispatches by task type:
#        implement -> `opencode run --agent rust-migrator` (one unit, no commit)
#        test      -> diagnose + add regression tests (opencode rust-tester)
#        review    -> `opencode run --agent rust-reviewer` (read-only verdict)
#        integrate -> runs integrate.sh (coordinator usually does this inline)
#        inventory -> runs inventory.sh (coordinator usually does this inline)
#   4. validates inside the worktree (fmt --check, check, test).
#   5. writes result.json in the worktree dir + updates queue via mq.py.
#      NEVER commits, pushes, merges, or touches the main tree.
set -u
# Keep inherited PATH first (tests inject mock toolchains; systemd gets a
# minimal PATH) then pin the tool dirs this orchestration depends on.
export PATH="$PATH:$HOME/.bun/bin:$HOME/.local/bin:$HOME/.cargo/bin:/run/current-system/sw/bin:/usr/bin:/bin"
OPENCODE_BIN="$(command -v opencode || echo "$HOME/.bun/bin/opencode")"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck disable=SC1091
[ -f "$SCRIPT_DIR/coordinator.conf" ] && . "$SCRIPT_DIR/coordinator.conf"

REPO="${MIGRATION_REPO_ROOT:-$(cd "$SCRIPT_DIR/../.." && pwd)}"
BRANCH="${MIGRATION_BRANCH:-rust-recode}"
AGENT="${MIGRATION_AGENT:-rust-migrator}"
REVIEW_AGENT="${MIGRATION_REVIEW_AGENT:-rust-reviewer}"
TEST_AGENT="${MIGRATION_TEST_AGENT:-rust-tester}"
MODEL="${MIGRATION_MODEL:-}"
MQ="$SCRIPT_DIR/mq.py"

TASK_ID="${1:?usage: worker.sh <task-id>}"
WT_DIR="$REPO/.worktrees/$TASK_ID"
WT_BRANCH="wt/$TASK_ID"
RESULT_FILE="$SCRIPT_DIR/workers/$TASK_ID.result.json"
LOG_FILE="$SCRIPT_DIR/logs/workers/$TASK_ID.log"

mkdir -p "$SCRIPT_DIR/logs/workers" "$SCRIPT_DIR/workers"

log() { printf '%s [worker %s] %s\n' "$(date -u '+%Y-%m-%dT%H:%M:%SZ')" "$TASK_ID" "$*" | tee -a "$LOG_FILE"; }
heartbeat() { python3 "$MQ" heartbeat "$TASK_ID" --pid "$$" >/dev/null 2>&1 || true; }
fail() { # fail <message>: record retry-or-block + exit 1
  log "FAILED: $1"
  python3 "$MQ" retry-or-block "$TASK_ID" --error "$1" >/dev/null 2>&1 || true
  printf '{"task":"%s","status":"failed","error":%s}\n' "$TASK_ID" "$(printf '%s' "$1" | python3 -c 'import json,sys;print(json.dumps(sys.stdin.read()))')" > "$RESULT_FILE"
  exit 1
}

TASK_TYPE="$(python3 "$MQ" get "$TASK_ID" type 2>/dev/null || echo '')"
TASK_TIMEOUT="$(python3 "$MQ" get "$TASK_ID" timeout_sec 2>/dev/null || echo '')"
[ -z "$TASK_TYPE" ] && { echo "worker: unknown task $TASK_ID" >&2; exit 2; }
[ -z "$TASK_TIMEOUT" ] || [ "$TASK_TIMEOUT" = "0" ] && TASK_TIMEOUT="${MIGRATION_WORKER_TIMEOUT:-3600}"

log "start type=$TASK_TYPE timeout=${TASK_TIMEOUT}s"
heartbeat

# --- worktree setup (implement/test/review types) ---------------------------
setup_worktree() {
  cd "$REPO" || exit 2
  if [ -d "$WT_DIR" ]; then
    # Orphaned worktree from a previous attempt: keep the diff for diagnosis
    # on first sight, reuse only if it still points at our branch.
    if git worktree list --porcelain | grep -q "worktree $WT_DIR"; then
      existing_branch="$(git -C "$WT_DIR" branch --show-current 2>/dev/null || true)"
      if [ "$existing_branch" = "$WT_BRANCH" ]; then
        log "reusing existing worktree (branch $WT_BRANCH)"
      else
        fail "orphaned worktree $WT_DIR on unexpected branch '$existing_branch' — preserved for manual triage, not touching it"
      fi
    else
      fail "stale worktree dir $WT_DIR not registered with git — preserved for manual triage"
    fi
  else
    git fetch origin "$BRANCH" >/dev/null 2>&1 || true
    if ! git worktree add -b "$WT_BRANCH" "$WT_DIR" "$BRANCH" >>"$LOG_FILE" 2>&1; then
      # Branch may exist from a previous run: attach to it.
      git worktree add "$WT_DIR" "$WT_BRANCH" >>"$LOG_FILE" 2>&1 || \
        fail "cannot create worktree $WT_DIR (branch $WT_BRANCH)"
      log "attached to existing branch $WT_BRANCH"
    fi
    log "worktree ready: $WT_DIR"
  fi
  python3 "$MQ" set "$TASK_ID" worktree "$WT_DIR" >/dev/null 2>&1 || true
  python3 "$MQ" set "$TASK_ID" branch "$WT_BRANCH" >/dev/null 2>&1 || true
}

run_opencode() { # run_opencode <agent> <prompt> — heartbeat while it runs
  local agent="$1" prompt="$2"
  local args=(run --agent "$agent" --auto)
  [ -n "$MODEL" ] && [ "$agent" = "$AGENT" ] && args+=(--model "$MODEL")
  heartbeat
  timeout "$TASK_TIMEOUT" "$OPENCODE_BIN" "${args[@]}" "$prompt" >>"$LOG_FILE" 2>&1 &
  local pid=$!
  while kill -0 "$pid" 2>/dev/null; do
    heartbeat
    sleep 60
  done
  wait "$pid"
}

validate_tree() { # validate_tree <dir> — fmt + check + test, returns 0/1
  local dir="$1"
  cd "$dir/rust" || return 1
  log "validate: cargo fmt --check"
  cargo fmt --all -- --check >>"$LOG_FILE" 2>&1 || return 1
  log "validate: cargo check --workspace"
  timeout 900 cargo check --workspace >>"$LOG_FILE" 2>&1 || return 1
  log "validate: cargo test --workspace"
  timeout 1800 cargo test --workspace >>"$LOG_FILE" 2>&1 || return 1
  return 0
}

collect_test_counts() { # collect_test_counts <dir>
  local dir="$1" passed=0 failed=0 line
  line="$(grep -h '^test result:' "$LOG_FILE" 2>/dev/null | awk -F'[.;] ' '{p+=$2; f+=$3} END {print p+0" "f+0}')"
  passed="$(echo "$line" | cut -d' ' -f1)"
  failed="$(echo "$line" | cut -d' ' -f2)"
  # Fallback: cargo exposes per-suite lines like "test result: ok. 354 passed"
  if [ "$passed" = "0" ] && [ "$failed" = "0" ]; then
    passed="$(grep -hoE '[0-9]+ passed' "$LOG_FILE" 2>/dev/null | awk '{s+=$1} END {print s+0}')"
    failed="$(grep -hoE '[0-9]+ failed' "$LOG_FILE" 2>/dev/null | awk '{s+=$1} END {print s+0}')"
  fi
  python3 "$MQ" set "$TASK_ID" tests "{\"passed\": ${passed:-0}, \"failed\": ${failed:-0}, \"note\": \"worktree validation\"}" >/dev/null 2>&1 || true
  echo "$passed/$failed"
}

task_field() { python3 "$MQ" get "$TASK_ID" "$1" 2>/dev/null; }

# --- implement ---------------------------------------------------------------
do_implement() {
  setup_worktree
  local title desc accept
  title="$(task_field title)"; desc="$(task_field description)"; accept="$(task_field acceptance)"
  local prompt="Continue the autonomous TypeScript-to-Rust migration in this repo worktree (base branch $BRANCH, task $TASK_ID). Mandatory rules: .opencode/rust-migrator.md. Your ONE unit: TITLE: $title. DETAILS: $desc. ACCEPTANCE: $accept. Steps: 1) read the TS original(s) in scope, 2) implement the Rust equivalent under rust/, 3) cargo fmt, cargo check --workspace, cargo test --workspace, fix failures, 4) report DONE/FAILED + files changed + test counts. Scope discipline: ONLY modify files under the task scope; do not touch MIGRATION.md, ops/, or unrelated modules. Never commit. Never push. Stop after this ONE unit."
  if ! run_opencode "$AGENT" "$prompt"; then
    collect_test_counts "$WT_DIR" >/dev/null
    fail "opencode worker exited non-zero or timed out"
  fi
  counts="$(collect_test_counts "$WT_DIR")"
  log "worker finished, worktree tests passed/failed=$counts"
  if ! validate_tree "$WT_DIR"; then
    fail "worktree validation failed (tests $counts)"
  fi
  log "worktree validation green (tests $counts), awaiting review"
  printf '{"task":"%s","status":"needs-review","tests":"%s"}\n' "$TASK_ID" "$counts" > "$RESULT_FILE"
  python3 "$MQ" set "$TASK_ID" status '"needs-review"' >/dev/null 2>&1 || true
}

# --- review ------------------------------------------------------------------
do_review() {
  # Review target: the implement task named in depends_on[0]; the review
  # worker inspects that task's worktree diff read-only.
  local target
  target="$(python3 -c "import json,subprocess;print((json.loads(subprocess.run(['python3','$MQ','get','$TASK_ID'],capture_output=True,text=True).stdout).get('depends_on') or [''])[0])")"
  [ -z "$target" ] && fail "review task has no depends_on target"
  local target_wt="$REPO/.worktrees/$target"
  [ -d "$target_wt" ] || fail "target worktree $target_wt missing"
  local prompt="You are the Rust migration reviewer (.opencode/rust-reviewer.md, READ-ONLY, never modify files). Review task $target for migration task $TASK_ID. Worktree: $target_wt. Base branch: $BRANCH. 1) git -C $target_wt diff $BRANCH -- rust/ to see the change, 2) read each TS original in scope, 3) compare behavior. End your report with exactly one line: VERDICT: PASS or VERDICT: FAIL + findings ordered CRITICAL/HIGH/MEDIUM/LOW."
  if ! run_opencode "$REVIEW_AGENT" "$prompt"; then
    fail "reviewer agent failed to run"
  fi
  local verdict
  verdict="$(grep -hoE 'VERDICT: (PASS|FAIL)' "$LOG_FILE" 2>/dev/null | tail -1 | awk '{print $2}')"
  [ -z "$verdict" ] && verdict="FAIL"
  python3 "$MQ" set "$TASK_ID" review "{\"verdict\": \"${verdict,,}\", \"findings\": \"see logs/workers/$TASK_ID.log\", \"reviewer\": \"$REVIEW_AGENT\"}" >/dev/null 2>&1 || true
  if [ "$verdict" = "PASS" ]; then
    log "review PASS"
    printf '{"task":"%s","status":"review-pass","target":"%s"}\n' "$TASK_ID" "$target" > "$RESULT_FILE"
    python3 "$MQ" complete "$TASK_ID" --status done --result "review pass for $target" >/dev/null 2>&1 || true
    # Record the pass on the implement task too (gates its completion).
    python3 "$MQ" set "$target" review "{\"verdict\": \"pass\", \"findings\": \"see logs/workers/$TASK_ID.log\", \"reviewer\": \"$REVIEW_AGENT\"}" >/dev/null 2>&1 || true
  else
    log "review FAIL — implement task $target goes back for rework, nothing auto-completed"
    printf '{"task":"%s","status":"review-fail","target":"%s"}\n' "$TASK_ID" "$target" > "$RESULT_FILE"
    python3 "$MQ" complete "$TASK_ID" --status done --result "review fail for $target (see worker log)" >/dev/null 2>&1 || true
    python3 "$MQ" set "$target" review "{\"verdict\": \"fail\", \"findings\": \"see logs/workers/$TASK_ID.log\", \"reviewer\": \"$REVIEW_AGENT\"}" >/dev/null 2>&1 || true
    python3 "$MQ" set "$target" status '"review-failed"' >/dev/null 2>&1 || true
  fi
}

# --- test (diagnose + regression) --------------------------------------------
do_test() {
  setup_worktree
  local title desc
  title="$(task_field title)"; desc="$(task_field description)"
  local prompt="You are the autonomous Rust tester (.opencode/rust-tester.md). Task $TASK_ID in this worktree (base $BRANCH). GOAL: TITLE: $title. DETAILS: $desc. 1) git status/diff, 2) cargo fmt, cargo check --workspace, targeted cargo tests, 3) fix failures (preserve TS behavior — inspect src/ originals), 4) ADD a regression test covering the failure, 5) report DONE/FAILED + files changed + test counts. Scope discipline: only the task scope. Never commit. Never push."
  if ! run_opencode "$TEST_AGENT" "$prompt"; then
    collect_test_counts "$WT_DIR" >/dev/null
    fail "tester worker exited non-zero or timed out"
  fi
  counts="$(collect_test_counts "$WT_DIR")"
  if ! validate_tree "$WT_DIR"; then
    fail "tester worktree validation failed (tests $counts)"
  fi
  log "tester validation green (tests $counts), awaiting review"
  printf '{"task":"%s","status":"needs-review","tests":"%s"}\n' "$TASK_ID" "$counts" > "$RESULT_FILE"
  python3 "$MQ" set "$TASK_ID" status '"needs-review"' >/dev/null 2>&1 || true
}

case "$TASK_TYPE" in
  implement) do_implement ;;
  review)    do_review ;;
  test)      do_test ;;
  integrate) exec "$SCRIPT_DIR/integrate.sh" "$TASK_ID" ;;
  inventory) exec "$SCRIPT_DIR/inventory.sh" --task "$TASK_ID" ;;
  *) echo "worker: unknown task type $TASK_TYPE" >&2; exit 2 ;;
esac
log "done"
