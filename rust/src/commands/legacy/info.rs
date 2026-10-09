use super::*;

/// Welcomer config (GUILD.GUILD_CONFIG join/leave keys).
#[poise::command(slash_command, prefix_command, category = "utils", rename = "welcomer")]
pub async fn welcomer(
    ctx: Ctx<'_>,
    #[description = "Join channel"]
    #[channel_types("Text")]
    channel: Option<serenity::GuildChannel>,
    #[description = "Join message ({user} {server} {memberCount})"] message: Option<String>,
    #[description = "Leave channel"]
    #[channel_types("Text")]
    leave_channel: Option<serenity::GuildChannel>,
    #[description = "Leave message"] leave_message: Option<String>,
) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let raw = crate::db::kv_get(&ctx.data().pool, &gid, "GUILD.GUILD_CONFIG").await;
    let mut cfg: serde_json::Value = raw
        .and_then(|s| serde_json::from_str(&s).ok())
        .unwrap_or(serde_json::json!({}));
    if let Some(ch) = channel {
        cfg["join"] = serde_json::Value::String(ch.id.get().to_string());
    }
    if let Some(m) = message {
        cfg["joinmessage"] = serde_json::Value::String(m);
    }
    if let Some(ch) = leave_channel {
        cfg["leave"] = serde_json::Value::String(ch.id.get().to_string());
    }
    if let Some(m) = leave_message {
        cfg["leavemessage"] = serde_json::Value::String(m);
    }
    crate::db::kv_set(
        &ctx.data().pool,
        &gid,
        "GUILD.GUILD_CONFIG",
        &cfg.to_string(),
    )
    .await?;
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    ctx.say(
        crate::lang::get(&code, "msg_welcomer_updated")
            .unwrap_or_else(|| "Welcomer updated.".to_string()),
    )
    .await?;
    Ok(())
}

/// Changelog display. Mirrors @updates.ts (repo CHANGELOG.md).
#[poise::command(slash_command, prefix_command, category = "utils", rename = "updates")]
pub async fn updates(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    ctx.say(format!(
        "iHorizon Rust v{} — see /help.",
        env!("CARGO_PKG_VERSION")
    ))
    .await?;
    Ok(())
}

/// Shard info. Mirrors shardinfo.ts (cache-visible part).
#[poise::command(
    slash_command,
    prefix_command,
    category = "utils",
    rename = "shardinfo"
)]
pub async fn shardinfo(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    let guilds = ctx.cache().guild_count();
    ctx.say(format!("Guilds in cache: {guilds}.")).await?;
    Ok(())
}

/// Status embed. Mirrors status-embed.ts (local process status).
#[poise::command(
    slash_command,
    prefix_command,
    category = "utils",
    rename = "status-embed"
)]
pub async fn status_embed(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    let latency = ctx.ping().await.as_millis();
    let db_ms = crate::funcs::database_latency(&ctx.data().pool).await;
    let (mem_total, mem_free) = crate::funcs::system_memory_kb();
    let embed = serenity::CreateEmbed::default()
        .title("iHorizon status")
        .field("Latency", format!("{latency}ms"), true)
        .field("DB", format!("{db_ms}ms"), true)
        .field(
            "Memory",
            crate::funcs::nice_bytes((mem_total - mem_free.min(mem_total)) as f64),
            true,
        )
        .field("Version", env!("CARGO_PKG_VERSION"), true);
    ctx.send(poise::CreateReply::default().embed(embed)).await?;
    Ok(())
}

/// Language stats. Mirrors langstats.ts (loaded YAML key counts).
#[poise::command(
    slash_command,
    prefix_command,
    category = "utils",
    rename = "langstats"
)]
pub async fn langstats(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    let mut lines = vec![];
    for code in [
        "ar-EG", "de-DE", "en-US", "es-ES", "fr-FR", "fr-ME", "it-IT", "jp-JP", "pt-PT", "ru-RU",
    ] {
        let n = match crate::lang::table_for(code) {
            serde_yaml::Value::Mapping(m) => m.len(),
            _ => 0,
        };
        lines.push(format!("{code}: {n}"));
    }
    ctx.say(lines.join("\n")).await?;
    Ok(())
}

/// Create a webhook and return its URL. Mirrors securewebhook.ts.
#[poise::command(
    slash_command,
    prefix_command,
    category = "utils",
    rename = "securewebhook"
)]
pub async fn securewebhook(
    ctx: Ctx<'_>,
    #[description = "Channel"]
    #[channel_types("Text")]
    channel: serenity::GuildChannel,
    #[description = "Name"] name: Option<String>,
) -> Result<(), anyhow::Error> {
    let wh = channel
        .id
        .create_webhook(
            ctx.http(),
            serenity::CreateWebhook::new(name.unwrap_or_else(|| "iHorizon".to_string())),
        )
        .await?;
    let url = wh.url().unwrap_or_else(|_| "unavailable".to_string());
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    ctx.say(
        crate::lang::get(&code, "util_securewebhook_action_create_ok")
            .map(|s| {
                s.replace("${data.url}", &url)
                    .replace("${data.use}", &channel.name)
            })
            .unwrap_or_else(|| format!("Webhook: {url}")),
    )
    .await?;
    Ok(())
}
