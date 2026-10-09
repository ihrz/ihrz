#!/usr/bin/env bash
# ihrz Rust migration — parallel coordinator (AUTHORITATIVE orchestrator).
#
# Ownership: while this coordinator is active it owns scheduling, worktree
# integration, and queue/inventory updates. The legacy serial loop
# (migrate-loop.sh / ihrz-migration.service) MUST stay paused (PAUSED file
# present, service stopped) — never run both against the same tree.
#
# Loop:
#   1. reclaim stale workers (heartbeat older than STALE_SEC): SIGTERM the
#      worker if alive, release the claim WITHOUT deleting the worktree
#      (diffs are preserved for diagnosis), keep retry budget.
#   2. advance pipeline: needs-review implement/test tasks -> spawn review
#      task (depends_on implement); review-failed -> file test/rework task.
#   3. integrate: implement/test tasks whose review passed -> integrate.sh.
#   4. dispatch: while free slots, claim next runnable task (mq.py enforces
#      deps + file-scope conflicts) and spawn worker.sh in background.
#   5. empty queue -> run inventory.sh scan (repeats gap discovery after
#      every integration wave). Sleep IDLE_SLEEP only if the scan promotes
#      nothing AND validation is green; park + notify if validation is red.
#
# Durability: queue.json + inventory-scan.md + MIGRATION.md + git. Every
# integrated task commits. Restart recovery is automatic (step 1).
set -u
# Keep inherited PATH first (tests inject mock toolchains; systemd gets a
# minimal PATH) then pin the tool dirs this orchestration depends on.
export PATH="$PATH:$HOME/.bun/bin:$HOME/.local/bin:$HOME/.cargo/bin:/run/current-system/sw/bin:/usr/bin:/bin"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck disable=SC1091
[ -f "$SCRIPT_DIR/coordinator.conf" ] && . "$SCRIPT_DIR/coordinator.conf"

REPO="${MIGRATION_REPO_ROOT:-$(cd "$SCRIPT_DIR/../.." && pwd)}"
BRANCH="${MIGRATION_BRANCH:-rust-recode}"
MAX_WORKERS="${MIGRATION_MAX_WORKERS:-3}"
TICK_SEC="${MIGRATION_TICK_SEC:-30}"
STALE_SEC="${MIGRATION_STALE_SEC:-900}"
IDLE_SLEEP="${MIGRATION_IDLE_SLEEP:-600}"
MQ="$SCRIPT_DIR/mq.py"

COORD_LOCK="$SCRIPT_DIR/.coordinator.lockfile"
PAUSE_FILE="$SCRIPT_DIR/PAUSED"
LEGACY_PAUSE="$SCRIPT_DIR/PAUSED"
LOG_FILE="$SCRIPT_DIR/logs/coordinator.log"
PID_FILE="$SCRIPT_DIR/coordinator.pid"
mkdir -p "$SCRIPT_DIR/logs" "$SCRIPT_DIR/workers"

log() { printf '%s [coord] %s\n' "$(date -u '+%Y-%m-%dT%H:%M:%SZ')" "$*" | tee -a "$LOG_FILE"; }
notify() { "$SCRIPT_DIR/notify.sh" "$@" || true; }
SHUTDOWN=0
trap 'SHUTDOWN=1; log "SIGTERM received: stop scheduling, workers keep their claims/diffs"' TERM INT

effective_workers() {
  local nproc mem_gb cap="$MAX_WORKERS"
  nproc="$(nproc 2>/dev/null || echo 4)"
  mem_gb="$(free -g 2>/dev/null | awk '/^Mem:/{print $2}')"
  [ -z "$mem_gb" ] || [ "$mem_gb" = "0" ] && mem_gb=8
  local by_cpu=$((nproc / 2)) by_mem=$((mem_gb / 6))
  [ "$by_cpu" -lt 1 ] && by_cpu=1
  [ "$by_mem" -lt 1 ] && by_mem=1
  local eff="$cap"
  [ "$by_cpu" -lt "$eff" ] && eff="$by_cpu"
  [ "$by_mem" -lt "$eff" ] && eff="$by_mem"
  echo "$eff"
}

live_workers() { # count running worker.sh PIDs tracked in workers/*.pid
  local n=0 f pid
  for f in "$SCRIPT_DIR"/workers/*.pid; do
    [ -f "$f" ] || continue
    pid="$(cat "$f" 2>/dev/null || true)"
    if [ -n "$pid" ] && kill -0 "$pid" 2>/dev/null; then
      n=$((n + 1))
    else
      rm -f "$f"
    fi
  done
  echo "$n"
}

reclaim_stale() {
  local stale
  stale="$(python3 "$MQ" stale --older-than "$STALE_SEC" 2>/dev/null)"
  [ -z "$stale" ] && return 0
  for tid in $stale; do
    local pid
    pid="$(python3 "$MQ" get "$tid" worker_pid 2>/dev/null || echo 0)"
    if [ -n "$pid" ] && [ "$pid" != "0" ] && kill -0 "$pid" 2>/dev/null; then
      log "stale worker $tid (pid $pid, no heartbeat >${STALE_SEC}s): SIGTERM, claim released, worktree preserved"
      kill -TERM "$pid" 2>/dev/null || true
      sleep 5
      kill -KILL "$pid" 2>/dev/null || true
    else
      log "stale task $tid (no live worker): releasing claim, worktree preserved"
    fi
    python3 "$MQ" release "$tid" --reason "stale worker reclaimed, diff preserved" >/dev/null 2>&1 || true
    rm -f "$SCRIPT_DIR/workers/$tid.pid"
    notify fail "Stale worker reclaimed: $tid (diff preserved in .worktrees/$tid)."
  done
}

advance_pipeline() {
  # needs-review implement/test -> ensure a review task exists; review-failed
  # implement -> file one rework test task (bounded: only once per fail).
  python3 - "$MQ" <<'EOF'
import json, subprocess, time
mq = __import__('sys').argv[1]
now = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
tasks = {t['id']: t for t in json.loads(
    subprocess.run(['python3', mq, 'list', '--json'],
                   capture_output=True, text=True).stdout)}
def add(tid, ttype, title, body, deps, prio, scope=""):
    args = ['python3', mq, 'add', tid, '--type', ttype, '--title', title,
            '--body', body, '--priority', str(prio)]
    if deps: args += ['--depends', ','.join(deps)]
    if scope: args += ['--scope', scope]
    subprocess.run(args, capture_output=True)
for t in tasks.values():
    if t.get('status') == 'needs-review' and t.get('type') in ('implement', 'test'):
        rid = f"REVIEW-{t['id']}"
        if rid not in tasks:
            scope = ','.join(t.get('scope', []))
            add(rid, 'review', f"Review {t['id']}: {t.get('title','')[:80]}",
                f"Verify worktree wt/{t['id']} against the TS originals. "
                f"PASS only on behavioral parity.", [t['id']], 8, scope)
            print(f"pipeline: review task {rid} created")
    if t.get('status') == 'review-failed' and t.get('type') == 'implement':
        wid = f"REWORK-{t['id']}"
        if wid not in tasks:
            scope = ','.join(t.get('scope', []))
            rev = (t.get('review', {}) or {}).get('findings', 'see review worker log')
            add(wid, 'test', f"Rework {t['id']} per review findings",
                f"Address review findings in worktree wt/{t['id']} scope: {rev}. "
                f"Fix + add regression tests; must pass re-review.",
                [], 9, scope)
            print(f"pipeline: rework task {wid} created")
            subprocess.run(['python3', mq, 'set', t['id'], 'status',
                            '"queued"'], capture_output=True)
EOF
}

try_integrate() {
  # Implement/test tasks with review pass on record -> integrate.sh inline
  # (serial integration: one at a time, safest for the shared tree).
  local tid
  tid="$(python3 - "$MQ" <<'EOF'
import json, subprocess
mq = __import__('sys').argv[1]
tasks = json.loads(subprocess.run(['python3', mq, 'list', '--json'],
                                  capture_output=True, text=True).stdout)
cands = [t for t in tasks
         if t.get('type') in ('implement', 'test')
         and t.get('status') == 'needs-review'
         and (t.get('review', {}) or {}).get('verdict') == 'pass']
cands.sort(key=lambda t: (-t.get('priority', 0), t['id']))
if cands:
    print(cands[0]['id'])
EOF
)"
  [ -z "$tid" ] && return 1
  log "integrating $tid"
  python3 "$MQ" set "$tid" status '"integrating"' >/dev/null 2>&1 || true
  if "$SCRIPT_DIR/integrate.sh" "$tid" >>"$LOG_FILE" 2>&1; then
    log "integrated $tid"
    return 0
  fi
  log "integration of $tid failed (work preserved, see logs/integrate-$tid.log)"
  return 1
}

dispatch() {
  local eff="$1" free tid
  free=$((eff - $(live_workers)))
  while [ "$free" -gt 0 ]; do
    tid="$(python3 "$MQ" next 2>/dev/null)"
    [ -z "$tid" ] && return 0
    local ttype
    ttype="$(python3 "$MQ" get "$tid" type 2>/dev/null)"
    # integrate/inventory tasks run inline (serial, tree-sensitive).
    if [ "$ttype" = "integrate" ]; then
      python3 "$MQ" claim "$tid" --owner "coordinator[integrate]" --pid "$$" >/dev/null 2>&1 || return 0
      "$SCRIPT_DIR/integrate.sh" "$tid" >>"$LOG_FILE" 2>&1 || true
      continue
    fi
    if [ "$ttype" = "inventory" ]; then
      python3 "$MQ" claim "$tid" --owner "coordinator[inventory]" --pid "$$" >/dev/null 2>&1 || return 0
      "$SCRIPT_DIR/inventory.sh" --task "$tid" >>"$LOG_FILE" 2>&1 || \
        python3 "$MQ" retry-or-block "$tid" --error "inventory scan failed" >/dev/null 2>&1 || true
      continue
    fi
    python3 "$MQ" claim "$tid" --owner "worker[$tid]" --pid "0" >/dev/null 2>&1 || continue
    log "spawning worker $tid (type=$ttype)"
    setsid nohup "$SCRIPT_DIR/worker.sh" "$tid" >>"$SCRIPT_DIR/logs/workers/$tid.log" 2>&1 &
    local pid=$!
    echo "$pid" > "$SCRIPT_DIR/workers/$tid.pid"
    python3 "$MQ" heartbeat "$tid" --pid "$pid" >/dev/null 2>&1 || true
    free=$((free - 1))
  done
}

queue_empty() {
  python3 - "$MQ" <<'EOF'
import json, subprocess
mq = __import__('sys').argv[1]
tasks = json.loads(subprocess.run(['python3', mq, 'list', '--json'],
                                  capture_output=True, text=True).stdout)
active = [t for t in tasks if t.get('status') not in
          ('done', 'failed', 'blocked')]
print('empty' if not active else 'busy')
EOF
}

validate_main() {
  cd "$REPO/rust" || return 1
  cargo fmt --all -- --check >>"$LOG_FILE" 2>&1 || return 1
  timeout 900 cargo check --workspace >>"$LOG_FILE" 2>&1 || return 1
  timeout 1800 cargo test --workspace >>"$LOG_FILE" 2>&1 || return 1
  return 0
}

main() {
  python3 "$MQ" init >/dev/null 2>&1 || true
  exec 9>"$COORD_LOCK"
  if ! flock -n 9; then
    log "another coordinator holds $COORD_LOCK, exiting (single authoritative scheduler)"
    exit 0
  fi
  echo "$$" > "$PID_FILE"
  cd "$REPO" || exit 1
  local eff
  eff="$(effective_workers)"
  log "coordinator start (branch=$BRANCH max_workers=$MAX_WORKERS effective=$eff tick=${TICK_SEC}s)"
  # Authoritative-owner guard: never integrate while the legacy loop is alive.
  if [ ! -f "$LEGACY_PAUSE" ]; then
    log "WARNING: legacy PAUSED file missing — creating it so migrate-loop.sh idles while the coordinator owns the tree"
    touch "$LEGACY_PAUSE"
  fi
  if systemctl --user is-active ihrz-migration.service >/dev/null 2>&1; then
    log "note: legacy ihrz-migration.service is active but PAUSED (idles); coordinator is authoritative"
  fi
  notify info "Parallel coordinator started (branch $BRANCH, up to $eff workers). Legacy loop stays paused."
  log "effective workers=$eff (nproc=$(nproc), mem=$(free -g | awk '/^Mem:/{print $2}')GB)"

  while [ "$SHUTDOWN" -eq 0 ]; do
    # Pause flag is .coord-paused (coord.sh pause). The PAUSED file itself
    # is the legacy-loop guard and does NOT pause the coordinator.
    if [ -f "$SCRIPT_DIR/.coord-paused" ]; then
      log "paused via coord.sh, idling (workers keep claims; no new dispatch)"
      sleep 60
      continue
    fi

    current_branch="$(git branch --show-current)"
    if [ "$current_branch" != "$BRANCH" ]; then
      log "on branch $current_branch, expected $BRANCH — parking (no branch switching, no clobbering)"
      notify blocker "Coordinator parked: on $current_branch, expected $BRANCH."
      touch "$SCRIPT_DIR/.coord-paused"
      sleep 300
      continue
    fi

    reclaim_stale
    advance_pipeline
    if ! try_integrate; then
      dispatch "$eff"
    fi

    if [ "$(queue_empty)" = "empty" ] && [ "$(live_workers)" -eq 0 ]; then
      log "queue empty — triggering inventory scan (never blind sleep while gaps may remain)"
      "$SCRIPT_DIR/inventory.sh" >>"$LOG_FILE" 2>&1 || log "inventory scan failed"
      if [ "$(queue_empty)" = "empty" ]; then
        log "inventory clean — verifying main tree, then sleeping ${IDLE_SLEEP}s"
        if validate_main; then
          notify milestone "Queue empty, inventory clean, validation green. Idling ${IDLE_SLEEP}s."
        else
          log "validation RED with empty queue — parking for triage"
          notify blocker "Validation FAILED with empty queue — parked for triage."
          touch "$SCRIPT_DIR/.coord-paused"
        fi
        sleep "$IDLE_SLEEP"
        continue
      fi
    fi
    sleep "$TICK_SEC"
  done
  log "shutdown requested: no new tasks scheduled; in-progress workers keep claims/diffs (reclaimed or resumed on restart)"
  rm -f "$PID_FILE"
  notify info "Coordinator shutting down gracefully; in-progress diffs preserved."
}

main "$@"
