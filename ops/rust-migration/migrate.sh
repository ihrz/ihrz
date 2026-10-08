#!/usr/bin/env bash
# ihrz Rust migration — single control command.
# Usage: migrate.sh {install|start|stop|restart|status|logs|resume|pause|progress}
set -u
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck disable=SC1091
[ -f "$SCRIPT_DIR/migrate.conf" ] && . "$SCRIPT_DIR/migrate.conf"

SERVICE="ihrz-migration.service"
UNIT_SRC="$SCRIPT_DIR/$SERVICE"
UNIT_DST="$HOME/.config/systemd/user/$SERVICE"

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
  rm -f "$SCRIPT_DIR/PAUSED"
  systemctl --user start "$SERVICE"
  "$SCRIPT_DIR/notify.sh" info "Migration orchestrator started." || true
  systemctl --user status "$SERVICE" --no-pager -l | head -12
}

cmd_stop() {
  # Safe shutdown: systemd sends SIGTERM; the loop finishes the current
  # validation step boundary only if it traps it — otherwise state.json +
  # MIGRATION.md already hold resume state, nothing is lost.
  systemctl --user stop "$SERVICE" || true
  echo "stopped. State preserved in state.json + MIGRATION.md. Resume with: $0 resume"
}

cmd_restart() { systemctl --user restart "$SERVICE"; systemctl --user status "$SERVICE" --no-pager -l | head -8; }
cmd_status() {
  systemctl --user status "$SERVICE" --no-pager -l | head -15
  echo "--- state.json ---"; cat "$SCRIPT_DIR/state.json" 2>/dev/null || echo "(no state yet)"
  echo "--- remaining units ---"; grep -cE '^\s*- \[( |~)\]' "$SCRIPT_DIR/../../MIGRATION.md" 2>/dev/null || true
}
cmd_logs() { journalctl --user -u "$SERVICE" -n "${1:-50}" --no-pager; echo "--- loop.log tail ---"; tail -n "${1:-30}" "$SCRIPT_DIR/loop.log" 2>/dev/null; }
cmd_resume() { rm -f "$SCRIPT_DIR/PAUSED"; systemctl --user start "$SERVICE"; echo "resumed."; }
cmd_pause() {
  touch "$SCRIPT_DIR/PAUSED"
  echo "paused (loop will idle; worktree untouched). Resume with: $0 resume. To stop the service too: $0 stop"
}
cmd_progress() {
  echo "=== completed_units ==="; python3 -c "import json;print(json.load(open('$SCRIPT_DIR/state.json')))" 2>/dev/null || echo "(no state yet)"
  echo "=== remaining ==="; grep -E '^\s*- \[( |~)\]' "$SCRIPT_DIR/../../MIGRATION.md" || echo "(none)"
  echo "=== last validation ==="; grep -E 'test result|warning|error' "$SCRIPT_DIR/loop.log" 2>/dev/null | tail -5 || echo "(no log)"
}

case "${1:-status}" in
  install) cmd_install ;; start) cmd_start ;; stop) cmd_stop ;;
  restart) cmd_restart ;; status) cmd_status ;; logs) cmd_logs "${2:-}" ;;
  resume) cmd_resume ;; pause) cmd_pause ;; progress) cmd_progress ;;
  *) echo "Usage: $0 {install|start|stop|restart|status|logs|resume|pause|progress}"; exit 2 ;;
esac
