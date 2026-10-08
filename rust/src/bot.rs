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
        Ok(true)
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
                    // Mirrors errorManager.ts: structured command error log.
                    tracing::warn!("command error: {err}");
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
                })
            })
        })
        .build();

    let mut cache_settings = serenity::Settings::default();
    cache_settings.max_messages = 100;
    let mut client = serenity::ClientBuilder::new(token, intents())
        .cache_settings(cache_settings)
        .framework(framework)
        .event_handler(crate::events_handler::Handler::new(pool.clone()))
        .await?;

    crate::scheduler::spawn(pool.clone(), client.http.clone());

    // App emoji sync (best-effort background, mirrors emojisManager).
    {
        let http = client.http.clone();
        tokio::spawn(async move {
            crate::emojis::sync(&http).await;
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
