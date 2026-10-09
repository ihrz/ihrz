#!/usr/bin/env bash
# ihrz Rust migration — continuous gap discovery → actionable queue tasks.
#
# Usage: inventory.sh [--task <id>]
#
# Pipeline (explicit, reproducible, no blind file-existence checks):
#   1. SCAN: walk src/**/*.ts; for each file extract its behavioral surface:
#      command name (rename/aliases/parent), event handler, or exported fn.
#   2. MATCH: grep rust/src for positive evidence (rename="name", handler fn,
#      exported symbol). A file with evidence is COVERED.
#   3. DEDUP: skip paths already triaged in inventory.md MANUAL sections,
#      mentioned as done in MIGRATION.md, or already queued (same stable id).
#   4. VERIFY: candidate must still exist on disk + export real behavior
#      (loader scaffolding, type-only files, templates, commented-out bodies
#      are EXCLUDED with justification, never queued).
#   5. PROMOTE: strong-signal command gaps (exported command name, zero Rust
#      hits) become `implement` tasks with stable ids + scope + acceptance.
#      Ambiguous events/core gaps become ONE `inventory` triage task per
#      directory group for agent adjudication — never blind implement tasks.
#   6. RECORD: false positives + exclusions appended to inventory-scan report
#      with justification; queue-empty triggers this script (coordinator),
#      never a blind sleep while verified gaps remain.
set -u
# Keep inherited PATH first (tests inject mock toolchains; systemd gets a
# minimal PATH) then pin the tool dirs this orchestration depends on.
export PATH="$PATH:$HOME/.bun/bin:$HOME/.local/bin:$HOME/.cargo/bin:/run/current-system/sw/bin:/usr/bin:/bin"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck disable=SC1091
[ -f "$SCRIPT_DIR/coordinator.conf" ] && . "$SCRIPT_DIR/coordinator.conf"

REPO="${MIGRATION_REPO_ROOT:-$(cd "$SCRIPT_DIR/../.." && pwd)}"
MQ="$SCRIPT_DIR/mq.py"
REPORT="$SCRIPT_DIR/inventory-scan.md"
TASK_ID=""
[ "${1:-}" = "--task" ] && TASK_ID="${2:-}"

log() { printf '%s [inventory] %s\n' "$(date -u '+%Y-%m-%dT%H:%M:%SZ')" "$*"; }

if [ -n "$TASK_ID" ]; then
  python3 "$MQ" heartbeat "$TASK_ID" >/dev/null 2>&1 || true
fi

log "scanning $REPO/src vs $REPO/rust/src"
python3 - "$REPO" "$MQ" "$REPORT" "${TASK_ID:-}" <<'EOF'
import hashlib, json, os, re, subprocess, sys, time
repo, mq, report, owner_task = sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4]
ts_now = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())

def run(*a):
    return subprocess.run(a, capture_output=True, text=True).stdout

src = os.path.join(repo, 'src')
rust = os.path.join(repo, 'rust', 'src')
mig = open(os.path.join(repo, 'MIGRATION.md'), encoding='utf-8').read()
try:
    inv = open(os.path.join(repo, 'ops', 'rust-migration', 'inventory.md'),
               encoding='utf-8').read()
except FileNotFoundError:
    inv = ''
m = re.search(r'<!-- MANUAL:TRIAGED-PATHS -->(.*?)<!-- MANUAL:TRIAGED-PATHS-END -->',
              inv, re.S)
triaged = set(l.strip() for l in m.group(1).splitlines()
              if l.strip().startswith('src/')) if m else set()

# Positive-evidence corpus: all renames + all rust identifiers.
renames, rust_text = set(), []
for dp, _, fns in os.walk(rust):
    for f in fns:
        if not f.endswith('.rs'):
            continue
        t = open(os.path.join(dp, f), encoding='utf-8', errors='ignore').read()
        rust_text.append(t)
        renames.update(re.findall(r'rename\s*=\s*"([^"]+)"', t))
        renames.update(re.findall(r'"([a-z0-9][a-z0-9_-]{2,})"', t))
corpus = '\n'.join(rust_text).lower()

# Existing queue ids (dedup).
try:
    queued = set(json.loads(run('python3', mq, 'list', '--json')))
    queued_ids = set(t['id'] for t in queued)
    queued_paths = set()
    for t in queued:
        d = t.get('description', '')
        queued_paths.update(re.findall(r'src/\S+\.ts', d))
except Exception:
    queued_ids, queued_paths = set(), set()

EXCLUDE_PATTERNS = [
    (r'!Blank.*Template\.ts$', 'TS-only scaffold, no runtime behavior'),
    (r'core/handlers/load.*\.ts$', 'discord.js fs loader scaffolding; poise registration replaces it'),
    (r'core/handlerHelper\.ts$', 'discord.js loader helper; replaced by poise'),
    (r'functions/colors\.ts$', 'ANSI constant bag; Rust uses tracing via logger.rs'),
    (r'functions/method\.ts$', 'discord.js interaction-send helper bag; replaced by poise/serenity'),
    (r'functions/wait\.ts$', 'trivial setTimeout wrapper; tokio::sleep inline'),
    (r'core/database/types\.ts$', 'type-only; runtime covered by db.rs'),
    (r'database/driver/(json|memory)\.ts$', 'single-backend decision: sqlx sqlite only'),
    (r'owner/eval\.ts$', 'arbitrary JS execution; no Rust equivalent (documented exclusion)'),
]
BLOCKED_PATTERNS = [
    (r'html2png', 'Chromium render; SVG replacement where feasible'),
    (r'kdenlive', 'needs melt/xvfb binaries'),
    (r'lavalink|playerManager', 'needs Lavalink server'),
    (r'Mailer', 'needs SMTP creds'),
    (r'postgres', 'needs Postgres server'),
    (r'searchLyrics', 'needs Lavalink node'),
    (r'tts/messageCreate', 'needs Lavalink + TTS key'),
]

def cmd_name(path):
    b = os.path.basename(path)[:-3]
    return b[1:] if b[:1] in ('!', '@') else b

def is_cmd(path):
    return any(k in path for k in ('/HybridCommands/', '/MessageCommands/',
                                   '/SlashCommands/', '/Components/',
                                   'ApplicationCommands'))

# Token-overlap evidence: handler-consolidated TS files (temp-voice buttons,
# vd setters) share no `rename` with Rust but share distinctive tokens
# (custom-ids, handler names). A file is covered when >=2 distinctive tokens
# from its path hit the Rust corpus, or 1 distinctive token + a MIGRATION.md
# mention. Generic tokens never count.
GENERIC_TOKENS = set("""button menu command channel voice guild user role set
get add remove list show create delete update message temp temporary
interaction hybrid slash component components event events core util utils
helper manager module modules data info panel new von dashboard member auto
config with channel category name position text staff lobby legacy misc fn
language code file image embed ticket giveaway fun economy tag rank stats
index main default type options argument sub hype invite suggest sticky
report rolesaver notifier blogger honeypot protection security starboard
counter suggestion rankrole context workflow workflowtemplate""".split())

def distinctive_tokens(path):
    stem = os.path.splitext(os.path.basename(path))[0]
    if stem[:1] in ('!', '@'):
        stem = stem[1:]
    dirs = os.path.dirname(path).replace('src/', ' ')
    toks = re.split(r'[^a-z0-9]+', (dirs + ' ' + stem).lower())
    return [t for t in toks if len(t) >= 4 and t not in GENERIC_TOKENS]

def token_hits(path, corpus_norm):
    return sum(1 for t in distinctive_tokens(path) if t in corpus_norm)

# A file exports a command definition (vs a handler/fragment) when it builds
# one with a discord.js builder call. Only command-surface files may
# auto-promote to `implement`; everything else goes to agent triage.
# (Deliberately strict: `name:` object keys and bare `Command` mentions are
# NOT command surface — that looseness once auto-promoted the already-ported
# temp-voice buttons.)
COMMAND_SURFACE_RE = re.compile(
    r'SlashCommandBuilder|SlashCommandSubcommandBuilder|ContextMenuCommandBuilder|'
    r'addSubcommand|setName\s*\(|setCustomId\s*\(|set_custom_id|'
    r'PermissionFlagsBits|setDMPermission', re.I)

corpus_norm = re.sub(r'[^a-z0-9]', '', corpus)

covered, excluded, blocked, strong, triage_groups = [], [], [], {}, {}
checked = 0
for dp, _, fns in os.walk(src):
    for f in fns:
        if not f.endswith('.ts'):
            continue
        rel = os.path.relpath(os.path.join(dp, f), repo)
        checked += 1
        if rel in triaged or rel in queued_paths:
            covered.append(rel)
            continue
        skip = False
        for pat, why in EXCLUDE_PATTERNS:
            if re.search(pat, rel):
                excluded.append((rel, why))
                skip = True
                break
        if skip:
            continue
        try:
            body = open(os.path.join(repo, rel), encoding='utf-8',
                        errors='ignore').read()
        except OSError:
            continue
        if not body.strip() or re.fullmatch(r'[\s\S]*?//.*commented.*',
                                            body.strip()[:200] if False else ''):
            pass
        # Commented-out body = no-op (e.g. lockVanity, linked-channel).
        code = re.sub(r'//.*', '', body)
        code = re.sub(r'/\*.*?\*/', '', code, flags=re.S)
        if len(code.strip()) < 40:
            excluded.append((rel, 'no-op: body commented out / empty'))
            continue
        for pat, why in BLOCKED_PATTERNS:
            if re.search(pat, rel, re.I) or re.search(pat, body[:2000], re.I):
                if cmd_name(rel).lower() not in renames and \
                        re.sub(r'[^a-z0-9]', '', cmd_name(rel).lower()) not in \
                        re.sub(r'[^a-z0-9]', '', corpus):
                    blocked.append((rel, why))
                    skip = True
                    break
        if skip:
            continue
        if is_cmd(rel):
            name = cmd_name(rel)
            norm = re.sub(r'[^a-z0-9]', '', name.lower())
            hits = token_hits(rel, corpus_norm)
            hit = (name in renames or norm in corpus_norm or rel in mig
                   or hits >= 2
                   or (hits >= 1 and (rel in mig or name in mig)))
            if hit:
                covered.append(rel)
            elif '/Components/' in rel:
                # Component buttons/selects are router-dispatched handler
                # fragments (customIds often generic like "modal"/"name";
                # Rust namespaces them, e.g. "tempvoice-name"). Per-file
                # auto-implement is structurally wrong — agent triage with
                # router context decides.
                triage_groups.setdefault(os.path.dirname(rel), []).append(rel)
            elif COMMAND_SURFACE_RE.search(body):
                strong.setdefault(os.path.dirname(rel), []).append(rel)
            else:
                triage_groups.setdefault(os.path.dirname(rel), []).append(rel)
        else:
            # Events/core: need behavioral judgment — group for triage
            # unless the token evidence is strong (>=2 distinctive hits).
            base = re.sub(r'[^a-z0-9]', '', os.path.splitext(f)[0].lower())
            if len(base) >= 5 and base in corpus_norm:
                covered.append(rel)
            elif rel in mig:
                covered.append(rel + '  # mentioned in MIGRATION.md')
            elif token_hits(rel, corpus_norm) >= 2:
                covered.append(rel + '  # token-overlap evidence')
            else:
                triage_groups.setdefault(os.path.dirname(rel), []).append(rel)

added = []
for group in sorted(strong):
    files = sorted(strong[group])
    digest = hashlib.sha1('\n'.join(files).encode()).hexdigest()[:8]
    area = re.sub(r'[^a-z0-9]+', '-', group.replace('src/', '').lower()
                  ).strip('-')[:40]
    tid = f"INV-{area}-{digest}"
    if tid in queued_ids:
        continue
    names = ', '.join(cmd_name(p) for p in files)[:220]
    scope = 'rust/src/commands'
    title = f"{group}/ parity ({len(files)} files: {names})"
    body = (f"Auto-promoted by inventory scan {ts_now} (strong signal: "
            f"exported command names with zero Rust evidence).\nFiles:\n" +
            '\n'.join(f'- {p}' for p in files))
    acc = (f"each command from {group} reachable with TS name/aliases || "
           f"cargo fmt/check/test green")
    rc = subprocess.run(['python3', mq, 'add', tid, '--type', 'implement',
                         '--title', title, '--body', body, '--scope', scope,
                         '--priority', '5', '--acceptance', acc],
                        capture_output=True, text=True)
    if rc.returncode == 0:
        added.append(tid)
for group in sorted(triage_groups):
    files = sorted(triage_groups[group])
    digest = hashlib.sha1('\n'.join(files).encode()).hexdigest()[:8]
    area = re.sub(r'[^a-z0-9]+', '-', group.replace('src/', '').lower()
                  ).strip('-')[:40]
    tid = f"TRIAGE-{area}-{digest}"
    if tid in queued_ids:
        continue
    title = f"Triage {group} ({len(files)} files, behavioral check)"
    body = (f"Inventory scan {ts_now} found TS modules with no cheap Rust "
            f"evidence. Adjudicate each: read the TS original, grep rust/src "
            f"for the behavior. If covered, record evidence in "
            f"ops/rust-migration/inventory.md MANUAL section. If genuinely "
            f"missing and offline-continuable, file a scoped implement task "
            f"(stable id, scope, acceptance). If infra-blocked, extend the "
            f"Blocked list in MIGRATION.md. Never auto-implement from this "
            f"task.\nFiles:\n" + '\n'.join(f'- {p}' for p in files))
    rc = subprocess.run(['python3', mq, 'add', tid, '--type', 'inventory',
                         '--title', title, '--body', body,
                         '--priority', '1'], capture_output=True, text=True)
    if rc.returncode == 0:
        added.append(tid)

with open(report, 'w', encoding='utf-8') as fh:
    fh.write(f"# Inventory scan {ts_now}\n\n")
    fh.write(f"Checked {checked} TS files: {len(covered)} covered, "
             f"{len(excluded)} excluded, {len(blocked)} blocked, "
             f"{sum(len(v) for v in strong.values())} strong gaps, "
             f"{sum(len(v) for v in triage_groups.values())} triage.\n\n")
    fh.write(f"Promoted {len(added)} tasks: " +
             (', '.join(sorted(added)) or '(none)') + "\n\n")
    if blocked:
        fh.write("## Blocked (infra, not queued)\n" +
                 ''.join(f"- {p} — {w}\n" for p, w in sorted(blocked)))
    if excluded:
        fh.write("\n## Excluded (justified, not queued)\n" +
                 ''.join(f"- {p} — {w}\n" for p, w in sorted(excluded)))

print(f"inventory: checked={checked} covered={len(covered)} "
      f"excluded={len(excluded)} blocked={len(blocked)} "
      f"strong_groups={len(strong)} triage_groups={len(triage_groups)} "
      f"promoted={len(added)}")
if added:
    print("inventory: promoted " + ', '.join(sorted(added)))
if owner_task:
    subprocess.run(['python3', mq, 'complete', owner_task, '--status', 'done',
                    '--result', f"scan promoted {len(added)} tasks"],
                   capture_output=True)
EOF
log "scan finished (report: $REPORT)"
