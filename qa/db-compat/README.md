# db-compat — TS ↔ Rust database compatibility toolkit

Proves the TS bot (`src/`) and the Rust port (`rust/src/`) read/write identical
DB keys. Contents:

| file | what |
|---|---|
| `key-matrix.json` | per-dataset inventory: TS key templates, Rust key templates, `shapes_match`, `gaps` |
| `diff_live.py` | stdlib-only live diff: reads the same guild rows via the shared backend and compares |

## Key model (why a diff is meaningful)

- **TS**: one composed dotted wire key `"<guildId>.<PATH>"` via
  `client.db.get/set/push/delete` (`src/core/database/`, default table `json`,
  server resolves dot-nesting). Backends: HorizonDB (default `ws://127.0.0.1:8080`),
  sqlite (`src/files/db.sqlite`), postgres, json, memory.
- **Rust**: same logical key split into scope + key —
  `tbl_get/set/del(pool, gid="<guildId>", key="<PATH>")`, recomposed on the wire
  as `horizon_key == "{scope}.{key}"` (`rust/src/db.rs`). Table-first read with
  legacy flat-row (`kv`) fallback; writes dual-store table + kv.
  Codec `table_string`: strings stay plain, integers render bare, everything
  else compact JSON — matches the TS driver for JSON-serializable values.
- **Rule**: TS `"<gid>.<PATH>"` ≡ Rust `(gid="<gid>", key="<PATH>")`.
  Named horizon tables `backups` / `schedule` are shared verbatim by both sides.

No `types/database_structure.ts` exists in-tree — TS record shapes are inline at
the `set()` call sites (noted per dataset in the matrix); Rust shapes are serde
structs (`backup_types.rs`, `RankEntry`, `TicketPanel*`, `Giveaway`, …).

## Run a live diff

Both bots must point at the **same** HorizonDB backend (same URL/login/tables).
Then, from this directory:

```bash
# full guild sweep (probe user/channel default to "1"; override with --user/--channel)
python3 diff_live.py --guild <GUILD_ID> --url ws://127.0.0.1:8080 \
  --login <LOGIN> --password '<PASSWORD>'

# single dataset / offline sqlite copy (read-only)
python3 diff_live.py --guild <GUILD_ID> --only tickets
python3 diff_live.py --guild <GUILD_ID> --sqlite ../../src/files/db.sqlite
```

Suggested flow: seed state with the TS bot (e.g. set lang, open a ticket, add a
warn), run the diff, repeat the same actions from the Rust bot, diff again.
Statuses: `OK` (identical) · `MISMATCH` (exit 1) · `ONE-SIDED` (exit 1 only with
`--strict`) · `MISSING` (absent both sides — expected for features never used in
the probe guild) · `alias-*` lines cover documented dual spellings
(`GUILD.SNIPE`/`SNIPE`, `OWNER`/`GUILD.OWNER`, `USER…XP_LEVELING`/`RANKS`, …).

## Known gaps (from `key-matrix.json`, fix-or-verify list)

1. `COMMAND_LIMITS` layout differs (`UTILS.COMMAND_LIMITS…` vs
   `COMMAND_LIMITS.{gid}.{path}.{uid}`) — normalize before comparing.
2. `CUSTOM_VOICE.{gid}.{uid}` and `warn_db_key` embed the guild id *inside* the
   key — confirm call sites don't double-scope under `tbl_*`.
3. `VOICE_SESSION.{uid}` is Rust-only interim state (expected one-sided).
4. `SECURITY.*` (TS captcha config) vs Rust `security_key` (in-memory map) must
   NOT be diffed against each other; same for `temp_creation_key`.
5. Not yet inventoried: Rust blogger keys, starboard/skullboard read path, tag
   `storedTags` nesting, TS giveaway key family.

## Regenerating the inventory

```bash
# TS key templates (counts per normalized template)
/usr/bin/grep -rhoE '`[^`]*' ../../../src --include='*.ts' | grep -E '\.(GUILD|USER|UTILS|STATS|ACTIVE_VOICE|TICKET|EMBED|PFPS|COUNTER|...)' ...

# Rust key constructors + helpers
/usr/bin/grep -rnE 'format!\("[A-Z][A-Za-z_0-9.{}_-]{2,90}' ../../../rust/src --include='*.rs'
/usr/bin/grep -rnE 'fn [a-z_]*(key|path)[a-z_]*' ../../../rust/src --include='*.rs'
```
(run from `qa/db-compat/`; paths above are relative to it).
