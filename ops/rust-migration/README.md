# iHorizon Rust migration — autonomous orchestrator

Runs the TypeScript → Rust migration unattended until every unit in
`MIGRATION.md` is done and verified. Lives in `ops/rust-migration/` (outside
`src/` and `rust/src/`) so it never pollutes application sources.

## How it works

- `migrate-loop.sh` is the loop: read `MIGRATION.md` → pick the first
  unfinished unit under `## Remaining` (dependency-ordered) → run the
  `rust-migrator` opencode agent (embeds `.opencode/rust-migrator.md`,
  mandatory) for **one unit** → `cargo fmt --check` + `cargo check` +
  `cargo test` in `rust/` → git checkpoint → Discord notify → repeat.
- No global iteration limit. Failures retry per-unit
  (`MIGRATION_MAX_RETRIES`, exponential backoff, rate-limit aware), then the
  unit parks in a `PAUSED` state for human triage instead of looping forever.
- Crash-safe: resume state is `state.json` + `MIGRATION.md` + git history.
  systemd `Restart=always` revives the loop; a `flock` lockfile (released by
  the kernel on crash) guarantees a single instance per tree.
- Worker pipeline per unit: **migrator** (`rust-migrator` agent) →
  **reviewer** (`@rust-reviewer` subagent, invoked by the worker) →
  **tester** (`cargo` validation in the loop; `@rust-tester` for hard cases).
  Independent modules may run in parallel via `git worktree` (serialize
  shared files; integrate before dependents). Default is serial — safest.
- Hermes usage (verified on 0.21.6): `hermes send` for Discord, `hermes cron`
  for the progress watchdog, existing gateway service untouched
  (`hermes-gateway.service` already running).
- NixOS: user service, no `/etc/nixos` change needed. Linger already enabled.

## Commands (single entrypoint)

```sh
ops/rust-migration/migrate.sh install   # install+enable systemd user unit
ops/rust-migration/migrate.sh start     # resume (clears PAUSED) + start
ops/rust-migration/migrate.sh stop      # safe stop, state preserved
ops/rust-migration/migrate.sh restart
ops/rust-migration/migrate.sh status    # service + state.json + remaining
ops/rust-migration/migrate.sh logs [N]  # journal + loop.log tail
ops/rust-migration/migrate.sh resume    # clear PAUSED + start
ops/rust-migration/migrate.sh pause     # idle loop, tree untouched
ops/rust-migration/migrate.sh progress  # units left + last test results
```

Config: `migrate.conf` (branch, Discord target, agent, retries, timeouts).
Discord helper: `notify.sh` (wraps `hermes send`, never touches tokens).

## Parallel coordinator (authoritative, 2026-10-09)

See `README-PARALLEL.md`. `coord.sh {install|start|status|logs|pause|resume|progress|gc|recover|inventory}`
owns scheduling, worktree integration, and the queue while active — keep
the serial loop above paused (`PAUSED`) and never enable both services.

## Recovery

- Reboot/crash: `systemd --user` starts the unit on login (enabled +
  linger); the loop resumes from `state.json` + `MIGRATION.md`.
- API outage/quota: loop backs off exponentially, notifies Discord, retries.
- Wrong branch: loop parks + notifies instead of migrating the wrong tree.
- API keys: only `hermes send --list` targets; secrets stay in `~/.hermes/`.
- Live co-workers: if another agent session edits the same tree, do NOT
  fight it — the loop never resets user work, validates (`fmt` + `check` +
  `test`) before every checkpoint, and commits serialize concurrent edits.
  The 20-minute Hermes takeover job (`ihrz-migration-takeover`,
  `--continuity`) only takes over a unit when `loop.log` is stale >30min.

## Hermes cron watchdog

A 6-hourly progress summary (separate from the loop, survives loop pauses):

```sh
hermes cron create '0 */6 * * *' --name ihrz-migration-watch \
  --workdir /home/kisakay/Documents/Code/GitLab/ihrz \
  --deliver discord:#hermes \
  'Summarize the Rust migration: read ops/rust-migration/state.json and MIGRATION.md Remaining section, run `git log --oneline -3` and `systemctl --user is-active ihrz-migration.service`, report units left, last result, service state. Keep it under 500 chars. Do not modify files.'
```

## What remains manual

- External-infra blockers (Lavalink, Chromium, SMTP, API keys, DB servers).
- Triaging a unit parked after `MIGRATION_MAX_RETRIES` failures.
- Merging `rust-recode` into `dev` when the migration is verified complete.
- Any privileged (`/etc/nixos`, root) change — none required currently.
