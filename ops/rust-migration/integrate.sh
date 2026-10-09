#!/usr/bin/env bash
# ihrz Rust migration — explicit integration pipeline for one finished task.
#
# Usage: integrate.sh <task-id>
#
# Steps (never skipped, never reordered):
#   1. verify the task scope (worktree diff touches only declared scope)
#   2. inspect the diff (stat + full diff kept in logs/)
#   3. run relevant tests (worktree validation must already be green; re-run
#      the affected test targets as a sanity check)
#   4. reviewer check (implement tasks need review.verdict=pass on record)
#   5. rebase/merge deliberately (merge --no-ff wt/<id> into MIGRATION_BRANCH)
#   6. run integration validation (fmt --check + check + test in main tree)
#   7. update authoritative inventory + queue (MIGRATION.md log, queue done)
#   8. preserve failed changes (on ANY failure: keep worktree + branch,
#      mark task failed/review-failed, notify — never reset/clean/discard)
#
# Forbidden here: git reset --hard, git clean, automatic reverts, push.
set -u
# Keep inherited PATH first (tests inject mock toolchains; systemd gets a
# minimal PATH) then pin the tool dirs this orchestration depends on.
export PATH="$PATH:$HOME/.bun/bin:$HOME/.local/bin:$HOME/.cargo/bin:/run/current-system/sw/bin:/usr/bin:/bin"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck disable=SC1091
[ -f "$SCRIPT_DIR/coordinator.conf" ] && . "$SCRIPT_DIR/coordinator.conf"

REPO="${MIGRATION_REPO_ROOT:-$(cd "$SCRIPT_DIR/../.." && pwd)}"
BRANCH="${MIGRATION_BRANCH:-rust-recode}"
MQ="$SCRIPT_DIR/mq.py"
TASK_ID="${1:?usage: integrate.sh <task-id>}"
LOG_FILE="$SCRIPT_DIR/logs/integrate-$TASK_ID.log"
mkdir -p "$SCRIPT_DIR/logs"

log() { printf '%s [integrate %s] %s\n' "$(date -u '+%Y-%m-%dT%H:%M:%SZ')" "$TASK_ID" "$*" | tee -a "$LOG_FILE"; }
notify() { "$SCRIPT_DIR/notify.sh" "$@" || true; }

abort_preserve() { # abort_preserve <message>
  log "ABORT (work preserved): $1"
  python3 "$MQ" retry-or-block "$TASK_ID" --error "integrate: $1" >/dev/null 2>&1 || true
  notify fail "Integration of $TASK_ID aborted, work preserved in wt/$TASK_ID: $1"
  exit 1
}

TASK_TYPE="$(python3 "$MQ" get "$TASK_ID" type 2>/dev/null)"
WT_BRANCH="wt/$TASK_ID"
WT_DIR="$REPO/.worktrees/$TASK_ID"

cd "$REPO" || exit 2
log "integrating type=$TASK_TYPE branch=$WT_BRANCH"

# 0. claim as integrating (coordinator normally already did this)
python3 "$MQ" set "$TASK_ID" status '"integrating"' >/dev/null 2>&1 || true

# 1. scope verification -------------------------------------------------------
if [ -d "$WT_DIR" ]; then
  mapfile -t CHANGED < <(git -C "$WT_DIR" diff --name-only "$BRANCH" -- 2>/dev/null || true)
else
  CHANGED=()
fi
if [ "${#CHANGED[@]}" -eq 0 ] && [ "$TASK_TYPE" = "implement" ]; then
  abort_preserve "worktree diff is empty — nothing to integrate"
fi
SCOPE_JSON="$(python3 "$MQ" get "$TASK_ID" scope 2>/dev/null)"
# shellcheck disable=SC2016
OUT_OF_SCOPE="$(printf '%s\n' "${CHANGED[@]}" | python3 -c '
import json,sys
scope = json.loads(sys.argv[1]) or []
def inside(f):
    if not scope: return True
    return any(f == s.rstrip("/") or f.startswith(s.rstrip("/") + "/") for s in scope)
bad = [l.strip() for l in sys.stdin if l.strip() and not inside(l.strip())]
print("\n".join(bad))' "$SCOPE_JSON")"
if [ -n "$OUT_OF_SCOPE" ]; then
  # Out-of-scope files that are explicitly safe are tolerated with a note;
  # anything else aborts. Safe: Cargo.lock (dep-only drift), MIGRATION.md is
  # NEVER allowed from a worktree (coordinator owns it).
  if printf '%s\n' "$OUT_OF_SCOPE" | grep -qvE '^(rust/Cargo\.lock|rust/Cargo\.toml)$'; then
    abort_preserve "diff touches out-of-scope files: $(echo "$OUT_OF_SCOPE" | tr '\n' ' ')"
  fi
  log "note: diff also touches lockfile/manifest (tolerated, reviewed below)"
fi
log "scope OK: ${#CHANGED[@]} files"

# 2. inspect the diff ----------------------------------------------------------
{
  echo "=== diff --stat $WT_BRANCH vs $BRANCH ==="
  git diff --stat "$BRANCH" "$WT_BRANCH" --
  echo "=== full diff (rust/ only) ==="
  git diff "$BRANCH" "$WT_BRANCH" -- rust/ | head -2000
} >>"$LOG_FILE" 2>&1
log "diff recorded in $LOG_FILE"

# 3. relevant tests (worktree must already be green; sanity re-run) ------------
if [ -d "$WT_DIR" ]; then
  cd "$WT_DIR/rust" || abort_preserve "worktree rust/ missing"
  log "sanity: cargo test --workspace in worktree"
  timeout 1800 cargo test --workspace >>"$LOG_FILE" 2>&1 || \
    abort_preserve "worktree tests went red before merge"
  cd "$REPO" || exit 2
fi

# 4. reviewer check ------------------------------------------------------------
if [ "$TASK_TYPE" = "implement" ]; then
  VERDICT="$(python3 -c "import json,subprocess;print(json.loads(subprocess.run(['python3','$MQ','get','$TASK_ID'],capture_output=True,text=True).stdout).get('review',{}).get('verdict',''))")"
  if [ "$VERDICT" != "pass" ]; then
    log "review gate: verdict='$VERDICT' — refusing automatic completion"
    python3 "$MQ" set "$TASK_ID" status '"review-failed"' >/dev/null 2>&1 || true
    notify fail "Review gate stopped $TASK_ID (verdict=$VERDICT). Work preserved in $WT_BRANCH."
    exit 3
  fi
  log "review gate: PASS on record"
fi

# 5. deliberate merge -----------------------------------------------------------
git checkout "$BRANCH" --quiet || abort_preserve "cannot checkout $BRANCH"
# Fast-forward-free, no-rebase-surprise: merge --no-ff keeps the unit boundary.
if ! git merge --no-ff --no-edit "$WT_BRANCH" >>"$LOG_FILE" 2>&1; then
  git merge --abort >>"$LOG_FILE" 2>&1 || true
  abort_preserve "merge conflict with $BRANCH — resolve manually in $WT_DIR, work preserved"
fi
log "merged $WT_BRANCH into $BRANCH"

# 6. integration validation (main tree) ----------------------------------------
cd "$REPO/rust" || exit 2
log "integration validation: cargo fmt --check"
# shellcheck disable=SC2086
timeout 300 ${MIGRATION_CHECK_FMT:-cargo fmt --all -- --check} >>"$LOG_FILE" 2>&1 || {
  cd "$REPO" && git merge --abort >>"$LOG_FILE" 2>&1 || true
  abort_preserve "fmt check red after merge"
}
log "integration validation: cargo check --workspace"
timeout 900 cargo check --workspace >>"$LOG_FILE" 2>&1 || abort_preserve "cargo check red after merge (merge commit kept; fix forward, never reset)"
log "integration validation: cargo test --workspace"
timeout 1800 cargo test --workspace >>"$LOG_FILE" 2>&1 || abort_preserve "cargo test red after merge (merge commit kept; fix forward, never reset)"
cd "$REPO" || exit 2

# 7. authoritative records ------------------------------------------------------
COMMIT="$(git rev-parse --short HEAD)"
python3 "$MQ" set "$TASK_ID" integration "{\"commit\": \"$COMMIT\", \"note\": \"merged $WT_BRANCH into $BRANCH, validation green\"}" >/dev/null 2>&1 || true
python3 "$MQ" complete "$TASK_ID" --status done --result "merged $WT_BRANCH as $COMMIT" >/dev/null 2>&1 || \
  abort_preserve "merge is in but queue completion failed (commit $COMMIT kept)"
# Durable checkpoint: MIGRATION.md log line (coordinator commits it).
printf -- '- integrated %s as %s (parallel coordinator, validation green).\n' "$TASK_ID" "$COMMIT" >> "$REPO/MIGRATION.md"
git add MIGRATION.md >>"$LOG_FILE" 2>&1 || true
git -c user.name="ihrz-migration" -c user.email="migration@ihrz.local" \
  commit -m "feat(rust): integrate $TASK_ID as $COMMIT" >>"$LOG_FILE" 2>&1 || \
  log "note: MIGRATION.md checkpoint commit empty/failed (merge commit kept)"
log "records updated, commit=$COMMIT"

# 8. cleanup: remove the worktree, KEEP the branch for audit -------------------
git worktree remove --force "$WT_DIR" >>"$LOG_FILE" 2>&1 || \
  log "note: worktree remove failed, left for gc"
log "INTEGRATED $TASK_ID ($COMMIT)"
notify ok "Integrated $TASK_ID ($COMMIT)."
exit 0
