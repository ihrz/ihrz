#!/usr/bin/env bash
# ihrz Rust migration — parallel coordinator control command.
# Usage: coord.sh {install|start|stop|restart|status|logs|pause|resume|progress|gc|recover|inventory}
set -u
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck disable=SC1091
[ -f "$SCRIPT_DIR/coordinator.conf" ] && . "$SCRIPT_DIR/coordinator.conf"

SERVICE="ihrz-migration-coordinator.service"
UNIT_SRC="$SCRIPT_DIR/$SERVICE"
UNIT_DST="$HOME/.config/systemd/user/$SERVICE"
MQ="$SCRIPT_DIR/mq.py"

cmd_install() {
  mkdir -p "$HOME/.config/systemd/user"
  sed "s|@REPO@|${MIGRATION_REPO_ROOT:-/home/kisakay/Documents/Code/GitLab/ihrz}|g" "$UNIT_SRC" > "$UNIT_DST"
  systemctl --user daemon-reload
  systemctl --user enable "$SERVICE"
  echo "installed + enabled: $UNIT_DST"
  echo "Next: $0 start"
}

cmd_start() {
  [ -f "$UNIT_DST" ] || cmd_install
  # Single authoritative owner: the legacy serial loop must idle.
  touch "$SCRIPT_DIR/PAUSED"
  rm -f "$SCRIPT_DIR/.coord-paused"
  systemctl --user start "$SERVICE"
  "$SCRIPT_DIR/notify.sh" info "Parallel coordinator started." || true
  systemctl --user status "$SERVICE" --no-pager -l | head -12
}

cmd_stop() {
  # Graceful: SIGTERM traps in coordinator.sh (stops scheduling, keeps
  # claims/diffs); workers finish or are reclaimed with diffs preserved.
  systemctl --user stop "$SERVICE" || true
  echo "stopped. Claims + diffs preserved in queue.json + .worktrees/. Resume with: $0 resume"
}

cmd_restart() { cmd_stop; rm -f "$SCRIPT_DIR/.coord-paused"; systemctl --user start "$SERVICE"; systemctl --user status "$SERVICE" --no-pager -l | head -8; }

cmd_status() {
  systemctl --user status "$SERVICE" --no-pager -l | head -12
  echo "--- queue ---"; python3 "$MQ" stats 2>/dev/null || echo "(no queue yet)"
  echo "--- by status ---"; python3 "$MQ" list 2>/dev/null | head -30 || true
  echo "--- live workers ---"
  local n=0
  for f in "$SCRIPT_DIR"/workers/*.pid; do
    [ -f "$f" ] || continue
    pid="$(cat "$f" 2>/dev/null)"; tid="$(basename "$f" .pid)"
    if [ -n "$pid" ] && kill -0 "$pid" 2>/dev/null; then echo "  $tid pid=$pid ALIVE"; n=$((n+1)); else echo "  $tid pid=$pid DEAD"; fi
  done
  [ "$n" -eq 0 ] && echo "  (none)"
  echo "--- worktrees ---"; git worktree list 2>/dev/null || true
  echo "--- validation (last lines) ---"; grep -E 'test result|INTEGRATED|FAILED|review' "$SCRIPT_DIR/logs/coordinator.log" 2>/dev/null | tail -5 || echo "(no log)"
  if [ -f "$SCRIPT_DIR/.coord-paused" ]; then echo "--- PAUSED (coordinator) ---"; fi
  echo "--- legacy loop guard ---"; [ -f "$SCRIPT_DIR/PAUSED" ] && echo "PAUSED present (legacy loop idles)" || echo "PAUSED MISSING (legacy loop could run!)"
}

cmd_logs() { journalctl --user -u "$SERVICE" -n "${1:-50}" --no-pager; echo "--- coordinator.log tail ---"; tail -n "${1:-30}" "$SCRIPT_DIR/logs/coordinator.log" 2>/dev/null; }

cmd_pause() {
  touch "$SCRIPT_DIR/.coord-paused"
  echo "coordinator paused (no new dispatch; workers keep claims/diffs). Resume with: $0 resume"
}

cmd_resume() {
  rm -f "$SCRIPT_DIR/.coord-paused"
  touch "$SCRIPT_DIR/PAUSED"  # keep legacy loop idling
  systemctl --user start "$SERVICE"
  echo "resumed."
}

cmd_progress() {
  echo "=== queue stats ==="; python3 "$MQ" stats 2>/dev/null || echo "(no queue yet)"
  echo "=== open tasks ==="; python3 "$MQ" list --status "queued,running,needs-review,review-failed,integrating" 2>/dev/null || true
  echo "=== failed/blocked ==="; python3 "$MQ" list --status "failed,blocked" 2>/dev/null || true
  echo "=== last integration ==="; grep -E 'INTEGRATED|ABORT|review' "$SCRIPT_DIR/logs/coordinator.log" 2>/dev/null | tail -5 || echo "(no log)"
  echo "=== last inventory ==="; head -8 "$SCRIPT_DIR/inventory-scan.md" 2>/dev/null || echo "(no scan yet)"
}

cmd_gc() {
  # Prune worktrees whose branches already merged (keeps failed diffs).
  cd "${MIGRATION_REPO_ROOT:-$(cd "$SCRIPT_DIR/../.." && pwd)}" || exit 1
  git worktree prune
  git worktree list --porcelain | grep '^worktree ' | awk '{print $2}' | while read -r wt; do
    br="$(git -C "$wt" branch --show-current 2>/dev/null || true)"
    case "$br" in wt/*)
      tid="${br#wt/}"
      if python3 "$MQ" get "$tid" status 2>/dev/null | grep -q done; then
        echo "gc: removing merged worktree $wt ($br)"
        git worktree remove --force "$wt" || true
        git branch -D "$br" 2>/dev/null || true
      else
        echo "gc: keeping $wt ($br, task not done)"
      fi
      ;;
    esac
  done
  rm -f "$SCRIPT_DIR"/workers/*.pid
  echo "gc done."
}

cmd_recover() {
  # Restart recovery: release claims whose workers are dead (diffs kept),
  # report orphans, prune git metadata.
  cd "${MIGRATION_REPO_ROOT:-$(cd "$SCRIPT_DIR/../.." && pwd)}" || exit 1
  python3 - "$MQ" <<'EOF'
import json, os, subprocess
mq = __import__('sys').argv[1]
tasks = {t['id']: t for t in json.loads(
    subprocess.run(['python3', mq, 'list', '--json'],
                   capture_output=True, text=True).stdout)}
for t in tasks.values():
    if t.get('status') != 'running':
        continue
    pid = t.get('worker_pid', 0)
    alive = False
    try:
        if pid:
            os.kill(pid, 0)
            alive = True
    except (OSError, TypeError):
        alive = False
    if not alive:
        print(f"recover: {t['id']} worker dead (pid={pid}), releasing claim, diff preserved")
        subprocess.run(['python3', mq, 'release', t['id'],
                        '--reason', 'recover: worker dead, diff preserved'],
                       capture_output=True)
    else:
        print(f"recover: {t['id']} worker alive (pid={pid}), keeping claim")
EOF
  git worktree prune
  echo "--- orphan worktrees (no queue task or task not done) ---"
  git worktree list
  echo "recover done. Resume with: $0 resume"
}

cmd_inventory() {
  "$SCRIPT_DIR/inventory.sh" "$@"
}

case "${1:-status}" in
  install) cmd_install ;; start) cmd_start ;; stop) cmd_stop ;;
  restart) cmd_restart ;; status) cmd_status ;; logs) cmd_logs "${2:-}" ;;
  pause) cmd_pause ;; resume) cmd_resume ;; progress) cmd_progress ;;
  gc) cmd_gc ;; recover) cmd_recover ;; inventory) shift; cmd_inventory "$@" ;;
  *) echo "Usage: $0 {install|start|stop|restart|status|logs|pause|resume|progress|gc|recover|inventory}"; exit 2 ;;
esac
