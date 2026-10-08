# iHorizon TS → Rust migration tracker

Source: `src/` (TypeScript, discord.js, ~666 files). Target: `rust/`
(serenity 0.12 + poise 0.6). Rules: every unit must compile
(`cargo check`), pass tests (`cargo test`), stay rustfmt-clean, and be
recorded here before moving on.

## Status legend

- [x] done (ported + unit-tested + wired where possible)
- [~] partial (pure logic ported, external infra pending)
- [ ] todo
- [!] blocked (needs external service/key, genuinely not continuable offline)

## Units

### Core
- [x] bootstrap/sharding (`main.rs`, `bot.rs`, `core::release`)
- [x] config env-first (`config.rs`)
- [x] logger (`logger.rs`)
- [x] i18n YAML reuse + coverage tests (`lang.rs`)
- [x] sqlite kv + guild_lang/prefix/blacklist (`db.rs`)
- [x] command registry 28/28 categories (`commands/`)
- [x] global blacklist gate + dynamic prefix (`bot.rs`)
- [x] cooldowns + pagination (`executor.rs`)
- [x] release consume-once (`core::release`)
- [x] schedulers: schedule/giveaway/temprole-tempban sweeps (`scheduler.rs`)
- [x] serenity EventHandler wired (`events_handler.rs`, `events.rs`)
- [x] transcripts builder + ticket close wiring (`transcript.rs`)
- [x] embed builder model (`embed_builder.rs`)
- [x] notifier dedup + counter check (`notifier.rs`)
- [x] voice helpers: source routing, proximity, guard, queue (`voice.rs`)
- [x] audio backend trait + mock (`audio.rs`)
- [x] SVG cards replacing html2png (`cards.rs`)

### Commands (28 categories)
- [x] antispam, backup, bot, confession, economy, fun, giveaway,
      guildconfig, h247, invitesmanager, membercount, moderation, music,
      newfeatures, owner, pfps, profil, ranks, rolereactions, schedule,
      security, starboard, stats, sticky, tag, ticket, tts, utils
- [x] U1 economy shop admin (role add/delete/list, boost-set)
- [x] U2 ranks config setters (channel/ignore/message/roles) + XP ignore
      gate + level-up message + role rewards wired in message handler
- [x] U3 fun animal live HTTP fetch (reqwest)
- [x] U4 utils remaining interactive (embed post, massmove, leash...)
- [x] U9 fun percents (rate/gay/stench), trans (MyMemory), prevnames read,
      stats tops + channel tracking, ticket set-here/log-channel/category,
      moderation lock/unlock + rolepanel, autoreact list/remove, voice
      move/mute, ticket panel V2, SVG cards wired, audio backend mock
- [x] U10 join gates (blockbot/toonew/joindm/joinrole/nickkicker),
      custom automod (5 detectors + enforcement), voicedashboard setters,
      suggestions (+thread/record/accept/deny), nick-kicker, suggest channel
- [x] U11 protection slash (rules/sanction/allowlist, TS keys), notifier
      CRUD, blogger CRUD + live RSS validation, lastfm surface
- [x] U12 legacy MessageCommands (autofeur/antiexe/reacts/welcomer/updates/
      shardinfo/status-embed/langstats/nitrofdp/securewebhook) + enforcements
- [x] U13 context menus (lookup/love/question/play), honeypot
      (config/post/claim-ban)
- [x] U14 slowmode, sticker steal, webhook/admin guards, github-lines
      unfurl, ghost-ping config
- [x] U15 emojis sync (base64 maison, 205 assets)
- [x] U16 infra monitoring (TCP Lavalink + 60s tick + kv status)
- [x] U17 temp voice dashboard (panel + name/limit/privacy/claim/delete)
- [x] U18 confession author reveal, tempvoice trust/untrust,
      member-kick audit, channel-update guard
- [x] U19 membercount + pfps live ticks, config-show, autologs,
      aliases, webhook/admin guards, github unfurl, slowmode/sticker
- [x] U20 autorenew setter + clone-rotate sweep, tempvoice transfer,
      nightmode tick stays live-only (channel-op semantics need live guild)
- [x] U21 perm system (UTILS.PERMS levels + global hook), welcomer
      migrated to GUILD.GUILD_CONFIG + leave messages, ghost-ping,
      slowmode/sticker/where/serverpic, trans, affinity percents
- [x] U22 core functions batch (ms full FR units, number, progress,
      sanitize, mask, urls, image/link gates, emoji, embed validators,
      batch, shard, date, gateway, owners, options, buckets, oauth,
      niceBytes, password, db latency, intent self-heal wired,
      expressions, assets, logs-channel, warnlist dates, eco beautify,
      automod/link gates wired, blacklist owner gate, status embed)
- [x] U23 PUNISHPUB full flow (flags + ban/kick/mute + whitelist + media)
- [x] U25 bot lore/status (YAML), owner bledit, nickrole/rolelimit,
      renew/sync, confession-list, backup save/restore aliases
- [x] U26 autoreact master switch, MessageCommands full audit
      (24/25, 4 meme mergers blocked)
- [x] U27 true zero warnings, snipe content via cache, skullboard
      reactions, ticket purge, nick history, freeze list, rolelimit
      enforcement, emojis steal, ghost commands
- [x] U28 fun config kill-switch, tag whitelists + gates, blacklist join
      gate, animals batch, vkick, grosbg/setup/blogger-poll
- [x] U29 derank/massiverole/wakeup/derogation/vc/bringall/talk/untalk/
      allbots/role-members/inviteinfo/allwebhooks/admin-users/67/
      setmentionrole(+enforcement)/slowmode/sticker/where/serverpic/
      renew/sync/zip-emojis/unzip/zip-stickers/renewvc/nickrole/rolelimit/
      emojis-steal/trans/lock/unlock
- [x] U24 invites tracking (create/delete cache, join attribution,
      leaves), xpChannels gate, confession archive, captcha alphabet,
      server-logs poster (moderation/message)
### Events
- [x] ready, guildCreate/Delete, memberAdd/Remove, message (XP/stats,
      counter, autoreact, sticky, suggestions, antispam), messageDelete
      (snipe), reactions (roles + starboard), userUpdate (prevnames),
      component interactions (confession modal, giveaway join,
      roleselect, rolepanel)
- [x] U5 protection punish executors (role/channel/ban/kick guards)
- [x] U6 voicedashboard temp voice
- [x] U7 voice session tracking + coins (onVoiceUpdate)
- [x] U8 giveaway requirement checks (invites/messages/roles)

### Blocked (external infra)
- [!] Lavalink audio playback/voice (needs server; mock ready)
- [!] html2png Chromium renders (replaced by SVG where feasible)
- [!] SMTP mailer (needs creds)
- [!] Twitch/YouTube/Kick + Blogger live polling (needs API keys)
- [!] MySQL/Postgres drivers (needs servers)
- [!] Flowery TTS speak (needs Lavalink + key)

## Remaining (offline-continuable, dependency order)

Source references are TS paths under `src/`; targets are files under `rust/src/`.

1. Component interactions with no Rust counterpart yet (wire into
   `events_handler.rs` component router; depends on: executor,
   ticket/confession/voicedashboard state — all ported):
   - [x] `Interaction/Components/Buttons/newsletter-toggle.ts`
     (legacy.rs toggle_newsletter_bl + handle_newsletter_toggle,
     router-wired, 2 tests)
   - [x] `Interaction/Components/Buttons/confessionres.ts`
     (confession.rs handle_confession_response + find_confession_by_code,
     archive now stores code/message_id/thread_id, router-wired, 1 test)
   - [x] `Interaction/Components/Buttons/new-confession-button.ts`
     (handle_confess_button: disable gate, panel binding via
     panel_target, cooldown reply, lang modal, #code title, respond
     button, server log; 1 test. Deferred: case_private avatar footer,
     panel-message rotation)
   - [x] `Interaction/Components/Buttons/t-embed-delete-ticket.ts`
     (ticket.rs handle_ticket_embed_delete: row drop, owner DM,
     logs embed, channel delete; 2 tests)
   - [x] `Interaction/Components/Buttons/t-embed-transcript-ticket.ts`
     (handle_ticket_embed_transcript: ack + DM HTML + follow-up)
   - [x] `Interaction/Components/SelectMenu/t-embed-select-user.ts`
     (handle_ticket_select_user: opener gate, sync overwrites,
     announce + log)
   - [x] temp-voice `temporary_voice_block_button.ts`,
     `temporary_voice_privacy_button.ts`,
     `temporary_voice_trust_button.ts`
     (voicedashboard.rs: block button + user-select trust/untrust/
     block menus with overwrite sync, 6-option privacy menu,
     handle_tempvoice_select, sync_members + privacy_rule; 2 tests)
2. Slash subcommand surface audit (depends on: 1 + existing command
   modules; mostly thin wrappers over ported state):
   - [x] `SlashCommands/protection/` allowlist + actions parity
     (verified: rule all/cls, sanction, show, allowlist add/remove/
     show ported; TS member/allowlist/nobody modes simplified to
     on/off bool in both store and guard — known delta, U11)
   - [x] `SlashCommands/guildconfig/` automod + perm + welcomerPanel +
     join-ghostping parity. Done: perm-roles-create/edit (UTILS.roles
     map, owner gate) + role-hierarchy level wired into the bot gate
     (executor::role_level); perm-change/perm-delete grant manager
     (!command.ts change/delete actions); config-save/
     config-restore encrypted backup (AES-256-GCM/PBKDF2 interop
     verified against TS vector); perm-list-all grouped
     paged overview + perm-delete-all bulk sweep (!command.ts
     list/delete-all actions); wc-channel/wc-embed/wc-text/
     wc-components welcomer setters (panel channel/embed/toggle keys;
     1 test). Deferred: joinbanner image config (preview needs
     html2png), interactive panel UX itself (replaced by setters)
   - [~] `SlashCommands/authrestore/` full set (!get/!set/!roles/
     !delete/!force-join): offline-portable pieces already ported
     (funcs.rs GatewayMethod URL table + oauth2_link builder, U22).
     The subcommands themselves call the HorizonGateway HTTP API
     (apiToken/secretCode, member force-join) — external infra,
     see Blocked.
3. Verification baseline (2026-10-08): `cargo test --workspace`
   234 passed / 0 failed; `cargo fmt --check` clean; `cargo clippy
   --workspace` zero warnings. Re-run after each unit.

## Orchestrator (autonomous loop, 2026-10-08)

- Location: `ops/rust-migration/` (outside `src/` and `rust/src/`).
- Loop: `migrate-loop.sh` picks the first unfinished unit under
  `## Remaining`, runs `opencode run --agent rust-migrator` for one unit
  (agent embeds `.opencode/rust-migrator.md`; worker invokes
  `@rust-reviewer` for significant units), validates
  (`cargo fmt --check`, `cargo check --workspace`, `cargo test
  --workspace` in `rust/`), checkpoints via git, notifies via
  `hermes send` to `discord:#hermes`, repeats. No global iteration limit.
- Retries: `MIGRATION_MAX_RETRIES=5` per unit, exponential backoff,
  rate-limit aware; then parks (`PAUSED`) + Discord triage ping.
- Single instance: `flock` on `.loop.lockfile` (crash-safe) + one
  `systemd --user` unit (`ihrz-migration.service`, `Restart=always`,
  linger on, network-online ordered). Control: `migrate.sh
  {install|start|stop|restart|status|logs|resume|pause|progress}`.
- Hermes 0.21.6 verified: gateway `hermes-gateway.service` running,
  Discord target `discord:#hermes` listed via `hermes send --list`.
  Watchdog: 6-hourly `hermes cron` progress summary (see
  `ops/rust-migration/README.md`).
- Validation commands: `cargo fmt --all -- --check`,
  `cargo check --workspace`, `cargo test --workspace` (from `rust/`).
- Baseline re-verified 2026-10-08: 233 passed / 0 failed.


## Log
- 2026-10-08: tracker created. Baseline: 158 tests, 63 commands, fmt clean.
- 2026-10-08: U1-U9 done. 166 tests, 78 commands, fmt clean, clippy 1
  cosmetic. All offline-continuable units complete; remainder is
  genuinely blocked on external infra (see Blocked section).
- 2026-10-08: resurvey found offline-continuable gaps (7 component
  interactions + 3 slash-surface audits, see Remaining). Fixed
  rustfmt drift in rust/src/commands/moderation.rs; fmt clean
  re-verified. Full cargo check/test still pending (timed out).
- 2026-10-08: ported newsletter-toggle button (parse + toggle pure
  fns, owner gate, kv `0`/`newsletter_bl`, router-wired). Full suite:
  222 passed, 0 failed; fmt clean.
- 2026-10-08: ported confessionres button (code lookup, cooldown
  reply, modal, thread post, server-log + reveal button; archive
  extended with code/message_id/thread_id). Suite: 223 passed,
  0 failed; fmt + clippy clean.
- 2026-10-08: new-confession-button parity pass (disable gate, panel
  binding, 5min default + cooldown reply, lang modal 2..2500,
  maskLink, #code title, respond button, thread name, mod log,
  shared post_confession_log helper). Suite: 224 passed, 0 failed;
  fmt + clippy clean.
- 2026-10-08: ticket embed controls (t-embed-delete/transcript/
  select-user: TicketDelete/Transcript/AddMember_2 flows, shared
  channel_transcript_html + find_ticket_by_channel helpers, router-wired).
  Suite: 226 passed, 0 failed; fmt + clippy clean.
- 2026-10-08: temp-voice block/trust/privacy parity (select menus +
  overwrite sync + summary embeds; trust/untrust modals replaced).
  Suite: 228 passed, 0 failed; fmt + clippy clean.
- 2026-10-08: perm role-hierarchy parity (UTILS.roles map,
  perm-roles-create/edit owner-gated commands, role_level wired into
  bot gate max(USER_PERMS, roles)). Suite: 230 passed, 0 failed;
  fmt + clippy clean.
- 2026-10-08: perm grant manager (perm-change toggles + level with
  change summary, perm-delete single reset, legacy number format in
  load_cmd_perms). Suite: 231 passed, 0 failed; fmt + clippy clean.
- 2026-10-08: encrypted config backup (config-save gateway/file-DM
  paths, config-restore attachment decrypt + row replace; new
  aes-gcm/pbkdf2/sha2/rand/hex deps, HORIZON_API_TOKEN/GATEWAY/BOT_ENV
  config). Suite: 232 passed, 0 failed; fmt + clippy clean.
- 2026-10-08: perm overview + bulk sweep (perm-list-all grouped
  embed with page param, perm-delete-all single-target sweep).
  Suite: 233 passed, 0 failed; fmt + clippy clean.
- 2026-10-08: welcomer panel parity via setters (wc-channel/wc-embed/
  wc-text/wc-components over the GUILD.GUILD_CONFIG blob; banner
  preview stays html2png-blocked). Suite: 234 passed, 0 failed;
  fmt + clippy clean.
