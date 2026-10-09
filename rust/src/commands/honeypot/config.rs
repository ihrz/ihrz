use super::*;
use poise::serenity_prelude as serenity;

#[poise::command(slash_command, prefix_command, rename = "config")]
pub async fn honeypot_config(
    ctx: Ctx<'_>,
    #[description = "on or off"] action: String,
    #[description = "Channel for the lure"]
    #[channel_types("Text")]
    channel: Option<serenity::GuildChannel>,
) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let enabled = matches!(action.to_ascii_lowercase().as_str(), "on" | "power on");
    let channel_id = channel
        .as_ref()
        .map(|c| c.id.get().to_string())
        .unwrap_or_default();
    let mention = channel
        .as_ref()
        .map(|c| format!("<#{}>", c.id.get()))
        .unwrap_or_default();
    let cfg = serde_json::json!({
        "enabled": enabled,
        "channelId": channel_id,
    });
    save_honeypot(&ctx.data().pool, &gid, &cfg).await?;
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    ctx.say(if enabled {
        crate::lang::get(&code, "honeypot_config_enable_success")
            .map(|s| s.replace("${channel}", &mention))
            .unwrap_or_else(|| format!("Honeypot is now enabled in {mention}."))
    } else {
        crate::lang::get(&code, "honeypot_config_disable_success")
            .unwrap_or_else(|| "Honeypot is now disabled.".to_string())
    })
    .await?;
    Ok(())
}
