#!/usr/bin/env bash
# ihrz Rust migration — Discord notifier.
# Reuses the existing Hermes Discord integration (gateway credentials in
# ~/.hermes/.env + ~/.hermes/config.yaml). Never handles tokens directly.
# Usage: notify.sh <kind> <message...>   (kind: info|task|fail|blocker|milestone)
set -u
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck disable=SC1091
[ -f "$SCRIPT_DIR/migrate.conf" ] && . "$SCRIPT_DIR/migrate.conf"

KIND="${1:-info}"
shift || true
MSG="$*"
DISCORD_TARGET="${MIGRATION_DISCORD_TARGET:-discord:#hermes}"
PREFIX="[migration]"

case "$KIND" in
  info)      EMOJI="ℹ️" ;;
  task)      EMOJI="🔨" ;;
  ok)        EMOJI="✅" ;;
  fail)      EMOJI="❌" ;;
  blocker)   EMOJI="⛔" ;;
  milestone) EMOJI="🎉" ;;
  *)         EMOJI="ℹ️" ;;
esac

if ! command -v hermes >/dev/null 2>&1; then
  echo "notify: hermes CLI not found, skipping: $MSG" >&2
  exit 0
fi

# Never send empty messages; cap length for Discord.
[ -z "$MSG" ] && exit 0
MSG="$(printf '%s' "$MSG" | head -c 1800)"

if ! hermes send --to "$DISCORD_TARGET" "$EMOJI $PREFIX $MSG" >/dev/null 2>&1; then
  echo "notify: hermes send failed (target=$DISCORD_TARGET), message kept in logs: $MSG" >&2
  exit 1
fi
