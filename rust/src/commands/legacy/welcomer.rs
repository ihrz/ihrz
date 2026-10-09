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
    let raw = crate::commands::owner::main::routed_get(
        &ctx.data().pool,
        &gid,
        &gid,
        "GUILD.GUILD_CONFIG",
    )
    .await;
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
    crate::commands::owner::main::routed_set(
        &ctx.data().pool,
        &gid,
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
