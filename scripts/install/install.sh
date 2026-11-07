#!/usr/bin/env bash
# The answers are assigned through `printf -v` in the ask* helpers.
# shellcheck disable=SC2154
#
# iHorizon Discord Bot (https://gitlab.com/ihrz/ihrz)
#
# Licensed under the Attribution-NonCommercial-ShareAlike 4.0 International (CC-BY-NC-SA-4.0)
#
# Under the following terms:
#
# - Attribution — You must give appropriate credit, provide a link to the license, and indicate if changes were made.
#   You may do so in any reasonable manner, but not in any way that suggests the licensor endorses you or your use.
#
# - NonCommercial — You may not use the material for commercial purposes.
#
# - ShareAlike — If you remix, transform, or build upon the material, you must distribute your contributions under the same
#   license as the original.
#
# - No additional restrictions — You may not apply legal terms or technological measures that legally restrict others
#   from doing anything the license permits.
#
# Was mainly developed by Ether (https://gitlab.com/veryuhq)
#
# Copyright © 2020-2026 iHorizon
#

# Installs iHorizon on Ubuntu / Debian:
#   1. system packages (git, curl, unzip, ffmpeg, melt, xvfb, emoji fonts);
#   2. Bun, Node.js and pm2;
#   3. the iHorizon repository (production or dev branch), cloned or updated;
#   4. the configuration in .env, checked by the bot's own parser;
#   5. the bot under pm2, from the checkout (updates itself with git pull on
#      every restart) or as a standalone binary built on this machine.
#
# Every question reads from /dev/tty, so `curl ... | bash` works too.
# Override the locations with IHORIZON_DIR (checkout, default ~/ihrz) and
# IHORIZON_BIN_DIR (standalone binary, default ~/ihorizon-bin).

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
DEFAULT='\033[0m'

REPO_URL="https://gitlab.com/ihrz/ihrz.git"
INSTALL_DIR="${IHORIZON_DIR:-$HOME/ihrz}"
BIN_DIR="${IHORIZON_BIN_DIR:-$HOME/ihorizon-bin}"
PM2_NAME="iHorizon"
SYSTEM_PACKAGES=(git curl unzip ffmpeg melt xvfb fonts-noto-color-emoji)

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

step() { echo -e "\n${BOLD}==> $1${DEFAULT}"; }
info() { echo -e "${CYAN}$1${DEFAULT}"; }
ok() { echo -e "${GREEN}$1${DEFAULT}"; }
warn() { echo -e "${YELLOW}$1${DEFAULT}"; }
fail() {
	echo -e "${RED}$1${DEFAULT}" >&2
	exit 1
}

# ask <variable> <question> [default]
ask() {
	local __var="$1" __question="$2" __default="${3:-}" __reply
	[[ -n "$__default" ]] && __question+=" [$__default]"
	read -r -p "$(echo -e "${CYAN}${__question}: ${DEFAULT}")" __reply </dev/tty
	printf -v "$__var" '%s' "${__reply:-$__default}"
}

# ask_secret <variable> <question>: the answer is not echoed.
ask_secret() {
	local __var="$1" __question="$2" __reply
	read -r -s -p "$(echo -e "${CYAN}${__question}: ${DEFAULT}")" __reply </dev/tty
	echo
	printf -v "$__var" '%s' "$__reply"
}

# ask_required <variable> <question> [secret]: asks again until non-empty.
ask_required() {
	local __var="$1" __question="$2" __secret="${3:-}"
	while true; do
		if [[ -n "$__secret" ]]; then
			ask_secret "$__var" "$__question"
		else
			ask "$__var" "$__question"
		fi
		[[ -n "${!__var}" ]] && return 0
		warn "This value is required."
	done
}

# ask_yes_no <question> <y|n>: returns 0 for yes.
ask_yes_no() {
	local question="$1" default="$2" answer
	while true; do
		read -r -p "$(echo -e "${CYAN}${question} (y/n) [${default}]: ${DEFAULT}")" answer </dev/tty
		answer="$(echo "${answer:-$default}" | tr '[:upper:]' '[:lower:]')"
		case "$answer" in
			y | yes) return 0 ;;
			n | no) return 1 ;;
			*) warn "Please answer y or n." ;;
		esac
	done
}

# ask_choice <variable> <question> <option>...: stores the chosen option.
ask_choice() {
	local __var="$1" __question="$2" __reply __i __option
	shift 2
	echo -e "${CYAN}${__question}${DEFAULT}"
	__i=1
	for __option in "$@"; do
		echo "  $__i) $__option"
		__i=$((__i + 1))
	done
	while true; do
		read -r -p "$(echo -e "${CYAN}Choice [1]: ${DEFAULT}")" __reply </dev/tty
		__reply="${__reply:-1}"
		if [[ "$__reply" =~ ^[0-9]+$ ]] && ((__reply >= 1 && __reply <= $#)); then
			printf -v "$__var" '%s' "${!__reply}"
			return 0
		fi
		warn "Please enter a number between 1 and $#."
	done
}

# Comma-separated Discord IDs (spaces removed), or empty.
ask_id_list() {
	local __var="$1" __question="$2" __ids
	while true; do
		ask __ids "$__question"
		__ids="${__ids// /}"
		if [[ -z "$__ids" || "$__ids" =~ ^[0-9]{15,21}(,[0-9]{15,21})*$ ]]; then
			printf -v "$__var" '%s' "$__ids"
			return 0
		fi
		warn "Expected Discord IDs (15 to 21 digits), separated by commas."
	done
}

# A single Discord ID, or empty.
ask_id() {
	local __var="$1" __question="$2" __id
	while true; do
		ask __id "$__question (leave blank for none)"
		__id="${__id// /}"
		if [[ -z "$__id" || "$__id" =~ ^[0-9]{15,21}$ ]]; then
			printf -v "$__var" '%s' "$__id"
			return 0
		fi
		warn "Expected a Discord ID (15 to 21 digits)."
	done
}

# set_env <key> <value>: writes KEY="value" in .env (replaces the line, or
# appends it). Bun expands $NAME inside double quotes, so `$` is escaped; a
# `"` or a backslash cannot be stored exactly in a .env value.
set_env() {
	local escaped
	case "$2" in
		*'"'* | *\\*)
			warn "The value of $1 contains a \" or a backslash, which .env files cannot store exactly. Check $1 in .env."
			;;
	esac
	escaped="$(printf '%s' "$2" | sed 's/\$/\\$/g')"
	ENV_KEY="$1" ENV_VALUE="$escaped" awk '
		BEGIN { key = ENVIRON["ENV_KEY"]; line = key "=\"" ENVIRON["ENV_VALUE"] "\""; done = 0 }
		index($0, key "=") == 1 { print line; done = 1; next }
		{ print }
		END { if (!done) print line }
	' .env >.env.tmp && mv .env.tmp .env
}

# Percent-encodes a value for a URL (passwords in LAVALINK_URL / DATABASE_URL).
url_encode() {
	bun -e 'process.stdout.write(encodeURIComponent(process.argv[1]))' "$1"
}

# Missing Debian packages among the given ones.
missing_packages() {
	local package
	for package in "$@"; do
		dpkg -s "$package" &>/dev/null || echo "$package"
	done
}

pm2_has_app() {
	pm2 describe "$PM2_NAME" &>/dev/null
}

# ---------------------------------------------------------------------------
# Pre-checks
# ---------------------------------------------------------------------------

if ! command -v apt-get &>/dev/null; then
	fail "This script supports Ubuntu / Debian-based distributions only (apt-get not found)."
fi

if [[ "$(id -u)" -eq 0 ]]; then
	fail "Run this script as your normal user, not as root: it uses sudo when needed, and the bot must not run as root."
fi

HAS_INIT_SYSTEM=true
if ! command -v systemctl &>/dev/null && ! command -v rc-status &>/dev/null; then
	HAS_INIT_SYSTEM=false
fi

echo -e "
██╗██╗  ██╗ ██████╗ ██████╗ ██╗███████╗ ██████╗ ███╗   ██╗
██║██║  ██║██╔═══██╗██╔══██╗██║╚══███╔╝██╔═══██╗████╗  ██║
██║███████║██║   ██║██████╔╝██║  ███╔╝ ██║   ██║██╔██╗ ██║
██║██╔══██║██║   ██║██╔══██╗██║ ███╔╝  ██║   ██║██║╚██╗██║
██║██║  ██║╚██████╔╝██║  ██║██║███████╗╚██████╔╝██║ ╚████║
╚═╝╚═╝  ╚═╝ ╚═════╝ ╚═╝  ╚═╝╚═╝╚══════╝ ╚═════╝ ╚═╝  ╚═══╝"
echo -e "${BOLD}Welcome to the iHorizon installation script.${DEFAULT}"
echo "It installs what iHorizon needs, writes its configuration and starts the bot."
echo "Nothing you type is sent anywhere except to the services you configure (Discord, Lavalink, your database)."
echo "You can read this script with any text editor before running it."
echo

ask_yes_no "Do you want to continue?" y || {
	warn "Installation cancelled."
	exit 0
}

# ---------------------------------------------------------------------------
# 1. System packages
# ---------------------------------------------------------------------------

step "System packages"

mapfile -t to_install < <(missing_packages "${SYSTEM_PACKAGES[@]}")

if ((${#to_install[@]})); then
	info "Installing: ${to_install[*]}"
	sudo apt-get update
	sudo apt-get install -y "${to_install[@]}"
else
	ok "Already installed: ${SYSTEM_PACKAGES[*]}"
fi

# ---------------------------------------------------------------------------
# 2. Bun, Node.js and pm2
# ---------------------------------------------------------------------------

step "Bun, Node.js and pm2"

export BUN_INSTALL="$HOME/.bun"
export PATH="$BUN_INSTALL/bin:$PATH"
BUN_FRESHLY_INSTALLED=false

if command -v bun &>/dev/null; then
	ok "Bun $(bun --version) is already installed."
else
	info "Installing Bun..."
	curl -fsSL https://bun.sh/install | bash
	BUN_FRESHLY_INSTALLED=true
fi

# The Bun installer adds itself to ~/.bashrc; keep it there for older installs.
if ! grep -q 'BUN_INSTALL' "$HOME/.bashrc" 2>/dev/null; then
	echo 'export BUN_INSTALL="$HOME/.bun"' >>"$HOME/.bashrc"
	echo 'export PATH="$BUN_INSTALL/bin:$PATH"' >>"$HOME/.bashrc"
fi

# pm2 runs on Node.js.
export NVM_DIR="$HOME/.nvm"
if ! command -v node &>/dev/null; then
	if [[ ! -s "$NVM_DIR/nvm.sh" ]]; then
		info "Installing nvm..."
		curl -fsSL https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash
	fi
	# shellcheck source=/dev/null
	. "$NVM_DIR/nvm.sh"
	info "Installing Node.js LTS..."
	nvm install --lts
else
	ok "Node.js $(node --version) is already installed."
fi

if [[ -s "$NVM_DIR/nvm.sh" ]] && ! command -v npm &>/dev/null; then
	# shellcheck source=/dev/null
	. "$NVM_DIR/nvm.sh"
fi

if command -v pm2 &>/dev/null; then
	ok "pm2 $(pm2 --version) is already installed."
else
	info "Installing pm2..."
	npm install -g pm2
fi

# ---------------------------------------------------------------------------
# 3. iHorizon repository
# ---------------------------------------------------------------------------

step "iHorizon repository"

ask_choice git_branch "Which branch do you want to run?" "production" "dev"

if [[ -d "$INSTALL_DIR/.git" ]]; then
	info "Updating the existing checkout in $INSTALL_DIR..."
	cd "$INSTALL_DIR"
	git fetch origin "$git_branch"
	git checkout "$git_branch"
	git pull --ff-only origin "$git_branch"
elif [[ -e "$INSTALL_DIR" ]]; then
	fail "$INSTALL_DIR exists but is not a git checkout. Move it away or set IHORIZON_DIR to another folder."
else
	info "Cloning into $INSTALL_DIR..."
	git clone -b "$git_branch" "$REPO_URL" "$INSTALL_DIR"
	cd "$INSTALL_DIR"
fi

info "Installing the dependencies..."
bun install

# ---------------------------------------------------------------------------
# 4. Configuration (.env)
# ---------------------------------------------------------------------------

step "Configuration"

RUN_SETUP=true

if [[ -f ".env" || -f "src/files/config.ts" ]]; then
	if [[ -f "src/files/config.ts" ]]; then
		warn "A configuration was found in src/files/config.ts (the old format)."
	else
		warn "A configuration was found in .env."
	fi

	if ask_yes_no "Keep it? (no: answer the setup questions again)" y; then
		RUN_SETUP=false
		# The configuration now lives in .env: move the old file into it.
		if [[ -f "src/files/config.ts" ]]; then
			bun run config:env
		fi
	fi
fi

if [[ "$RUN_SETUP" == "true" ]]; then
	if [[ -f ".env" ]]; then
		backup=".env.bak.$(date +%Y%m%d%H%M%S)"
		cp .env "$backup"
		warn "Your current .env was saved as $backup."
	fi
	# The old format would win over the new .env: keep it aside.
	if [[ -f "src/files/config.ts" ]]; then
		mv "src/files/config.ts" "src/files/config.ts.bak.$(date +%Y%m%d%H%M%S)"
	fi
	cp .env.example .env
	chmod 600 .env

	echo
	info "Answer the questions below. Press Enter to keep the value between brackets."
	info "Every answer can be changed later in $INSTALL_DIR/.env (see https://www.ihorizon.org/docs/self-hosting/configuration/)."

	# --- Discord ---
	echo -e "\n${BOLD}Discord${DEFAULT}"
	ask_required bot_token "Bot token (hidden while you type)" secret
	ask_id_list owners "Owner user IDs, comma-separated (full rights on the bot)"

	if ask_yes_no "Trigger prefix commands by mentioning the bot (instead of a prefix)?" n; then
		mention=true
		prefix="?"
	else
		mention=false
		ask prefix "Prefix for message commands" "?"
	fi

	if ask_yes_no "Show the bot as connected from a phone?" n; then
		phone_presence=true
	else
		phone_presence=false
	fi

	set_env BOT_TOKEN "$bot_token"
	set_env OWNERS "$owners"
	set_env MESSAGE_COMMANDS_MENTION "$mention"
	set_env DEFAULT_PREFIX "$prefix"
	set_env PHONE_PRESENCE "$phone_presence"

	# --- Music (Lavalink) ---
	echo -e "\n${BOLD}Music (Lavalink)${DEFAULT}"
	lavalink_urls=()
	if ask_yes_no "Do you have a Lavalink server for the music module?" n; then
		while true; do
			ask_required ll_host "Lavalink host (e.g. lavalink.example.com)"
			if ask_yes_no "Is it reached over TLS (wss://)?" n; then
				ll_scheme="wss"
				ll_default_port=443
			else
				ll_scheme="ws"
				ll_default_port=2333
			fi
			ask ll_port "Port" "$ll_default_port"
			ask_required ll_password "Password (hidden)" secret
			ask ll_id "Name of this node" "node$((${#lavalink_urls[@]} + 1))"

			lavalink_urls+=("${ll_scheme}://$(url_encode "$ll_password")@${ll_host}:${ll_port}?id=$(url_encode "$ll_id")")

			ask_yes_no "Add another Lavalink node?" n || break
		done
		ask_id lavalink_logs "Channel ID for Lavalink error logs"
		set_env LAVALINK_LOGS_CHANNEL_ID "$lavalink_logs"
	else
		warn "Skipped: music commands stay unavailable until LAVALINK_URL is set."
	fi
	set_env LAVALINK_URL "$(IFS=,; echo "${lavalink_urls[*]:-}")"

	# --- Database ---
	echo -e "\n${BOLD}Database${DEFAULT}"
	ask_choice db_choice "Where should iHorizon store its data?" \
		"SQLite (a file in src/files, recommended)" \
		"PostgreSQL" \
		"HorizonDB" \
		"JSON file (small bots, testing)"

	case "$db_choice" in
		PostgreSQL)
			ask_required pg_host "PostgreSQL host"
			ask pg_port "Port" "5432"
			ask_required pg_user "User"
			ask_secret pg_password "Password (hidden)"
			ask_required pg_database "Database name"
			database_url="postgres://$(url_encode "$pg_user"):$(url_encode "$pg_password")@${pg_host}:${pg_port}/$(url_encode "$pg_database")"
			;;
		HorizonDB)
			ask_required hdb_host "HorizonDB host"
			ask hdb_port "Port" "8080"
			ask_required hdb_login "Login"
			ask_secret hdb_password "Password (hidden)"
			database_url="ws://$(url_encode "$hdb_login"):$(url_encode "$hdb_password")@${hdb_host}:${hdb_port}"
			;;
		JSON*) database_url="json" ;;
		*) database_url="sqlite" ;;
	esac
	set_env DATABASE_URL "$database_url"

	# --- Logs and extras ---
	echo -e "\n${BOLD}Logs and extras${DEFAULT}"
	ask_id guild_logs "Channel ID where the bot logs the servers it joins and leaves"
	ask_id report_channel "Channel ID for bug reports"
	ask blacklist_picture "Image URL shown to blacklisted users (leave blank for none)"
	set_env GUILD_LOGS_CHANNEL_ID "$guild_logs"
	set_env REPORT_CHANNEL_ID "$report_channel"
	set_env BLACKLIST_PICTURE_URL "$blacklist_picture"

	if ask_yes_no "Set up Last.fm for the scrobbler module?" n; then
		ask_required lastfm_key "Last.fm API key"
		ask_required lastfm_secret "Last.fm shared secret (hidden)" secret
		set_env LASTFM_API_KEY "$lastfm_key"
		set_env LASTFM_SHARED_SECRET "$lastfm_secret"
	fi

	if ask_yes_no "Enable development mode (verbose logs)?" n; then
		set_env DEV_MODE true
	else
		set_env DEV_MODE false
	fi

	ok "Configuration written to $INSTALL_DIR/.env."
fi

# The bot's own parser: a typo is reported now instead of at the first start.
step "Checking the configuration"
if ! bun -e '
	import { loadConfig } from "./src/core/modules/envConfig.ts";
	try {
		const config = await loadConfig();
		process.stdout.write(
			`Owners: ${config.owners.users.length}, Lavalink nodes: ${config.lavalink.nodes.length}, database: ${config.database?.method}\n`
		);
	} catch (error) {
		process.stderr.write(`${error instanceof Error ? error.message : error}\n`);
		process.exit(1);
	}
'; then
	fail "The configuration is invalid (see the message above). Fix $INSTALL_DIR/.env, then run this script again and keep your configuration."
fi
ok "The configuration is valid."

# ---------------------------------------------------------------------------
# 5. Running the bot
# ---------------------------------------------------------------------------

step "Running the bot"

ask_choice run_mode "How do you want to run iHorizon?" \
	"From the checkout (recommended: updates itself with git pull on every restart)" \
	"As a standalone binary built on this machine (updates only when you run this script again)"

# One bot at a time: a second copy would answer every command twice.
if pm2_has_app; then
	info "Stopping the previous $PM2_NAME pm2 process..."
	pm2 delete "$PM2_NAME" >/dev/null
fi

if [[ "$run_mode" == From* ]]; then
	pm2 start pm2.config.cjs
	RUN_DIR="$INSTALL_DIR"
else
	info "Building the binary..."
	bun run build:binary
	mkdir -p "$BIN_DIR"
	cp dist/ihorizon "$BIN_DIR/ihorizon"
	cp .env "$BIN_DIR/.env"
	chmod 600 "$BIN_DIR/.env"

	# Moving an existing bot: its data and version files come along once,
	# without them the first start would announce the release again.
	if [[ -d src/files && ! -d "$BIN_DIR/src/files" ]]; then
		mkdir -p "$BIN_DIR/src"
		cp -r src/files "$BIN_DIR/src/files"
	fi
	for version_file in v.txt v.old.txt; do
		if [[ -f "$version_file" && ! -f "$BIN_DIR/$version_file" ]]; then
			cp "$version_file" "$BIN_DIR/$version_file"
		fi
	done

	pm2 start "$BIN_DIR/ihorizon" --name "$PM2_NAME" --cwd "$BIN_DIR" \
		--interpreter none --kill-timeout 15000 --restart-delay 5000 --time
	RUN_DIR="$BIN_DIR"
fi

pm2 save --force

if [[ "$HAS_INIT_SYSTEM" == "true" ]]; then
	if ask_yes_no "Start iHorizon automatically when this machine boots?" n; then
		startup_command="$(pm2 startup -u "$USER" --hp "$HOME" | grep -E '^\s*sudo ' | tail -1 || true)"
		if [[ -n "$startup_command" ]]; then
			eval "$startup_command"
			pm2 save --force
			ok "iHorizon will start at boot."
		else
			warn "pm2 did not print a startup command: run 'pm2 startup' yourself."
		fi
	fi
else
	warn "No systemd or openrc found: pm2 cannot start iHorizon at boot on this machine."
fi

echo
ok "iHorizon is installed and running from $RUN_DIR."
echo "  Logs:       pm2 logs $PM2_NAME"
echo "  Restart:    pm2 restart $PM2_NAME"
echo "  Settings:   $RUN_DIR/.env (restart after a change)"
if [[ "$BUN_FRESHLY_INSTALLED" == "true" ]]; then
	warn "Bun was just installed: open a new terminal (or run 'source ~/.bashrc') to use the bun command."
fi
