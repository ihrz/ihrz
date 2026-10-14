# Intelligent QA roadmap — module state matrices (test guild 999449972615413861)

How waves use `qa/live-sdk/actions.py` to test MODULES, not commands.
Every matrix row = preconditions (actions) + probe + asserted state.
Real fixtures: admin `<@324942190222770176>`, normal `<@1132574182270570557>`,
owner `<@606504664610897920>`. Sacrificial voice for joins: `3`
(`1509600846126645408`); sacrificial text `cmd-1` only for threads/pins
(observation channel cmd-2 is NEVER mutated).

## M1 — Music (needs voice presence + FUN on, net-zero revert)

1. `voice_join(3)` → `send .play <query>` → `wait_for_bot_voice(?, 20s)` →
   assert bot joined the SELF channel; `send .nowplaying` → embed.
2. `send .pause` → `send .nowplaying` (paused leg) → `send .resume`.
3. `send .stop` / queue drain → `wait_for_bot_voice` timeout (bot leaves).
4. LastFM (needs `/lastfm login` row on the selfbot account + keys in
   `rust/config.toml`): play a >30s track, hold past threshold
   (half duration, max 4min), assert scrobble on the Last.fm profile;
   `voice_leave` mid-track → leave-credit leg. Bot-log oracle:
   `lastfm ... failed` lines.
5. FUN off at start AND end (`.fconfig on` … `.fconfig off`).

## M2 — Join-to-create / temp voice

1. Read current interface config (no write): note the lobby channel.
2. `voice_join(lobby)` → `wait_for_bot_voice(any, 15s)` → assert the BOT
   created a temp channel and moved itself there (snapshot ids).
3. `voice_leave` → assert temp channel auto-deletes (snapshot again).
4. NEVER use the lobby as a music/join target for other matrices.

## M3 — Vocal counts (`+vc`, stats)

1. `voice_snapshot` (baseline 0) → `voice_join(3)` → `send .vc` →
   assert `In Voice : **1**` → `voice_leave` → `send .vc` → `**0**`.
   (Proven 2026-10-15.)

## M4 — Roles / moderation gates (STRUCTURAL, net-zero)

1. `role_create(qa-tmp)` → `role_add(normal, qa-tmp)` →
   `member_snapshot(normal)` asserts membership → probe the gated leaf
   as normal (granted leg) → `role_remove` → `role_delete` →
   `member_snapshot` asserts revert.
2. NEVER grant Admin 1/2, never touch the owner, never delete
   non-qa roles (hard refusals in actions.py).

## M5 — Channels (STRUCTURAL, net-zero)

1. `channel_create_text(qa-tmp)` → probe (welcome/log target set,
   thread create, pin) → `channel_delete`. Observation channels
   cmd/cmd-1/cmd-2 are hard-refused.

## M6 — Welcomer / join flows

- No fake joins possible via API: assert panel render + config
  writes (`guild_snapshot` diff), and drive the LEAVE leg only with
  real accounts (operator). Everything else is shape parity.

## M7 — Giveaway / polls / timers (deferred reply legs)

- `send` + re-fetch SAME message id after the work window (ack edits
  in place); never the channel tail. Timers >60s need operator hold.

## Wave discipline with the new library

- One matrix per wave (≤25 actions), preconditions staged INSIDE the
  same plan, reverts INSIDE the same plan. A wave that leaves a
  qa-tmp channel/role/member-behind FAILED hygiene even if all
  probes passed — end every structural wave with snapshots proving
  net-zero.
- Prod side stays read-only: preconditions are staged on TEST only;
  prod probes use prod's own live state. Shape-diffs caused by
  missing prod preconditions are STATE-DIFF, not code FAIL.
