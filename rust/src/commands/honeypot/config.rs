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
    let cfg = serde_json::json!({
        "enabled": enabled,
        "channelId": channel.map(|c| c.id.get().to_string()).unwrap_or_default(),
    });
    save_honeypot(&ctx.data().pool, &gid, &cfg).await?;
    ctx.say(if enabled {
        "Honeypot on."
    } else {
        "Honeypot off."
    })
    .await?;
    Ok(())
}
