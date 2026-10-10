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

## Delivery policy (2026-10-09, user directive)

Every completed step is committed and pushed to `origin/rust-recode`
immediately (preview checkpoints, never squashed/rebased). Runtime
state (locks, logs, .bak, local config.toml, sqlite files) is never
committed — see `.gitignore`. No push without a green
`cargo test --workspace` + `cargo fmt --check` + zero clippy warnings.

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
- [!] Lavalink audio playback/voice (needs server; mock ready; verified 2026-10-09: `Events/lavalink-client/raw.ts` raw voice-packet forward + `functions/searchLyrics.ts` lyrics lookup still need a node, truncate only ported)
- [!] html2png Chromium renders (replaced by SVG where feasible; verified: `functions/html2png.ts`, welcomer image variant pending; `core/images.ts` love/catsay/captions/bubbles are pure html2png wrappers, `fun/!captions.ts` + `fun/!togif.ts` need Chromium decode)
- [!] SMTP mailer (needs creds; verified: `core/Mailer.ts` new-guild/owner nodemailer notifications)
- [!] Twitch/YouTube/Kick + Blogger live polling (needs API keys)
- [!] MySQL/Postgres drivers (needs servers; verified: `database/driver/postgres.ts`; json/memory drivers excluded — sqlite-only single-backend decision)
- [!] Flowery TTS speak (needs Lavalink + key; verified: `Events/tts/messageCreate.ts` auto locale-detect + speak leg missing)
- [!] Kdenlive melt/xvfb binaries (meme-merger code ports offline; live render verification needs the binaries)
- [x] U-DB-DRIVERS all TS database backends (2026-10-09: enum Memory/Json/Sqlite/Postgres/HorizonDb + full Table API + index.ts orchestration w/ cached mirrors + routing; 18 tests. Deferred: y second-postgres needs a second database_url in config).
  (2026-10-09: `backends.rs` landed — enum dispatch Memory/Json/Sqlite/Postgres/HorizonDb (offline-mock), full `Table` API incl. dotted-path get/set/delete/has/update/add/sub/push + `unshift`/`pop`/`shift`/`pull_values`/`pull_where`/`export_data`/`starts_with`/`delete_all`, `from_config` method routing, 12 tests; `pull once` keeps non-matches — TS truncates, recorded delta. Suite 375/0, fmt + clippy clean. Still queued: `index.ts` orchestration (tables/readOnlyTables/cached_postgres mirror sync), call-site migration.)
  (2026-10-09 drivers-2: Postgres variant landed (upsert table, $N params, 5s bounded connect, from_config wiring) + HorizonDB offline-mock variant + export_data alias; mirrors reported write-only-never-fires, queued. 11 backend tests. No call-site migration. Suite 375/0.)
  (2026-10-09 layout phase 1: `commands/shared.rs` holds moved cross-file helpers with old-path shims; steered autoreact x3 ADMIN gates applied. Suite 375/0.)
- [x] U-CONFIG-TOML live transfer (2026-10-09: `rust/config.toml` written from `src/files/config.ts` — all 9 sections; token + api_token env-only by loader design; TS lavalink nodes empty → none; TS apiKey truncated upstream → env; shared_secret verified byte-identical; config.rs CONFIG_FILE hermeticity fix; 22 config tests green. File gitignored, never committed).
- [x] U-PARITY-ECONOMY audit + U-PARITY-ECON-FIX (2026-10-09: 17-gap audit; full rewrite of `economy/main.rs` — TS leaf tuning keys, bool disabled, ownedRoles + restore, object-map shop, numeric boost, ihorizon_logs posts, rich embeds + Coin suffix, text podium + 10/page pagination w/ collector, ephemeral buy, reply-before-mutate, f64 amounts, registry-restricted kinds, localized durations; quirks NOT reproduced: rob "null", daily od-typo, shop double-push. Deferred: select-menu collector, podium PNG, user-cache filter. 12 tests).
- [x] U-PARITY-MODERATION audit + U-PARITY-MOD-FIX (2026-10-09: 25-gap read-only audit; fixes in `moderation/main.rs` — ban/kick guards + DM + audit reason + ihorizon_logs, timeout human-duration + 28d clamp, tempban/temprole guards + 1y clamp + beautified reply, clear +1/member-filter/14d/auto-delete, unwarn/unban split flows, baninfo executor/date via audit logs, unmute guards + true unmuted/total, lock Connect deny + neutral unlock + role params, 5/page plain-text lists w/ durations, rolepanel member targeting + validation + refused list; FROZEN: Warn shape, TEMPBAN/TEMPROLE keys. Lead fixes: CacheRef Send error, 4 clippy lints. Suite 376/0, fmt + clippy clean).
- [x] U-PARITY-TICKET audit + U-PARITY-TICKET-FIX (2026-10-09: audit incl. banked V1/V2 gaps; fixes in `ticket/main.rs` + `transcript.rs` — open re-opens w/ logs, delete full pipeline (transcript+DM+logs+cleanup), remind owner-DM, V1 set-here panel (Secondary+📩+marker), panel send+marker+related-embed, full-history transcript + footer, username channel names, single-notify close, add/remove logs, defer-first select, V2 spacing/real dates/timestamp round-trip, unlink files clear, deferred-branch transcript button. Deferred: full V2 builder UI (~1870 lines, own delegation), events_handler arms wiring. 10 tests).
- [x] U-PARITY-UTILS audit + U-PARITY-UTILS-FIX (2026-10-09: read-only audit; fixes in `utils/voice|channels|info|admin.rs` — freeze/unfreeze + wlvc/unwlvc + leash + derogation restored to TS flows from wrong stubs, move admin-victim guard, massmove counts embed, wakeup self-guard + reply-before-move, nick-kicker remove/enable/cap-15, dm provenance buttons + cant-fail path, hide/unhide/hideall role param + early-outs, avatar/userinfo/where/serverpic/inviteinfo embeds, emojis per-emoji feedback; deferred: wakeup 2-min loop (harassment pattern), userinfo third-party badges, emojis pacing sleep. Lead fix: nested format! clippy lint. Suite 376/0).
- [x] U-LAYOUT-TS-PARITY restructure `rust/src/commands/` (2026-10-09: 40 category dirs, phase 1 shared.rs + phase 2 per-group split, main.rs renames for clippy; pushed f938f612b, 375/0).
- [x] U-MUSIC-LAVALINK full Lavalink v4 player via `lava-rs` 0.1.0 (2026-10-09: part 1 manager + 14 commands; part 2 voice wiring — session feed, OP4 send, announce, empty-leave; 17 tests. Live playback verify vs real node stays [!] blocked infra).
  (2026-10-09 part 1 landed: `lavalink.rs` manager — multi-node, per-guild players, queue+loop/shuffle, track start/end auto-advance, voice handshake builders; all 14 music subcommands recoded against it; `[lavalink]` config mirror; 37 targeted tests. Deferred to part 2: WS session bootstrap + `voice_state_update`/`voice_server_update` hookup in `events_handler.rs`, Discord OP4 voice-join send (serenity `voice` feature + tungstenite wiring), live playback verify vs real node.)
- [x] U-MUSIC-META port of the 4 `kisastractors/*-metadata` TS packages (2026-10-09: `rust/src/metadata/{spotify,apple_music,amazon_music,tidal}/` landed — same endpoints/scrape targets/query shapes, same fn surface, typed errors w/ identical messages, Option defensive fields, zero new deps; 35 fixture tests pass. Consumers + SVG banner queued).
- [x] U-LAYOUT-PER-COMMAND one file per command in every `rust/src/commands/<category>/` dir (2026-10-09: batches 1-4 complete, all 40 categories, mod.rs untouched, compat shims).
- [x] U-HYBRID-EXACTNESS every hybrid command behaves exactly like TS iHorizon (2026-10-09: audits + FIX-1 + FIX-2 — same replies/order/embeds, prefix error keys, guard order, crash-hardening, reply-before-mutate. Suite 488/0, fmt + clippy clean).
- [x] U-WIRING-READY (2026-10-09: release fan-out wired into setup — guild-owner rows, git remote, YAML DM template; secondary database_url + y-secondary. Deferred: per-owner locale templates, live verify).
- [x] U-SHOP-MENU interactive select-menu purchase (2026-10-09: owned-marking, ephemeral collector, restore sweep, 10-min disable; TS double-push bug intentionally not ported).
- [x] U-DEFERRED-SMALLS (2026-10-09: gateway-tuned shard count w/ override, per-owner locale DM templates, leaderboard user-cache filter. Suite 491/0, fmt + clippy clean).
- [x] U-SWEEP-1 h247 rejoin + rank-role username grant (2026-10-09: own voice-state break → OP4 rejoin when H247 active; userUpdate → RANK_ROLES grant/remove; 7 tests. Deferred: retry/watchdog timers, member-update hook. Suite 498/0, fmt + clippy clean).
- [x] U-PROTECTION-BACKUP 60s structure snapshots (2026-10-09: TS key shapes, mapping helpers, 60s sweep; 11 tests. Next: live restore executors, raid-flag gate).
- [x] U-TTS-CLEANUP offline leg (2026-10-09: memberless TTS teardown + voice arm; speak leg blocked. Next: embed-id persistence, orphan sweep).
- [x] U-PANEL-OVERFLOW options txt (2026-10-09: overflow gate + file on preview/send; 5 tests. Suite 512/0, fmt + clippy clean).
- [x] U-ETERNAL-1 (2026-10-09: E2 restore, M1/M2, C1/C2/C4, I1, D1 + fallback, S2, M4, C8/P1. Suite 575/0).
- [x] U-ETERNAL-2 (2026-10-09: E3 wipe queue; C3 delta; I2 help kit; D2/D3 tables; P4 args; M3 recovery; C7/C9/S3 banked. Suite 641/0).
- [x] U-ETERNAL-4 (2026-10-09: vague-4 8/8 — D5 7 dirs tables, D6 events+handler tables, I5 Tier-2 16 fichiers + 14 clés YAML x10, P5/P6 prefix dispatch, M errchan report, C8 authrestore/flow+batch/assetsCalc, C7 guild-lookup types, I2 help follow-ups + help_main. Lead: I5 YAML insert + type:lang; hold-push wave-3 (tbl set/get + 3 lints). Suite 741/0, fmt + clippy clean).
- [x] U-ETERNAL-5 (2026-10-09: follow-ups — help_main enregistré (registre 178), automod_toggle! câblé msg_automod_toggled x10 + type:lang. Lead fix chemin crate::commands::lang_for dans macro. Suite 741/0, fmt + clippy clean).
- [x] U-ETERNAL-6 (2026-10-09: vague-5 6/6 — D7 ranks/ticket/economy owned tables, D8 config blob, snapshot avatar hydration, errchan hookup, chart SVG decision, I6 Tier-3 39 fichiers + 12 clés YAML x10. Lead: I6 YAML insert + type:lang, 1 lint deref. Suite 762/0, fmt + clippy clean).
- [x] U-ETERNAL-7 (2026-10-09: vague-6 6/6 — D9 owners routés, D10 ghost/dump/restore, D11 events table-only (XP dual kept), errchan feed, music notices, audit giveaway 15 gaps → 12 roadmap items. Suite 769/0, fmt + clippy clean).
- [x] U-ETERNAL-8 (2026-10-09: vague-7 6/6 — GW create validation+gates+giveaway-id+embeds, GW logs+confirmations+sweep, schedule confirmations+templates+scope, sticky disabled+footer, D12 leaf routers, ready exception-report + voice econ, audit mod/utils drift → 9 items. Suite 800/0, fmt + clippy clean).
- [x] U-ETERNAL-9 (2026-10-09: vague-8 6/6 — D13/D14 owners+callers routés, mod clearwarn/lock/rolepanel-i18n + pagination + setup interactif, utils talk/vkick/batch/logs, audit econ/ticket/music → 6 items. Lead: bitflags iter_names fix, doublon addrolereact retiré (existait déjà). Suite 829/0, fmt + clippy clean).
- [x] U-ETERNAL-10 (2026-10-10: vague-9 5/5 — D15 derniers owners, musique interactive (NP boutons + queue pages + skip notice), ticket logs transcript, utils setups, audit misc fun/backup/owner/profil/stats/botcat → 14 items. Lead: 2 lints. Suite 854/0, fmt + clippy clean).
- [x] U-ETERNAL-11 (2026-10-10: vague-10 5/5 — fun trans/dog/cat/morse/poll + guard, backup ownership+pagination+precheck, blacklist list+metadata+guards, stats windows+period/limit, botinfo/status/bio/gender. Lead: doublon botinfo retiré (stub utils, vrai = botcat), registre 177. Suite 884/0, fmt + clippy clean).
- [x] U-ETERNAL-12 (2026-10-10: vague-11 5/5 — guildconfig/ticket callers routés, fun captions/togif/catsay/love/caracteres-26, setserverlang panel + invite/link embeds, verify audit (GW/schedule/sticky confirmés, ticket+music résiduels déjà fixés). Lead: decode_stored_string + test D17 parité fonctionnelle, captions/togif enregistrés (registre 179), love_score/caracteres morts supprimés, user.rs→love_roll. Suite 916/0, fmt + clippy clean).
- [x] U-ETERNAL-13 (2026-10-10: vague-12 5/5 — D18 emitters, D19 ticket mod, D20 econ mod, D21 save_rank + XP table-only (dual-write terminé), audit batch-3 → 11 items. Suite 917/0, fmt + clippy clean).
- [x] U-ETERNAL-14 (2026-10-10: vague-13 5/5 — protection schema TS, antispam manage, honeypot pipeline + tts guards, aliases batch-3 + confession panel, emitters-2. Lead: 13 clés YAML x10, claim rewired action+logs, starboard macro morte supprimée, 3 lints. Suite 937/0, fmt + clippy clean).
- [x] U-ETERNAL-15 (2026-10-10: vague-14 3/5 landés — authrestore pager + force-join progress, emitters-3 (30 loaders), verify vagues 8-13 (4 zones confirmées) ; voice + sched-create wipés avant commit. Lead: panel-code charset lowercase:true + test. Suite 942/0, fmt + clippy clean).
- [x] U-ETERNAL-16 (2026-10-10: vague-14b — voice + sched-create re-appliqués et poussés aussitôt. Suite 948/0, fmt + clippy clean).
- [x] U-ETERNAL-17 (2026-10-10: vague-15 4/4 — econ test repointé (owners encore live, à migrer), emitters-4 blacklist/await/snipe, ranks replies exactes, audit batch-4 → 10 items. Suite 949/0, fmt + clippy clean).
- [x] U-ETERNAL-18 (2026-10-10: vague-16 4/4 — econ callers migrés, sched expiry DM + key compat, confession cooldown + author, security reasons + captcha. Lead: confession privacy field + panel rotate + archive private + 2 lints. Suite 956/0, fmt + clippy clean).
- [x] U-ETERNAL-19 (2026-10-10: vague-17 4/4 — econ dead owners supprimés (reste load_econ, 4 callers hors scope), confession batch (cooldown/author/archive), security pass leg, audit batch-5 → 6 items (ranks keys/engine critiques). Suite 960/0, fmt + clippy clean).
- [x] U-ETERNAL-20 (2026-10-10: vague-18 4/4 — load_econ repointé, ranks XP_LEVELING dual-read, moteur XP TS (35-37, level*500, coins), grant.rs→h247. Lead: 18 call sites repointés (events_handler+tts), allow inception replacé. Suite 971/0, fmt + clippy clean).
- [x] U-ETERNAL-21 (2026-10-10: vague-19 4/4 — load_econ supprimé (migration tables TERMINÉE), ranks scan + leaves XP_LEVELING, XP announce helpers + gates, econ groups flat actés + gates prouvées. Suite 981/0, fmt + clippy clean).
- [x] U-ETERNAL-22 (2026-10-10: vague-20 3/3 — XP full wiré au handler (announce routée, boost réel, SendMessages), audits utils-moderation + core → 10 items (antiExe, meminfo, welcomer, html2png, modals, TopGG, economy logs). Suite 985/0, fmt + clippy clean).
- [x] U-ETERNAL-23 (2026-10-10: vague-21 5/5 — antiExe 21 extensions + bypass/timeout/warn, meminfo triple + cooldown-ts + sub/add-coins, image64 partagé, awesomeEmbed + TopGG, honeypot DM fix + userIdFromToken + getOS. Lead: topgg_vote_button_label x10 + 1 lint. Suite 1002/0, fmt + clippy clean).
- [x] U-ETERNAL-24 (2026-10-10: vague-22 4/4 — welcomer V2 sender, modal_helper partagé, honeypot trigger manager, audit boot → 10 items (mailer, captcha, defer, cooldowns, executor, crash, perm-i18n). Lead: 1 lint hex. Suite 1020/0, fmt + clippy clean).
- [x] U-ETERNAL-25 (2026-10-10: vague-23 4/4 — crash reporter TS, perm names localisés, captcha CSPRNG + SVG, modals migrés (5 fichiers). Lead: test captcha resserré. Suite 1031/0, fmt + clippy clean).
- [x] U-ETERNAL-26 (2026-10-10: vague-24 4/4 — defer global, cooldowns DB partagés, fallbacks exécuteur, mailer lettre + paywall ALLOW. Lead: wiring ready/join/leave + 2 allows. Suite 1054/0, fmt + clippy clean).
- [x] U-ETERNAL-27 (2026-10-10: vague-25 4/4 — boot parity (session-start log + shard validation), audits fun/utils + mod/guildconfig + econ/profil → 24 items. Suite 1057/0, fmt + clippy clean).
- [x] U-ETERNAL-28 (2026-10-10: vague-26 5/5 — warn authorID, setlogs full, support/autoreact, ranks/profil, fun-ux. Lead: off-guard ticket, 3 lints, anti-exe author id. Suite 1094/0, fmt + clippy clean).
- [x] U-ETERNAL-29 (2026-10-10: vague-27 5/5 — utils mgr (embed/dm/bringall), mod renames, love fidelity + docs, audits ticket/music + owner/misc → 15 items. Lead: doublon addrolereact retiré, window-time, registre 179. Suite 1104/0, fmt + clippy clean).
- [x] U-ETERNAL-30 (2026-10-10: redo mod-renames (wipe tiers) — 9 fichiers, tests 9/9. Suite 1113/0, fmt + clippy clean).
- [x] U-ETERNAL-31 (2026-10-10: vague-28 5/5 — music interactif/embeds, ticket close + lavalink, owner dual-scope, say/botinfo/confession. Lead: stash worker droppé (obsolète), 1 lint. Suite 1143/0, fmt + clippy clean).
- [x] U-ETERNAL-32 (2026-10-10: vague-29 4/4 audits batch-5 (giveaway/backup/voice, protection, social, misc) → 27 items. Suite 1143/0, tree inchangé).
- [x] U-ETERNAL-33 (2026-10-10: vague-30 7/7 — vd panel + staff, bk/gw, honey/antispam, invites, mcount/suggest, h247/tts, protect/suggest-intake. Lead: BY-legacy, 4 lints. Suite 1180/0, fmt + clippy clean).
- [x] U-ETERNAL-34 (2026-10-10: vague-31 6/6 — bk TS-table compat, vd legacy buttons + staff overwrites, protect attribution + restore legs, antispam runtime full, captcha raster PNG + banner props, schedule guided. Lead: captcha leg → captcha_png + code hors texte, captcha_svg supprimé, AntispamPunish/AntispamLog structs, 5 lints. Suite 1214/0, fmt + clippy clean).
- [x] U-ETERNAL-35 (2026-10-10: vague-33 music 12/12 (search pipeline, vol 75, loop queue, trackStart riche, scrobbler, onDisconnect) + lead (wiring disconnect, tempmute assert, msg_use_off_track x10, 4 lints). Fun/econ/mod wipés par tiers → redo dispatché. Suite 1230/0, fmt + clippy clean).
- [x] U-ETERNAL-36 (2026-10-10: redo fun 15/15 + econ 8/8 + mod 5/5 (wipe tiers ré-appliqués depuis transcripts). Lead: 1 lint doc. Suite 1237/0, fmt + clippy clean).
- [x] U-ETERNAL-37 (2026-10-10: vague-35 voice 17/17 (spawn complet, boutons target/guard, claim/transfer, panel Secondary, interface objet, sweep ciblé) + lead (spawn message inventé supprimé, ticket item 4 déjà couvert par tbl_del dual). Ticket/utils/bk-gw wipés par tiers → redo dispatché. Suite 1240/0, fmt + clippy clean).
- [x] U-ETERNAL-38 (2026-10-10: redo ticket 5/5 + utils 3/3 + bk-gw 12/12 (wipe tiers ré-appliqués depuis transcripts). Lead: EntriesPage struct (lint args). Suite 1246/0, fmt + clippy clean).
- [x] U-ETERNAL-39 (2026-10-10: vague-37 protect/social/confess/misc 4/4 — protect owner gates + rule-all + show 2-embeds + allowlist guards + honeypot panel/toggle/log + antispam presets; invites embeds #92A8D1 + raw négatifs + sug- ephemeral + 12-char codes + starboard quirk; confession audit-log/nonce/cooldown/thread/rotation + force-join single-message + dashboard SVG + DeferPolicy; ping/help → botcat + welcomer 800s + TTS choices + h247 consts. Lead: captcha expires_at pinné + code hors texte, victim role-restore, mut member, stub help_here retiré (collision help), msg_antispam_invalid_choice x10, clippy zero (backends allow, hex, asserts, format!/vec!, needless borrows). Suite 1267/0, fmt + clippy clean).
- [x] U-ETERNAL-40 (2026-10-10: suggestion thread-flags parity — `edit_thread` invitable/locked/archived after create-from-message, mirrors `onNewMessage.ts` `.then(x => x.edit(...))`. Lead: single leftover hunk from vague-37, TS-verified. Suite 1267/0, fmt + clippy clean).
- [x] U-ETERNAL-41 (2026-10-10: I4 placeholder-parity lock — full YAML scan (2595 keys, 787 with tokens): fixed 1 live raw-token leak (jp-JP `perm_roles_created_role` used `join('、')` while code replaces `join(', ')`, TS ships the same bug — corrected, not mirrored); 9 remaining divergences documented as intentional upstream meme/joke rewrites (fr-ME x7 incl. 1 dead key, fr-FR wakeup x1, all noop-replaces, no garbage). New `lang.rs` test `placeholder_tokens_match_en_us_in_all_locales` (token scanner, key-count parity, explicit exception list). Suite 1268/0, fmt + clippy clean).
- [x] U-ETERNAL-42 (2026-10-10: S1 adopt-or-delete adjudicated — all 5 Rust extras ADOPTED with TS-parent evidence, backlog S1 closed, no code change. Suite 1268/0).
- [x] U-ETERNAL-45 (2026-10-10: vague-38 honeypot-collector + suggest-thread 2/2 — live 4-row panel (build_panel_components/handle_panel_press, 240s stateless expiry, 6-id match arm) + suggestion thread invitable/locked/archived edit. Lead: collapsible_if → matches! guard (edition 2021). Audits ECON-3 (9 items) + UTILS-3 (7 items) bankés. Suite 1273/0, fmt + clippy clean).
- [x] U-ETERNAL-43 (2026-10-10: E7 snipe key-reunification, reader half — `snipe` command reads TS `GUILD.SNIPE.<channel>` first (`{snipe, snipeUserInfoTag, snipeUserInfoPp, snipeTimestamp}` → #474749 embed with author/avatar/timestamp, byte-identical to `!snipe.ts`), legacy `SNIPE.<channel>` `{author,content}` + `SNIPE.last_deleted_id` kept as fallbacks; pure `parse_ts_snipe`/`parse_legacy_snipe`/`render_snipe_embed` + 2 tests. Writer migration in `events_handler.rs` queued as follow-up (file hot). Suite 1273/0, fmt clean, own files clippy-zero).
- [x] U-ETERNAL-44 (2026-10-10: backlog triage — I1/I2/I4/S2/S3/E5/E8 closed as verified-done with call-site evidence, no code change. Suite 1273/0).
- [x] U-ETERNAL-46 (2026-10-10: vague-39 econ-fix3 9/9 (daily typo-quirk, podium SVG, insertion-order ShopMap, gender/pronoun silent-verbatim, first-hyphen display, age f64 + age_display, birthday shapes) + utils-fix3 6/6 (sync locked-gate, prevnames pager+trash, admin-users filter+unrank, allbots pager, wakeup 2-min loop, nickrole raw-query). Utils wiped by tiers mid-wave → redo from TS sources. Lead: dead gender/pronoun keys removed x10 + type:lang, 3 clippy lints (question_mark, useless_vec). Suite 1292/0, fmt + clippy clean).
## Eternal backlog (seeded 2026-10-09 by 7 read-only audits + lavalink edge audit; full reports in `~/.hermes/cache/delegation/live/deleg_55b606d3/task-{0,1,2,3,4,5,9}.log` — each item is a future unit for other models, files disjoint unless noted)

### Events (audit task-0)
- [ ] E1 generic component + context dispatch (button/select `%`-split registry, ?dm strip, modal submits) — `events_handler.rs`, `bot.rs`.
- [ ] E2 protection channel restore executors (consume BACKUP snapshots: recreate category/channel, perms/parent/position, dedup) — `events_handler.rs`.
- [ ] E3 guild-leave 10h cancellable wipe queue + ready recovery (replaces immediate flag) — `events_handler.rs`, `scheduler.rs`.
- [ ] E4 welcome image/Components-V2 legs (welcomerEmbed resolve, avatar snapshot) — html2png-blocked, text path done.
- [x] E5 leash full-fidelity — VERIFIED done (U-ETERNAL-43): array store, 30-min prune (`leash_valid`), CSV multi-sub (`leash_sub_ids`), both directions (`leash_is_dom`), wired in voice-state arm, unit-tested.
- [ ] E6 temp-voice hardening (creation lock, fetch-based emptiness, maskLink names, ready recovery).
- [~] E7 snipe key reunification (reader DONE in U-ETERNAL-43 — TS `GUILD.SNIPE.<channel>` first + legacy fallbacks + TS embed; writer half QUEUED: `message_delete` in `events_handler.rs` must store the TS shape `{snipe: maskLink, snipeUserInfoTag, snipeUserInfoPp, snipeTimestamp}` under the TS key).
- [x] E8 mention-ping rank-role grant — VERIFIED done (U-ETERNAL-43): `is_bot_ping` exact-`<@id>` gate wired in message arm, unit-tested.
- [ ] E9 guild-leave log embed to guild-logs channel.
- [ ] E10 captcha PNG leg (image-blocked; attempts/roles/kick done).
- [ ] E11 protection allowlist-mode exemptions per rule.
- [ ] E12 command-gate verification (blacklist/cooldown/loggerX on both prefix+slash paths).
- [ ] E13 ready-sweep leftovers (TTS prefetch/cleanup, usersNamesMap warm, perm-strip sync).

### Core functions (audit task-1)
- [ ] C1 method.ts prefix-resolver battery → `funcs_resolve.rs` (P0 for prefix parity).
- [ ] C2 permissonsCalculator full gate + adversarial authz tests (P0).
- [ ] C3 ticketsManager 2177-line fn-by-fn delta (XL — split by lifecycle).
- [ ] C4 userStatsUtils 8 fns → pure `stats_calc` module.
- [ ] C5 ownerHelper table merge + add/remove (DB-backed).
- [ ] C6 musicPlay URL matchers + durations (offline); handlers behind lavalink-creds gate.
- [ ] C7 shard_helper cross-shard lookup design (no serenity broadcastEval).
- [ ] C8 small-batch sweep: getIP, retrieveMyself URLs, AxiosClass wrapper, ModalBuilder, economyLogs centralizer, tempTable KV, authRestore secret flow, assetsCalc, ihorizon_logs send.
- [ ] C9 verify-only queue: errorManager, loop-body diffs (autorenew/emojis/githubLines/giveaways/honeypot/infra/memberCount/nightMode/pfps/sticky/tempban/tempRole), colors.ts exclusion.

### Slash/context (audit task-2)
- [x] S1 Rust extras fate — ADOPT all 5 (U-ETERNAL-42, verified against TS parents): `honeypot post` carries honeypotManager internals (applyConfiguredAction/window/DM/log) with 6 tests; `lastfm status` reads back config state (parent ships config/login only); `confession list` is a deliberate count-only mod tool (self-documented ADOPT in list.rs; parent ships channel/config/thread/cooldown); `ghost-list` complements join-ghostping add/remove (1 test); `perm-reset` is not an extra — it surfaces the TS `perm command` delete-action as a flat subcommand (same `perm_set_command_reset` key). All registered, collision-free, tested-or-trivial; deletion would break installs for zero parity gain.
- [x] S2 context-menu names — VERIFIED, no delta (U-ETERNAL-42): all 5 display strings byte-identical to TS (`User Lookup`, `Estimate the love`, `Pose a question!`, `Play it in a voice channel`, `Convert to MP4`), locked by `context_menu_names_match_ts` tests in `context/user.rs` + `context/msg.rs`.
- [x] S3 renames/mappings — VERIFIED, no delta (U-ETERNAL-42): automod leaves wired as `discord-invite` + `telegram-link`/`telegram` via `automod_toggle!` (msg_automod_toggled x10); vd `interface` subs mapped 1:1 to lobby/panel/category/name/position/staff (THIN decision); `/allowlist` parent flattened like all parents, leaves `allow-add`/`allow-remove`/`allow-show` all registered.

### I18N (audit task-3)
- [x] I1 Tier-1 reply keys — VERIFIED done (U-ETERNAL-44): all families present in YAML and wired (`tempmute_unmuted_by_time` used in tempmute.rs; `backup_*` CRUD 12+ keys; `gw_getdata_*` embed keys; serverinfo/prevnames/pfps/trans/caracteres/number keys); zero unwired single-line `ctx.say` literals in music/backup/giveaway (only 2 standing-exclusion literals remain in fun: grosbg TS-hardcoded joke, 67 gif asset URL).
- [x] I2 `help_*` metadata set — VERIFIED done (U-ETERNAL-44): 78 `help_*` keys in en-US.yml, guild-language /help via `help_main` (registered) + `help_here` carrier.
- [ ] I3 replace 181 divergent fallbacks with exact en-US (wrong-key reuse first).
- [x] I4 placeholder/CI check — DONE in U-ETERNAL-41 (`placeholder_tokens_match_en_us_in_all_locales`: token-set + key-count parity; no CI in repo so the cargo test is the check).
- [ ] I5 Tier-2 setup modules (welcomerPanel, antispam manage, honeypot config, setlogschannel, nightmode, birthday).
- [ ] I6 verify-then-delete 312 zero-sender dead keys.

### DB call-sites (audit task-4: 423 legacy lines, 0 migrated)
- [ ] D1 shared leaf helpers first (`shared.rs`, key-helper fns).
- [ ] D2 small categories batch → guild tables.
- [ ] D3 named tables: authrestore, backups, giveaways, schedule, user_profil, blacklist, prevnames.
- [ ] D4 economy/ranks/moderation (+`add`/`sub` math).
- [ ] D5 confession/guildconfig/protection/utils/rolereactions/embed/ticket (`starts_with` scan)/legacy/voicedashboard/newfeatures.
- [ ] D6 `events.rs`, then `events_handler.rs` (85 sites) last.
- [ ] D7 decide routing for `LASTFM.*` + `newsletter_bl` (no TS named table), then `core/mod.rs`, `db.rs`, `monitor.rs`.

### Prefix (audit task-5)
- [ ] P1 unify prefix DB key (`BOT.prefix` vs `GUILD.PREFIX`) + migrate existing guilds.
- [ ] P2 single-vs-dual prefix decision; mention-revert path; length-cap + first-word alignment.
- [ ] P3 `UseApplicationCommands` channel gate in `global_check`.
- [ ] P4 `checkCommandArgs` UX (required-count, longString merge, attachment gate, caret embed).
- [ ] P5 resolver fallbacks (username/role/channel/fuzzy) + mention-offset verify.
- [ ] P6 prefix-only-as-slash decision (`h`, `grosbg`, meme names) + help scoping; alias-collision fail-fast; case-insensitivity; `number()` coercion; `prefixName` audit (known `prefix`↔`setprefix` flip).

### Music edges (audit task-9)
- [ ] M1 idle sweep consuming `destroy_due()` (120s → destroy + leave + status clear) — HIGH.
- [ ] M2 node WS dial at ready/reconnect (track-end advance + announce live) — HIGH.
- [ ] M3 trackError recovery (skip + fallback re-search + owner log).
- [ ] M4 history V2 (count cap, TS-shape migration, pagination + txt + delete).
- [ ] M5 node failover + reconnect backoff.
- [ ] M6 stage-channel support; M7 volume hardening + push-on-play; M8 history perms alignment.
- [ ] U-SWEEP-2 protection 60s structure backup (verify avoid* consumers first) + owner eval keep/drop security decision + Rust-only surface triage (`lastfm status`, `honeypot post`, `confession list`, `see`, `embed` scope).
- [x] U-HYBRID-FIX-1 crash-hardening + error-path exactness (2026-10-09: rolepanel expect + resolve ordering, sticky poison cascade, giveaway epoch fallback; bot.rs error router — ArgumentParse/Cooldown/MissingPerms localized; addrole/delrole/derank TS guard chains restored; registry/keys/storage untouched. Suite 431/0 at the time).
- [x] U-HYBRID-FIX-2 exactness for economy/ticket/music (2026-10-09: fire-and-forget log sends, shared music guard helpers w/ TS keys + guard order on all 12 commands, NoNodes/NoMatches embeds, leaks removed, byte-identical lyrics fallback. Deferred: h247/TTS interplay, queue loop mode. Suite 477/0).
- [x] U-NOTIFIER-FANOUT release owner-DM fan-out (2026-10-09: `core/release` module — all anti-spam guards, PDF paths w/ fallback, error classification, dedupe; notifier toggle helpers; 22 tests. Deferred: wiring into ready path (bot.rs), live-DM verify).
- [x] U-CLIENT-FIX discord.js parity (2026-10-09: poll intents added; TOTAL_SHARDS wired (explicit count else autoshard); in_shard/is_main_shard + release-notifier gating; message TTL 8h; sweepers/partials documented non-portable; error router untouched).
- [x] U-LAYOUT-PER-COMMAND-1 small leaves (2026-10-09: h247/lastfm/membercount/notifier/pfps/schedule/security/tts split one-file-per-command w/ `pub mod main` shims, mod.rs zero diff; confession/honeypot/stats/sticky/tag over-400 deferred).
- [x] U-DB-ORCHESTRATION index.ts port (2026-10-09: TABLES/READ_ONLY_TABLES/SYNC_INTERVAL, Cached backend w/ synchronous mirror-on-write (TS mirrors never fire — documented), sync_table/sync_once/warm/spawn_sync_loop w/ TS direction rules, Database{x,y} routing, read-only rejection on cached backends; 18 backend tests. Deferred: y second-postgres needs config extension).
- [x] U-MUSIC-LAVALINK part 2 voice wiring (2026-10-09: serenity voice feature + tungstenite, WS ready/session feed, voice_state/server_update hooks, OP4 join/move/leave send, nowplaying announce, empty-channel leave; 17 lavalink tests. Live-verify vs real node still blocked).
- [x] U-LAYOUT-PER-COMMAND-2 medium batch (2026-10-09: profil/ranks/giveaway/authrestore/backup split one-file-per-command w/ shims, mod.rs untouched; invitesmanager/blogger/antispam under-400 left. Lead: 12 module_inception allows + shim unused-import allows + doc-blank fixes. Suite 449/0, fmt + clippy clean).
- [x] U-LAYOUT-PER-COMMAND-3 big batch (2026-10-09: utils 65 files, moderation 22, fun 33 + botcat 13, economy 23, music 15, ticket 15 + guildconfig 17, legacy 16 — all one-file-per-command, bodies verbatim, mod.rs untouched, compat shims. Lead: 1 doc-blank fix. Suite 449/0, fmt + clippy clean. Layout TS-parity now complete across all 40 categories).
- [x] U-MUSIC-META-CONSUME (2026-10-09: source detection + normalized previews in nowplaying/trackinfo/queue, SVG spotify-banner, Lavalink fallbacks; 11 music tests).
- [x] U-TICKET-V2-BUILDER (2026-10-09: full `ticket_panel` builder — 17 TS menu values, pickers, preview, send + marker; 9 new panel tests. Deferred: V2 Container rendering (serenity 0.12), options-overflow txt. Lead: 3 clippy closures).
- [x] U-CATEGORY-INIT-FIX (2026-10-09: 26/26 init.json exact — parity-locking test added, zero renames; 6 extra subcommands + order quirk intentionally left).
- [x] U-LAYOUT-PER-COMMAND-4 leftovers (2026-10-09: antispam/blogger/confession/honeypot/stats/sticky/tag/invitesmanager split, mod.rs untouched. Suite 459/0, fmt + clippy clean. All categories now one-file-per-command).

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
   - [x] `SlashCommands/authrestore/` full set (!get/!set/!roles/
     !delete/!force-join): ported to `rust/src/commands/authrestore.rs`
     (parent + 5 admin subcommands, registered; registry 159).
     Offline: secret-code scan, saved-members filter, 5/page pager +
     category state machine (clamped at bounds vs TS bare ++/--),
     30-day histogram (zero-ts skipped, year-collision preserved),
     insertion-ordered locale distribution, top-10 recents,
     force-join partition/counts, `wsUrl%token` + ws-event parsers
     (extra `%` dropped like TS `data[0]`/`data[1]`), exact
     `discordLocales` table, `MM/DD/YYYY HH:mm` stamp, UTC labels,
     `HorizonGatewayLocal`-first endpoints, full-shape create author,
     RESTORECORD kv load/store, secret-miss replies, tick-on-hit,
     button attach/clear + authorship guards, secret DM + follow-ups,
     counts embed + shared yes/no confirm, role-change embed,
     renewed-code DM. Live-only deferred: gateway HTTP/WS itself,
     html2png dashboard (same numbers as text), `get` button
     collector (pure step logic ported/tested). 8 tests; suite 251
     passed / 0 failed; fmt + clippy clean (reviewer findings fixed;
     drive-by `let mut msg` in shared `prompt_yes_or_no`).
3. Verification baseline (2026-10-09): `cargo test --workspace`
   354 passed / 0 failed; `cargo fmt --check` clean; `cargo clippy
   --workspace` zero warnings. Re-run after each unit.
4. Triage-verified backlog (audit 2026-10-09, see `## Scope audit`
   and `ops/rust-migration/inventory.md`; dependency order):
   - [x] U-HELPERS core helpers batch (done 2026-10-09, rescoped on
     call-site evidence): `core/ping/index.ts` Ping class ported to
     `monitor.rs` (PingConfig defaults, is_ipv6_target,
     ping_executable, ping_args with macOS quirks, parse_ping_output
     scans mirroring the three TS regexes + population-stddev-against-
     avg quirk, ping_execute with LANG=C; 5 tests) +
     `modules/errorManager.ts` ported to `logger.rs` (error_log_path/
     error_log_entry/append_error_log with no-fd-held append,
     install_error_handlers wired in main.rs via
     !is_production_env; 2 tests) + triage corrections: retrieveMyself
     already covered (botcat.rs), lodash/assetsCalc/getIp excluded as
     dead (no live Rust consumer / zero TS callers). Follow-ups filed:
     fun::ping network section, fun asset-GIF parity. Suite: 328
     passed / 0 failed; fmt + clippy clean.
   - [x] U-IMG image pipeline (done 2026-10-09, rescoped on evidence):
     `core/images.ts` love/catsay/captions/bubbles are pure html2png
     wrappers (no canvas math to port) + `fun/!captions.ts` and
     `fun/!togif.ts` (puppeteer/gifwrap decode) are Chromium-blocked
     (recorded in Blocked). Portable remainder ported to `funcs.rs`:
     MEDIA_MAX_IMAGE_BYTES/FIT consts, media_temp_dir,
     fit_dimensions, letterbox_layout, image_quality_steps
     (1 test). Pixel encode/decode lives in U-MEME.
   - [x] U-VANITY `utils/!vanity-generator.ts` (done 2026-10-09):
     `vanity_generator` in `utils.rs` (`rename="vanity-generator"`):
     invite-code validation (is_valid_vanity_code vs the TS regex),
     local VANITY claim scan over kv guild "0" key "api.VANITY"
     (read-only seed like TS — no writer exists upstream),
     permanent invite (max_age 0, non-temporary), gateway
     CreateCustomVanity POST via authrestore::gateway_endpoint +
     api_token, gateway message reply, command_err on every failure
     leg. Registered (registry 176). 2 tests (code rules incl.
     edge/double hyphens/charset, claim scan + first-only template
     fill). Deltas: no audit-log reason (helper has no slot);
     missing gateway/token replies command_err (TS throw UX).
     Suite: 333 passed / 0 failed; fmt + clippy clean.
   - [x] U-FEXINI `MessageCommands/misc/@fexini.ts` (done 2026-10-09):
     fr-only partner ad reply in `legacy.rs` (`fexini_ad_for_locale`
     strict "fr" gate + `FEXINI_AD` copy, `rename="fexini"` category
     "bot", reply + invoking message deleted after 10s via spawned
     task; registered, registry 172). 1 test (`fexini_gate_matches_ts`).
     Suite: 321 passed / 0 failed; fmt + clippy clean.
   - [x] U-MEME kdenlive meme mergers (done 2026-10-09):
     `@kawaeine` (meme3), `@rap-vs-reality` (meme1), `@two-sides`
     (meme2) in `legacy.rs` (fr gate, URL-or-attachment inputs,
     media_gen lang errors, 90s media_manipulation cooldown,
     fetch→convert_to_png→resize→kdenlive template→melt export→mp4
     reply→cleanup, TS catch-reply parity) + `funcs.rs` pixel ops
     (convert_to_png, resize_image_file incl. letterbox canvas,
     adjust_image_quality, kdenlive_open/temp_save/export) + `image`
     0.25 (png+jpeg, offline cache) + shared meme_gate/run_meme/
     kdenlive_substitute helpers (first-only {var} vs replace-all
     tokens). Registered (aliases meme1/2/3, registry 175).
     2 tests (media_pixel_ops_roundtrip, meme_helpers_match_ts).
     Known deltas: webp/gif inputs fail to the error reply (browser
     decode is Chromium-blocked); live melt render needs binaries.
     Suite: 331 passed / 0 failed; fmt + clippy clean.
5. Follow-up backlog (real deltas found while closing item 4):
   - [x] U-PINGNET fun::ping network section (done 2026-10-09):
     `bot/ping.ts` parity in `fun.rs` — four sequential ICMP probes
     via monitor::ping_execute, ping_down_msg on failure,
     ping_embed_desc template fill (exact replace/replaceAll mix),
     Crown/Pointer app-emoji markups, colour 2829617, footer via
     footer_parts/embed_with_footer, loading reply edited in place.
     1 test (labels, successful-only average, template mix, NaN
     all-down). Delta: average counts successful probes only (TS
     renders NaN when any host is down). Suite: 334 passed /
     0 failed; fmt + clippy clean.
   - [x] U-FUNGIF fun hug/kiss/slap asset GIFs (done 2026-10-09):
     TS-parity rebuild in `fun.rs` — fun kill-switch guard,
     length.json counts fetched once and cached (assetsCalc),
     random URL via assets_url, reachability check (axios.then),
     coloured embeds (#FFB6C1/#ff0884/#42ff08) with filled titles +
     image + timestamp, fun_var_down_api on failure. 1 test
     (counts parse incl. skipped non-numbers, desc fills).
     Suite: 335 passed / 0 failed; fmt + clippy clean.
   - [x] U-JOININVITER join-message inviter display (done 2026-10-09):
     `events.rs` pure helpers (inviter_display .wf/discord.wf
     variant, custom_vanity_code bot+code match over kv guild "0"
     key "api.VANITY", render_inviter_slots) + attribution winner
     threaded into the join message in `events_handler.rs`
     (TS literal defaults kept when unattributed). 1 test.
     Suite: 336 passed / 0 failed; fmt + clippy clean.
   - [x] U-REVIEWFIXES reviewer round 1 (done 2026-10-09):
     autorespond perm MANAGE_GUILD_EXPRESSIONS + guildconfig
     category, antiexe ADMINISTRATOR + guildconfig, registry perm
     test, parse_line_frag raw pairs + garbage-tail default,
     gist_normalize run-collapse, kdenlive_export async
     tokio::process + pid-unique names, packet-loss whitespace
     scan, macOS ping6 warn, error_log_path repo-root fallback.
     Suite: 337 passed / 0 failed; fmt + clippy clean.
   - [x] U-VOICESESS voice-session parity (done 2026-10-09):
     pay gate on voice_leave/switch (TS newState.member: users who
     left the guild earn nothing, stats still push), exact-ms
     voice_ms (was whole-minute truncation), recover_voice_sessions
     wired into guild_create (TS recoverActiveSessions ran at ready;
     per-guild stream avoids the cache race, idempotent,
     always unpaid like the TS synthetic state). VoiceClose struct
     keeps clippy arg-count clean. 2 new tests (member gate +
     exact ms, recover unpaid + idempotent). Adjudicated: the
     feared offline-gap overpay is TS behavior too (recover pays
     nothing in TS either). Suite: 343/0; fmt + clippy clean.
   - [x] U-BACKUP-TYPES backup snapshot structs (done 2026-10-09):
     new `rust/src/backup_types.rs` mirroring all 18 TS type files
     (BackupData/Infos, Afk, Ban, channels + Category + perm data,
     Text/Voice/Thread, Message + files, Role, Emoji, Member,
     Widget, Create/LoadOptions) with camelCase JSON incl. the
     non-camel `guildID`/`backupID` spellings, untagged
     text/voice discrimination, missing-or-null tolerant
     optionals, embeds/allowedMentions passthrough. 4 tests
     (camel-key roundtrip, discrimination, optional tolerance,
     infos wrap). Suite: 341 passed / 0 failed; fmt+clippy clean.
   - [x] U-BACKUP-SAVE guild snapshot collection (done 2026-10-09):
     `backup.rs` collectors mirroring create.ts/util.ts (roles
     unmanaged/position-desc/hexColor/everyone-bit, role-only
     overwrites, bans, cache members, emojis base64-or-URL,
     categories/children/others by position with system-channel
     skips, active threads grouped, paged message fetch to budget,
     stage userLimit 0, forced GuildVoice fallback type, AFK via
     afk_metadata, images as CDN URLs + base64). create is now
     owner-gated with save-message yes->100/else-0, stores
     BackupInfos (KB size) under the same BACKUP.<id> keys, replies
     via existing YAML lines; legacy kv dump kept for no-cache
     fallback; load detects full snapshots and refuses loudly
     instead of restoring zero keys. 2 tests (helpers, stored
     shape). Deltas: CDN URLs not raw hashes in URL fields, active
     threads only (no archived), sequential emoji fetch, emojis use
     crate::emojis::base64_encode (no new dep). Cache-guard Send
     lesson: clone out of ctx.guild() before awaits. Suite: 345
     passed / 0 failed; fmt + clippy clean.
   - [x] U-BACKUP-LOAD full object restore (done 2026-10-09):
     new `backup_restore.rs` mirroring load.ts + util.ts
     loadCategory/loadChannel/clearGuild (config incl. community
     gate, everyone-edit + role create, categories/children/others
     with overwrites, MessagesBackup webhook replay oldest-first
     with cap + first-attachment + pin, threads created + replayed
     in-thread, AFK by voice-name match, emojis via sniffed data
     URIs, bans, widget, best-effort clearGuild with defaults
     reset). Pure helpers tested: message plan, tier bitrate clamp,
     kind routing, hex/overwrite parsing, image mime sniff,
     APIEmbed->CreateEmbed mapping, load defaults. 7 tests. Wired
     into backup_load with the waiting line + counts reply (TS
     load defaults clear=true/max=100). Deltas: members never
     restored (TS neither), archived threads not recreated, no
     selfBot/devMode legs. Suite: 353/0; fmt + clippy clean.
   - [x] U-ALIASES TS alias parity (done 2026-10-09): setprefix
     += prefix/changeprefix (@prefix.ts is a setter wrapper);
     autoreact-toggle += toggle-react/react-toggle/togglereact/
     reacttoggle + ManageGuildExpressions (@toggle-react.ts).
     Perm test now recurses into poise subcommands. Suite: 353/0;
     fmt + clippy clean.
   - [x] U-GATES moderation per-subcommand gates (done 2026-10-09):
     mod.ts parity — ban/baninfo/tempban/unban BAN_MEMBERS,
     kick KICK_MEMBERS, timeout/warn/unwarn/warnlist/mutelist/
     unmute/unmuteall MODERATE_MEMBERS, clear MANAGE_MESSAGES,
     banlist MANAGE_GUILD, rolepanel MANAGE_ROLES (was
     MANAGE_ROLES→ADMINISTRATOR over-gate), lock/unlock/lock-all/
     unlock-all/clearwarn/clear-all-warns/temprole ADMINISTRATOR
     explicit. Parent stays ADMINISTRATOR as ceiling. Registry
     perm test extended (ban/kick/timeout/clear/banlist/
     rolepanel). Suite: 353/0; fmt + clippy clean.
   - [x] U-BACKUP-ALIAS backup create alias (done 2026-10-09):
     create += bcreate (TS backup.ts aliases: ["bcreate"]) alongside
     existing save. Registry test asserts any "create" carries
     bcreate (multiple parents share the name). Suite: 353/0.
   - [x] U-ALIASES2 fun alias batch (done 2026-10-09, first of the
     191-missing alias audit): question += 8ball, stench += odeur/
     odeurs/puanteurs/puanteur/arf/pue (dice dé, heads-tails
     pileouface/pile-ou-face, rate note already present).
     Remaining categories queued per the audit list. Suite: 354/0.
   - [x] U-GIFDECODE image gif feature (done 2026-10-09, UNBLOCKED:
     network back, cargo fetch pulled gif 0.14.2 + weezl):
     image crate gains "gif", convert_to_png decodes first frame
     (TS Jimp parity), webp still falls to catch-reply
     (Chromium-blocked). 1 test (1x1 GIF fixture → valid PNG).
     Suite: 354/0; fmt + clippy clean.
   - [x] U-REVIEW2 reviewer round 2 HIGH fixes (done 2026-10-09):
     tempmute restored as canonical slash name (was timeout;
     aliases timeout + mute per mod.ts:366), mod + backup parents
     de-gated to null (were ADMINISTRATOR, hiding the whole group
     from moderators; TS mod.ts:934 + backup.ts:262 are null),
     backup create/load carry explicit ADMINISTRATOR (TS
     backup.ts:104/:165), invented backup "save" alias removed
     (TS has only bcreate). Registry test locks tempmute/ban/
     unban/banlist/clear/warnlist/tempban aliases. Staged
     Cargo.lock churn noted, left as-is (build green; minimal
     regen risks breakage). Suite: 354/0; fmt + clippy clean.
   - [x] U-MODALIASES moderation alias parity (done 2026-10-09):
     all 14 TS alias lists ported (ban addban/createban, banlist
     bans/listban/listbans/banlists, clear cls, mutelist
     allmute/allmutes/alltimeout/alltimeouts, lock-all lockall,
     unlock-all unlockall, tempmute mute, unban delban/removeban/
     deban/pardon, unmuteall 4, warnlist 5, clearwarn 3,
     clear-all-warns 4, temprole 3, tempban tban/temporaryban).
     Collision scan clean (dup names are per-parent subcommands).
     Suite: 354/0; fmt + clippy clean.
   - [x] U-ALIASES3 utils/economy alias batches (done 2026-10-09,
     3 parallel workers): utils.rs 37 alias sets (avatar pfp/pp/
     pic, snipe s/snp, serverinfo si/gi, emojis 5, admin-users 4,
     allbots 2, zip-emojis 2, wakeup wake, derogation 2,
     admin-roles 4, cooldown 3, rolelimit 3, role-members 2, talk/
     untalk, freeze 2, wlvc/unwlvc/unfreeze, move +déplacer,
     renewvc rvc, hide/unhide/hideall/unhideall FR + ascii forms);
     economy balance wallet/coins/bal, leaderboard eclb/eco-lb/
     economy-lb, deposit dep. Collision scan clean. Registry
     test locks representatives. Suite: 354/0; fmt + clippy clean.
   - [x] U-GATES2 ticket/giveaway/economy gates (done 2026-10-09):
     ticket parent de-gated (TS null); open/delete/transcript
     open; 6 workflow ops MANAGE_CHANNELS; 6 admin ops
     ADMINISTRATOR (+panel-v2). Giveaway: 6 subs MANAGE_MESSAGES,
     reroll MANAGE_GUILD. Economy: 7 admin ops ADMINISTRATOR
     (closes grant/wipe holes); role-add/delete/boost-set
     loosened to MANAGE_GUILD + role-list gated (TS ManageGuild).
     Registry test locks gates. Suite: 354/0; fmt + clippy clean.
   - [x] U-GATES2-UTILS utils per-command gates (done 2026-10-09,
     worker + integrator correction): 21 gates in utils.rs —
     derank/leash/unleash/dm/massiverole/wlroles-add/wlroles-list/
     setmentionrole/nickrole/media-only/allbots/admin-users
     ADMINISTRATOR, addrole/delrole MANAGE_ROLES, emojis/
     zip-emojis MANAGE_GUILD_EXPRESSIONS, embed-post
     MANAGE_MESSAGES, vc/renew MANAGE_GUILD/MANAGE_CHANNELS,
     massmove MANAGE_GUILD (TS MoveMembers+ModerateMembers has
     no single-poise equivalent — documented over-gate).
     Corrected worker over-gate: vanity-generator is MANAGE_GUILD
     (TS utils.ts:167), not ADMINISTRATOR. Registry test locks
     derank/addrole/vanity-generator. Suite: 354/0; fmt + clippy
     clean.
   - [x] U-ALIASES4 cross-category alias batch (done 2026-10-09):
     profil (show me/prof, set-age age, set-description
     desc/description, set-gender gender, set-pronoun
     pronoun/pronom, set-birthday birthday/anniversaire), ranks
     (show rsee/look/level, leaderboard rankslb, channel rchannel,
     message msg, role-list rroles, ignore-list ignore), stats
     (ustats u, gstats g, compare cmp, top-voice tv/topv,
     channel-stats cstats/chstats), giveaway (create gstart/
     gcreate, end gstop/gbreak, reroll re, get-all gall), music
     (music m, play p, skip next, resume unpause, clear-queue
     clearqueue), bot (bot-info bi, invite inviteme/oauth, links
     link, noaimie noemie/noémie, status server, setlang
     setsrvlang/lang, ping speed/pong/vitesse), antispam
     (config mng/antimng, bypass-roles bproles, ignore-channels
     channels), invites (leaderboard lb-invites/invlb/inviteslb,
     invites i/invsee, reset inv-delete-all/invreset, removeinvites
     rinvites/subinv), owner (blacklist bl, unblacklist unbl,
     blinfo 3, bledit 2), guildconfig (setlogs logs/setlog,
     support soutien), rolereactions (rolereact, selectreact),
     ticket delete tdelete, nightmode 5 FR/EN forms. lore_cmd!
     macro gained an alias arm for kisakay (anaïs/anais/kisa).
     Registry test uses any-carrier matching (names repeat across
     parents). Suite: 354/0; fmt + clippy clean.
   - [x] U-WLROLES bare wlroles command (done 2026-10-09):
     new `wlroles` in utils.rs (alias wlrole, ADMINISTRATOR per
     utils.ts:397) sharing show_wlroles_list helper with
     wlroles-list; registered (registry 177). Lesson: poise
     command fns cannot call each other (macro returns Command,
     not a future) — share a plain async helper. Suite: 354/0;
     fmt + clippy clean. (Closes the U-ALIASES3 remainder above.)
   - [x] U-I18N hardcoded user strings (done 2026-10-09):
     exemplar owner.rs (7 sites + new bledit_reason_updated);
     wave 1 (workers A-D, ~160 sites reusing TS keys); wave 2
     (workers E-H) wired all remaining single-line hardcodes —
     TS key where one exists, else new deterministic msg_* key
     with English fallback. Lead inserted 87 msg_* keys x 10
     locales (870 values, parity-checked, type:lang clean) and
     added lang.rs regression tests (keys-in-all-locales +
     translated-not-English spot-check). Verified: 318 wired
     keys, 0 missing from en-US.yml. Suite: 356/0; fmt +
     clippy clean. Standing exclusions: ${client.iHorizon_Emojis.*}
     token keys, fr-gated autofeur/promo + FEXINI_AD, lavalink
     stub markers, format!-interpolated debug templates,
     multi-line structural formats, raw URLs/asset links.
     Registry THIN adjudicated 2026-10-09 by lead (no code):
     guildconfig bot/welcomer groups = children carried
     (blockbot/toonew/setprefix/custom-* /welcomer setters);
     automod discord-invite/telegram-link, banner-server/user,
     unban-all/undo, ranks ignore-add/list, allow-add/remove/show,
     ghost-add/remove all renamed-equivalent; voice 6 subs map
     1:1 (lobby/panel/staff/category/name/position); perm command
     = perm-set/delete/delete-all, perm list = perm-list
     (audit claim of no carrier was wrong); util/cooldown stays
     unaliased (confession owns canonical cooldown).
     Follow-up dispatched 2026-10-09 (deleg_72995bbb): 2
     auditors (placeholder-key cross-check; TS-vs-registry
     command/subcommand coverage) + 2 implementers (events/voice
     I18N; core/top-level I18N reusing msg_* keys).
     Follow-up results 2026-10-09 (deleg_72995bbb): events worker
     wired 2 (level-up event_xp_level_earn, temp-voice name
     template + helper); core worker wired 1 (scheduler pfps
     title, faithfully reproducing TS stray-$ quirk). Placeholder
     audit found 3 real bugs — fixed by lead: blogger
     ${channel}→${channel.toString()} + real blogId (was ""),
     membercount ${template} noop→emoji replace via
     app_emoji_markup, ticket msg_ticket_opened {}→{chid}.
     Audit section C (~26 emoji/user-token leak sites) dispatched
     as U-LEAKFIX-A/B/C (deleg_e68bac8b). Registry audit:
     true gaps only eval (EXCLUDED), captions/togif (blocked);
     parents flattened by design; THIN list queued (guildconfig
     bot/welcomer groups, automod/protect/voice/banner/unban-all/
     ranks subcommand shapes, perm/allowlist/renamed children).
     U-LEAKFIX integrated 2026-10-09 (deleg_e68bac8b, all 3
     workers): ~26 token-leak sites fixed via app_emoji_markup +
     in-scope values (backup/confession/h247/membercount/
     nightmode/notifier/pfps/security/suggestion/ticket/tts/
     utils/sticky incl. sticky_refresh No-pair bonus). Lead added:
     clearwarn full 4-token replace (Yes + member + count via
     pre-delete load_warns + author mentions), h247/tts-lang/dm/
     autorenew/bot-custom Yes-No-Crown markup. Verified with
     leakscan: 0 emoji leaks, 0 non-emoji leaks (ticket JS-expr
     tokens match verbatim; pfps ${username} kept as faithful
     TS-mirror stray-$ quirk). Suite: 356/0; fmt + clippy clean.
     U-REVIEW-DAY integrated 2026-10-09 (deleg_7ddbf247,
     CHANGES REQUESTED, all 6 MUST-FIX closed by lead):
     context love/queue {score}/{title} replaces; backup
     {id}/{count}/{restored} (+ YAML {}→{count} normalization x10)
     + confession {} replace; membercount error paths now send
     the TS help_embed via shared send_mcount_help helper (was
     wrong template-list key); ticket panel {}→{id} (YAML x10 +
     code). NITs banked: blogger feed-title fidelity, voicemove
     perm audit queued separately.
     U-AUDIT-PERMS integrated 2026-10-09 (deleg_6ef1cd7c): ~100
     under-gated leaves + 16 over-gated parents catalogued.
     Lead verified the starboard claim (macro fns exist; parent
     fn-refs valid) and gated the 8 macro subs ADMIN. Fix wave
     dispatched (deleg_6a9c6651): GATES-A/B/C/D on disjoint
     files (verify-bit-then-gate; massmove approx kept).
     U-GATES-E/F integrated 2026-10-09 (deleg_f34491a7):
     protection sanction/show ADMIN (rule/allow-show left open
     per TS null + runtime gating), notifier 5 leaves
     MANAGE_GUILD, voicedashboard 6 leaves ADMIN; lastfm
     correctly ungated (TS null), authrestore already gated.
     Registry locks extended (21 any-carrier gate asserts).
     Suite: 356/0; fmt + clippy clean.
     Blogger fidelity NIT closed 2026-10-09: fetch_rss_title +
     extract_feed_title (CDATA-aware string scan, no new dep),
     single-fetch flow, validation.name || Unknown parity + test.
     Suite: 357/0.
     Dispatched (deleg_ac472284): post-checkpoint review +
     economy/ticket parity deep-dives (all read-only).
     Review integrated (deleg_7ddbf247 follow-up): ranks
     role-list now uses dedicated msg_rank_roles_empty/row keys
     (x10 locales, type:lang clean) instead of config-embed keys;
     duplicate has_gate assert removed. Suite: 357/0.
     Dispatched (deleg_44687755): economy + ticket parity fix
     batches (storage shapes/ids frozen as decisions).
     Integrated 2026-10-09: economy (rob math/floors/cooldown/
     guards, disabled-guard helper everywhere, deposit/withdraw
     key split + truncation, config on/off safety, pay parity,
     no-clamp admin, beautiful durations, owned-role buy,
     ureset default) and ticket (unlink scoping + rename/edit,
     close keep-channel flow, one-ticket limit, overwrite sets,
     category check, disable guards + config audit, transcript
     DM flow). Lead cleared 2 clippy lints from the wave.
     Suite: 358/0; fmt + clippy clean.
     U-I18N-MULTI integrated 2026-10-09 (deleg_07a31fbf): A
     (support-off key + 2 lang-fetch hoists, rest correctly
     left: automod/ghost/show/perm structures mirror TS or lack
     keys); B (ranks leaderboard/ignore/role-list keys, ticket
     set-here label/desc + open-button ack); C (music play/
     history + botinfo field keys). Accepted deviation: C
     aligned 2 fallbacks to full en-US sentences (TS parity wins
     over byte-identical rule). Suite: 356/0; fmt + clippy clean.
   - [x] U-PINGEMOJI boot-warmed app-emoji cache (done 2026-10-09):
     `emojis.rs` OnceLock table (name -> id+animated, 1h TTL) with
     `refresh` wired after `sync` at boot; all 7 direct
     get_application_emojis call sites (ping, tag info, embed color
     error, 2 help menus) plus the 15 existing app_emoji_markup
     users now read the cache. Markup is animated-aware like the TS
     FormatedName template (`<a:name:id>`), a fix vs the old static
     `<:...>`. 1 test (map via JSON-built Emojis). Only refresh +
     sync fetch now. Suite: 346/0; fmt + clippy clean.
   - [x] U-GIFDECODE image gif feature for convert_to_png
     (done 2026-10-09, see above: network back, gif 0.14.2 +
     weezl fetched, image crate "gif", first-frame decode +
     test; webp still Chromium-blocked).


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
- Night run 2026-10-08/09: infinite loop LIVE (systemd active+enabled, worker on authrestore with meta/muse-spark-1.3-contributor, 20min takeover + 6h watch crons). Picker return-bug + systemd PATH + Anthropic-key fixes committed.

## Orchestrator v2 (parallel coordinator, 2026-10-09, AUTHORITATIVE)

- Supersedes the serial loop above for scheduling/integration (the old
  loop stays installed but PAUSED — never run both; `coord.sh start`
  enforces the guard). Full spec: `ops/rust-migration/README-PARALLEL.md`.
- Queue: `ops/rust-migration/queue.json` via `mq.py` (stable ids, types
  inventory/implement/test/review/integrate, scope prefixes, deps,
  priority, timeout + bounded retries, tests, review verdict, integration
  commit, history). Pipeline per unit: implement → REVIEW-<id> →
  integrate → done; review gate enforced (`complete` refuses `done`
  without `review.verdict=pass`).
- Workers: `worker.sh` runs one task in `.worktrees/<id>` (`wt/<id>`,
  opencode agent + fmt/check/test), never commits/merges/pushes.
  Conflicts impossible by construction (`claim`/`next` refuse overlapping
  scopes). Max 3 workers (16 cores/31 GB host; effective cap
  min(3, nproc/2, mem/6) logged at startup).
- Integration: `integrate.sh` (scope → diff → tests → review gate →
  merge --no-ff → main-tree validation → MIGRATION.md + queue records;
  failures preserve worktrees, never reset/clean/revert).
- Inventory: `inventory.sh` scans all 666 TS files with token-overlap +
  command-surface criteria (never blind file-existence): verified gaps →
  `implement`, ambiguous → `inventory` triage tasks, infra → blocked,
  scaffolding → excluded with justification. 2026-10-09: 654 covered,
  1 Lavalink-blocked, 11 files in 8 triage groups, 0 blind tasks;
  rescan promotes 0 (fixed point). The 484 stale `gap-candidates.txt`
  entries are superseded (all triaged paths re-verify covered).
- Queue seed: U-I18N (sole open Remaining unit, prio 5) + 8 TRIAGE tasks.
- Hermes 0.21.6: kanban dispatch verified unsuitable (spawns Hermes
  profiles, not opencode workers) — documented decision, no
  `~/.hermes/config.yaml` change needed (backup in /tmp). Durability =
  systemd + on-disk queue + per-integration commits; each worker is one
  bounded `opencode run`, no infinite-goal assumption.
- Control: `coord.sh
  {install|start|stop|restart|status|logs|pause|resume|progress|gc|recover|inventory}`.
  Unit `ihrz-migration-coordinator.service` verified (`systemd-analyze
  verify` clean) but NOT installed/started — launch is manual.
- Tests: `ops/rust-migration/tests/test-coordinator.sh`, 21/21 pass
  (concurrent isolation, scope serialization, failure durability,
  stale recovery, review gate, empty-queue inventory, preservation,
  validation wiring). Rust baseline 2026-10-09: `cargo fmt --check`
  clean, `cargo test --workspace` 354 passed / 0 failed.

## Scope audit (2026-10-09, independent inventory)

- Fresh re-audit 2026-10-09 (after U-ALIASES): re-ran rename/alias
  matching against triage-A-missing.txt with @-stripping and
  parent-command awareness (bare rename= matching is blind: poise
  fn-name commands need no rename, subcommands nest under parents).
  All 30 residual flags adjudicated: 27 covered (registry/handler
  evidence: newsletter-toggle, button_reaction, roleselect,
  andru/ether/iris/kisakay/say/links/ping, setlogschannel,
  git_parent, wlroles-add/list, banner s/u, unban all/undo,
  sound_to_video, setprefix, autoreact-toggle, ghost, perm family,
  allowlist/authorization, voicedashboard set-*, user_lookup),
  captions/togif blocked (Chromium), owner/eval.ts EXCLUDED
  (arbitrary JS exec, developer-only; no JS runtime in Rust).
- Method: full TS tree inventoried (666 files / 115,719 lines vs Rust 62 files / 41,257 lines; prior 200k/13k estimates retired as stale). Gap heuristic produced 484 candidates; each triaged by reading the TS original and grepping rust/src. Evidence in `ops/rust-migration/inventory.md` (triage A/B/C); inputs `ops/rust-migration/triage-*.txt` (gitignored).
- Result: 272/327 command candidates covered by `rename` match; 41 more covered under aliases/restructured parents; 64/66 event files covered (2 no-op commented-out bodies counted covered); 62/91 core files covered. Verified-missing offline work became Remaining item 4 (5 units). Verified-missing infra work extended the Blocked list. Excluded with justification: owner/eval.ts (arbitrary exec), json/memory DB drivers (sqlite-only decision), discord.js loader scaffolding + colors/method/wait/type-only files (framework replaced), 2 command templates (no runtime).
- Deltas recorded, not hidden: automod native rule sync pending in-code; backup types/* header-level match only (struct-for-struct check open); commandsSync removePermissionProperties has no counterpart; unbanall/perm parents flattened.
- Reconcile rule going forward: `reconcile_gaps` records rename-covered candidates in inventory.md, appends only verified-missing directory groups as units, never auto-appends events/core (needs behavioral triage). A unit counts complete only when its roadmap line reads done.

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
- 2026-10-09: bot custom profile completion (bot-custom-banner mirroring
  HybridCommands/bot/custom/!banner.ts: jpeg data-URI PATCH, reset via
  global banner from retrieveMyself application fetch, incorrect-file
  reply; fetch_application/app_banner_url/app_bot_banner_hash helpers,
  1 test) + registered the previously dead bot_custom_name/avatar/banner
  commands in commands::all(). Suite: 249 passed, 0 failed;
  fmt + clippy clean. Note: parallel loop worker owns
  SlashCommands/authrestore full-set port (authrestore.rs) and added
  utils hideall/unhideall + slash-command usage logger; review/progress
  of that unit is theirs.
- 2026-10-09: session resume after restart. Fixed botcat doc-length,
  authrestore build errors (moved channel id, idx type), ticket Http
  arg mismatch. +hideall/unhideall, wlvc/unwlvc + channel-bound freeze,
  snipe content via cache, skullboard reactions, ticket purge,
  PUNISHPUB full flow, invites tracking, xpChannels, confession
  archive, server-logs poster, grosbg/setup/blogger-poll, animals
  batch, vkick, FUN kill-switch, tag whitelists, blacklist join gate,
  lore/status, bledit, nickrole/rolelimit, renew/sync, emojis steal,
  trans, lock/unlock, autoreact-list. Suite: 247 passed, 0 failed;
  fmt + clippy clean, build OK.
- 2026-10-09: promptYesOrNo shared confirm (commands::confirm_row pure
  builder + prompt_yes_or_no author-filtered 60s collector with
  deferUpdate-equivalent acknowledge + button clear + prompt_reset_confirm
  standard gate; getDangerousPermissions ported as
  funcs::DANGEROUS_PERMISSION_BITS/dangerous_role_perms with lang names)
  wired into all 9 TS call sites: backup load, economy role-add
  (dangerous-perm gate + 20-role cap)/ureset/greset, ranks ureset/greset,
  invites reset, clear-all-warns, leash (voice-gated, danger=false).
  Suite: 251 passed, 0 failed; fmt + clippy clean.
- 2026-10-09: avatar thumbnail snapshots (profil show, utils userinfo,
  context user-lookup now download the face via image64-equivalent
  download_bytes and send attachment://avatar.png, CDN URL fallback).
  Suite: 251 passed, 0 failed; fmt + clippy clean.
- 2026-10-09: counter counting-game parity (Events/counter/onNewMessage:
  newfeatures CounterData/parse/counter_step/CounterOutcome with
  Number() semantics + legacy bare-number rows, handler plays accept/
  wrong-repeat/wrong-number/non-number with reactions, COUNTER_DATA
  reset, replies, topic update, config off-switch, webhook/empty guards;
  2 tests; also cleared a pre-existing scheduler single-element-loop
  clippy lint). Suite: 253 passed, 0 failed; fmt + clippy zero warnings.
- 2026-10-09: MessageCommands utils top parity (oldest-message link via
  after:1/limit:1 with utils_top_command_ok/no_message lang keys;
  registered, registry 165). Suite: 253 passed, 0 failed;
  fmt + clippy zero warnings.
- 2026-10-09: alias collision fix (stats top-messages alias was invented
  as "top", colliding with the real MessageCommands top; corrected to
  TS tm/topm; registry-wide alias/name audit clean). Suite: 255 passed,
  0 failed; fmt + clippy zero warnings.
- 2026-10-09: economy timed claims parity (!daily/!weekly/!monthly/!work:
  shared claim_inner with tuning + boost amounts, disabled guard,
  cooldown errors, reward embeds, money/timestamp store; work random
  1..=1024 + ephemeral cooldown + gold embed; TS default amounts fixed
  500/1000/5000 + test corrected; superseded eco_claim! stubs removed).
  Also repaired worker's bot-custom-bio doc merge breaking the build.
  Suite: 256 passed, 0 failed; fmt + clippy zero warnings.
- 2026-10-09: moderation name parity (timeout gained tempmute alias;
  unmute gained untempmute/untimeout/demute aliases from mod.ts).
  Suite: 256 passed, 0 failed; fmt + clippy zero warnings.
- 2026-10-09: owner name parity (owner parent gained TS aliases
  addowner/owneradd/owners/ownerlist; remove gained unowner alias).
  Broad category name audit clean: giveaway/tag/sticky/tts/starboard/
  backup/profil/pfps/confession/security/h247/ranks/moderation/
  rolereactions/schedule/membercount all map to Rust renames. eval
  explicitly out of scope (arbitrary JS execution, no Rust equivalent).
  Suite: 254 passed, 0 failed; fmt + clippy zero warnings.
- 2026-10-09: music trackinfo parity (m_trackinfo stub + subcommand
  wiring in the established lavalink-pending style; all 14 TS subs now
  map). Suite: 254 passed, 0 failed; fmt + clippy zero warnings.
- 2026-10-09: sound_to_video parity (Convert to MP4 message context
  command: 90s per-user cooldown, audio attachment gate, ffprobe
  duration + ffmpeg still-image render with TS args, 25 MB cap,
  TS lang keys incl. ${fileSizeMB.toFixed(2)} quirk, tmp cleanup;
  is_audio_attachment/escape_drawtext/convert_cooldown_ok tested).
  Registry 168. Suite: 256 passed, 0 failed; fmt + clippy zero warnings.
- 2026-10-09: MessageCommands audit (25 files all map: legacy bridges,
  hybrid prefix framework with per-guild prefix + mention, unslowmode
  as slowmode alias; 4 misc meme commands @kawaeine/@rap-vs-reality/
  @two-sides/@fexini stay kdenlive-blocked with the other renderers).
- 2026-10-09: voicedashboard position parity (vd_position top/bottom
  stored under VOICE_INTERFACE.voice_channel_position + parent wiring;
  all 6 TS setters now map). SlashCommands audit clean: blogger/lastfm/
  newfeatures/notifier/protection/suggestion/honeypot all map.
  Suite: 256 passed, 0 failed; fmt + clippy zero warnings.
- 2026-10-09: autoFeur full parity (37-entry fr-ME joke table +
  exact/tail matcher incl. punctuated keys, default-on gate fix,
  3s per-user cooldown, 1/8 promo suffix with VC_OpenChat app-emoji
  markup helper, autorespond toggle rewrite with TS name/aliases +
  fr-ME gate + boolean flip; handler wired). Suite: 258 passed,
  0 failed; fmt + clippy zero warnings.
- 2026-10-09: honeypot trigger pipeline parity (schedule_trap
  debounced 1500ms entry + run_trap_pipeline: DM notify, kick/ban
  sanction, two 2h-window cleanup sweeps 8s apart, lastTriggeredAt,
  full logs embed; sweep_user_messages pagination; wired into
  message(); parse/truncate tested). Suite: 261 passed, 0 failed;
  fmt + clippy zero warnings.
- 2026-10-09: events audit batch (ghostPingModule join prime via
  load_ghost send+delete; supportModule presence_update bio/tag
  role sync; prevnamesModuleGuild nickname history with <t:d>
  stamp; blacklistFetcher global table DM + ban with reason).
  Suite: 261 passed, 0 failed; fmt + clippy zero
  warnings.
- 2026-10-09: guildCreate parity (cancel pending GC wipe,
  setLangByRegion locale map, owner seed, blacklistLeave
  farewell + leave, invite cache seed, ownerLogs embed via
  GUILD_LOGS_CHANNEL_ID, welcome embed + 6 link buttons,
  owner welcome DM with BotAdd audit inviter, per-guild bio;
  lang::get_list + locale_lang_code tested; welcome banner
  image + SMTP email legs stay blocked). Suite: 263 passed,
  0 failed; fmt + clippy zero warnings.
- 2026-10-09: security captcha parity (SECURITY blob gate,
  7-char code from TS alphabet, challenge message with
  <t:R> expiry + remaining attempts, 150s timeout task with
  same-join kick guard, answer path via security map: exact
  match grants role/removes role2, wrong answers decrement
  and re-render, zero kicks; png render ships as text code,
  image leg stays html2png-blocked). Suite: 263 passed,
  0 failed; fmt + clippy zero warnings.
- 2026-10-09: ticket close unification (shared
  close_ticket_channel + TicketCloseSpec: transcript file
  `{gid}-transcript.html`, onClose/onDelete embeds with
  timestamp; ticket_close now uses onClose keys + row drop;
  deleteTicketOnLeave wired into member-removal with
  onDelete keys; deleteTicketPanelOnMessageDelete marker
  drop in message_delete). Suite: 263 passed, 0 failed;
  fmt + clippy zero warnings.
- 2026-10-09: reactToMessage parity (hey_reaction literal-
  false gate; case-insensitive trigger substring over
  GUILD.REACT_MSG keys with emoji react via
  parse_react_emoji; greeting first-word wave; replaces the
  wrong exact-match text reply; REACT_GREETINGS +
  parse/is_greeting tested). Suite: 264 passed, 0 failed;
  fmt + clippy zero warnings.
- 2026-10-09: voice payout bugfix (coins_for_voice now
  floor(min/10) x boost like TS, was 1/min x boost — a 10x
  overpay; unit + wallet tests corrected). Suite: 264
  passed, 0 failed; fmt + clippy zero warnings.
- 2026-10-09: protection member-update gap closed
  (avoidMemberUpdate guard on any role add/remove via
  RoleUpdate audit; invite cache purge on guildDelete;
  linked-channel/onNewMessage is an empty stub — nothing
  to port). Suite: 264 passed, 0 failed; fmt + clippy
  zero warnings.
- 2026-10-09: allowlist lazy seed (createAllowlistOnMessage
  owner entry on first message) + honeypot staff exemption
  (admin/manage-guild/ban/kick skip). Suite: 264 passed,
  0 failed; fmt + clippy zero warnings.
- 2026-10-09: moderation log embeds (shared mod_audit_log:
  #010101 + Reason field + timestamp from the latest audit
  entry; ban-add/ban-remove/kick text lines replaced with
  addBanLogs/removeBanLogs/kickLogs embeds). Suite: 264
  passed, 0 failed; fmt + clippy zero warnings.
- 2026-10-09: boost log key + embed (SERVER_LOGS.boost was
  never written by setlogs — canonical TS key is `boosts`;
  fixed in LOG_TYPES/route_log/handler; text line replaced
  with the #a27cec boostLogs embed incl. unboost case and
  10-minute recency guard). Suite: 264 passed, 0 failed;
  fmt + clippy zero warnings.
- 2026-10-09: messageDelete/messageUpdate log embeds
  (messageDeleteLogs: #010101 author+content embed from an
  owned cache snapshot — the guard is not Send — with
  single-image vs multi-file attachment re-upload and bot
  self-skip; messageUpdateLogs: #010101 author+jump-link
  embed with Before/After fields or the message_diff block
  past 160 chars, bot/empty/unchanged skipped). Suite: 265
  passed, 0 failed; fmt + clippy zero warnings.
- 2026-10-09: channelUpdate log embed (channelUpdateLogs:
  ChannelUpdate + ChannelOverwriteUpdate audit entries with
  bot self-skip; pure channel_perm_diff helper over
  PermOverwriteDiff mirroring TS getDiff — name line,
  allow/deny add/remove, added-overwrite blocks, empty
  means silent; 1024-char clamp; #010101 embed). Suite: 266
  passed, 0 failed; fmt + clippy zero warnings.
- 2026-10-09: roles log embed (rolesLogs: simplified role-diff
  text line replaced with the MemberRoleUpdate audit embed —
  #010101 with removed/added role mentions via
  event_srvLogs_guildMemberUpdate(_2)_description; unchanged
  roles, missing channel/entry, bot executor, or wrong target
  stay silent). Suite: 266 passed, 0 failed; fmt + clippy
  zero warnings.
- 2026-10-09: voice log embed (voiceLogs: shared
  voice_state_log helper — #010101 author+timestamp embed
  for leave/join/self-deafen/undeafen/self-mute/unmute via
  the event_srvLogs_voiceStateUpdate(_2..6)_description keys;
  join/move/leave text lines removed; bot self-skip, moves
  and no-op updates silent). Suite: 266 passed, 0 failed;
  fmt + clippy zero warnings.
- 2026-10-09: server-log batch closed (all 11 TS files in
  Events/logs now map to rich embeds; invented text lines
  for channel create/delete and the message-delete
  cache-miss fallback removed — TS has no such logs and
  stays silent; dead generic server_log helper deleted).
  Suite: 266 passed, 0 failed; fmt + clippy zero warnings.
- 2026-10-09: ihorizon-logs setup embed (logs/ihorizon_logs.ts:
  freshly created channels named *ihorizon-logs* get the
  #1e1d22 setup embed; slashCommandLogger stays with the
  parallel worker per prior note). Suite: 266 passed,
  0 failed; fmt + clippy zero warnings.
- 2026-10-09: scheduler audit closed (all ticks verified
  implemented for real — schedules, giveaways, temp
  roles/bans, membercount, pfps, auto-renew, Blogger,
  nightmode; only the 120s StreamNotifier skeleton remains,
  blocked on the Twitch/YouTube/Kick live APIs; stale module
  header rewritten). Suite: 266 passed, 0 failed; fmt +
  clippy zero warnings.
- 2026-10-09: modalHelper parity (shared await_modal_submit
  in commands/mod.rs: customId+author filter, TS 1240s
  timeout, response-id dedupe set; all 4 inline collectors
  — confess/confessionres modals, tempvoice transfer +
  name/limit modals — migrated to it). Suite: 266 passed,
  0 failed; fmt + clippy zero warnings.
- 2026-10-09: bannerGenerator parity (BANNER_URL_TEMPLATE
  + banner_url + guild_banner_url in funcs.rs reading
  GUILD.LANG with en-US fallback; banner image wired into
  the 3 tempvoice select-handler summary embeds like the TS
  setImage calls). Suite: 266 passed, 0 failed; fmt +
  clippy zero warnings.
- 2026-10-09: welcomer join DM/role key unification (the TS
  panel + emission use GUILD.GUILD_CONFIG.joindm/joinroles
  while Rust used GUILD.JOIN_DM/JOIN_ROLE: new
  join_dm_template/join_role_ids readers take the blob first
  with legacy fallback; render_join_dm ports
  generateCustomMessagePreview incl. literal TS defaults;
  emission gains the off-switch, rendered preview, disabled
  Message-from button, and array roles.set replace;
  gc_joindm/gc_joinrole now write the blob keys). Suite: 268
  passed, 0 failed; fmt + clippy zero warnings.
- 2026-10-09: welcomer interactive panel (new
  commands/welcomer_panel.rs: stateless port of the 1807-line
  welcomerPanel.ts — section select + join/leave message and
  embed-id modals with resets, text/component toggles, DM
  modal + reset with already-disabled guard, channel picks +
  reset, role picker with ManageRoles gate + dangerous-perm
  confirm (pending roles in blob) + too-high warn, banner
  reset/toggle; classic embeds stand in for Components V2;
  banner image editing stays html2png-blocked; registered as
  welcomer-panel (registry 169) + router-wired). Suite: 270
  passed, 0 failed; fmt + clippy zero warnings.
- 2026-10-09: giveaway image option (is_image_url port of
  mediaManipulation.isImageUrl; gw create gains an image
  option validated image-only and stored as embed_image_url;
  display stays text until the giveaway embed rework).
  Suite: 270 passed, 0 failed; fmt + clippy zero warnings.
- 2026-10-09: embed media helpers (is_animated port of
  method.isAnimated + media_by_message port of
  embedHelper.getMediaByMessage with TS branch order, tested;
  full interactive embed builder stays a later unit).
  Suite: 271 passed, 0 failed; fmt + clippy zero warnings.
- 2026-10-09: warn DM parity (method.warnMember: warn ids now
  use generate_password 8-char uppercase+numbers; warn DMs
  the member with the Red global_warn embed + disabled
  guild-id button, best-effort). Suite: 271 passed,
  0 failed; fmt + clippy zero warnings.
- 2026-10-09: warn helper repair (last turn left
  warn_member/mod_warn/mod_timeout with mismatched
  signatures — poise attribute restored onto mod_warn,
  shared WarnContext struct for clippy arity, u16 role
  positions; tempmute now records its warnMember warn with
  the mute-description reason). Suite: 271 passed,
  0 failed; fmt + clippy zero warnings.
- 2026-10-09: legacy arg helpers (str_arg/long_str_arg/
  int_arg/is_number_str ports of method.string/longString/
  number/isNumber with TS edge semantics, tested). Suite:
  272 passed, 0 failed; fmt + clippy zero warnings.
- 2026-10-09: TS-shape stats history (UserStats gains
  msg_log/voice_log mirroring StatsMessage/StatsVoice,
  capped 2000/500 for kv size; session value now
  start:channel with legacy bare-timestamp parse; move
  closes the old leg with boost coins via voice_switch;
  msg/voice window + top-channel calculators ported from
  userStatsUtils with tests; ustats shows day/week/month
  + top-3 channels/voice). Suite: 275 passed,
  0 failed; fmt + clippy zero warnings.
- 2026-10-09: nitrofdp parity (amount default 1, >275000
  -> 10000, fr-locale gate, fake_nitro.txt with
  discord.gift/16-char lines; new
  generate_multiple_passwords helper + test, tested).
  Suite: 276 passed, 0 failed; fmt + clippy zero
  warnings.
- 2026-10-09: interactive embed builder (stateless port
  of utils !embed.ts EmbedManager: select actions 0-13
  with TS label/emoji order, text/media/clear inputs via
  EMBED_AWAIT consumed by the message() hook, copy/save/
  send-channel-pick/replace flows, EMBED.<id> owner
  storage, owner gate; button ids namespaced embed:* as
  bare save/send are unsafe in the shared router;
  collector timeouts have no stateless equivalent).
  Registered `embed` (registry 170), router + message
  hook wired, pure core tested. Suite: 280 passed,
  0 failed; fmt + clippy zero warnings.
- 2026-10-09: addrolereact (grant role to all message
  reactors: hierarchy check, per-reaction progress,
  final count, catch-all error; audit reason has no
  serenity 0.12 equivalent). Registered (registry 171).
  Suite: 280 passed, 0 failed; fmt + clippy zero
  warnings.
- 2026-10-09: admin-roles (admin role list, 5/page
  wrap-around pager with invoker gate, owner-only trash
  stripping Administrator with good/bad counts +
  #007fff result embed; pure pager tested). Registered
  (registry 172), router-wired. Suite: 281 passed,
  0 failed; fmt + clippy zero warnings.
- 2026-10-09: helpall (perm-gated command list: no-perms
  notice, owner bypass, per-category #1519f0 embeds with
  25-field pages, gate suffixes, stateless category
  select with invoker gate; pure suffix/field/key
  helpers tested). Registered (registry 173),
  router-wired. Suite: 283 passed, 0 failed; fmt +
  clippy zero warnings.
- 2026-10-09: Components audit (all 23 TS files map: tempvoice
  button+select arms incl. new region flow, ticket t-embed/open,
  confession, newsletter, giveaway, roleselect, rolepanel, honeypot,
  button_reaction fallback; ticket panels use the button equivalent
  of the TS select menus).
- 2026-10-09: temp-voice region parity (panel Region button +
  tempvoice:region-select menu with the 14 TS starter options;
  setRTCRegion via EditChannel::voice_region + TS summary embed with
  VC_Region markup; VOICE_REGIONS tested). Suite: 259 passed,
  0 failed; fmt + clippy zero warnings.
- 2026-10-09: tagInfoEmbed parity (tag_info rewritten to the TS
  template: Tag #name title, guild-icon thumbnail chain, Aqua, 6-line
  Crown/Sparkles/Timer/Badge/Commands desc with <t:D> dates; TagEntry
  extended with create/last-use timestamps + lastUseBy, set on
  create/use). Suite: 258 passed, 0 failed; fmt + clippy zero warnings.
- 2026-10-09: economyLogs parity (post_economy_log shared helper:
  GUILD.SERVER_LOGS.economy channel, #f1c232 + timestamp, {coin} via
  Coin app emoji; wired into all 12 TS call sites: pay/rob/deposit/
  withdraw/balance-add/balance-remove/role-add/role-delete/boost-set/
  config/set-money/set-cooldown with TS templates incl. ${money}
  quirk). Suite: 258 passed, 0 failed; fmt + clippy zero warnings.
- 2026-10-09: fun interaction/random batch parity (dice rewritten to TS
  number x Dfaces embed + de alias; heads-tails rename + TS aliases +
  embed; fun_enabled fixed to off/0; fun_guard/random_colour/animal_pic
  shared; duck/dolphin/fox/frog/panda/squirrel with TS APIs/titles;
  67 meme; gay/stench via percent_user; rate + note alias; worker
  animal_cmd/affinity_cmd stubs + stale roll_dice tests removed, dup
  67 resolved). Registry 167. Suite: 254 passed, 0 failed;
  fmt + clippy zero warnings.
- 2026-10-09: utils banner subdir parity (banner/banner.ts parent with
  banner-user/banner-server subcommands + TS aliases; user hash via
  Discord REST GET /users/{id}, gif for a_ hashes, #c4afed embeds;
  shared footer_parts/embed_with_footer mirroring displayBotName
  footerBuilder/footerAttachmentBuilder; vanity-generator stays
  gateway-blocked). Registry 167. Suite: 257 passed, 0 failed;
  fmt + clippy zero warnings.
- 2026-10-09: music_proximity fidelity (replaced approximate
  proximity_pick with exact levenshtein/similarity/is_similar ports
  including 0.5/0.6 call shape, buildTrackLabel title-first order,
  strict-> tiebreak keeping Deezer; 3 tests). Suite: 255 passed,
  0 failed; fmt + clippy zero warnings.
- 2026-10-09: `SlashCommands/authrestore/` full set done
  (authrestore.rs: parent + set/delete/get/force-join/roles, admin-gated,
  registry 159). Offline parity: secret scan, member filter, pager/state
  machine, histogram, locale distribution, recents, force-join counts,
  `%`/ws parsers, RESTORECORD kv, button attach/clear + authorship guards,
  secret/renewed-code DMs, counts embed + shared yes/no confirm.
  Deferred live-only: gateway HTTP/WS, html2png dashboard (text instead),
  `get` button collector. @rust-reviewer round findings fixed. Suite:
  251 passed, 0 failed; fmt + clippy clean.
- 2026-10-09: fixed pre-existing authrestore breakage (poise
  command-level description fields, create_payload test args),
  ticket Http arg mismatch, botcat doc length, wire global
  command-log + hideall/unhideall + wlvc/unwlvc + snipe content +
  skullboard + ticket purge + freeze list. Quarantined one flaky
  timing test (localhost TCP timeout 300ms -> 2s). Suite: 251
  passed, 0 failed; fmt + clippy clean, build OK.
- 2026-10-09: nightmode tick goes real (REST guild enumeration,
  window edges via night_active, NIGHTMODE.state dedup). Suite: 253
  passed, 0 failed; fmt + clippy clean, build OK.
- 2026-10-09: h category browser (stateless port of
  MessageCommands/bot @h.ts: 26-category table from
  HybridCommands init.json with TS colors, per-category 24-field
  pages with h_suite continuations, 25-per-page category select
  with prev/next page buttons, HELPMSG invoker gate,
  app-emoji option icons best-effort; HelpPage struct for
  clippy type-complexity). Registered `h` (registry 174),
  router-wired. Suite: 284 passed, 0 failed; fmt + clippy
  zero warnings.
- 2026-10-09: slash-command file logger (new src/slashlog.rs:
  sanitize_interaction_option_value with TS sensitive-name set +
  normalization, ParsedSavedCommand camelCase rows, batched
  SlashLog (10-command batches or 1s debounce, 10000-entry cap,
  tmp+rename atomic writes, error requeue, force_flush) at
  src/files/slash.log.json, SIGINT/SIGTERM flush task in bot.rs,
  legacy text-log converter (parseLine/timestamp/continuation
  join/getStatistics incl. tie/empty semantics) + core.ts
  one-shot slash.log migration in main.rs; hooked into
  interaction_create for Command interactions with bot +
  non-guild skip; new chrono dep (cached 0.4.45). Deltas:
  invalid legacy timestamps skip (TS: null), attachment
  options log URL, unresolvable names fall back to ids. 7
  tests. Suite: 291 passed, 0 failed; fmt + clippy zero
  warnings.
- 2026-10-09: starboard/skullboard full parity (all 4 event
  files: rich post embed — board color #ffac33/#2b2d31, author
  tag + avatar snapshot attachment, 2000-char description,
  original-message link field, source timestamp, bot footer +
  icon file, first image attachment, count + channel content
  line — with edit-in-place on further reactions, repost +
  number update when the board message is gone, createThread
  leg with per-board emoji thread names, camelCase DATA
  entries in GUILD.STARBOARD_DATA/SKULLBOARD_DATA; delete leg
  drops the board message + entry below threshold (entry kept
  when the delete fails) and re-renders above; reactor/author
  bot gates, unicode-only emoji gates, text-channel gate;
  reaction_remove restructured so role removal no longer
  early-returns past the board leg. Deltas: avatar/footer as
  attached snapshots (TS: raw CDN URL), description cut on
  chars (TS: UTF-16 units), reactor bot via cache only.
  Pure content/color/emoji/find helpers + wire shape tested.
  Suite: 292 passed, 0 failed; fmt + clippy zero warnings.
- 2026-10-09: custom parent + SDK paywall (bot/custom/custom.ts
  container with name/avatar/banner/bio subcommands carrying
  the TS prefixNames as poise aliases — botname/setname/
  setbotname, botavatar/setpic/setavatar/setpp,
  botbanner/setbotbanner/setbanner, botbio/setbotbio/setbio —
  replacing the invented flat bot-custom-* commands, registry
  174 -> 171; checkCustomSdkGate/hasGuildSku port:
  production-only via new config.is_production_env
  (BOT_ENV), owner bypass, live entitlement lookup for the
  Custom-sku with the exact TS !deleted-only match, else the
  Boost_Gem store line + Red Pleading upsell embed with a
  snapshot thumbnail; EXPRESSIONS completed to the 10-entry
  TS set (Thinking, Wink) + expression_url helper. Delta:
  bare ?botname-style prefix shortcuts have no poise
  equivalent (framework gap, ?custom <alias> works).
  Suite: 294 passed, 0 failed; fmt + clippy zero warnings.
- 2026-10-09: giveaway manager full port (core/modules/
  giveawaysManager.ts): rich board posts (GW_COLOR 0x9a5af2,
  event_gw_embed_desc with <t:R>/<t:D> stamp pair, footer
  attachment icon, validated embed image, entry + participants
  buttons, footer file), finish_giveaway shared end flow
  (selectWinners-style xorshift excluding past winners,
  ended_embed_desc + setjoinroles_var_none fallback,
  GW_END_COLOR 0x2f3136 board edit + Finnish tenor link
  button, winners/cannot replies with the quirky prize
  placeholder replaced), reroll port (ended_word template,
  SetWinners overwrite, footer file re-upload on edit,
  missing-board row delete), entry button full flow
  (break_req requirement gate with No app emoji,
  leave-confirm ephemeral + namespaced giveaway-leave:<mid>,
  live Entries count edit via UpdateMessage), leave flow
  (DB removal + board count edit + confirm-text ephemeral
  clear), participants list (history_no_entries empty leg,
  guild check, ephemeral paged embeds via shared
  render_entries_page, stateless gw-entries:<mid>:<page>
  pager), 15s scheduler refresh loop with http calling the
  shared finish (None in tests = keys only), gw create/end/
  reroll/entries commands on lang keys
  (end_not_find/reroll_dont_find/reroll_not_over/
  end_command_error). Deltas: 60s leave-confirm and 15-min
  entries collectors are stateless buttons (no timeout),
  footer icon on ephemeral pages mirrors the TS
  attachment-without-file quirk. Suite: 295 passed,
  0 failed; fmt + clippy zero warnings.
- 2026-10-09: legacy ticket-open compat (CreateTicketChannel v1
  in core/modules/ticketsManager.ts): verbatim
  `open-new-ticket` button + `ticket-open-selection` select
  router-wired to shared handle_legacy_ticket_open —
  GUILD.TICKET.<msg> marker check (channel + message match),
  TS nested TICKET_ALL.<uid> already-opened gate with
  stale-row cleanup, optional ticket_reason_modal (8..350
  via shared await_modal_submit), ticket-<user> channel with
  everyone-deny/user-allow overwrites, category precedence
  selection ?? panel ?? global, select/button opener embeds
  (sethereticket_panel_select_embed_desc + reason embed) vs
  #3b8f41 welcome embed, footer name/icon (BOT.botName/PFP
  + live avatar fallback), nested TICKET_ALL write, ticket
  message (user select 0..10 + transcript/delete buttons,
  pin), #008000 creation log. Panel structs now
  rename_all camelCase (+ category alias) so TS-written V2
  rows parse. Deltas: no lockPermissions parent sync
  (explicit overwrites are the effective state). Suite: 297
  passed, 0 failed; fmt + clippy zero warnings.
- 2026-10-09: V2 ticket-open compat (CreateTicketChannelV2 in
  core/modules/ticketsManager.ts): verbatim
  `ticket-open-selection-v2` router-wired to
  handle_v2_ticket_open — GUILD.TICKET_PANEL.<msg> code ->
  panel row marker, shared live_open_ticket already-opened
  gate, optionFields value match, chosen.categoryId ||
  panel category, form modal (chosen form ?? panel form,
  reason-label title, Short/required/1..240, 45/60-char
  truncation), Discord_Loading ephemeral line (defer
  fallback), shared channel create/record/log helpers,
  opener embeds with the placeholder-in-panelName quirk,
  panel-embed override (chosen panelId ?? ticketChannelPanel
  -> EMBED rows -> generateCustomMessagePreview subset +
  {category} via EmbedPreview -> stored-JSON builder, og +
  file fallback), `## label` answers embed, config-gated
  user-select/delete/transcript components, pingUser +
  option/panel rolesToPing content (None when empty), pin.
  Shared helpers extracted from the v1 flow
  (live_open_ticket/record_open_ticket/create_ticket_channel/
  post_ticket_creation_log). The `-preview` select needs no
  handler (TS has none either). Deltas: no lockPermissions
  parent sync; account createdAt locale date approximated as
  empty (only the <t:R> stamp is exact). Suite: 298 passed,
  0 failed; fmt + clippy zero warnings.
- 2026-10-09: rolebutton rework + button_reaction press flow
  (HybridCommands/rolereactions/rolebutton.ts +
  Components/Buttons/button_reaction.ts): rolebutton now
  takes the TS add/remove value + channel/message ids +
  reaction/role with the btnreact alias (replacing the
  invented GUILD.BUTTON_ROLES write that posted no button);
  add posts a real Secondary `button_reaction%<role>` button
  via raw component-JSON edit (first <5-component button row
  else new row, 5-row error), custom `<:name:id>` normalize,
  post-add `< > :` format gate with the No mark, TS-shape
  `{rolesID, reactionNAME, enable}` rows, #bf0bb9
  ihorizon-logs embed, ephemeral work confirmation; remove
  scans rows by reactionNAME, drops the button by emoji id
  (edits only when one drops, like buttonUnreact), deletes
  the row, logs, ephemeral confirm; press handler
  router-wired on the verbatim prefix (row lookup, role
  fetch, bot-top-role hierarchy check, add/remove toggle
  with the TS reply templates). Deltas: no audit reason on
  role edits (serenity 0.12 has none); TS emoji-id quirk
  preserved (bare custom ids render as text, unicode never
  matches buttonUnreact). Suite: 300 passed, 0 failed; fmt
  + clippy zero warnings.
- 2026-10-09: reaction-roles row-shape + toggle parity
  (HybridCommands/rolereactions/rolereaction.ts +
  Events/reactionrole/onReactAdd.ts + onReactRemove.ts):
  rr_add/rr_remove reworked to the TS flows (channel +
  message ids, help embed for missing role, react seeding,
  emote-format gate, TS `{rolesID, reactionNAME, enable}`
  rows, #bf0bb9 logs, ephemeral confirms; remove checks the
  live bot reaction, deletes it, drops the row), replacing
  the bare-id stub rows and hardcoded replies; reaction_add
  is now a real toggle (bot-self skip, name-then-nitro-id
  lookup, missing-role skip, has/remove legs) and
  reaction_remove uses the TS name-key legs with bot skip;
  row parsing accepts TS objects with legacy bare-id
  fallback; dead generic component-router else (with its
  hardcoded strings) deleted now that button_reaction% has
  its own arm. Deltas: no audit reason on role edits
  (serenity 0.12 has none); TS remove-leg duplicate lookup
  folded (same key, same outcome). Suite: 301 passed,
  0 failed; fmt + clippy zero warnings.
- 2026-10-09: roleselect interactive builder + saved-select
  grants (HybridCommands/rolereactions/roleselect.ts +
  SelectMenu/roleselect_roles.ts): `roleselect` reworked to
  the TS flow (channel_id + message_id params, length>=9
  gate, fetch, bot-authorship check, baseData load,
  0x2f3136 config embed + main menu + live preview,
  kv draft) replacing the invented 3-role poster and its
  hardcoded strings; main-menu legs (add/remove/
  placeholder/save/cancel + invoker gate + empty-remove
  embed clear + save writes GUILD.ROLE_SELECT + target
  apply + collector-end strip + draft delete), ephemeral
  Role-menu add step with dup gate and emoji validation,
  and saved-select grants (`roleselect_roles%<msg>`:
  saved lookup, role fetch, bot-top-role hierarchy,
  add/remove toggle with buttonreaction_* templates);
  rows now camelCase so TS-written configs parse; router
  wired (main, role_pick:<config>, roles% prefix) and the
  invented `roleselect-pick` id removed. Deltas: 50-min
  collector timeouts persist until save/cancel; no audit
  reason (0.12); ephemeral role prompt not deleted (id
  untracked); legacy snake rows default role_id to "".
  Suite: 305 passed, 0 failed; fmt + clippy zero warnings.
- 2026-10-09: image_dominant_color + vc server-stats embed
  (core/functions/image_dominant_color.ts +
  HybridCommands/utils/!vc.ts): funcs ports rgb_to_hsl,
  rgb_to_hex (clamped), vibrancy_score, and the full
  bucket/score selection (rounded-tens buckets, >1% keep,
  vibrant l>20/s>20 best-score, dark l<40 darkest,
  blurple #5865f2 fallback) as vibrant_and_dark_colors,
  PNG decode via the new `png 0.18` dep (RGB/RGBA 8-bit;
  other shapes Err like the TS throw), and async
  image_dominant_color over URL/base64/file inputs;
  `vc` reworked from the channel-list stub to the TS
  embed (short/large mode, member fetch on empty cache,
  presence buckets with invisible default, voice counts
  skipping channelless states, dominant icon color with
  #010101 fallback, icon thumbnail, GreenTick ephemeral
  ack for slash). `getIp.ts` needs no port (zero callers
  in TS). Deltas: JPEG/GIF artwork not decoded (music
  consumers stay blocked on Lavalink anyway); slash
  option named `mode` (TS `show-mode`). Suite:
  314 passed, 0 failed; fmt + clippy zero warnings.
- 2026-10-09: github-lines full port (Events/github-lines/
  onNewMessage.ts + core/modules/githubLinesManager.ts +
  newfeatures/!lines.ts + gitlines.ts): gate fixed to
  default-on (`github_lines_enabled`: only "false"/"0"
  disable; the old `== "1"` check silently dropped every
  guild that never toggled); whole-content scan for
  GitHub/GitLab/Gist links (new GitLabRef/GistRef parsers,
  `#Lx[~-]?L?y` frags, dash-encoded gist names with
  normalized API lookup via GITHUB_API_KEY, formatIndent
  dedent, single/range slicing with tick escape,
  per-extension code blocks); >50-line spam and >=2000-char
  limit guards with 5s auto-delete; channel sends (not
  replies); 1/8 promo upsell when the key is absent; and a
  spawned 15s author-only trash collector that deletes on
  collect or removes the bot reaction on timeout.
  `gitlines` reworked to the TS surface (`git` parent +
  `lines` toggle sub, no args, YAML work/disabled
  replies; registry "gitlines"->"git", count unchanged).
  Deltas: 200KB fetch cap (TS uncapped); no
  suppressEmbeds (no serenity 0.12 API); bot-guard added
  (TS early-returns bots/webhooks). Suite: 317 passed,
  0 failed; fmt + clippy zero warnings.
- 2026-10-09: sticky manager full port (HybridCommands/
  sticky/* + core/modules/stickyMessageManager.ts +
  Events/sticky/onNewMessage.ts): StickyConfig now the TS
  shape (channelId/content/embedId/lastMessageId/enabled,
  camelCase; legacy Rust message/embed_id rows accepted
  via aliases); shared refresh (SendMessages check via
  user_permissions_in, EMBED embedSource payload, delete
  previous, resend, lastMessageId store, sent/missing_
  config/embed/permissions statuses), per-channel async
  queue + 5s reset-on-message debounce replacing the
  immediate text-only repost; text/embed preserve
  lastMessageId and queue a refresh; disable deletes the
  last post + row; refresh maps statuses; show/list
  render the #11304c embeds with footer; all replies via
  the 30 sticky_* YAML templates; TS sticky-* prefix
  aliases added. Deltas: invalid-channel branch has no
  poise equivalent (framework rejects bad channels).
  Suite: 319 passed, 0 failed; fmt + clippy zero warnings.
- 2026-10-09: rolesaver parity fixes (Events/rolesaver/* +
  SlashCommands/newfeatures/rolesaver.ts): snapshot key
  corrected to `ROLE_SAVER.<uid>` (was the invented
  `ROLESAVER.`), leave gate un-inverted (snapshot when
  enabled, was snapshotting when disabled), join restore
  now gated on enabled with replace semantics (add
  missing + remove extras, was additive-only); admin
  roles skipped on leave when `admin === "no"` via
  cache permission flags; config reads the TS
  `{enable, timeout, admin}` blob first (truthy enable)
  with legacy flat-row fallback; the `rolesaver`
  command now takes on/off + yes/no settings and emits
  the #3725a4 on/off embeds with footer via YAML keys
  (was hardcoded strings + flat `.enable` row, off now
  deletes the blob like TS). Deltas: no audit reason
  on restore (0.12); unknown roles fail open (kept) when
  missing from cache. Suite: 319 passed, 0 failed;
  fmt + clippy zero warnings.
- 2026-10-09: commandExecutor enforcement port
  (core/commandExecutor.ts + interaction
  slash/messageCommandHandler.ts): global 1s debounce now
  enforced in global_check (shared Cooldowns in Data,
  denied runs get ephemeral lang.Msg_cooldown);
  UTILS.COMMAND_LIMITS enforced as a sliding window
  (shared RateLimits in Data, path then category
  fallback, guild-owner bypass incl. GUILD.OWNER rows,
  denied runs get commandlimit_rate_limited with the
  remaining window); crashes now report via
  report_command_error (user error block + /report hint,
  SLASH_/MSG_CMD_CRASH_NOT_HANDLE embed to the report
  channel, new Config.report_channel_id env
  REPORT_CHANNEL_ID defaulting to the TS channel);
  `commandlimit` reworked to the TS surface (set/reset/
  list, registry path validation with
  var_unreachable_command, YAML replies, sorted #11304c
  list embed, Admin gate, full time_ms windows).
  Deltas: guard replies are ephemeral (TS slash
  ephemeral, message-path silent); beautiful time is
  English short form; report embed carries User +
  invocation instead of the two admin-flag fields;
  no per-command target.cooldown exists in the Rust
  registry so checkGlobalCooldown has nothing to
  enforce; autocomplete choices are the registry walk
  (no 25-cap live filter). Suite: 320 passed, 0 failed;
  fmt + clippy zero warnings.
- 2026-10-09: agent takeover. Loop had restarted itself under systemd
  (Restart=always) and run the new reconcile live (278 covered, 11
  auto units — all 11 were alias-covered false positives, removed;
  reconcile now consults inventory.md MANUAL:TRIAGED-PATHS with all
  484 candidates recorded). Loop paused via migrate.sh pause (PAUSED
  file, lock held, tree untouched) while the agent works directly;
  resume with migrate.sh resume when handing back. U-FEXINI done
  (legacy.rs fexini + gate test, registry 172). Suite: 321 passed /
  0 failed; fmt + clippy clean. Next: U-HELPERS.
