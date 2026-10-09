#!/usr/bin/env bash
# ihrz Rust migration — autonomous execution loop.
#
# Runs unattended: picks the next dependency-safe unit from MIGRATION.md,
# invokes the `rust-migrator` opencode agent (which embeds
# .opencode/rust-migrator.md), validates with cargo fmt/check/test,
# checkpoints verified work with git, notifies via Hermes Discord, and
# continues. No global iteration limit: stops only when MIGRATION.md has
# no remaining `- [ ]` / `- [~]` items, when paused, or on an external
# blocker (missing creds/quota) which is recorded and retried with backoff.
#
# Crash-safe: state lives in state.json + MIGRATION.md in the repo, so a
# systemd restart resumes where the last iteration left off. A lockfile
# prevents two loops on the same tree. Never touches uncommitted user work
# except the migration's own files (it commits only after validation).
set -u
# systemd user units get a minimal PATH (no ~/.bun/bin, no ~/.local/bin):
# pin the tools this loop depends on.
export PATH="$HOME/.bun/bin:$HOME/.local/bin:$HOME/.cargo/bin:/run/current-system/sw/bin:/usr/bin:/bin"
OPENCODE_BIN="$(command -v opencode || echo "$HOME/.bun/bin/opencode")"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck disable=SC1091
[ -f "$SCRIPT_DIR/migrate.conf" ] && . "$SCRIPT_DIR/migrate.conf"

REPO="${MIGRATION_REPO_ROOT:-$(cd "$SCRIPT_DIR/../.." && pwd)}"
BRANCH="${MIGRATION_BRANCH:-rust-recode}"
AGENT="${MIGRATION_AGENT:-rust-migrator}"
MODEL="${MIGRATION_MODEL:-}"
MAX_RETRIES="${MIGRATION_MAX_RETRIES:-5}"
BACKOFF="${MIGRATION_BACKOFF_BASE:-60}"
WORKER_TIMEOUT="${MIGRATION_WORKER_TIMEOUT:-3600}"
IDLE_SLEEP="${MIGRATION_IDLE_SLEEP:-30}"

STATE_FILE="$SCRIPT_DIR/state.json"
LOCK_FILE="$SCRIPT_DIR/.loop.lockfile"
LOG_FILE="$SCRIPT_DIR/loop.log"
PAUSE_FILE="$SCRIPT_DIR/PAUSED"

log() { printf '%s %s\n' "$(date -u '+%Y-%m-%dT%H:%M:%SZ')" "$*" | tee -a "$LOG_FILE"; }
notify() { "$SCRIPT_DIR/notify.sh" "$@" || true; }

state_get() { python3 -c "import json;print(json.load(open('$STATE_FILE')).get('$1',''))" 2>/dev/null; }
state_set() {
  python3 - "$STATE_FILE" "$1" "$2" <<'EOF'
import json, sys
p, k, v = sys.argv[1], sys.argv[2], sys.argv[3]
try: s = json.load(open(p))
except Exception: s = {}
s[k] = v
json.dump(s, open(p, 'w'), indent=2)
EOF
}

init_state() {
  if [ ! -f "$STATE_FILE" ]; then
    cat > "$STATE_FILE" <<'EOF'
{
  "current_task": "",
  "retry_count": "0",
  "last_result": "",
  "last_run_utc": "",
  "completed_units": "0",
  "status": "running"
}
EOF
  fi
}

acquire_lock() {
  # flock on a lockfile: kernel-released on crash, so a systemd restart
  # after SIGKILL never wedges on a stale lock. Second concurrent loop
  # exits quietly (systemd sees exit 0, no restart storm).
  exec 9>"$LOCK_FILE"
  if ! flock -n 9; then
    log "another loop holds $LOCK_FILE, exiting (no concurrent orchestrators)"
    exit 0
  fi
}

# Next unfinished unit: first `- [ ]` or `- [~]` line under MIGRATION.md
# "## Remaining" section (dependency-ordered by maintainers).
next_task() {
  python3 - "$REPO/MIGRATION.md" <<'EOF'
import re, sys
text = open(sys.argv[1], encoding='utf-8').read()
m = re.search(r'## Remaining.*', text, re.S)
scope = m.group(0) if m else text
for line in scope.splitlines():
    s = line.strip()
    if s.startswith('- [ ]') or s.startswith('- [~]'):
        print(s[:300])
        break
else:
    print('')
EOF
}

remaining_count() {
  python3 - "$REPO/MIGRATION.md" <<'EOF'
import re, sys
text = open(sys.argv[1], encoding='utf-8').read()
m = re.search(r'## Remaining.*', text, re.S)
scope = m.group(0) if m else text
n = sum(1 for l in scope.splitlines() if l.strip().startswith(('- [ ]', '- [~]')))
print(n)
EOF
}

# A unit counts as complete only if its roadmap line is now marked
# `- [x]` — not deleted, not left open. Stops a worker from
# "finishing" by dropping the entry.
task_marked_done() {
  python3 - "$REPO/MIGRATION.md" "$1" <<'EOF'
import re, sys
text = open(sys.argv[1], encoding='utf-8').read()
task = sys.argv[2]
tail = re.sub(r'^-\s*\[[ ~]\]\s*', '', task).strip()[:60]
m = re.search(r'## Remaining.*', text, re.S)
scope = m.group(0) if m else text
for line in scope.splitlines():
    s = line.strip()
    if tail and tail in s:
        print('done' if s.startswith('- [x]') else 'open')
        break
else:
    print('gone')
EOF
}

validate() {
  cd "$REPO/rust" || return 1
  log "validate: cargo fmt --check"
  cargo fmt --all -- --check >>"$LOG_FILE" 2>&1 || return 1
  log "validate: cargo check --workspace"
  timeout 900 cargo check --workspace >>"$LOG_FILE" 2>&1 || return 1
  log "validate: cargo test --workspace"
  timeout 1800 cargo test --workspace >>"$LOG_FILE" 2>&1 || return 1
  return 0
}

checkpoint() {
  local task="$1"
  cd "$REPO" || return 1
  # Explicit paths only: never sweep runtime state into a checkpoint.
  # lockfiles, loop.log, gap-candidates.txt and state.json are
  # gitignored/untracked by design; a stray file (e.g. .lock) must
  # not be committed by accident.
  git add -- rust MIGRATION.md \
    ops/rust-migration/migrate-loop.sh \
    ops/rust-migration/migrate.sh \
    ops/rust-migration/migrate.conf \
    ops/rust-migration/README.md \
    ops/rust-migration/notify.sh \
    ops/rust-migration/ihrz-migration.service \
    ops/rust-migration/inventory.md >/dev/null 2>&1
  if git diff --cached --quiet; then
    log "checkpoint: nothing new to commit"
    return 0
  fi
  git -c user.name="ihrz-migration" -c user.email="migration@ihrz.local" \
    commit -m "feat(rust): autonomous migration — ${task:0:72}" >>"$LOG_FILE" 2>&1 || return 1
  log "checkpoint: committed"
}

run_worker() {
  local task="$1" attempt="$2"
  local prompt="Continue the autonomous TypeScript-to-Rust migration in this repo (branch $BRANCH). Mandatory rules: .opencode/rust-migrator.md. Current unit: $task (attempt $attempt/$MAX_RETRIES). Loop: 1) inspect MIGRATION.md Remaining + the TS original, 2) implement the Rust equivalent in rust/, 3) cargo fmt, cargo check --workspace, cargo test --workspace, fix failures, 4) update MIGRATION.md (move finished items to done, log results). For significant units ask @rust-reviewer (subagent) for review and fix findings yourself. Never commit (the orchestrator checkpoints). Never push. Stop after ONE unit and report DONE/FAILED + files changed + test counts."
  cd "$REPO" || return 1
  local args=(run --agent "$AGENT" --auto)
  [ -n "$MODEL" ] && args+=(--model "$MODEL")
  # shellcheck disable=SC2086
  timeout "$WORKER_TIMEOUT" "$OPENCODE_BIN" "${args[@]}" "$prompt" >>"$LOG_FILE" 2>&1
}

is_rate_limit() { grep -qiE 'rate.?limit|429|quota|overloaded|temporarily unavailable' "$LOG_FILE" | tail -1 >/dev/null 2>&1; tail -30 "$LOG_FILE" | grep -qiE 'rate.?limit|429|quota exceeded|overloaded|temporarily unavailable'; }

# Gap audit: list TS files under src/ with no plausible Rust counterpart.
# NEVER edits MIGRATION.md by itself (filename matching has false
# positives: e.g. ready.ts is covered by events.rs). Writes candidates to
# gap-candidates.txt and notifies; the next worker triages them into real
# Remaining units or documents why they are covered.
audit_new_gaps() {
  python3 - "$REPO" <<'EOF'
import os, re
repo = os.path.normpath(os.path.expandvars(os.path.expanduser(__import__('sys').argv[1])))
src = os.path.join(repo, 'src')
rust = os.path.join(repo, 'rust', 'src')
mig = os.path.join(repo, 'MIGRATION.md')
have = set()
for dp, _, fns in os.walk(rust):
    for f in fns:
        if f.endswith('.rs'):
            have.add(os.path.splitext(f.lower())[0])
missing = []
for dp, _, fns in os.walk(src):
    for f in fns:
        if not f.endswith('.ts'):
            continue
        base = os.path.splitext(f.lower())[0]
        norm = re.sub(r'[^a-z0-9]', '', base)
        if not any(norm in re.sub(r'[^a-z0-9]', '', h) or re.sub(r'[^a-z0-9]', '', h) in norm for h in have):
            missing.append(os.path.relpath(os.path.join(dp, f), repo))
text = open(mig, encoding='utf-8').read()
known = set(re.findall(r'src/\S+\.ts', text))
fresh = sorted(set(missing) - known)
open(os.path.join(repo, 'ops', 'rust-migration', 'gap-candidates.txt'), 'w').write('\n'.join(fresh))
print('audit: %d candidates written to gap-candidates.txt' % len(fresh))
EOF
}

# Inventory-aware reconcile: filename matching alone cannot prove a
# module is unmigrated (Rust consolidates many TS files per module).
# For command/component candidates, a `rename = "<name>"` hit in
# rust/src is positive evidence of coverage and is recorded in
# inventory.md. Candidates with no rename hit and no mention in
# MIGRATION.md are grouped by directory and appended as `- [ ]`
# units under ## Remaining (dependency-safe: one area per unit).
# Events/core candidates need behavioral judgment and are recorded
# as pending-triage in inventory.md, never auto-appended.
reconcile_gaps() {
  python3 - "$REPO" <<'EOF'
import os, re, collections, datetime
repo = os.path.normpath(os.path.expandvars(os.path.expanduser(__import__('sys').argv[1])))
mig_path = os.path.join(repo, 'MIGRATION.md')
inv_path = os.path.join(repo, 'ops', 'rust-migration', 'inventory.md')
gap_path = os.path.join(repo, 'ops', 'rust-migration', 'gap-candidates.txt')
rust = os.path.join(repo, 'rust', 'src')
try:
    cands = [l.strip() for l in open(gap_path, encoding='utf-8') if l.strip()]
except FileNotFoundError:
    print('reconcile: no gap-candidates.txt, nothing to do')
    raise SystemExit
renames = set()
for dp, _, fns in os.walk(rust):
    for f in fns:
        if f.endswith('.rs'):
            t = open(os.path.join(dp, f), encoding='utf-8', errors='ignore').read()
            renames.update(re.findall(r'rename\s*=\s*"([^"]+)"', t))
mig = open(mig_path, encoding='utf-8').read()
# Machine-triaged paths (manual triage A/B/C evidence in inventory.md):
# never auto-appended; missing ones are covered by hand-written units
# (protected by the done-guard) or done already.
triaged = set()
try:
    inv_text = open(inv_path, encoding='utf-8').read()
    m = re.search(r'<!-- MANUAL:TRIAGED-PATHS -->(.*?)<!-- MANUAL:TRIAGED-PATHS-END -->',
                  inv_text, re.S)
    if m:
        triaged = set(l.strip() for l in m.group(1).splitlines() if l.strip().startswith('src/'))
except FileNotFoundError:
    pass
def is_cmd(p):
    return any(k in p for k in ('/HybridCommands/', '/MessageCommands/',
                                '/SlashCommands/', '/Components/', 'ApplicationCommands'))
def cmd_name(p):
    b = os.path.basename(p)[:-3]
    return b[1:] if b[:1] in ('!', '@') else b
covered, missing_groups, pending = [], collections.defaultdict(list), []
for p in cands:
    if p in triaged:
        covered.append(p + '  # manually triaged, see inventory.md')
        continue
    if is_cmd(p):
        if cmd_name(p) in renames:
            covered.append(p)
        elif p not in mig and cmd_name(p) not in mig:
            missing_groups[os.path.dirname(p)].append(p)
        else:
            pending.append(p + '  # mentioned in MIGRATION.md, needs worker check')
    else:
        pending.append(p)
ts = datetime.datetime.now(datetime.timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')
inv = ''
if os.path.exists(inv_path):
    inv = open(inv_path, encoding='utf-8').read()
def set_block(text, marker, body):
    start, end = '<!-- AUTO:' + marker + ' -->', '<!-- AUTO:' + marker + '-END -->'
    chunk = '%s\n%s\n%s' % (start, body, end)
    if start in text:
        return re.sub(re.escape(start) + r'.*?' + re.escape(end), lambda _: chunk, text, flags=re.S)
    return (text + '\n' + chunk + '\n' if text else '# Rust migration inventory (auto-reconciled)\n\n' + chunk + '\n')
inv = set_block(inv, 'COVERED', '%s — %d command candidates with rename evidence:\n%s' % (
    ts, len(covered), '\n'.join(sorted(covered)) or '(none)'))
inv = set_block(inv, 'PENDING', '%s — %d candidates needing behavioral triage:\n%s' % (
    ts, len(pending), '\n'.join(sorted(pending)) or '(none)'))
open(inv_path, 'w').write(inv)
added = 0
if missing_groups:
    lines = mig.splitlines()
    units = []
    for d in sorted(missing_groups):
        files = sorted(missing_groups[d])
        if d in mig:
            continue
        names = ', '.join(cmd_name(p) for p in files)[:220]
        units.append('- [ ] `%s/` parity (auto-audit %s, %d files: %s)' % (d, ts[:10], len(files), names))
    if units:
        anchor = next((i for i, l in enumerate(lines) if l.startswith('## Orchestrator')), len(lines))
        lines[anchor:anchor] = units + ['']
        open(mig_path, 'w').write('\n'.join(lines) + '\n')
        added = len(units)
print('reconcile: %d covered recorded, %d pending, %d roadmap units added' % (len(covered), len(pending), added))
EOF
}

main() {
  init_state
  acquire_lock
  cd "$REPO" || exit 1
  log "loop start (branch=$BRANCH agent=$AGENT max_retries=$MAX_RETRIES)"
  notify info "Migration loop started/resumed on branch $BRANCH."

  while true; do
    [ -f "$PAUSE_FILE" ] && { log "paused via PAUSED file, sleeping 60s"; sleep 60; continue; }

    # Never switch branches or clobber foreign work: stay on branch, only
    # fast-forward-free operation (no pull/reset).
    current_branch="$(git branch --show-current)"
    if [ "$current_branch" != "$BRANCH" ]; then
      log "on branch $current_branch, expected $BRANCH — parking as blocker"
      state_set status "blocked: wrong branch $current_branch"
      notify blocker "Expected branch $BRANCH but on $current_branch. Parked; fix branch and remove PAUSED."
      touch "$PAUSE_FILE"
      sleep 300; continue
    fi

    task="$(next_task)"
    if [ -z "$task" ]; then
      # NEVER exit on "complete": the TS side keeps moving, and agents
      # routinely miss units. Re-verify forever: full validation, then a
      # fresh TS-vs-Rust gap audit, then watch for new TS changes.
      log "no remaining units — entering verify-forever watch"
      state_set status "verify-watch"
      if validate; then
        notify milestone "All known units done + validation green. Entering verify-forever watch (re-auditing TS vs Rust)."
        # Reconcile the inventory while green: verified-missing work
        # becomes roadmap units so the queue refills itself.
        audit_new_gaps
        reconcile_gaps >>"$LOG_FILE" 2>&1
      else
        # Validation red with an empty queue is a real blocker, not a
        # watch condition: park for triage instead of failing hourly.
        log "verify-forever: validation FAILED with zero remaining units — parking"
        state_set status "blocked: validation failed in verify-watch"
        state_set last_result "blocked: validation failed in verify-watch"
        notify blocker "Validation FAILED with zero remaining units — parked for triage, see loop.log."
        touch "$PAUSE_FILE"
        sleep 300; continue
      fi
      log "verify-forever: sleeping 3600s, then re-audit"
      sleep 3600
      continue
    fi

    prev_task="$(state_get current_task)"
    if [ "$task" != "$prev_task" ]; then
      state_set current_task "$task"
      state_set retry_count "0"
      notify task "Starting unit: $task"
    fi
    attempt="$(($(state_get retry_count) + 1))"
    log "iteration: task=$task attempt=$attempt"
    state_set last_run_utc "$(date -u '+%Y-%m-%dT%H:%M:%SZ')"

    if run_worker "$task" "$attempt"; then
      marked="$(task_marked_done "$task")"
      if [ "$marked" != "done" ]; then
        log "worker left roadmap entry as '$marked', not done: $task"
      elif validate; then
        if checkpoint "$task"; then
          done_n="$(($(state_get completed_units) + 1))"
          state_set completed_units "$done_n"
          state_set retry_count "0"
          state_set last_result "ok: $task"
          left="$(remaining_count)"
          log "unit DONE: $task (completed=$done_n remaining=$left)"
          notify ok "Unit done: $task ($left remaining)."
          sleep "$IDLE_SLEEP"
          continue
        else
          log "checkpoint failed"
        fi
      else
        log "validation failed for $task"
      fi
    else
      log "worker failed for $task (exit=$?)"
    fi

    # Failure path: bounded retries with exponential backoff, then park.
    if [ "$attempt" -ge "$MAX_RETRIES" ]; then
      log "unit FAILED x$attempt, parking as blocked: $task"
      state_set last_result "blocked: $task"
      state_set retry_count "0"
      notify blocker "Unit failed $attempt times, parked for human triage: $task. Continuing with next unit is manual (edit MIGRATION.md to reorder)."
      touch "$PAUSE_FILE"
      sleep 300; continue
    fi

    state_set retry_count "$attempt"
    state_set last_result "retry $attempt: $task"
    wait_s=$((BACKOFF * 2 ** (attempt - 1)))
    [ "$wait_s" -gt 1800 ] && wait_s=1800
    if is_rate_limit; then
      wait_s=$((wait_s * 2)); [ "$wait_s" -gt 3600 ] && wait_s=3600
      log "rate-limit suspected, backing off ${wait_s}s"
      notify fail "Rate limit/provider error on: $task. Backing off ${wait_s}s (attempt $attempt/$MAX_RETRIES)."
    else
      log "retry $attempt/$MAX_RETRIES for $task after ${wait_s}s"
      notify fail "Unit failed (attempt $attempt/$MAX_RETRIES): $task. Retrying in ${wait_s}s."
    fi
    sleep "$wait_s"
  done
}

main "$@"
