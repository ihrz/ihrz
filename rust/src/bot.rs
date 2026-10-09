// iHorizon Discord Bot (https://gitlab.com/ihrz/ihrz)
// Licensed under CC-BY-NC-SA-4.0.
// Mirrors src/core/bot.ts (intents/partials/cache) + src/index.ts (sharding)
// + src/core/commandsSync.ts (slash registration via poise).

use crate::{commands, config::Config, db::Pool};
use poise::serenity_prelude as serenity;
use std::sync::Arc;

/// Prefix arg UX (required-count, longString tail merge,
/// attachment-required gate, caret usage-error embed). Declared here via
/// path attribute so the port stays within this file's scope: pure
/// policy in prefix_args.rs, Discord hooks below.
#[path = "prefix_args.rs"]
pub mod prefix_args;

pub struct Data {
    pub pool: Pool,
    pub config: Arc<Config>,
    pub cooldowns: std::sync::Mutex<crate::executor::Cooldowns>,
    pub rate_limits: std::sync::Mutex<crate::executor::RateLimits>,
    /// Command file log. Mirrors the SafeJSONLogger shared by the TS
    /// message + slash handlers; the prefix leg logs here (pre-command
    /// hook), the slash leg in events_handler::log_slash_command.
    pub slashlog: Arc<crate::slashlog::SlashLog>,
}

/// Current unix millis. Mirrors Date.now() in the executor guards.
pub fn now_ms() -> i64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_millis() as i64)
        .unwrap_or(0)
}

pub type Ctx<'a> = poise::Context<'a, Data, anyhow::Error>;

/// Global command gate. Mirrors commandExecutor.ts guards +
/// blacklistTable + UTILS.PERMS custom levels.
fn global_check(
    ctx: poise::Context<'_, Data, anyhow::Error>,
) -> poise::BoxFuture<'_, Result<bool, anyhow::Error>> {
    Box::pin(async move {
        let pool = &ctx.data().pool;
        if crate::db::is_blacklisted(pool, ctx.author().id.get()).await {
            return Ok(false);
        }
        let name = ctx.command().name.clone();
        // Slash-command usage log (mirrors slashCommandLogger.ts).
        if let Some(gid) = ctx.guild_id() {
            let gid = gid.get().to_string();
            if let Some(ch) = crate::db::kv_get(pool, &gid, "GUILD.SERVER_LOGS.command").await {
                if let Ok(ch_id) = ch.parse::<u64>() {
                    let _ = poise::serenity_prelude::ChannelId::new(ch_id)
                        .say(
                            &ctx.serenity_context().http,
                            format!("/{} by {}.", name, ctx.author().tag()),
                        )
                        .await;
                }
            }
        }
        // Fun kill-switch (mirrors GUILD.FUN.states check in commandExecutor).
        // The config command itself stays available.
        if ctx.command().category.as_deref() == Some("fun")
            && name != "config"
            && !crate::commands::fun::fun_enabled(pool, ctx.guild_id().map(|g| g.get())).await
        {
            return Ok(false);
        }
        if let Some(perms) = crate::commands::guildconfig::load_cmd_perms(
            pool,
            &ctx.guild_id()
                .map(|g| g.get().to_string())
                .unwrap_or_default(),
            &name,
        )
        .await
        {
            let member_roles: Vec<u64> = ctx
                .author_member()
                .await
                .map(|m| m.roles.iter().map(|r| r.get()).collect())
                .unwrap_or_default();
            let gid = ctx
                .guild_id()
                .map(|g| g.get().to_string())
                .unwrap_or_default();
            let user_level: u8 = crate::db::kv_get(
                pool,
                &gid,
                &format!("UTILS.USER_PERMS.{}", ctx.author().id.get()),
            )
            .await
            .and_then(|s| s.parse().ok())
            .unwrap_or(0);
            // Role-hierarchy level (Perm 1-9 roles). Mirrors
            // checkRoleHierarchy: the effective level is the max.
            let roles_map: std::collections::HashMap<String, String> =
                crate::db::kv_get(pool, &gid, "UTILS.roles")
                    .await
                    .and_then(|s| serde_json::from_str(&s).ok())
                    .unwrap_or_default();
            let user_level = user_level.max(crate::executor::role_level(&member_roles, &roles_map));
            if !crate::executor::check_cmd_access(
                ctx.author().id.get(),
                &member_roles,
                user_level,
                &perms,
            ) {
                return Ok(false);
            }
        }
        // Global 1s debounce. Mirrors preExecutionCooldown (slash
        // COOLDOWN.<uid> + message "msg_commands" helper cooldown):
        // denied runs get lang.Msg_cooldown and never execute.
        let code = crate::db::guild_lang(pool, ctx.guild_id().map(|g| g.get())).await;
        let left = ctx
            .data()
            .cooldowns
            .lock()
            .map(|mut c| c.check(ctx.author().id.get(), "msg_commands", 1000, now_ms()))
            .unwrap_or(0);
        if left > 0 {
            let msg = crate::lang::get(&code, "Msg_cooldown").unwrap_or_default();
            let _ = ctx
                .send(poise::CreateReply::default().content(msg).ephemeral(true))
                .await;
            return Ok(false);
        }
        // Per-command rate limits. Mirrors checkCommandRateLimit:
        // UTILS.COMMAND_LIMITS.<path> then <category> fallback, guild
        // owners bypass, denied runs get commandlimit_rate_limited.
        let path = ctx.command().qualified_name.clone();
        let raw = crate::db::kv_get(
            pool,
            &ctx.guild_id()
                .map(|g| g.get().to_string())
                .unwrap_or_default(),
            "UTILS.COMMAND_LIMITS",
        )
        .await;
        let map: std::collections::HashMap<String, crate::commands::guildconfig::CommandLimit> =
            raw.and_then(|s| serde_json::from_str(&s).ok())
                .unwrap_or_default();
        let category = path.split(' ').next().unwrap_or(&path).to_string();
        let limit = map.get(&path).or_else(|| map.get(&category)).cloned();
        if let Some(limit) = limit {
            if limit.count > 0 && limit.window_ms > 0 {
                let bypass = match ctx.guild_id() {
                    Some(gid) => {
                        let owner = gid
                            .to_partial_guild(ctx.http())
                            .await
                            .map(|g| g.owner_id)
                            .unwrap_or_else(|_| ctx.author().id);
                        owner == ctx.author().id
                            || crate::db::kv_get(
                                pool,
                                &gid.get().to_string(),
                                &format!("GUILD.OWNER.{}", ctx.author().id.get()),
                            )
                            .await
                            .is_some()
                    }
                    None => false,
                };
                if !bypass {
                    let left = ctx
                        .data()
                        .rate_limits
                        .lock()
                        .map(|mut r| {
                            r.check(
                                ctx.guild_id().map(|g| g.get()).unwrap_or(0),
                                ctx.author().id.get(),
                                &path,
                                limit.count,
                                limit.window_ms,
                                now_ms(),
                            )
                        })
                        .unwrap_or(0);
                    if left > 0 {
                        let msg = crate::lang::get(&code, "commandlimit_rate_limited")
                            .unwrap_or_default()
                            .replace("${time}", &crate::funcs::beautiful_ms(left as f64));
                        let _ = ctx
                            .send(poise::CreateReply::default().content(msg).ephemeral(true))
                            .await;
                        return Ok(false);
                    }
                }
            }
        }
        Ok(true)
    })
}
/// Crash reporter. Mirrors handleExecutionError in commandExecutor.ts:
/// the user gets the error block + /report suggestion, and a report
/// embed goes to config.core.reportChannelID.
async fn crash_block(ctx: Ctx<'_>, error_text: String) {
    let is_prefix = matches!(ctx, poise::Context::Prefix(_));
    let invocation = match ctx {
        poise::Context::Prefix(p) => p.msg.content.clone(),
        _ => format!("/{}", ctx.command().qualified_name),
    };
    let target_name = ctx.command().name.clone();
    let error_block = format!(
        "```TS\nMessage: The command ran into a problem!\nCommand Name: {target_name}\nError: {error_text}```\n"
    );
    let _ = ctx
        .send(
            poise::CreateReply::default()
                .content(format!(
                    "{error_block}**Let me suggest you to report this issue with `/report`.**"
                ))
                .ephemeral(true),
        )
        .await;
    let channel_id: u64 = ctx.data().config.report_channel_id.parse().unwrap_or(0);
    if channel_id == 0 {
        return;
    }
    let embed = serenity::CreateEmbed::default()
        .title(if is_prefix {
            "MSG_CMD_CRASH_NOT_HANDLE"
        } else {
            "SLASH_CMD_CRASH_NOT_HANDLE"
        })
        .description(error_block)
        .field("User", ctx.author().tag(), false)
        .field("** **", invocation, false);
    let _ = serenity::ChannelId::new(channel_id)
        .send_message(
            ctx.serenity_context().http.clone(),
            serenity::CreateMessage::new().embed(embed),
        )
        .await;
}

/// Localized user-facing reply for framework-level denials.
/// Mirrors commandExecutor.ts `replyDenied` (plain channel reply,
/// never ephemeral) + the TS lang keys used on each denial path.
async fn denial_reply(ctx: Ctx<'_>, key: &str, sub: Option<(&str, String)>) {
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    let mut msg = crate::lang::get(&code, key).unwrap_or_default();
    if msg.is_empty() {
        return;
    }
    if let Some((pat, val)) = sub {
        msg = msg.replace(pat, &val);
    }
    let _ = ctx.send(poise::CreateReply::default().content(msg)).await;
}

/// Framework error router. Command/CommandPanic keep the crash block;
/// parse + permission + cooldown denials get TS-keyed replies instead
/// of silence. CommandCheckFailed without an error stays silent: the
/// global check already replied (cooldown / rate-limit) or denied
/// quietly (blacklist, fun switch, custom perms), mirroring TS.
pub async fn report_command_error(err: poise::FrameworkError<'_, Data, anyhow::Error>) {
    match &err {
        poise::FrameworkError::Command { ctx, error, .. } => {
            crash_block(*ctx, error.to_string()).await;
        }
        poise::FrameworkError::CommandPanic { ctx, payload, .. } => {
            crash_block(*ctx, format!("{payload:?}")).await;
        }
        // Prefix arg that poise could not parse (member/role/user
        // mention). TS resolves these via method.member/role (null ->
        // per-command key); ban_dont_found_member is the shared key
        // used by 6 TS commands for unresolvable member input.
        poise::FrameworkError::ArgumentParse { ctx, .. } => {
            denial_reply(*ctx, "ban_dont_found_member", None).await;
        }
        // Mirrors the preExecutionCooldown denial (lang.Msg_cooldown).
        poise::FrameworkError::CooldownHit { ctx, .. } => {
            denial_reply(*ctx, "Msg_cooldown", None).await;
        }
        // Mirrors the bot-permission denial (!addrole.ts,
        // !delrole.ts use backup_i_dont_have_permission).
        poise::FrameworkError::MissingBotPermissions { ctx, .. } => {
            denial_reply(*ctx, "backup_i_dont_have_permission", None).await;
        }
        // Mirrors checkNativePermission (var_dont_have_perm + perm name).
        poise::FrameworkError::MissingUserPermissions {
            ctx,
            missing_permissions,
            ..
        } => {
            let perm = missing_permissions
                .map(|p| p.to_string())
                .unwrap_or_else(|| "permission".to_string());
            denial_reply(*ctx, "var_dont_have_perm", Some(("{perm}", perm))).await;
        }
        poise::FrameworkError::CommandCheckFailed {
            ctx,
            error: Some(error),
            ..
        } => {
            crash_block(*ctx, error.to_string()).await;
        }
        _ => {}
    }
}
/// Pre-command hook: prefix file-log gate. Mirrors loggerX.addCommand
/// in messageCommandHandler.ts (channel, full content, executor,
/// guild, timestamp, channel id). Slash invocations are already logged
/// by the interactionCreate leg (events_handler::log_slash_command),
/// so only the prefix path logs here; logging both would double-log
/// slash. Gate verdicts need no hook: poise runs command_check
/// (global_check: blacklist, 1s debounce, rate limits) on both the
/// prefix and slash dispatch paths, and per-command cooldowns via
/// check_permissions_and_cooldown on both as well.
fn pre_command_hook(ctx: poise::Context<'_, Data, anyhow::Error>) -> poise::BoxFuture<'_, ()> {
    Box::pin(async move {
        let poise::Context::Prefix(p) = ctx else {
            return;
        };
        let Some(guild_id) = p.msg.guild_id else {
            return;
        };
        let cache = &p.serenity_context.cache;
        let guild_name = cache
            .guild(guild_id)
            .map(|g| g.name.clone())
            .unwrap_or_else(|| guild_id.get().to_string());
        let channel_name = cache
            .guild(guild_id)
            .and_then(|g| g.channels.get(&p.msg.channel_id).map(|c| c.name.clone()))
            .unwrap_or_else(|| "unknown".to_string());
        p.data
            .slashlog
            .log(crate::slashlog::ParsedSavedCommand {
                guild_name,
                guild_id: Some(guild_id.get().to_string()),
                executor_username: p.msg.author.name.clone(),
                timestamp: now_ms(),
                channel_name,
                channel_id: p.msg.channel_id.get().to_string(),
                command: p.msg.content.trim().to_string(),
            })
            .await;
    })
}

/// Per-guild prefix with global default. Mirrors TS
/// defaultMessageCommandsPrefix + GUILD.PREFIX override.
fn dynamic_prefix(
    ctx: poise::PartialContext<'_, Data, anyhow::Error>,
) -> poise::BoxFuture<'_, Result<Option<String>, anyhow::Error>> {
    Box::pin(async move {
        let prefix = crate::db::guild_prefix(
            &ctx.data.pool,
            ctx.guild_id.map(|g| g.get()),
            &ctx.data.config.prefix,
        )
        .await;
        Ok(Some(prefix))
    })
}

/// Partials / enforceNonce parity notes (src/core/bot.ts lines 86-99).
/// serenity 0.12 exposes no Partials client option: gateway dispatches
/// always carry their full payload, and cache misses surface as `None`
/// at the lookup site rather than as partial objects. Mapping of the 10
/// TS partials: Channel, Message, User, Reaction, GuildMember,
/// GuildScheduledEvent, ThreadMember, Poll, PollAnswer, SoundboardSound
/// all arrive complete in serenity events; where this file needs data
/// that may not be cached it fetches over HTTP instead (the guild-owner
/// lookup in global_check uses `to_partial_guild`, i.e. a fetch-missing
/// fallback). Uncached-event handling inside the event dispatcher is
/// owned by events_handler, out of scope for this file.
/// enforceNonce likewise has no global flag in serenity: it is a
/// per-message builder option
/// (`CreateMessage::enforce_nonce`, only effective with an explicit
/// `.nonce(...)`). Command replies here go through poise's reply path,
/// which manages its own idempotency, so no per-send nonce is set.
fn intents() -> serenity::GatewayIntents {
    // Mirrors the explicit GatewayIntentBits list in src/core/bot.ts.
    serenity::GatewayIntents::GUILDS
        | serenity::GatewayIntents::GUILD_MEMBERS
        | serenity::GatewayIntents::GUILD_MODERATION
        | serenity::GatewayIntents::GUILD_EMOJIS_AND_STICKERS
        | serenity::GatewayIntents::GUILD_INTEGRATIONS
        | serenity::GatewayIntents::GUILD_WEBHOOKS
        | serenity::GatewayIntents::GUILD_INVITES
        | serenity::GatewayIntents::GUILD_VOICE_STATES
        | serenity::GatewayIntents::GUILD_PRESENCES
        | serenity::GatewayIntents::GUILD_MESSAGES
        | serenity::GatewayIntents::GUILD_MESSAGE_REACTIONS
        | serenity::GatewayIntents::GUILD_MESSAGE_TYPING
        | serenity::GatewayIntents::DIRECT_MESSAGES
        | serenity::GatewayIntents::DIRECT_MESSAGE_REACTIONS
        | serenity::GatewayIntents::DIRECT_MESSAGE_TYPING
        | serenity::GatewayIntents::MESSAGE_CONTENT
        | serenity::GatewayIntents::GUILD_SCHEDULED_EVENTS
        | serenity::GatewayIntents::AUTO_MODERATION_CONFIGURATION
        | serenity::GatewayIntents::AUTO_MODERATION_EXECUTION
        | serenity::GatewayIntents::GUILD_MESSAGE_POLLS
        | serenity::GatewayIntents::DIRECT_MESSAGE_POLLS
}

/// Parse `git remote get-url origin` into an https base URL. Mirrors
/// parseGitRemote in src/version.ts (`git@host:path` -> `https://host/path`,
/// trailing `.git` stripped).
pub fn parse_git_remote(raw: &str) -> String {
    let mut s = raw.trim().to_string();
    if let Some(rest) = s.strip_prefix("git@") {
        if let Some(i) = rest.find(':') {
            s = format!("https://{}/{}", &rest[..i], &rest[i + 1..]);
        }
    }
    if let Some(stripped) = s.strip_suffix(".git") {
        s = stripped.to_string();
    }
    s
}

/// Resolve the git remote base URL for release links. `GIT_REMOTE` env
/// wins (offline/test override); otherwise `git remote get-url origin`
/// like src/version.ts. Empty when unresolvable (offline checkout).
pub fn resolve_git_remote() -> String {
    if let Ok(v) = std::env::var("GIT_REMOTE") {
        if !v.trim().is_empty() {
            return parse_git_remote(&v);
        }
    }
    match std::process::Command::new("git")
        .args(["remote", "get-url", "origin"])
        .output()
    {
        Ok(out) if out.status.success() => parse_git_remote(&String::from_utf8_lossy(&out.stdout)),
        _ => String::new(),
    }
}

/// Resolve the newsletter DM template for one owner locale. Reuses the
/// existing `newsletter_dm_body` YAML key (never hardcoded); the lang
/// table falls back to en-US for the lookup only. Mirrors sendDm()
/// reading `lang.newsletter_dm_body` via getOwnerLang(client, guildId).
pub fn resolve_dm_body_template_for(lang_code: &str) -> String {
    crate::lang::get(lang_code, "newsletter_dm_body").unwrap_or_default()
}

/// Collect guild->owner rows from the gateway cache for the release
/// notifier. Mirrors getAllGuildOwnerData in releaseNotifier.ts
/// (no-shard path): one row per cached guild with its owner_id;
/// unavailable guilds (no cached Guild yet) are skipped. The
/// first-guild-wins per-owner dedupe lives in the release module
/// (`dedupe_owners`), so duplicate owners across guilds stay here.
pub fn collect_guild_owners(cache: &serenity::Cache) -> Vec<crate::core::release::GuildOwner> {
    let mut rows = Vec::new();
    for gid in cache.guilds() {
        if let Some(g) = cache.guild(gid) {
            rows.push(crate::core::release::GuildOwner {
                guild_id: gid.get().to_string(),
                owner_id: g.owner_id.get().to_string(),
            });
        }
    }
    rows
}

/// Strip custom `perm`/`permission` props from a command payload.
/// Mirrors removePermissionProperties in src/core/commandsSync.ts (used
/// for the REST PUT body and the dev commands.json dump): arrays are
/// mapped, non-objects pass through, nested objects are cleaned
/// recursively. Poise serializes slash options from function
/// parameters (no custom fields to carry), so this applies to JSON
/// payload snapshots, not the poise registration call itself.
pub fn strip_perm_props(value: &mut serde_json::Value) {
    match value {
        serde_json::Value::Array(items) => {
            for item in items {
                strip_perm_props(item);
            }
        }
        serde_json::Value::Object(map) => {
            map.remove("perm");
            map.remove("permission");
            for (_, v) in map.iter_mut() {
                strip_perm_props(v);
            }
        }
        _ => {}
    }
}

/// Shard presence activity name. Mirrors the (currently disabled)
/// quotesPresence body in ready.ts:
/// `Shards #<id> | <guilds> Servers | www.ihorizon.org`
/// (ActivityType.Playing, per-shard id). Pure so the template is
/// testable offline; the live setPresence call stays caller-side.
pub fn shard_presence_name(shard_id: u64, guilds: u64) -> String {
    format!("Shards #{shard_id} | {guilds} Servers | www.ihorizon.org")
}

/// Warm rows for the username cache. Mirrors the ready.ts loop filling
/// usersNamesMap from the guild member cache:
/// `usersNamesMap.set(id, { username, globalName })`. Takes plain
/// rows so it stays offline-testable; the live caller feeds it from
/// the gateway cache. Later rows win on duplicate ids.
pub fn collect_users_names(
    entries: impl IntoIterator<Item = (u64, String, Option<String>)>,
) -> std::collections::HashMap<u64, (String, Option<String>)> {
    let mut map = std::collections::HashMap::new();
    for (id, username, global_name) in entries {
        map.insert(id, (username, global_name));
    }
    map
}

pub async fn run(cfg: Config, pool: Pool) -> anyhow::Result<()> {
    let token = crate::config::bot_token().ok_or_else(|| {
        anyhow::anyhow!("missing BOT_TOKEN env (mirrors config.discord.token fallback)")
    })?;

    let cfg = Arc::new(cfg);
    let pool_fw = pool.clone();
    let cfg_fw = cfg.clone();
    // SlashLog shared with the pre-command prefix file-log gate; the
    // event handler keeps its own clone for the slash leg.
    let slashlog = crate::slashlog::SlashLog::new(crate::slashlog::SlashLog::default_path());
    let slashlog_fw = slashlog.clone();

    let framework = poise::Framework::builder()
        .options(poise::FrameworkOptions {
            commands: commands::all(),
            command_check: Some(global_check),
            pre_command: pre_command_hook,
            on_error: |err| {
                Box::pin(async move {
                    tracing::warn!("command error: {err}");
                    crate::bot::report_command_error(err).await;
                })
            },
            prefix_options: poise::PrefixFrameworkOptions {
                dynamic_prefix: Some(dynamic_prefix),
                mention_as_prefix: cfg.message_commands_mention,
                ..Default::default()
            },
            // HybridCommands in TS run as both slash + prefix; poise does
            // the same natively.
            ..Default::default()
        })
        .setup(|ctx, ready, framework| {
            Box::pin(async move {
                poise::builtins::register_globally(ctx, &framework.options().commands).await?;
                tracing::info!("slash commands synced");
                // Lavalink nodes: sync from config, register this
                // shard's messenger for OP4 leave, and dial each node
                // WS (mirrors playerManager.ts init + nodeManager
                // connect; frames feed feed_node_ws so track-end
                // advance + the nowplaying announce run live).
                {
                    let cfgs: Vec<crate::lavalink::NodeCfg> = cfg_fw
                        .lavalink_nodes
                        .iter()
                        .map(crate::lavalink::NodeCfg::from)
                        .collect();
                    let user_id = ready.user.id.get();
                    let mgr = crate::lavalink::manager();
                    mgr.sync_nodes(&cfgs, user_id).await;
                    let shard_id = ready.shard.as_ref().map(|s| u64::from(s.id.0)).unwrap_or(0);
                    mgr.register_shard(shard_id, ctx.shard.clone()).await;
                    if let Some(total) = ready.shard.as_ref().map(|s| s.total) {
                        mgr.ensure_total_shards(total).await;
                    }
                    crate::lavalink::spawn_all_node_ws(cfgs, user_id);
                }
                // Release newsletter fan-out (main shard only). Mirrors
                // checkAndNotifyRelease(client) in ready.ts: owner rows
                // enumerated from the guild cache, git remote for the
                // release URL, resolved newsletter_dm_body template.
                // Spawned so the staggered DM loop never blocks setup;
                // the module's own guards (main-shard gate, re-entrance,
                // claim-before-send, distributed lock) apply inside.
                {
                    let http = ctx.http.clone();
                    let cache = ctx.cache.clone();
                    let pool = pool_fw.clone();
                    let shard_id = ready.shard.as_ref().map(|s| u64::from(s.id.0)).unwrap_or(0);
                    tokio::spawn(async move {
                        let mut root = std::env::current_dir().unwrap_or_else(|_| ".".into());
                        if root.ends_with("rust") {
                            root.pop();
                        }
                        let entries = collect_guild_owners(&cache);
                        let summary = crate::core::release::check_and_notify_release(
                            &pool,
                            &http,
                            shard_id,
                            &root,
                            &entries,
                            &resolve_git_remote(),
                            &|code: &str| resolve_dm_body_template_for(code),
                        )
                        .await;
                        if summary.ran {
                            tracing::info!(
                                "release newsletter done: version {:?}, sent {}, blocked {}, transient {}, skipped {}",
                                summary.version,
                                summary.sent,
                                summary.blocked,
                                summary.transient,
                                summary.skipped
                            );
                        }
                    });
                }
                Ok(Data {
                    pool: pool_fw.clone(),
                    config: cfg_fw.clone(),
                    cooldowns: std::sync::Mutex::new(crate::executor::Cooldowns::default()),
                    rate_limits: std::sync::Mutex::new(crate::executor::RateLimits::default()),
                    slashlog: slashlog_fw.clone(),
                })
            })
        })
        .build();

    let mut cache_settings = serenity::Settings::default();
    cache_settings.max_messages = 100;
    // Mirrors the 8h message lifetime in src/core/bot.ts
    // (DISCORD_MESSAGE_SWEEP_LIFETIME_SECONDS = 60*60*8): serenity has no
    // per-category sweepers, so the global TTL for temp-cached data is the
    // closest equivalent. No serenity 0.12 equivalent exists for the
    // users (bot-only, 30min), presences (offline-only, 15min) and
    // threads (1h lifetime, 30min interval) sweepers: serenity exposes no
    // public per-category eviction API, only the max_messages cap above
    // (mirrors MessageManager: 100) plus this TTL. Periodic selective
    // eviction is therefore documented as not portable, not approximated
    // with a no-op ticker.
    cache_settings.time_to_live = std::time::Duration::from_secs(60 * 60 * 8);
    // Slash-command file log (mirrors loggerX in slashCommandLogger.ts).
    // Created at the top of run() and shared with Data for the prefix
    // leg; the shutdown flush below drains both legs' entries.
    // Mirrors the SIGINT/SIGTERM flush in slashCommandLogger.ts.
    {
        let logs = slashlog.clone();
        tokio::spawn(async move {
            #[cfg(unix)]
            {
                let mut term =
                    tokio::signal::unix::signal(tokio::signal::unix::SignalKind::terminate())
                        .expect("sigterm handler");
                tokio::select! {
                    _ = tokio::signal::ctrl_c() => {},
                    _ = term.recv() => {},
                }
            }
            #[cfg(not(unix))]
            {
                let _ = tokio::signal::ctrl_c().await;
            }
            tracing::info!("flushing command logs before shutdown...");
            logs.force_flush().await;
        });
    }
    let mut client = serenity::ClientBuilder::new(token, intents())
        .cache_settings(cache_settings)
        .framework(framework)
        .event_handler(crate::events_handler::Handler::new(pool.clone(), slashlog))
        .await?;

    crate::scheduler::spawn(pool.clone(), client.http.clone());

    // App emoji sync (best-effort background, mirrors emojisManager).
    {
        let http = client.http.clone();
        tokio::spawn(async move {
            crate::emojis::sync(&http).await;
            crate::emojis::refresh(&http).await;
        });
    }

    // Release version file. Mirrors `await writeVersionFile(pkg.version)`
    // in src/index.ts (boot, before spawning shards).
    if let Err(e) = crate::core::release::write_version_file(env!("CARGO_PKG_VERSION")) {
        tracing::warn!("version file write failed: {e}");
    }

    // Sharding mirrors ShardingManager in src/index.ts. TOTAL_SHARDS env
    // override (cfg.total_shards, parsed in config::load) takes priority,
    // same as TS; otherwise Discord's /gateway/bot recommendation scaled
    // by the tuning multiplier (crate::funcs, mirrors
    // getOptimalShardCount()). Offline (query fails) falls back to
    // start_autosharded, the previous behavior. Documented gaps (no
    // serenity 0.12 equivalent): the spawn pacing (delay 5500, timeout
    // 30000) and the respawn flag — serenity spawns shards sequentially
    // and auto-reconnects/resumes dropped shards via the ShardManager,
    // so respawn:true behaviour is the default, not a flag.
    let gateway_recommended: Option<u32> = match client.http.get_bot_gateway().await {
        Ok(g) => {
            tracing::info!("[Gateway] Discord recommends: {} shards", g.shards);
            Some(g.shards)
        }
        Err(e) => {
            tracing::warn!("gateway/bot query failed ({e}), falling back to autoshard");
            None
        }
    };
    let total_shards = crate::funcs::resolve_shard_count(gateway_recommended, cfg.total_shards);
    if let Some(n) = total_shards {
        crate::lavalink::manager().set_total_shards(n as u64).await;
        if cfg.total_shards.filter(|m| *m > 0).is_some() {
            tracing::info!("using TOTAL_SHARDS override: {n}");
        } else if let Some(rec) = gateway_recommended {
            tracing::info!(
                "[Gateway] Tuned shard count: {n} (Discord: {rec} × multiplier: {})",
                crate::funcs::shard_multiplier()
            );
        }
    }
    // Main-shard release gate. Mirrors checkAndNotifyRelease() running on
    // shard 0 only (client.isMainShard): in this single-process autoshard
    // shard 0 is always local, so the gate is evaluated for shard 0 here
    // at boot. The one-shot claim (v.old.txt rotation) lives in
    // consume_release_note; the owner-DM fan-out is deferred to the
    // notifier module, which must call this path only when
    // crate::funcs::is_main_shard holds.
    if crate::funcs::is_main_shard(0) {
        let mut root = std::env::current_dir().unwrap_or_else(|_| ".".into());
        if root.ends_with("rust") {
            root.pop();
        }
        if let Some(version) = crate::core::release::consume_release_note(&root) {
            tracing::info!("release {version} pending announcement (main shard)");
        }
    }

    tracing::info!("connecting gateway (autosharded)");
    let started = match total_shards {
        Some(n) => client.start_shards(n).await,
        None => client.start_autosharded().await,
    };
    match started {
        Ok(()) => Ok(()),
        Err(e) => {
            // Mirrors core.ts login(): self-heal disallowed intents, else exit.
            let msg = e.to_string();
            if msg.contains("disallowed intents") {
                if let Some(token) = crate::config::bot_token() {
                    if crate::funcs::enable_required_intents(&token).await {
                        tracing::info!("intents updated, restart to apply");
                    }
                }
            }
            Err(e.into())
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::sync::Mutex;

    static ENV_LOCK: Mutex<()> = Mutex::new(());

    #[test]
    fn parse_git_remote_mirrors_version_ts() {
        // https passthrough (trailing .git stripped).
        assert_eq!(
            parse_git_remote("https://gitlab.com/ihrz/ihrz.git"),
            "https://gitlab.com/ihrz/ihrz"
        );
        assert_eq!(
            parse_git_remote("https://gitlab.com/ihrz/ihrz"),
            "https://gitlab.com/ihrz/ihrz"
        );
        // scp-like syntax becomes https.
        assert_eq!(
            parse_git_remote("git@gitlab.com:ihrz/ihrz.git"),
            "https://gitlab.com/ihrz/ihrz"
        );
        assert_eq!(parse_git_remote("  "), "");
        assert_eq!(parse_git_remote(""), "");
    }

    #[test]
    fn resolve_git_remote_prefers_env() {
        let _guard = ENV_LOCK.lock().unwrap();
        std::env::set_var("GIT_REMOTE", "git@gitlab.com:ihrz/ihrz.git");
        assert_eq!(resolve_git_remote(), "https://gitlab.com/ihrz/ihrz");
        std::env::remove_var("GIT_REMOTE");
    }

    #[test]
    fn dm_body_templates_come_from_yaml_per_locale() {
        // Reuses the existing newsletter_dm_body key with its
        // placeholders, resolved per owner locale (mirrors sendDm via
        // getOwnerLang); no live Discord needed (YAML tables only).
        for code in ["en-US", "fr-FR"] {
            let template = resolve_dm_body_template_for(code);
            assert!(!template.is_empty(), "empty template for {code}");
            assert!(
                template.contains("{owner}"),
                "missing {{owner}} placeholder for {code}"
            );
            assert!(
                template.contains("{version}"),
                "missing {{version}} placeholder for {code}"
            );
            assert!(
                template.contains("{releaseUrl}"),
                "missing {{releaseUrl}} placeholder for {code}"
            );
        }
    }

    #[test]
    fn empty_cache_yields_no_owner_rows_offline() {
        // No live Discord: a default cache has no guilds to enumerate.
        let cache = serenity::Cache::default();
        assert!(collect_guild_owners(&cache).is_empty());
    }

    #[test]
    fn perm_strip_drops_perm_keys_recursively() {
        let mut v = serde_json::json!({
            "name": "x",
            "perm": "admin",
            "permission": 8,
            "options": [
                {"name": "a", "perm": "x", "nested": {"permission": true, "keep": 1}}
            ],
            "plain": [1, "s", null]
        });
        strip_perm_props(&mut v);
        assert_eq!(
            v,
            serde_json::json!({
                "name": "x",
                "options": [{"name": "a", "nested": {"keep": 1}}],
                "plain": [1, "s", null]
            })
        );
        // Non-objects pass through untouched.
        let mut scalar = serde_json::json!("perm");
        strip_perm_props(&mut scalar);
        assert_eq!(scalar, serde_json::json!("perm"));
    }

    #[test]
    fn shard_presence_template_matches_ts() {
        assert_eq!(
            shard_presence_name(0, 123),
            "Shards #0 | 123 Servers | www.ihorizon.org"
        );
        assert_eq!(
            shard_presence_name(3, 0),
            "Shards #3 | 0 Servers | www.ihorizon.org"
        );
    }

    #[test]
    fn users_names_warm_keeps_username_and_global_name() {
        let rows = collect_users_names(vec![
            (1u64, "alice".to_string(), Some("Alice".to_string())),
            (2u64, "bot".to_string(), None),
            // Later rows win, like Map.set in the TS warm loop.
            (1u64, "alice2".to_string(), None),
        ]);
        assert_eq!(rows.len(), 2);
        assert_eq!(rows[&1], ("alice2".to_string(), None));
        assert_eq!(rows[&2], ("bot".to_string(), None));
        assert!(collect_users_names(vec![]).is_empty());
    }
}
