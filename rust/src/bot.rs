// iHorizon Discord Bot (https://gitlab.com/ihrz/ihrz)
// Licensed under CC-BY-NC-SA-4.0.
// Mirrors src/core/bot.ts (intents/partials/cache) + src/index.ts (sharding)
// + src/core/commandsSync.ts (slash registration via poise).

use crate::{commands, config::Config, db::Pool};
use poise::serenity_prelude as serenity;
use std::sync::Arc;

pub struct Data {
    pub pool: Pool,
    pub config: Arc<Config>,
    pub cooldowns: std::sync::Mutex<crate::executor::Cooldowns>,
    pub rate_limits: std::sync::Mutex<crate::executor::RateLimits>,
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
}

pub async fn run(cfg: Config, pool: Pool) -> anyhow::Result<()> {
    let token = crate::config::bot_token().ok_or_else(|| {
        anyhow::anyhow!("missing BOT_TOKEN env (mirrors config.discord.token fallback)")
    })?;

    let cfg = Arc::new(cfg);
    let pool_fw = pool.clone();
    let cfg_fw = cfg.clone();

    let framework = poise::Framework::builder()
        .options(poise::FrameworkOptions {
            commands: commands::all(),
            command_check: Some(global_check),
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
        .setup(|ctx, _ready, framework| {
            Box::pin(async move {
                poise::builtins::register_globally(ctx, &framework.options().commands).await?;
                tracing::info!("slash commands synced");
                Ok(Data {
                    pool: pool_fw.clone(),
                    config: cfg_fw.clone(),
                    cooldowns: std::sync::Mutex::new(crate::executor::Cooldowns::default()),
                    rate_limits: std::sync::Mutex::new(crate::executor::RateLimits::default()),
                })
            })
        })
        .build();

    let mut cache_settings = serenity::Settings::default();
    cache_settings.max_messages = 100;
    // Slash-command file log (mirrors loggerX in slashCommandLogger.ts).
    let slashlog = crate::slashlog::SlashLog::new(crate::slashlog::SlashLog::default_path());
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

    // Sharding mirrors ShardingManager in src/index.ts. TOTAL_SHARDS env
    // override takes priority, same as TS.
    if let Some(total) = crate::config::Config::default().total_shards {
        let _ = total;
    }

    tracing::info!("connecting gateway (autosharded)");
    match client.start_autosharded().await {
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
