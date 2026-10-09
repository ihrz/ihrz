# Rust migration inventory — TS module to Rust counterpart mapping

Source of truth for scope reconciliation. The filename heuristic in
`audit_new_gaps` (migrate-loop.sh) is only a candidate generator; this
file records verified behavioral coverage with evidence. Sections marked
AUTO are rewritten by `reconcile_gaps`; manual triage sections below are
authoritative and never auto-edited.

## Manual triage A — Interaction commands (2026-10-09, agent-verified)

Scope: the 49 command/component files in triage-A-missing.txt (the ~280
others were already verified by `rename = "<name>"` match in rust/src).
Method: each TS original read, rust/src grepped for aliases, parent
commands, and handler functions.

### Covered (41)

Component handlers (dispatched in events_handler.rs):
- Components/Buttons/button_reaction.ts → rolereactions.rs BUTTON_REACTION_PREFIX + handle_button_reaction (dispatch events_handler.rs:3661)
- Components/Buttons/newsletter-toggle.ts → legacy.rs NEWSLETTER_TOGGLE_PREFIX + handle_newsletter_toggle (dispatch events_handler.rs:3615)
- Components/SelectMenu/roleselect_roles.ts → rolereactions.rs ROLESELECT_ROLES_PREFIX + handle_roleselect_grant (dispatch events_handler.rs:3652)

Bot lore/personality (different names, same behavior):
- bot/andru.ts, ether.ts, iris.ts, kisakay.ts → botcat.rs lore_cmd (botcat.rs:601-604), registered mod.rs:218-221
- bot/link.ts (cmd links) → botcat::links
- bot/ping.ts → fun::ping (mod.rs:58)
- bot/say.ts → botcat::say

Renamed but ported:
- guildconfig/setlogschannel.ts (cmd setlogs) → guildconfig.rs gc_setlogs, rename="setlogs"
- moderation/!tempmute.ts → moderation.rs rename="timeout" aliases("tempmute")
- newfeatures/gitlines.ts → newfeatures.rs git_lines_toggle + events_handler.rs:2138 enforcement
- utils/!wlroles.ts → utils.rs wlroles_add / wlroles_list (mod.rs:147-148)
- utils/banner/!server.ts → utils.rs banner_server, rename="banner-server"
- utils/banner/!user.ts → utils.rs banner_user, rename="banner-user"
- utils/unbanall/!all.ts → utils.rs unban_all, rename="unban-all"
- utils/unbanall/!undo.ts → utils.rs unban_undo, rename="unban-undo"
- utils/unbanall/unbanall.ts (parent) → flattened into the two above (mod.rs:145-146)
- MessageApplicationCommands/sound_to_video.ts → context.rs context_menu_command="Convert to MP4", ffprobe/ffmpeg pipeline
- MessageCommands/bot/@prefix.ts + SlashCommands/guildconfig/!prefix.ts → guildconfig.rs gc_prefix under guildconfig parent (+ db.rs guild_prefix)
- MessageCommands/guildconfig/@toggle-react.ts → guildconfig.rs gc_autoreact_toggle, rename="autoreact-toggle"
- MessageCommands/utils/autofeur.ts (cmd autorespond) → legacy.rs rename="autorespond" aliases autofeur, joke table + cooldown
- SlashCommands/guildconfig/!save.ts → guildconfig.rs gc_config_save, rename="config-save"
- SlashCommands/guildconfig/!too-new-account.ts → guildconfig.rs gc_toonew, rename="toonew"
- automod/!discord_invite_link.ts → guildconfig.rs gc_automod_discord
- automod/!link.ts → guildconfig.rs gc_automod_link
- automod/!mass-mention.ts → guildconfig.rs gc_automod_mass
- automod/!telegram_link.ts → guildconfig.rs gc_automod_telegram
- join-ghostping/join-ghostping.ts (parent) → guildconfig.rs gc_ghost_add/remove/list + events_handler.rs:1442 prime
- perm/!command.ts → guildconfig.rs gc_perm_change, rename="perm-change"
- perm/!create-roles.ts → guildconfig.rs gc_perm_roles_create, rename="perm-roles-create"
- perm/!edit-roles.ts → guildconfig.rs gc_perm_roles_edit, rename="perm-roles-edit"
- perm/!set-user.ts → guildconfig.rs gc_perm_user, rename="perm-user"
- perm/perm.ts (parent) → restructured as guildconfig subcommand family
- protection/allowlist/allowlist.ts (parent) → protection.rs protect_allow_add/remove/show
- protection/authorization.ts (cmd protect) → protection.rs protect + protect_rule/sanction/show
- voicedashboard/!set-staff-role.ts → voicedashboard.rs vd_staff, rename="staff", same staff_role key
- voicedashboard/!set-text-channel.ts → voicedashboard.rs vd_panel, rename="panel", same VOICE_INTERFACE.interface key
- UserApplicationCommands/lookup.ts → context.rs user_lookup, context_menu_command="User Lookup"

Known deltas inside covered (not blockers, recorded):
- automod detection ported but native Discord AutoMod rule sync noted pending in-code.
- unbanall/perm parents flattened rather than wrapped (behavior preserved).

### Missing, verified (7) — candidates for roadmap units

- fun/!captions.ts — captioned GIF from image + text via core/images captions(); zero caption hits in rust. Needs image pipeline.
- fun/!togif.ts — video/sticker-to-GIF conversion (Jimp + headless decode); no Rust counterpart.
- utils/!vanity-generator.ts — claim custom vanity URL (validate invite → create invite → gateway CreateCustomVanity POST); gateway method exists in funcs.rs but no command wires it.
- MessageCommands/misc/@fexini.ts — fr-only partner ad reply, auto-deleted after 10s. Small unit.
- MessageCommands/misc/@kawaeine.ts (alias meme3) — kdenlive two-image meme video merge.
- MessageCommands/misc/@rap-vs-reality.ts — kdenlive meme video merge.
- MessageCommands/misc/@two-sides.ts — kdenlive meme video merge. (legacy.rs header confirms meme mergers pending; no kdenlive in rust.)

### Excluded (1)

- owner/eval.ts — intentionally NOT ported (arbitrary code execution has no Rust equivalent; owner.rs header documents this).

## Manual triage B — Events (2026-10-09, agent-verified)

Scope: 66 files in triage-B-events.txt. Method: each TS original read,
rust/src grepped for the behavior.

### Covered (64)

- antispam/onNewMessage.ts → events_handler.rs raidInfo cache (:23) + sliding window (:2241), window_tripped (commands/antispam.rs)
- client/blacklistFetcher.ts → events_handler.rs:1283 blacklist gate, blacklist_key, global_blacklist_msg_to_send
- client/deleteDatabaseDataOnGuildLeave.ts → events_handler.rs:1167 deferred wipe GUILD_DELETE_QUEUED
- client/guildCreate.ts → events_handler.rs:943 guild_create + lang.rs:56 setLangByRegion
- client/onRateLimit.ts → events_handler.rs:3588 ratelimit() throttle log
- client/ready.ts → events_handler.rs:933 ready()
- client/removeGuildLog.ts → events_handler.rs:1161 guild_delete leave path
- counter/onNewMessage.ts → events_handler.rs:1872 COUNTER.channel/COUNTER_DATA + notifier.rs counter_valid test
- github-lines/onNewMessage.ts → events_handler.rs:2135 + commands/utils.rs extract_git_targets/github_lines_enabled
- guildconfig/autoreact.ts → events_handler.rs:393 autoreact_emit + :1980 master switch, GUILD.AUTOREACT
- guildconfig/blockSpam.ts → events_handler.rs:254 has_blacklisted_term + :1807 automod_on link/invite/telegram/mass-mention
- guildconfig/joinDm.ts → events.rs:325 join_dm_template + handler :1353
- guildconfig/joinMessage.ts → events_handler.rs:1177 + :1235 invite attribution + render_welcome
- guildconfig/joinRole.ts → events.rs:298 join_role_ids (+tests :699-731)
- guildconfig/leaveMessage.ts → events_handler.rs:1620 leave-message text path via render_welcome
- guildconfig/lockVanity.ts → covered as no-op (TS body fully commented out, nothing to port)
- guildconfig/reactToMessage.ts → events_handler.rs:2048-2111 GUILD.REACT_MSG custom reacts
- guildconfig/tooNewAccount.ts → guild_member_addition GUILD.BLOCK_NEW_ACCOUNT req/age gate
- interaction/buttonHandler.ts → events_handler.rs:3599 component routing (confession/giveaway/rolereactions/honeypot/ticket)
- interaction/messageCommandHandler.ts → bot.rs:27 command gate + executor.rs Cooldowns/RateLimits + db::guild_prefix
- interaction/selectMenuHandler.ts → interaction_create ROLESELECT_* handlers incl. handle_roleselect_grant
- interaction/slashCommandHandler.ts → bot.rs gate + log_slash_command/slashlog.rs + interaction_create
- invitemanager/onGuildLeave.ts → events_handler.rs:1171 invites.remove
- invitemanager/onInviteCreate.ts → events_handler.rs:3457 invite_create cache
- invitemanager/onInviteDelete.ts → events_handler.rs:3472 invite_delete purge
- linked-channel/onNewMessage.ts → covered as no-op (TS body fully commented out)
- logs/boostLogs.ts → guild_member_update :237-270 premiumSince detect, event_boostlog_add/sub
- logs/channelUpdateLogs.ts → channel_update :2949 rich audit log, event_srvLogs_channelUpdate
- logs/ihorizon_logs.ts → channel_create :2895 ihorizon-logs setup embed + :517 log-channel report
- logs/kickLogs.ts → guild_member_removal :1565 kick attribution + mod_audit_log
- logs/messageDeleteLogs.ts → message_delete :2317 + snipeModule last-deleted-id
- logs/messageUpdateLogs.ts → message_update :2447 + events.rs:437 message_diff
- logs/removeBanLogs.ts → guild_ban_removal :3092 + mod_audit_log
- logs/rolesLogs.ts → guild_member_update roles diff → GUILD.SERVER_LOGS.roles embed
- protection/avoidAdminRankWithoutConsent.ts → guild_member_update :3181 fresh-admin → protection_guard(..., "add_admin_roles")
- protection/avoidChannelCreate.ts → channel_create protection_guard(ChannelCreate)
- protection/avoidChannelDelete.ts → channel_delete protection_guard
- protection/avoidChannelUpdate.ts → channel_update protection_guard
- protection/avoidGuildEdit.ts → guild_update :3118 protection_guard(..., "updateguild")
- protection/avoidKickMember.ts → guild_member_removal protection_guard(..., "kickmember")
- protection/avoidMemberUpdate.ts → guild_member_update protection_guard(..., "updatemember")
- protection/avoidRoleCreate.ts → guild_role_create :2851 protection_guard + commands/protection.rs rule_for_event test
- protection/avoidRoleDelete.ts → guild_role_delete :2862 protection_guard
- protection/avoidRoleUpdate.ts → guild_role_update :2879 protection_guard
- protection/avoidUnbanMember.ts → guild_ban_removal protection_guard(..., "unbanmembers")
- protection/createAllowlistOnMessage.ts → message() allowlist lazy seed ALLOWLIST.list.<owner>
- protection/ready.ts → events.rs:48 protection_decision + tests + protection_guard audit-executor flow
- ranks/onNewMessage.ts → message() record_message_activity + GUILD.RANKS ignore/xp channels/level-up (events.rs tests)
- reactionrole/onReactAdd.ts → reaction_add :2713 toggle lookup
- reactionrole/onReactRemove.ts → reaction_remove :2779 name-key lookup
- rolesaver/onMemberJoin.ts → events_handler.rs:1410 snapshot restore + events.rs:105 snapshot_roles test
- rolesaver/onMemberLeave.ts → events_handler.rs:1636 snapshot on leave via load_rolesaver_cfg
- security/onMemberJoin.ts → Handler.security_challenges + commands/security.rs gen_captcha/captcha_code/verify_captcha tests
- starboard/onDeletedReact.ts → events_handler.rs:873 board_reaction_remove
- starboard/onNewReact.ts → :767 board_reaction_add (loops starboard+skullboard)
- starboard/skullboard/onDeletedReact.ts → same board_reaction_remove, skull board
- starboard/skullboard/onNewReact.ts → same board_reaction_add, skull board
- stats/onNewMessage.ts → message() :1723 + record_message_activity test (events.rs:796)
- sticky/onNewMessage.ts → events_handler.rs:1988 debounced repost via commands/sticky load_sticky/schedule_refresh
- suggestion/onNewMessage.ts → events_handler.rs:2007 SUGGEST.channel thread+record+votes, gen_suggest_code
- utils/antiExe.ts → events_handler.rs:2048 + legacy::has_blocked_exe
- utils/autoFeur.ts → legacy::autofeur_match/autofeur_cooldown_ok/autofeur_promo
- utils/nickKicker.ts → events_handler.rs:1324 UTILS.NICK_KICKER + commands/utils.rs:2163 nick_kicker_matches test
- utils/roleLimit.ts → guild_member_update :3152 GUILD.UTILS.ROLE_LIMIT.<role> + commands/utils.rs rolelimit

### Missing, verified (2) — external-infra blocked, not offline-continuable

- Events/lavalink-client/raw.ts — forward raw gateway voice packets to Lavalink player + H247 handler; no raw-packet path in Rust (only audio::LavalinkConfig + voice::AudioConflict guard). Home if unblocked: rust/src/audio.rs (or voice.rs). Blocked: needs Lavalink server (matches existing Blocked entry).
- Events/tts/messageCreate.ts — auto locale-detect (ru/jp/ko/ar regex 40%+) + speak TTS into voice on every guild message; Rust has only commands/tts.rs config + voice conflict guard. Home if unblocked: events_handler.rs message() via commands/tts.rs. Blocked: needs Lavalink + TTS key (matches existing Blocked entries).

## Manual triage C — core/* (2026-10-09, agent-verified)

Scope: 91 files in triage-C-core.txt. Method: each TS original read,
rust/src grepped for the counterpart.

### Covered (62)

- core/backup/src/create.ts → commands/backup.rs (backup_create, gen_backup_id, backup_key)
- core/backup/src/index.ts → commands/backup.rs (backup_create/list/load/delete/manage)
- core/backup/src/load.ts → commands/backup.rs (backup_load)
- backup/src/types/*.ts (15 files) → backup snapshot shapes in commands/backup.rs layer (struct-for-struct check not done — see caveat)
- core/captcha.ts → commands/security.rs (gen_captcha, captcha_code, verify_captcha) + events_handler.rs pending challenges
- core/commandsSync.ts → poise registration in bot.rs replaces REST sync
  (removePermissionProperties has no counterpart by design: it strips
  `perm`/`permission` props from raw discord.js REST bodies; poise
  builds commands natively, so there is nothing to strip).
- core/core.ts → bot.rs + main.rs boot + core/mod.rs release gate
- core/database/driver/sqlite.ts → db.rs sqlx sqlite pool
- core/database/index.ts → db.rs (init, kv_get/set/del, guild_prefix, guild_lang)
- functions/apiUrlParser.ts → funcs.rs (GatewayMethod, gateway_url)
- functions/awaitingResponse.ts → commands/mod.rs promptYesOrNo docs + backup.rs confirm gate
- functions/axios.ts → reqwest used directly (funcs.rs, commands/fun.rs, utils.rs)
- functions/bannerGenerator.ts → funcs.rs (BANNER_URL_TEMPLATE, banner_url, guild_banner_url)
- functions/batchProcessor.ts → funcs.rs (process_batch)
- functions/database_latency.ts → funcs.rs (database_latency, used in legacy.rs)
- functions/date_and_time.ts → funcs.rs (format_date)
- functions/emojiChecker.ts → funcs.rs (is_single_emoji, is_discord_emoji)
- functions/encryptDecryptMethod.ts → funcs.rs (encrypt_text, decrypt_text)
- functions/generateProgressBar.ts → funcs.rs (progress_bar)
- functions/getMessageURL.ts → funcs.rs (message_url)
- functions/helper.ts → executor.rs (Cooldowns) + funcs.rs (capitalize_first)
- functions/ihorizon_logs.ts → funcs.rs (logs_channel_id) + events.rs log routing (route_log)
- functions/image64.ts → funcs.rs (is_image_url) + byte download (utils.rs, botcat.rs)
- functions/image_dominant_color.ts → funcs.rs (vibrant_and_dark_colors, decode_png_pixels, image_dominant_color, rgb_to_hsl/hex)
- functions/intentEnabler.ts → funcs.rs (REQUIRED_INTENTS, missing_intents, enable_required_intents)
- functions/isAllowedLinks.ts → funcs.rs (is_allowed_links, extract_links, is_whitelisted_url, has_blacklisted_term)
- functions/maskLink.ts → funcs.rs (mask_link)
- functions/ms.ts → funcs.rs (time_ms, beautiful_ms)
- functions/numberBeautifuer.ts → funcs.rs (format_number)
- functions/permissonsCalculator.ts → executor.rs (CmdPerms, check_cmd_access, role_level) + funcs.rs (dangerous_role_perms, guild_owner_ids, is_bot_owner)
- functions/prefix.ts → db.rs (guild_prefix)
- functions/random.ts → funcs.rs (PasswordOptions, generate_password, generate_multiple_passwords)
- functions/randomExpression.ts → funcs.rs (EXPRESSIONS, random_expression, expression_url, assets_url)
- functions/sanitizeInteractionOptionValue.ts → slashlog.rs (sanitize_interaction_option_value) + funcs.rs (sanitize_option)
- functions/sanitizer.ts → funcs.rs (sanitizing)
- functions/shard_helper.ts → funcs.rs (guild_shard, bucketize)
- functions/validImageType.ts → funcs.rs (is_valid_image_type)
- functions/welcomerMessage.ts → events.rs (render_welcome, render_join_dm, join_role_ids, join_dm_template); image variant pending html2png
- core/getOS.ts → funcs.rs (parse_meminfo, system_memory_kb, used in legacy.rs/botcat.rs)
- core/locales.ts → lang.rs (locale_lang_code, table_for, get)
- modules/autorenewManager.ts → scheduler.rs (sweep_autorenew)
- modules/githubLinesManager.ts → commands/utils.rs (GitLineData, fetch_git_target)
- modules/playerManager.ts → audio.rs (LavalinkConfig, backend) + voice.rs guards; full Lavalink wiring pending (noted in music.rs)
- modules/tempRoleManager.ts → scheduler.rs (sweep_temp_expiry) + commands/moderation.rs temp-role rows
- modules/tempbanManager.ts → same (sweep_temp_expiry, TEMPBAN rows)
- core/index.ts → main.rs + bot.rs (sharding/poise boot)
- core/version.ts → core/mod.rs release (write_version_file, consume_release_note)

### Missing, verified (all resolved 2026-10-09: open items done in
U-IMG/U-MEME/U-HELPERS, rest excluded or blocked — see below)

Offline-continuable (roadmap candidates):
- functions/mediaManipulation.ts — DONE (U-IMG pure math + U-MEME pixel ops; isImageUrl was already ported).
- core/images.ts — DONE as blocked-render (U-IMG): pure html2png wrappers, no portable math; recorded in Blocked.
- functions/retrieveMyself.ts → COVERED after all (triage correction
  2026-10-09): botcat.rs fetch_application + app_banner_url +
  app_bot_banner_hash + test mirror the @me fetch and banner URL.
- functions/lodash.ts (database/lodash.ts) — EXCLUDED (triage
  correction): sole callers are the four DB drivers (three excluded,
  sqlite ported via sqlx); db.rs needs no deep-path helpers.
- functions/assetsCalc.ts — EXCLUDED (triage correction): its consumer
  chain (assetsFinder counts for fun GIFs) is unported in Rust
  (hug/kiss/slap send text lines); fetching length.json into the void
  would be dead code. Follow-up: fun asset-GIF parity unit.
- functions/getIp.ts — EXCLUDED (triage correction): zero callers even
  in TS. Dead upstream.
- modules/errorManager.ts — DONE in U-HELPERS (logger.rs hook + error.log).
- core/ping/index.ts — DONE in U-HELPERS (monitor.rs Ping port).
- functions/kdenliveManipulator.ts — DONE in U-MEME (funcs.rs open/temp_save/export + 3 meme commands; live render needs melt/xvfb binaries).

External-infra blocked:
- functions/searchLyrics.ts — Lavalink-node lyrics lookup (only truncate_lyrics ported in music.rs; needs node).
- core/Mailer.ts — SMTP new-guild/owner notification mailer (nodemailer); needs creds.
- database/driver/postgres.ts — Postgres driver (multi-DB); Rust is sqlite-only, needs server.
- functions/html2png.ts — Chromium/puppeteer render (blocked; cards.rs SVG instead, call sites note pending).

Excluded with justification:
- database/driver/json.ts — file-backed JSON driver; port standardized on sqlx sqlite only (single-backend decision).
- database/driver/memory.ts — in-memory driver; same single-backend decision.
- functions/colors.ts — ANSI constant bag for console logger; Rust uses tracing via logger.rs.
- functions/method.ts — discord.js interaction-send helper bag; replaced by poise/serenity.
- functions/wait.ts — trivial setTimeout wrapper; tokio::sleep used inline.
- core/handlerHelper.ts + handlers/loadAnotherStuff.ts, loadApplicationsCommands.ts, loadEvent.ts, loadHtmlFile.ts, loadHybridCommands.ts, loadMessageCommands.ts, loadSlashCommands.ts — discord.js fs loader scaffolding; poise registration + events modules replace them (loadHtmlFile: Rust renders SVG via cards.rs, no HTML pipeline).
- core/database/types.ts — type-only; runtime covered by db.rs.
- !BlankHybridCommandTemplate.ts, !BlankHybridSubCommandTemplate.ts — TS-only scaffolds, no runtime behavior.

<!-- AUTO:COVERED -->
2026-10-09T05:59:35Z — 278 command candidates with rename evidence:
src/Interaction/HybridCommands/antispam/!bypass-roles.ts
src/Interaction/HybridCommands/antispam/!ignore-channels.ts
src/Interaction/HybridCommands/backup/!create.ts
src/Interaction/HybridCommands/backup/!delete.ts
src/Interaction/HybridCommands/backup/!list.ts
src/Interaction/HybridCommands/backup/!load.ts
src/Interaction/HybridCommands/bot/custom/!avatar.ts
src/Interaction/HybridCommands/bot/custom/!banner.ts
src/Interaction/HybridCommands/bot/custom/!bio.ts
src/Interaction/HybridCommands/bot/custom/!name.ts
src/Interaction/HybridCommands/bot/custom/custom.ts
src/Interaction/HybridCommands/bot/help.ts
src/Interaction/HybridCommands/bot/noaimie.ts
src/Interaction/HybridCommands/bot/status.ts
src/Interaction/HybridCommands/confession/!channel.ts
src/Interaction/HybridCommands/confession/!cooldown.ts
src/Interaction/HybridCommands/confession/!thread.ts
src/Interaction/HybridCommands/economy/!add.ts
src/Interaction/HybridCommands/economy/!balance-add.ts
src/Interaction/HybridCommands/economy/!balance-remove.ts
src/Interaction/HybridCommands/economy/!balance.ts
src/Interaction/HybridCommands/economy/!boost-set.ts
src/Interaction/HybridCommands/economy/!daily.ts
src/Interaction/HybridCommands/economy/!delete.ts
src/Interaction/HybridCommands/economy/!deposit.ts
src/Interaction/HybridCommands/economy/!greset.ts
src/Interaction/HybridCommands/economy/!leaderboard.ts
src/Interaction/HybridCommands/economy/!list.ts
src/Interaction/HybridCommands/economy/!monthly.ts
src/Interaction/HybridCommands/economy/!pay.ts
src/Interaction/HybridCommands/economy/!rob.ts
src/Interaction/HybridCommands/economy/!set-cooldown.ts
src/Interaction/HybridCommands/economy/!set-money.ts
src/Interaction/HybridCommands/economy/!shop.ts
src/Interaction/HybridCommands/economy/!ureset.ts
src/Interaction/HybridCommands/economy/!weekly.ts
src/Interaction/HybridCommands/economy/!withdraw.ts
src/Interaction/HybridCommands/economy/!work.ts
src/Interaction/HybridCommands/fun/!67.ts
src/Interaction/HybridCommands/fun/!bubbles.ts
src/Interaction/HybridCommands/fun/!caracteres.ts
src/Interaction/HybridCommands/fun/!catsay.ts
src/Interaction/HybridCommands/fun/!dice.ts
src/Interaction/HybridCommands/fun/!dog.ts
src/Interaction/HybridCommands/fun/!dolphin.ts
src/Interaction/HybridCommands/fun/!duck.ts
src/Interaction/HybridCommands/fun/!fox.ts
src/Interaction/HybridCommands/fun/!frog.ts
src/Interaction/HybridCommands/fun/!gay.ts
src/Interaction/HybridCommands/fun/!hack.ts
src/Interaction/HybridCommands/fun/!heads-tails.ts
src/Interaction/HybridCommands/fun/!hug.ts
src/Interaction/HybridCommands/fun/!kiss.ts
src/Interaction/HybridCommands/fun/!love.ts
src/Interaction/HybridCommands/fun/!morse.ts
src/Interaction/HybridCommands/fun/!number.ts
src/Interaction/HybridCommands/fun/!panda.ts
src/Interaction/HybridCommands/fun/!poll.ts
src/Interaction/HybridCommands/fun/!question.ts
src/Interaction/HybridCommands/fun/!rate.ts
src/Interaction/HybridCommands/fun/!slap.ts
src/Interaction/HybridCommands/fun/!squirrel.ts
src/Interaction/HybridCommands/fun/!stench.ts
src/Interaction/HybridCommands/fun/!transgender.ts
src/Interaction/HybridCommands/fun/!tweet.ts
src/Interaction/HybridCommands/fun/!youtube.ts
src/Interaction/HybridCommands/giveaway/!create.ts
src/Interaction/HybridCommands/giveaway/!end.ts
src/Interaction/HybridCommands/giveaway/!get-all.ts
src/Interaction/HybridCommands/giveaway/!get-data.ts
src/Interaction/HybridCommands/giveaway/!list-entries.ts
src/Interaction/HybridCommands/giveaway/!reroll.ts
src/Interaction/HybridCommands/giveaway/gw.ts
src/Interaction/HybridCommands/guildconfig/autoreact.ts
src/Interaction/HybridCommands/guildconfig/commandlimit.ts
src/Interaction/HybridCommands/guildconfig/support.ts
src/Interaction/HybridCommands/h247/!info.ts
src/Interaction/HybridCommands/h247/!join.ts
src/Interaction/HybridCommands/h247/!leave.ts
src/Interaction/HybridCommands/invitesmanager/!addinvites.ts
src/Interaction/HybridCommands/invitesmanager/!leaderboard.ts
src/Interaction/HybridCommands/invitesmanager/!removeinvites.ts
src/Interaction/HybridCommands/invitesmanager/!reset.ts
src/Interaction/HybridCommands/moderation/!ban.ts
src/Interaction/HybridCommands/moderation/!baninfo.ts
src/Interaction/HybridCommands/moderation/!banlist.ts
src/Interaction/HybridCommands/moderation/!clear-all-warns.ts
src/Interaction/HybridCommands/moderation/!clear.ts
src/Interaction/HybridCommands/moderation/!clearwarn.ts
src/Interaction/HybridCommands/moderation/!kick.ts
src/Interaction/HybridCommands/moderation/!lock-all.ts
src/Interaction/HybridCommands/moderation/!lock.ts
src/Interaction/HybridCommands/moderation/!mutelist.ts
src/Interaction/HybridCommands/moderation/!rolepanel.ts
src/Interaction/HybridCommands/moderation/!tempban.ts
src/Interaction/HybridCommands/moderation/!temprole.ts
src/Interaction/HybridCommands/moderation/!unban.ts
src/Interaction/HybridCommands/moderation/!unlock-all.ts
src/Interaction/HybridCommands/moderation/!unlock.ts
src/Interaction/HybridCommands/moderation/!unmute.ts
src/Interaction/HybridCommands/moderation/!unmuteall.ts
src/Interaction/HybridCommands/moderation/!unwarn.ts
src/Interaction/HybridCommands/moderation/!warn.ts
src/Interaction/HybridCommands/moderation/!warnlist.ts
src/Interaction/HybridCommands/music/!clear-queue.ts
src/Interaction/HybridCommands/music/!history.ts
src/Interaction/HybridCommands/music/!loop.ts
src/Interaction/HybridCommands/music/!lyrics.ts
src/Interaction/HybridCommands/music/!nowplaying.ts
src/Interaction/HybridCommands/music/!pause.ts
src/Interaction/HybridCommands/music/!play.ts
src/Interaction/HybridCommands/music/!queue.ts
src/Interaction/HybridCommands/music/!resume.ts
src/Interaction/HybridCommands/music/!shuffle.ts
src/Interaction/HybridCommands/music/!skip.ts
src/Interaction/HybridCommands/music/!stop.ts
src/Interaction/HybridCommands/music/!trackinfo.ts
src/Interaction/HybridCommands/music/!volume.ts
src/Interaction/HybridCommands/newfeatures/!lines.ts
src/Interaction/HybridCommands/newfeatures/counter/!channel.ts
src/Interaction/HybridCommands/newfeatures/counter/counter.ts
src/Interaction/HybridCommands/owner/blacklist.ts
src/Interaction/HybridCommands/owner/bledit.ts
src/Interaction/HybridCommands/owner/blinfo.ts
src/Interaction/HybridCommands/owner/unblacklist.ts
src/Interaction/HybridCommands/pfps/!channel.ts
src/Interaction/HybridCommands/profil/!set-birthday.ts
src/Interaction/HybridCommands/profil/!set-description.ts
src/Interaction/HybridCommands/profil/!set-gender.ts
src/Interaction/HybridCommands/profil/!set-pronoun.ts
src/Interaction/HybridCommands/profil/!show.ts
src/Interaction/HybridCommands/ranks/!channel.ts
src/Interaction/HybridCommands/ranks/!greset.ts
src/Interaction/HybridCommands/ranks/!ignore-channels.ts
src/Interaction/HybridCommands/ranks/!leaderboard.ts
src/Interaction/HybridCommands/ranks/!message.ts
src/Interaction/HybridCommands/ranks/!roles.ts
src/Interaction/HybridCommands/ranks/!show.ts
src/Interaction/HybridCommands/ranks/!ureset.ts
src/Interaction/HybridCommands/rolereactions/rolebutton.ts
src/Interaction/HybridCommands/rolereactions/roleselect.ts
src/Interaction/HybridCommands/security/!channel.ts
src/Interaction/HybridCommands/security/!role-to-give.ts
src/Interaction/HybridCommands/security/!role-to-remove.ts
src/Interaction/HybridCommands/starboard/!channel.ts
src/Interaction/HybridCommands/starboard/!create-thread.ts
src/Interaction/HybridCommands/starboard/!threshold.ts
src/Interaction/HybridCommands/starboard/skullboard/!channel.ts
src/Interaction/HybridCommands/starboard/skullboard/!create-thread.ts
src/Interaction/HybridCommands/starboard/skullboard/!threshold.ts
src/Interaction/HybridCommands/starboard/skullboard/skullboard.ts
src/Interaction/HybridCommands/stats/!compare.ts
src/Interaction/HybridCommands/stats/!top-messages.ts
src/Interaction/HybridCommands/sticky/!disable.ts
src/Interaction/HybridCommands/sticky/!list.ts
src/Interaction/HybridCommands/sticky/!refresh.ts
src/Interaction/HybridCommands/sticky/!show.ts
src/Interaction/HybridCommands/tag/!create.ts
src/Interaction/HybridCommands/tag/!delete.ts
src/Interaction/HybridCommands/tag/!edit.ts
src/Interaction/HybridCommands/tag/!info.ts
src/Interaction/HybridCommands/tag/!list.ts
src/Interaction/HybridCommands/tag/!use.ts
src/Interaction/HybridCommands/tag/!wlroles-create.ts
src/Interaction/HybridCommands/tag/!wlroles-use.ts
src/Interaction/HybridCommands/ticket/!add-member.ts
src/Interaction/HybridCommands/ticket/!close.ts
src/Interaction/HybridCommands/ticket/!delete.ts
src/Interaction/HybridCommands/ticket/!log-channel.ts
src/Interaction/HybridCommands/ticket/!open.ts
src/Interaction/HybridCommands/ticket/!remind.ts
src/Interaction/HybridCommands/ticket/!remove-member.ts
src/Interaction/HybridCommands/ticket/!rename.ts
src/Interaction/HybridCommands/ticket/!set-category.ts
src/Interaction/HybridCommands/ticket/!set-here.ts
src/Interaction/HybridCommands/ticket/!unlink.ts
src/Interaction/HybridCommands/tts/!info.ts
src/Interaction/HybridCommands/tts/!join.ts
src/Interaction/HybridCommands/tts/!leave.ts
src/Interaction/HybridCommands/utils/!addrole.ts
src/Interaction/HybridCommands/utils/!admin-users.ts
src/Interaction/HybridCommands/utils/!avatar.ts
src/Interaction/HybridCommands/utils/!delrole.ts
src/Interaction/HybridCommands/utils/!derank.ts
src/Interaction/HybridCommands/utils/!dm.ts
src/Interaction/HybridCommands/utils/!leash.ts
src/Interaction/HybridCommands/utils/!massiverole.ts
src/Interaction/HybridCommands/utils/!massmove.ts
src/Interaction/HybridCommands/utils/!media-only.ts
src/Interaction/HybridCommands/utils/!nickrole.ts
src/Interaction/HybridCommands/utils/!prevnames.ts
src/Interaction/HybridCommands/utils/!renew.ts
src/Interaction/HybridCommands/utils/!serverinfo.ts
src/Interaction/HybridCommands/utils/!setmentionrole.ts
src/Interaction/HybridCommands/utils/!snipe.ts
src/Interaction/HybridCommands/utils/!unleash.ts
src/Interaction/HybridCommands/utils/!userinfo.ts
src/Interaction/HybridCommands/utils/!vc.ts
src/Interaction/HybridCommands/utils/banner/banner.ts
src/Interaction/HybridCommands/utils/chanel/!hide.ts
src/Interaction/HybridCommands/utils/chanel/!hideall.ts
src/Interaction/HybridCommands/utils/chanel/!unhide.ts
src/Interaction/HybridCommands/utils/chanel/!unhideall.ts
src/Interaction/HybridCommands/utils/chanel/channel.ts
src/Interaction/HybridCommands/utils/util/!addrolereact.ts
src/Interaction/HybridCommands/utils/util/!admin-roles.ts
src/Interaction/HybridCommands/utils/util/!allwebhooks.ts
src/Interaction/HybridCommands/utils/util/!autorenew.ts
src/Interaction/HybridCommands/utils/util/!bringall.ts
src/Interaction/HybridCommands/utils/util/!cooldown.ts
src/Interaction/HybridCommands/utils/util/!derogation.ts
src/Interaction/HybridCommands/utils/util/!freeze.ts
src/Interaction/HybridCommands/utils/util/!inviteinfo.ts
src/Interaction/HybridCommands/utils/util/!move.ts
src/Interaction/HybridCommands/utils/util/!nick-kicker.ts
src/Interaction/HybridCommands/utils/util/!role-members.ts
src/Interaction/HybridCommands/utils/util/!rolelimit.ts
src/Interaction/HybridCommands/utils/util/!serverpic.ts
src/Interaction/HybridCommands/utils/util/!sync.ts
src/Interaction/HybridCommands/utils/util/!talk.ts
src/Interaction/HybridCommands/utils/util/!unfreeze.ts
src/Interaction/HybridCommands/utils/util/!untalk.ts
src/Interaction/HybridCommands/utils/util/!unwlvc.ts
src/Interaction/HybridCommands/utils/util/!vkick.ts
src/Interaction/HybridCommands/utils/util/!wakeup.ts
src/Interaction/HybridCommands/utils/util/!where.ts
src/Interaction/HybridCommands/utils/util/!wlvc.ts
src/Interaction/HybridCommands/utils/util/!zip-stickers.ts
src/Interaction/HybridCommands/utils/utilss/!renewvc.ts
src/Interaction/MessageApplicationCommands/play.ts
src/Interaction/MessageApplicationCommands/question.ts
src/Interaction/MessageCommands/bot/@helpall.ts
src/Interaction/MessageCommands/bot/@updates.ts
src/Interaction/MessageCommands/guildconfig/@add-react.ts
src/Interaction/MessageCommands/guildconfig/@antiexe.ts
src/Interaction/MessageCommands/guildconfig/@list-react.ts
src/Interaction/MessageCommands/guildconfig/@remove-react.ts
src/Interaction/MessageCommands/guildconfig/autologs.ts
src/Interaction/MessageCommands/utils/nitrofdp.ts
src/Interaction/MessageCommands/utils/securewebhook.ts
src/Interaction/MessageCommands/utils/shardinfo.ts
src/Interaction/MessageCommands/utils/sticker.ts
src/Interaction/MessageCommands/utils/top.ts
src/Interaction/SlashCommands/authrestore/!delete.ts
src/Interaction/SlashCommands/authrestore/!force-join.ts
src/Interaction/SlashCommands/authrestore/!get.ts
src/Interaction/SlashCommands/authrestore/!roles.ts
src/Interaction/SlashCommands/authrestore/!set.ts
src/Interaction/SlashCommands/blogger/!add.ts
src/Interaction/SlashCommands/blogger/!list.ts
src/Interaction/SlashCommands/blogger/!remove.ts
src/Interaction/SlashCommands/blogger/!status.ts
src/Interaction/SlashCommands/guildconfig/!setup.ts
src/Interaction/SlashCommands/guildconfig/!show.ts
src/Interaction/SlashCommands/guildconfig/join-ghostping/!add.ts
src/Interaction/SlashCommands/guildconfig/join-ghostping/!remove.ts
src/Interaction/SlashCommands/guildconfig/perm/!list.ts
src/Interaction/SlashCommands/lastfm/!login.ts
src/Interaction/SlashCommands/newfeatures/punishpub.ts
src/Interaction/SlashCommands/newfeatures/report.ts
src/Interaction/SlashCommands/newfeatures/rolesaver.ts
src/Interaction/SlashCommands/notifier/!add.ts
src/Interaction/SlashCommands/notifier/!channel.ts
src/Interaction/SlashCommands/notifier/!list.ts
src/Interaction/SlashCommands/notifier/!message.ts
src/Interaction/SlashCommands/notifier/!remove.ts
src/Interaction/SlashCommands/protection/!sanction.ts
src/Interaction/SlashCommands/protection/!show.ts
src/Interaction/SlashCommands/protection/allowlist/!add.ts
src/Interaction/SlashCommands/protection/allowlist/!remove.ts
src/Interaction/SlashCommands/protection/allowlist/!show.ts
src/Interaction/SlashCommands/suggestion/setsuggest/!channel.ts
src/Interaction/SlashCommands/suggestion/setsuggest/setsuggest.ts
src/Interaction/SlashCommands/suggestion/suggest/!accept.ts
src/Interaction/SlashCommands/suggestion/suggest/!delete.ts
src/Interaction/SlashCommands/suggestion/suggest/!deny.ts
src/Interaction/SlashCommands/suggestion/suggest/!reply.ts
src/Interaction/UserApplicationCommands/love.ts
<!-- AUTO:COVERED-END -->

<!-- AUTO:PENDING -->
2026-10-09T05:59:35Z — 187 candidates needing behavioral triage:
src/Events/antispam/onNewMessage.ts
src/Events/client/blacklistFetcher.ts
src/Events/client/deleteDatabaseDataOnGuildLeave.ts
src/Events/client/guildCreate.ts
src/Events/client/onRateLimit.ts
src/Events/client/ready.ts
src/Events/client/removeGuildLog.ts
src/Events/counter/onNewMessage.ts
src/Events/github-lines/onNewMessage.ts
src/Events/guildconfig/autoreact.ts
src/Events/guildconfig/blockSpam.ts
src/Events/guildconfig/joinDm.ts
src/Events/guildconfig/joinMessage.ts
src/Events/guildconfig/joinRole.ts
src/Events/guildconfig/leaveMessage.ts
src/Events/guildconfig/lockVanity.ts
src/Events/guildconfig/reactToMessage.ts
src/Events/guildconfig/tooNewAccount.ts
src/Events/interaction/buttonHandler.ts
src/Events/interaction/messageCommandHandler.ts
src/Events/interaction/selectMenuHandler.ts
src/Events/interaction/slashCommandHandler.ts
src/Events/invitemanager/onGuildLeave.ts
src/Events/invitemanager/onInviteCreate.ts
src/Events/invitemanager/onInviteDelete.ts
src/Events/lavalink-client/raw.ts
src/Events/linked-channel/onNewMessage.ts
src/Events/logs/boostLogs.ts
src/Events/logs/channelUpdateLogs.ts
src/Events/logs/ihorizon_logs.ts
src/Events/logs/kickLogs.ts
src/Events/logs/messageDeleteLogs.ts
src/Events/logs/messageUpdateLogs.ts
src/Events/logs/removeBanLogs.ts
src/Events/logs/rolesLogs.ts
src/Events/protection/avoidAdminRankWithoutConsent.ts
src/Events/protection/avoidChannelCreate.ts
src/Events/protection/avoidChannelDelete.ts
src/Events/protection/avoidChannelUpdate.ts
src/Events/protection/avoidGuildEdit.ts
src/Events/protection/avoidKickMember.ts
src/Events/protection/avoidMemberUpdate.ts
src/Events/protection/avoidRoleCreate.ts
src/Events/protection/avoidRoleDelete.ts
src/Events/protection/avoidRoleUpdate.ts
src/Events/protection/avoidUnbanMember.ts
src/Events/protection/createAllowlistOnMessage.ts
src/Events/protection/ready.ts
src/Events/ranks/onNewMessage.ts
src/Events/reactionrole/onReactAdd.ts
src/Events/reactionrole/onReactRemove.ts
src/Events/rolesaver/onMemberJoin.ts
src/Events/rolesaver/onMemberLeave.ts
src/Events/security/onMemberJoin.ts
src/Events/starboard/onDeletedReact.ts
src/Events/starboard/onNewReact.ts
src/Events/starboard/skullboard/onDeletedReact.ts
src/Events/starboard/skullboard/onNewReact.ts
src/Events/stats/onNewMessage.ts
src/Events/sticky/onNewMessage.ts
src/Events/suggestion/onNewMessage.ts
src/Events/tts/messageCreate.ts
src/Events/utils/antiExe.ts
src/Events/utils/autoFeur.ts
src/Events/utils/nickKicker.ts
src/Events/utils/roleLimit.ts
src/Interaction/Components/Buttons/button_reaction.ts  # mentioned in MIGRATION.md, needs worker check
src/Interaction/Components/Buttons/newsletter-toggle.ts  # mentioned in MIGRATION.md, needs worker check
src/Interaction/Components/SelectMenu/roleselect_roles.ts  # mentioned in MIGRATION.md, needs worker check
src/Interaction/HybridCommands/bot/ether.ts  # mentioned in MIGRATION.md, needs worker check
src/Interaction/HybridCommands/bot/link.ts  # mentioned in MIGRATION.md, needs worker check
src/Interaction/HybridCommands/bot/ping.ts  # mentioned in MIGRATION.md, needs worker check
src/Interaction/HybridCommands/bot/say.ts  # mentioned in MIGRATION.md, needs worker check
src/Interaction/HybridCommands/fun/!captions.ts  # mentioned in MIGRATION.md, needs worker check
src/Interaction/HybridCommands/fun/!togif.ts  # mentioned in MIGRATION.md, needs worker check
src/Interaction/HybridCommands/moderation/!tempmute.ts  # mentioned in MIGRATION.md, needs worker check
src/Interaction/HybridCommands/newfeatures/gitlines.ts  # mentioned in MIGRATION.md, needs worker check
src/Interaction/HybridCommands/owner/eval.ts  # mentioned in MIGRATION.md, needs worker check
src/Interaction/HybridCommands/utils/!vanity-generator.ts  # mentioned in MIGRATION.md, needs worker check
src/Interaction/HybridCommands/utils/banner/!server.ts  # mentioned in MIGRATION.md, needs worker check
src/Interaction/HybridCommands/utils/banner/!user.ts  # mentioned in MIGRATION.md, needs worker check
src/Interaction/HybridCommands/utils/unbanall/!all.ts  # mentioned in MIGRATION.md, needs worker check
src/Interaction/HybridCommands/utils/unbanall/unbanall.ts  # mentioned in MIGRATION.md, needs worker check
src/Interaction/MessageApplicationCommands/sound_to_video.ts  # mentioned in MIGRATION.md, needs worker check
src/Interaction/MessageCommands/bot/@prefix.ts  # mentioned in MIGRATION.md, needs worker check
src/Interaction/MessageCommands/misc/@fexini.ts  # mentioned in MIGRATION.md, needs worker check
src/Interaction/MessageCommands/misc/@kawaeine.ts  # mentioned in MIGRATION.md, needs worker check
src/Interaction/MessageCommands/misc/@rap-vs-reality.ts  # mentioned in MIGRATION.md, needs worker check
src/Interaction/MessageCommands/misc/@two-sides.ts  # mentioned in MIGRATION.md, needs worker check
src/Interaction/MessageCommands/utils/autofeur.ts  # mentioned in MIGRATION.md, needs worker check
src/Interaction/SlashCommands/guildconfig/!prefix.ts  # mentioned in MIGRATION.md, needs worker check
src/Interaction/SlashCommands/guildconfig/!save.ts  # mentioned in MIGRATION.md, needs worker check
src/Interaction/SlashCommands/guildconfig/automod/!link.ts  # mentioned in MIGRATION.md, needs worker check
src/Interaction/SlashCommands/guildconfig/join-ghostping/join-ghostping.ts  # mentioned in MIGRATION.md, needs worker check
src/Interaction/SlashCommands/guildconfig/perm/!command.ts  # mentioned in MIGRATION.md, needs worker check
src/Interaction/SlashCommands/guildconfig/perm/perm.ts  # mentioned in MIGRATION.md, needs worker check
src/Interaction/SlashCommands/protection/allowlist/allowlist.ts  # mentioned in MIGRATION.md, needs worker check
src/Interaction/UserApplicationCommands/lookup.ts  # mentioned in MIGRATION.md, needs worker check
src/core/Mailer.ts
src/core/backup/src/create.ts
src/core/backup/src/index.ts
src/core/backup/src/load.ts
src/core/backup/src/types/AfkData.ts
src/core/backup/src/types/BanData.ts
src/core/backup/src/types/BaseChannelData.ts
src/core/backup/src/types/CategoryData.ts
src/core/backup/src/types/ChannelPermissionData.ts
src/core/backup/src/types/ChannelsData.ts
src/core/backup/src/types/CreateOptions.ts
src/core/backup/src/types/EmojiData.ts
src/core/backup/src/types/LoadOptions.ts
src/core/backup/src/types/MemberData.ts
src/core/backup/src/types/MessageData.ts
src/core/backup/src/types/RoleData.ts
src/core/backup/src/types/TextChannelData.ts
src/core/backup/src/types/ThreadChannelData.ts
src/core/backup/src/types/WidgetData.ts
src/core/backup/src/types/index.ts
src/core/captcha.ts
src/core/commandsSync.ts
src/core/core.ts
src/core/database/driver/json.ts
src/core/database/driver/memory.ts
src/core/database/driver/postgres.ts
src/core/database/driver/sqlite.ts
src/core/database/index.ts
src/core/database/lodash.ts
src/core/database/types.ts
src/core/functions/apiUrlParser.ts
src/core/functions/assetsCalc.ts
src/core/functions/awaitingResponse.ts
src/core/functions/axios.ts
src/core/functions/bannerGenerator.ts
src/core/functions/batchProcessor.ts
src/core/functions/colors.ts
src/core/functions/database_latency.ts
src/core/functions/date_and_time.ts
src/core/functions/emojiChecker.ts
src/core/functions/encryptDecryptMethod.ts
src/core/functions/generateProgressBar.ts
src/core/functions/getIp.ts
src/core/functions/getMessageURL.ts
src/core/functions/helper.ts
src/core/functions/html2png.ts
src/core/functions/ihorizon_logs.ts
src/core/functions/image64.ts
src/core/functions/image_dominant_color.ts
src/core/functions/intentEnabler.ts
src/core/functions/isAllowedLinks.ts
src/core/functions/kdenliveManipulator.ts
src/core/functions/maskLink.ts
src/core/functions/mediaManipulation.ts
src/core/functions/method.ts
src/core/functions/ms.ts
src/core/functions/numberBeautifuer.ts
src/core/functions/permissonsCalculator.ts
src/core/functions/prefix.ts
src/core/functions/random.ts
src/core/functions/randomExpression.ts
src/core/functions/retrieveMyself.ts
src/core/functions/sanitizeInteractionOptionValue.ts
src/core/functions/sanitizer.ts
src/core/functions/searchLyrics.ts
src/core/functions/shard_helper.ts
src/core/functions/validImageType.ts
src/core/functions/wait.ts
src/core/functions/welcomerMessage.ts
src/core/getOS.ts
src/core/handlerHelper.ts
src/core/handlers/loadAnotherStuff.ts
src/core/handlers/loadApplicationsCommands.ts
src/core/handlers/loadEvent.ts
src/core/handlers/loadHtmlFile.ts
src/core/handlers/loadHybridCommands.ts
src/core/handlers/loadMessageCommands.ts
src/core/handlers/loadSlashCommands.ts
src/core/images.ts
src/core/locales.ts
src/core/modules/autorenewManager.ts
src/core/modules/errorManager.ts
src/core/modules/githubLinesManager.ts
src/core/modules/playerManager.ts
src/core/modules/tempRoleManager.ts
src/core/modules/tempbanManager.ts
src/core/ping/index.ts
src/index.ts
src/version.ts
<!-- AUTO:PENDING-END -->

## Machine-readable triage record (reconcile consults this; do not hand-edit paths)

<!-- MANUAL:TRIAGED-PATHS -->
src/Events/antispam/onNewMessage.ts
src/Events/client/blacklistFetcher.ts
src/Events/client/deleteDatabaseDataOnGuildLeave.ts
src/Events/client/guildCreate.ts
src/Events/client/onRateLimit.ts
src/Events/client/ready.ts
src/Events/client/removeGuildLog.ts
src/Events/counter/onNewMessage.ts
src/Events/github-lines/onNewMessage.ts
src/Events/guildconfig/autoreact.ts
src/Events/guildconfig/blockSpam.ts
src/Events/guildconfig/joinDm.ts
src/Events/guildconfig/joinMessage.ts
src/Events/guildconfig/joinRole.ts
src/Events/guildconfig/leaveMessage.ts
src/Events/guildconfig/lockVanity.ts
src/Events/guildconfig/reactToMessage.ts
src/Events/guildconfig/tooNewAccount.ts
src/Events/interaction/buttonHandler.ts
src/Events/interaction/messageCommandHandler.ts
src/Events/interaction/selectMenuHandler.ts
src/Events/interaction/slashCommandHandler.ts
src/Events/invitemanager/onGuildLeave.ts
src/Events/invitemanager/onInviteCreate.ts
src/Events/invitemanager/onInviteDelete.ts
src/Events/lavalink-client/raw.ts
src/Events/linked-channel/onNewMessage.ts
src/Events/logs/boostLogs.ts
src/Events/logs/channelUpdateLogs.ts
src/Events/logs/ihorizon_logs.ts
src/Events/logs/kickLogs.ts
src/Events/logs/messageDeleteLogs.ts
src/Events/logs/messageUpdateLogs.ts
src/Events/logs/removeBanLogs.ts
src/Events/logs/rolesLogs.ts
src/Events/protection/avoidAdminRankWithoutConsent.ts
src/Events/protection/avoidChannelCreate.ts
src/Events/protection/avoidChannelDelete.ts
src/Events/protection/avoidChannelUpdate.ts
src/Events/protection/avoidGuildEdit.ts
src/Events/protection/avoidKickMember.ts
src/Events/protection/avoidMemberUpdate.ts
src/Events/protection/avoidRoleCreate.ts
src/Events/protection/avoidRoleDelete.ts
src/Events/protection/avoidRoleUpdate.ts
src/Events/protection/avoidUnbanMember.ts
src/Events/protection/createAllowlistOnMessage.ts
src/Events/protection/ready.ts
src/Events/ranks/onNewMessage.ts
src/Events/reactionrole/onReactAdd.ts
src/Events/reactionrole/onReactRemove.ts
src/Events/rolesaver/onMemberJoin.ts
src/Events/rolesaver/onMemberLeave.ts
src/Events/security/onMemberJoin.ts
src/Events/starboard/onDeletedReact.ts
src/Events/starboard/onNewReact.ts
src/Events/starboard/skullboard/onDeletedReact.ts
src/Events/starboard/skullboard/onNewReact.ts
src/Events/stats/onNewMessage.ts
src/Events/sticky/onNewMessage.ts
src/Events/suggestion/onNewMessage.ts
src/Events/tts/messageCreate.ts
src/Events/utils/antiExe.ts
src/Events/utils/autoFeur.ts
src/Events/utils/nickKicker.ts
src/Events/utils/roleLimit.ts
src/Interaction/Components/Buttons/button_reaction.ts
src/Interaction/Components/Buttons/newsletter-toggle.ts
src/Interaction/Components/SelectMenu/roleselect_roles.ts
src/Interaction/HybridCommands/!BlankHybridCommandTemplate.ts
src/Interaction/HybridCommands/!BlankHybridSubCommandTemplate.ts
src/Interaction/HybridCommands/antispam/!bypass-roles.ts
src/Interaction/HybridCommands/antispam/!ignore-channels.ts
src/Interaction/HybridCommands/backup/!create.ts
src/Interaction/HybridCommands/backup/!delete.ts
src/Interaction/HybridCommands/backup/!list.ts
src/Interaction/HybridCommands/backup/!load.ts
src/Interaction/HybridCommands/bot/andru.ts
src/Interaction/HybridCommands/bot/custom/!avatar.ts
src/Interaction/HybridCommands/bot/custom/!banner.ts
src/Interaction/HybridCommands/bot/custom/!bio.ts
src/Interaction/HybridCommands/bot/custom/!name.ts
src/Interaction/HybridCommands/bot/custom/custom.ts
src/Interaction/HybridCommands/bot/ether.ts
src/Interaction/HybridCommands/bot/help.ts
src/Interaction/HybridCommands/bot/iris.ts
src/Interaction/HybridCommands/bot/kisakay.ts
src/Interaction/HybridCommands/bot/link.ts
src/Interaction/HybridCommands/bot/noaimie.ts
src/Interaction/HybridCommands/bot/ping.ts
src/Interaction/HybridCommands/bot/say.ts
src/Interaction/HybridCommands/bot/status.ts
src/Interaction/HybridCommands/confession/!channel.ts
src/Interaction/HybridCommands/confession/!cooldown.ts
src/Interaction/HybridCommands/confession/!thread.ts
src/Interaction/HybridCommands/economy/!add.ts
src/Interaction/HybridCommands/economy/!balance-add.ts
src/Interaction/HybridCommands/economy/!balance-remove.ts
src/Interaction/HybridCommands/economy/!balance.ts
src/Interaction/HybridCommands/economy/!boost-set.ts
src/Interaction/HybridCommands/economy/!daily.ts
src/Interaction/HybridCommands/economy/!delete.ts
src/Interaction/HybridCommands/economy/!deposit.ts
src/Interaction/HybridCommands/economy/!greset.ts
src/Interaction/HybridCommands/economy/!leaderboard.ts
src/Interaction/HybridCommands/economy/!list.ts
src/Interaction/HybridCommands/economy/!monthly.ts
src/Interaction/HybridCommands/economy/!pay.ts
src/Interaction/HybridCommands/economy/!rob.ts
src/Interaction/HybridCommands/economy/!set-cooldown.ts
src/Interaction/HybridCommands/economy/!set-money.ts
src/Interaction/HybridCommands/economy/!shop.ts
src/Interaction/HybridCommands/economy/!ureset.ts
src/Interaction/HybridCommands/economy/!weekly.ts
src/Interaction/HybridCommands/economy/!withdraw.ts
src/Interaction/HybridCommands/economy/!work.ts
src/Interaction/HybridCommands/fun/!67.ts
src/Interaction/HybridCommands/fun/!bubbles.ts
src/Interaction/HybridCommands/fun/!captions.ts
src/Interaction/HybridCommands/fun/!caracteres.ts
src/Interaction/HybridCommands/fun/!catsay.ts
src/Interaction/HybridCommands/fun/!dice.ts
src/Interaction/HybridCommands/fun/!dog.ts
src/Interaction/HybridCommands/fun/!dolphin.ts
src/Interaction/HybridCommands/fun/!duck.ts
src/Interaction/HybridCommands/fun/!fox.ts
src/Interaction/HybridCommands/fun/!frog.ts
src/Interaction/HybridCommands/fun/!gay.ts
src/Interaction/HybridCommands/fun/!hack.ts
src/Interaction/HybridCommands/fun/!heads-tails.ts
src/Interaction/HybridCommands/fun/!hug.ts
src/Interaction/HybridCommands/fun/!kiss.ts
src/Interaction/HybridCommands/fun/!love.ts
src/Interaction/HybridCommands/fun/!morse.ts
src/Interaction/HybridCommands/fun/!number.ts
src/Interaction/HybridCommands/fun/!panda.ts
src/Interaction/HybridCommands/fun/!poll.ts
src/Interaction/HybridCommands/fun/!question.ts
src/Interaction/HybridCommands/fun/!rate.ts
src/Interaction/HybridCommands/fun/!slap.ts
src/Interaction/HybridCommands/fun/!squirrel.ts
src/Interaction/HybridCommands/fun/!stench.ts
src/Interaction/HybridCommands/fun/!togif.ts
src/Interaction/HybridCommands/fun/!transgender.ts
src/Interaction/HybridCommands/fun/!tweet.ts
src/Interaction/HybridCommands/fun/!youtube.ts
src/Interaction/HybridCommands/giveaway/!create.ts
src/Interaction/HybridCommands/giveaway/!end.ts
src/Interaction/HybridCommands/giveaway/!get-all.ts
src/Interaction/HybridCommands/giveaway/!get-data.ts
src/Interaction/HybridCommands/giveaway/!list-entries.ts
src/Interaction/HybridCommands/giveaway/!reroll.ts
src/Interaction/HybridCommands/giveaway/gw.ts
src/Interaction/HybridCommands/guildconfig/autoreact.ts
src/Interaction/HybridCommands/guildconfig/commandlimit.ts
src/Interaction/HybridCommands/guildconfig/setlogschannel.ts
src/Interaction/HybridCommands/guildconfig/support.ts
src/Interaction/HybridCommands/h247/!info.ts
src/Interaction/HybridCommands/h247/!join.ts
src/Interaction/HybridCommands/h247/!leave.ts
src/Interaction/HybridCommands/invitesmanager/!addinvites.ts
src/Interaction/HybridCommands/invitesmanager/!leaderboard.ts
src/Interaction/HybridCommands/invitesmanager/!removeinvites.ts
src/Interaction/HybridCommands/invitesmanager/!reset.ts
src/Interaction/HybridCommands/moderation/!ban.ts
src/Interaction/HybridCommands/moderation/!baninfo.ts
src/Interaction/HybridCommands/moderation/!banlist.ts
src/Interaction/HybridCommands/moderation/!clear-all-warns.ts
src/Interaction/HybridCommands/moderation/!clear.ts
src/Interaction/HybridCommands/moderation/!clearwarn.ts
src/Interaction/HybridCommands/moderation/!kick.ts
src/Interaction/HybridCommands/moderation/!lock-all.ts
src/Interaction/HybridCommands/moderation/!lock.ts
src/Interaction/HybridCommands/moderation/!mutelist.ts
src/Interaction/HybridCommands/moderation/!rolepanel.ts
src/Interaction/HybridCommands/moderation/!tempban.ts
src/Interaction/HybridCommands/moderation/!tempmute.ts
src/Interaction/HybridCommands/moderation/!temprole.ts
src/Interaction/HybridCommands/moderation/!unban.ts
src/Interaction/HybridCommands/moderation/!unlock-all.ts
src/Interaction/HybridCommands/moderation/!unlock.ts
src/Interaction/HybridCommands/moderation/!unmute.ts
src/Interaction/HybridCommands/moderation/!unmuteall.ts
src/Interaction/HybridCommands/moderation/!unwarn.ts
src/Interaction/HybridCommands/moderation/!warn.ts
src/Interaction/HybridCommands/moderation/!warnlist.ts
src/Interaction/HybridCommands/music/!clear-queue.ts
src/Interaction/HybridCommands/music/!history.ts
src/Interaction/HybridCommands/music/!loop.ts
src/Interaction/HybridCommands/music/!lyrics.ts
src/Interaction/HybridCommands/music/!nowplaying.ts
src/Interaction/HybridCommands/music/!pause.ts
src/Interaction/HybridCommands/music/!play.ts
src/Interaction/HybridCommands/music/!queue.ts
src/Interaction/HybridCommands/music/!resume.ts
src/Interaction/HybridCommands/music/!shuffle.ts
src/Interaction/HybridCommands/music/!skip.ts
src/Interaction/HybridCommands/music/!stop.ts
src/Interaction/HybridCommands/music/!trackinfo.ts
src/Interaction/HybridCommands/music/!volume.ts
src/Interaction/HybridCommands/newfeatures/!lines.ts
src/Interaction/HybridCommands/newfeatures/counter/!channel.ts
src/Interaction/HybridCommands/newfeatures/counter/counter.ts
src/Interaction/HybridCommands/newfeatures/gitlines.ts
src/Interaction/HybridCommands/owner/blacklist.ts
src/Interaction/HybridCommands/owner/bledit.ts
src/Interaction/HybridCommands/owner/blinfo.ts
src/Interaction/HybridCommands/owner/eval.ts
src/Interaction/HybridCommands/owner/unblacklist.ts
src/Interaction/HybridCommands/pfps/!channel.ts
src/Interaction/HybridCommands/profil/!set-birthday.ts
src/Interaction/HybridCommands/profil/!set-description.ts
src/Interaction/HybridCommands/profil/!set-gender.ts
src/Interaction/HybridCommands/profil/!set-pronoun.ts
src/Interaction/HybridCommands/profil/!show.ts
src/Interaction/HybridCommands/ranks/!channel.ts
src/Interaction/HybridCommands/ranks/!greset.ts
src/Interaction/HybridCommands/ranks/!ignore-channels.ts
src/Interaction/HybridCommands/ranks/!leaderboard.ts
src/Interaction/HybridCommands/ranks/!message.ts
src/Interaction/HybridCommands/ranks/!roles.ts
src/Interaction/HybridCommands/ranks/!show.ts
src/Interaction/HybridCommands/ranks/!ureset.ts
src/Interaction/HybridCommands/rolereactions/rolebutton.ts
src/Interaction/HybridCommands/rolereactions/roleselect.ts
src/Interaction/HybridCommands/security/!channel.ts
src/Interaction/HybridCommands/security/!role-to-give.ts
src/Interaction/HybridCommands/security/!role-to-remove.ts
src/Interaction/HybridCommands/starboard/!channel.ts
src/Interaction/HybridCommands/starboard/!create-thread.ts
src/Interaction/HybridCommands/starboard/!threshold.ts
src/Interaction/HybridCommands/starboard/skullboard/!channel.ts
src/Interaction/HybridCommands/starboard/skullboard/!create-thread.ts
src/Interaction/HybridCommands/starboard/skullboard/!threshold.ts
src/Interaction/HybridCommands/starboard/skullboard/skullboard.ts
src/Interaction/HybridCommands/stats/!compare.ts
src/Interaction/HybridCommands/stats/!top-messages.ts
src/Interaction/HybridCommands/sticky/!disable.ts
src/Interaction/HybridCommands/sticky/!list.ts
src/Interaction/HybridCommands/sticky/!refresh.ts
src/Interaction/HybridCommands/sticky/!show.ts
src/Interaction/HybridCommands/tag/!create.ts
src/Interaction/HybridCommands/tag/!delete.ts
src/Interaction/HybridCommands/tag/!edit.ts
src/Interaction/HybridCommands/tag/!info.ts
src/Interaction/HybridCommands/tag/!list.ts
src/Interaction/HybridCommands/tag/!use.ts
src/Interaction/HybridCommands/tag/!wlroles-create.ts
src/Interaction/HybridCommands/tag/!wlroles-use.ts
src/Interaction/HybridCommands/ticket/!add-member.ts
src/Interaction/HybridCommands/ticket/!close.ts
src/Interaction/HybridCommands/ticket/!delete.ts
src/Interaction/HybridCommands/ticket/!log-channel.ts
src/Interaction/HybridCommands/ticket/!open.ts
src/Interaction/HybridCommands/ticket/!remind.ts
src/Interaction/HybridCommands/ticket/!remove-member.ts
src/Interaction/HybridCommands/ticket/!rename.ts
src/Interaction/HybridCommands/ticket/!set-category.ts
src/Interaction/HybridCommands/ticket/!set-here.ts
src/Interaction/HybridCommands/ticket/!unlink.ts
src/Interaction/HybridCommands/tts/!info.ts
src/Interaction/HybridCommands/tts/!join.ts
src/Interaction/HybridCommands/tts/!leave.ts
src/Interaction/HybridCommands/utils/!addrole.ts
src/Interaction/HybridCommands/utils/!admin-users.ts
src/Interaction/HybridCommands/utils/!avatar.ts
src/Interaction/HybridCommands/utils/!delrole.ts
src/Interaction/HybridCommands/utils/!derank.ts
src/Interaction/HybridCommands/utils/!dm.ts
src/Interaction/HybridCommands/utils/!leash.ts
src/Interaction/HybridCommands/utils/!massiverole.ts
src/Interaction/HybridCommands/utils/!massmove.ts
src/Interaction/HybridCommands/utils/!media-only.ts
src/Interaction/HybridCommands/utils/!nickrole.ts
src/Interaction/HybridCommands/utils/!prevnames.ts
src/Interaction/HybridCommands/utils/!renew.ts
src/Interaction/HybridCommands/utils/!serverinfo.ts
src/Interaction/HybridCommands/utils/!setmentionrole.ts
src/Interaction/HybridCommands/utils/!snipe.ts
src/Interaction/HybridCommands/utils/!unleash.ts
src/Interaction/HybridCommands/utils/!userinfo.ts
src/Interaction/HybridCommands/utils/!vanity-generator.ts
src/Interaction/HybridCommands/utils/!vc.ts
src/Interaction/HybridCommands/utils/!wlroles.ts
src/Interaction/HybridCommands/utils/banner/!server.ts
src/Interaction/HybridCommands/utils/banner/!user.ts
src/Interaction/HybridCommands/utils/banner/banner.ts
src/Interaction/HybridCommands/utils/chanel/!hide.ts
src/Interaction/HybridCommands/utils/chanel/!hideall.ts
src/Interaction/HybridCommands/utils/chanel/!unhide.ts
src/Interaction/HybridCommands/utils/chanel/!unhideall.ts
src/Interaction/HybridCommands/utils/chanel/channel.ts
src/Interaction/HybridCommands/utils/unbanall/!all.ts
src/Interaction/HybridCommands/utils/unbanall/!undo.ts
src/Interaction/HybridCommands/utils/unbanall/unbanall.ts
src/Interaction/HybridCommands/utils/util/!addrolereact.ts
src/Interaction/HybridCommands/utils/util/!admin-roles.ts
src/Interaction/HybridCommands/utils/util/!allwebhooks.ts
src/Interaction/HybridCommands/utils/util/!autorenew.ts
src/Interaction/HybridCommands/utils/util/!bringall.ts
src/Interaction/HybridCommands/utils/util/!cooldown.ts
src/Interaction/HybridCommands/utils/util/!derogation.ts
src/Interaction/HybridCommands/utils/util/!freeze.ts
src/Interaction/HybridCommands/utils/util/!inviteinfo.ts
src/Interaction/HybridCommands/utils/util/!move.ts
src/Interaction/HybridCommands/utils/util/!nick-kicker.ts
src/Interaction/HybridCommands/utils/util/!role-members.ts
src/Interaction/HybridCommands/utils/util/!rolelimit.ts
src/Interaction/HybridCommands/utils/util/!serverpic.ts
src/Interaction/HybridCommands/utils/util/!sync.ts
src/Interaction/HybridCommands/utils/util/!talk.ts
src/Interaction/HybridCommands/utils/util/!unfreeze.ts
src/Interaction/HybridCommands/utils/util/!untalk.ts
src/Interaction/HybridCommands/utils/util/!unwlvc.ts
src/Interaction/HybridCommands/utils/util/!vkick.ts
src/Interaction/HybridCommands/utils/util/!wakeup.ts
src/Interaction/HybridCommands/utils/util/!where.ts
src/Interaction/HybridCommands/utils/util/!wlvc.ts
src/Interaction/HybridCommands/utils/util/!zip-stickers.ts
src/Interaction/HybridCommands/utils/utilss/!renewvc.ts
src/Interaction/MessageApplicationCommands/play.ts
src/Interaction/MessageApplicationCommands/question.ts
src/Interaction/MessageApplicationCommands/sound_to_video.ts
src/Interaction/MessageCommands/bot/@helpall.ts
src/Interaction/MessageCommands/bot/@prefix.ts
src/Interaction/MessageCommands/bot/@updates.ts
src/Interaction/MessageCommands/guildconfig/@add-react.ts
src/Interaction/MessageCommands/guildconfig/@antiexe.ts
src/Interaction/MessageCommands/guildconfig/@list-react.ts
src/Interaction/MessageCommands/guildconfig/@remove-react.ts
src/Interaction/MessageCommands/guildconfig/@toggle-react.ts
src/Interaction/MessageCommands/guildconfig/autologs.ts
src/Interaction/MessageCommands/misc/@fexini.ts
src/Interaction/MessageCommands/misc/@kawaeine.ts
src/Interaction/MessageCommands/misc/@rap-vs-reality.ts
src/Interaction/MessageCommands/misc/@two-sides.ts
src/Interaction/MessageCommands/utils/autofeur.ts
src/Interaction/MessageCommands/utils/nitrofdp.ts
src/Interaction/MessageCommands/utils/securewebhook.ts
src/Interaction/MessageCommands/utils/shardinfo.ts
src/Interaction/MessageCommands/utils/sticker.ts
src/Interaction/MessageCommands/utils/top.ts
src/Interaction/SlashCommands/authrestore/!delete.ts
src/Interaction/SlashCommands/authrestore/!force-join.ts
src/Interaction/SlashCommands/authrestore/!get.ts
src/Interaction/SlashCommands/authrestore/!roles.ts
src/Interaction/SlashCommands/authrestore/!set.ts
src/Interaction/SlashCommands/blogger/!add.ts
src/Interaction/SlashCommands/blogger/!list.ts
src/Interaction/SlashCommands/blogger/!remove.ts
src/Interaction/SlashCommands/blogger/!status.ts
src/Interaction/SlashCommands/guildconfig/!prefix.ts
src/Interaction/SlashCommands/guildconfig/!save.ts
src/Interaction/SlashCommands/guildconfig/!setup.ts
src/Interaction/SlashCommands/guildconfig/!show.ts
src/Interaction/SlashCommands/guildconfig/!too-new-account.ts
src/Interaction/SlashCommands/guildconfig/automod/!discord_invite_link.ts
src/Interaction/SlashCommands/guildconfig/automod/!link.ts
src/Interaction/SlashCommands/guildconfig/automod/!mass-mention.ts
src/Interaction/SlashCommands/guildconfig/automod/!telegram_link.ts
src/Interaction/SlashCommands/guildconfig/join-ghostping/!add.ts
src/Interaction/SlashCommands/guildconfig/join-ghostping/!remove.ts
src/Interaction/SlashCommands/guildconfig/join-ghostping/join-ghostping.ts
src/Interaction/SlashCommands/guildconfig/perm/!command.ts
src/Interaction/SlashCommands/guildconfig/perm/!create-roles.ts
src/Interaction/SlashCommands/guildconfig/perm/!edit-roles.ts
src/Interaction/SlashCommands/guildconfig/perm/!list.ts
src/Interaction/SlashCommands/guildconfig/perm/!set-user.ts
src/Interaction/SlashCommands/guildconfig/perm/perm.ts
src/Interaction/SlashCommands/lastfm/!login.ts
src/Interaction/SlashCommands/newfeatures/punishpub.ts
src/Interaction/SlashCommands/newfeatures/report.ts
src/Interaction/SlashCommands/newfeatures/rolesaver.ts
src/Interaction/SlashCommands/notifier/!add.ts
src/Interaction/SlashCommands/notifier/!channel.ts
src/Interaction/SlashCommands/notifier/!list.ts
src/Interaction/SlashCommands/notifier/!message.ts
src/Interaction/SlashCommands/notifier/!remove.ts
src/Interaction/SlashCommands/protection/!sanction.ts
src/Interaction/SlashCommands/protection/!show.ts
src/Interaction/SlashCommands/protection/allowlist/!add.ts
src/Interaction/SlashCommands/protection/allowlist/!remove.ts
src/Interaction/SlashCommands/protection/allowlist/!show.ts
src/Interaction/SlashCommands/protection/allowlist/allowlist.ts
src/Interaction/SlashCommands/protection/authorization.ts
src/Interaction/SlashCommands/suggestion/setsuggest/!channel.ts
src/Interaction/SlashCommands/suggestion/setsuggest/setsuggest.ts
src/Interaction/SlashCommands/suggestion/suggest/!accept.ts
src/Interaction/SlashCommands/suggestion/suggest/!delete.ts
src/Interaction/SlashCommands/suggestion/suggest/!deny.ts
src/Interaction/SlashCommands/suggestion/suggest/!reply.ts
src/Interaction/SlashCommands/voicedashboard/!set-staff-role.ts
src/Interaction/SlashCommands/voicedashboard/!set-text-channel.ts
src/Interaction/UserApplicationCommands/lookup.ts
src/Interaction/UserApplicationCommands/love.ts
src/core/Mailer.ts
src/core/backup/src/create.ts
src/core/backup/src/index.ts
src/core/backup/src/load.ts
src/core/backup/src/types/AfkData.ts
src/core/backup/src/types/BanData.ts
src/core/backup/src/types/BaseChannelData.ts
src/core/backup/src/types/CategoryData.ts
src/core/backup/src/types/ChannelPermissionData.ts
src/core/backup/src/types/ChannelsData.ts
src/core/backup/src/types/CreateOptions.ts
src/core/backup/src/types/EmojiData.ts
src/core/backup/src/types/LoadOptions.ts
src/core/backup/src/types/MemberData.ts
src/core/backup/src/types/MessageData.ts
src/core/backup/src/types/RoleData.ts
src/core/backup/src/types/TextChannelData.ts
src/core/backup/src/types/ThreadChannelData.ts
src/core/backup/src/types/WidgetData.ts
src/core/backup/src/types/index.ts
src/core/captcha.ts
src/core/commandsSync.ts
src/core/core.ts
src/core/database/driver/json.ts
src/core/database/driver/memory.ts
src/core/database/driver/postgres.ts
src/core/database/driver/sqlite.ts
src/core/database/index.ts
src/core/database/lodash.ts
src/core/database/types.ts
src/core/functions/apiUrlParser.ts
src/core/functions/assetsCalc.ts
src/core/functions/awaitingResponse.ts
src/core/functions/axios.ts
src/core/functions/bannerGenerator.ts
src/core/functions/batchProcessor.ts
src/core/functions/colors.ts
src/core/functions/database_latency.ts
src/core/functions/date_and_time.ts
src/core/functions/emojiChecker.ts
src/core/functions/encryptDecryptMethod.ts
src/core/functions/generateProgressBar.ts
src/core/functions/getIp.ts
src/core/functions/getMessageURL.ts
src/core/functions/helper.ts
src/core/functions/html2png.ts
src/core/functions/ihorizon_logs.ts
src/core/functions/image64.ts
src/core/functions/image_dominant_color.ts
src/core/functions/intentEnabler.ts
src/core/functions/isAllowedLinks.ts
src/core/functions/kdenliveManipulator.ts
src/core/functions/maskLink.ts
src/core/functions/mediaManipulation.ts
src/core/functions/method.ts
src/core/functions/ms.ts
src/core/functions/numberBeautifuer.ts
src/core/functions/permissonsCalculator.ts
src/core/functions/prefix.ts
src/core/functions/random.ts
src/core/functions/randomExpression.ts
src/core/functions/retrieveMyself.ts
src/core/functions/sanitizeInteractionOptionValue.ts
src/core/functions/sanitizer.ts
src/core/functions/searchLyrics.ts
src/core/functions/shard_helper.ts
src/core/functions/validImageType.ts
src/core/functions/wait.ts
src/core/functions/welcomerMessage.ts
src/core/getOS.ts
src/core/handlerHelper.ts
src/core/handlers/loadAnotherStuff.ts
src/core/handlers/loadApplicationsCommands.ts
src/core/handlers/loadEvent.ts
src/core/handlers/loadHtmlFile.ts
src/core/handlers/loadHybridCommands.ts
src/core/handlers/loadMessageCommands.ts
src/core/handlers/loadSlashCommands.ts
src/core/images.ts
src/core/locales.ts
src/core/modules/autorenewManager.ts
src/core/modules/errorManager.ts
src/core/modules/githubLinesManager.ts
src/core/modules/playerManager.ts
src/core/modules/tempRoleManager.ts
src/core/modules/tempbanManager.ts
src/core/ping/index.ts
src/index.ts
src/version.ts
<!-- MANUAL:TRIAGED-PATHS-END -->
