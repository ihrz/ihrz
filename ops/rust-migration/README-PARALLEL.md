# iHorizon Rust migration — parallel coordinator (authoritative)

Runs the TypeScript → Rust migration with up to `MIGRATION_MAX_WORKERS`
isolated workers (one git worktree + branch per task), a durable queue,
an explicit integrate pipeline, and continuous gap discovery. Lives in
`ops/rust-migration/` (outside `src/` and `rust/src/`).

## Authority

**This coordinator is the single authoritative scheduler.** While it is
active, the legacy serial loop (`migrate-loop.sh` /
`ihrz-migration.service`) MUST stay paused: `coord.sh start` guarantees the
`PAUSED` guard file, and the coordinator refuses to run concurrently with
another coordinator (flock on `.coordinator.lockfile`). Never enable both
services at once.

Why not Hermes kanban as the queue (verified 2026-10-09, Hermes 0.21.6)?
`hermes kanban dispatch` spawns Hermes agent profiles, not the
`opencode run --agent rust-migrator` workers this migration is built on
(proven provider/model pin in `coordinator.conf`). So the queue is a
durable JSON file with the same guarantees (atomic claims, deps, retries),
and Hermes stays in its proven roles: Discord notify (`hermes send`) and
the 6-hourly watchdog cron.

## Layout

| File | Role |
|---|---|
| `queue.json` | durable task queue (gitignored; mirrored into `MIGRATION.md` + git on every integration) |
| `mq.py` | atomic queue ops: `init/add/get/set/list/next/claim/heartbeat/complete/retry-or-block/release/rm/stats/stale` |
| `coordinator.sh` | authoritative loop: reclaim stale → pipeline → integrate → dispatch → inventory-on-empty |
| `worker.sh` | one task in `.worktrees/<id>` (`wt/<id>`): opencode agent → validate → needs-review. Never commits/merges/pushes |
| `integrate.sh` | 8-step merge pipeline: scope → diff → tests → review gate → merge --no-ff → validate → records → cleanup |
| `inventory.sh` | gap scan: 666 TS files vs Rust evidence → verified `implement` tasks, ambiguous groups → `inventory` triage tasks, infra → blocked, scaffolding → excluded with justification |
| `inventory-scan.md` | last scan report (gitignored runtime state) |
| `coord.sh` | control: `install/start/stop/restart/status/logs/pause/resume/progress/gc/recover/inventory` |
| `coordinator.conf` | config (`MIGRATION_MAX_WORKERS=3`, timeouts, retries, models). All vars are env-overridable defaults |
| `ihrz-migration-coordinator.service` | systemd user unit (`Restart=always`) |
| `tests/test-coordinator.sh` | 21 orchestration tests (fixture repo + mock opencode) |
| `logs/`, `workers/` | structured logs per task/worker (gitignored) |

Task schema: stable id, `type` (inventory/implement/test/review/integrate),
description + acceptance, `scope` (rust path prefixes), `depends_on`,
priority, owner, timeout + `max_retries`, tests, review verdict,
integration commit, history. Pipeline per implement unit:
`implement → REVIEW-<id> → integrate → done`. A failed review files
`REWORK-<id>` and blocks completion (`mq.py complete` refuses `done`
without `review.verdict=pass` unless `--force`, which is recorded).

Conflict prevention: `mq.py claim/next` refuse tasks whose scope prefixes
overlap any `running`/`integrating` task (`""` = tree-wide). Workers never
share files.

## Exact commands

```sh
# install the systemd unit (copies + daemon-reload + enable; does NOT start)
ops/rust-migration/coord.sh install

# launch (pauses legacy loop via PAUSED guard, starts service)
ops/rust-migration/coord.sh start

# monitor
ops/rust-migration/coord.sh status          # service + queue + live workers + worktrees + validation tail
ops/rust-migration/coord.sh progress        # open / failed / last integration / last inventory
ops/rust-migration/coord.sh logs [N]        # journal + coordinator.log tail
python3 ops/rust-migration/mq.py list --status queued,running,needs-review,review-failed,integrating
python3 ops/rust-migration/mq.py get <TASK-ID>

# pause (no new dispatch; workers keep claims/diffs) / resume
ops/rust-migration/coord.sh pause
ops/rust-migration/coord.sh resume

# graceful stop (SIGTERM: stops scheduling, preserves claims/diffs)
ops/rust-migration/coord.sh stop

# restart recovery (releases dead-worker claims, diffs kept; prunes metadata)
ops/rust-migration/coord.sh recover
ops/rust-migration/coord.sh resume

# force a gap scan now (also runs automatically whenever the queue empties)
ops/rust-migration/coord.sh inventory

# prune merged worktrees/branches (keeps failed diffs for diagnosis)
ops/rust-migration/coord.sh gc

# run the orchestration tests (fixture repo + mock agents, real queue restored)
ops/rust-migration/tests/test-coordinator.sh
```

Queue surgery (triage corrections only, never for running tasks):

```sh
python3 ops/rust-migration/mq.py add U-NEW --type implement --title "..." --body "..." \
  --scope "rust/src/commands/fun.rs" --priority 5 --acceptance "behavior X || cargo test green"
python3 ops/rust-migration/mq.py complete <ID> --status blocked --result "why (parked for triage)"
python3 ops/rust-migration/mq.py rm <ID> --reason "false positive: <evidence>"
```

## Concurrency

Default `MIGRATION_MAX_WORKERS=3` on this host (16 cores, 31 GB RAM; one
`cargo check --workspace` ≈ 2–4 GB + 3–4 cores). The coordinator caps the
effective value at `min(MAX_WORKERS, nproc/2, mem_gb/6)` and logs it at
startup. Raise only with headroom to spare.

## Recovery model

- Coordinator crash/restart: systemd revives it; claims + worktrees + queue
  survive on disk. Stale heartbeats (`>MIGRATION_STALE_SEC`, default 900 s)
  are SIGTERMed and released with diffs preserved — or run `coord.sh recover`.
- Worker killed mid-task: worktree + branch keep the diff; the task is
  requeued (bounded retries) or parked as `failed` for triage.
- Shutdown: `coord.sh stop` stops scheduling; nothing is force-pushed,
  reset, or cleaned — ever (`reset --hard` / `clean` / `push` are absent
  from all scripts by test-enforced invariant).
- Checkpoints: every integration is a `merge --no-ff` + `MIGRATION.md` log
  line + commit. Resume state = `queue.json` + `MIGRATION.md` + git.

## Hermes long-running setup (verified, no config change needed)

- No `~/.hermes/config.yaml` change was required (backed up to
  `/tmp/hermes-config.yaml.bak` before verification; file untouched).
  Durability comes from systemd + on-disk queue, not from raising a turn
  limit: checkpoints and task state survive goal termination, process
  restart, and context exhaustion by construction. Each worker is one
  bounded `opencode run` call, so no infinite-goal capability is assumed.
- Existing crons (untouched, still active): `ihrz-migration-watch` (6-hourly
  progress to `discord:#hermes`), `ihrz-migration-takeover` (20-min stale
  `loop.log` guard for the legacy loop).
- Optional coordinator watchdog (NOT created automatically — run only if
  you want Discord summaries of the new queue):

```sh
hermes cron create '0 */6 * * *' --name ihrz-coordinator-watch \
  --workdir /home/kisakay/Documents/Code/GitLab/ihrz \
  --deliver discord:#hermes \
  'Summarize the parallel Rust migration: run ops/rust-migration/coord.sh progress and git worktree list. Keep it under 500 chars. Do not modify files.'
```

## Current state (2026-10-09)

Queue: `U-I18N` (implement, prio 5 — the single open `MIGRATION.md` unit) +
8 `TRIAGE-*`/`TRIAGE-SEED` inventory tasks from the 2026-10-09 scan
(666 TS files: 654 covered, 1 Lavalink-blocked, 11 files in triage —
including 3 genuinely never-triaged files: `contextCommandHandler`,
`avoidBanMember`, `avoidWebhookModifying`). The 483 stale
`gap-candidates.txt` entries were superseded: all previously-triaged paths
re-verify as covered; rescan promotes 0 (idempotent fixed point).

Legacy loop: `ihrz-migration.service` active but `PAUSED` (idles, owns
nothing). Do NOT `migrate.sh start` while the coordinator runs.
