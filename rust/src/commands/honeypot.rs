// iHorizon Discord Bot (https://gitlab.com/ihrz/ihrz)
// Licensed under CC-BY-NC-SA-4.0.
// Mirrors src/Interaction/SlashCommands/honeypot/* (config) +
// honeypotManager lure trigger (simplified single-pass).
//
// TS keys: GUILD.HONEYPOT {enabled, channelId}. TS runs two passes
// (1500ms + 8000ms) in a 2h window; the Rust port bans on lure claim
// after a 2s grace delay. Custom_id: honeypot-claim.

use crate::bot::Ctx;
use poise::serenity_prelude as serenity;

pub const HONEYPOT_CUSTOM_ID: &str = "honeypot-claim";

pub fn honeypot_key() -> &'static str {
    "GUILD.HONEYPOT"
}

#[poise::command(
    slash_command,
    prefix_command,
    category = "honeypot",
    rename = "honeypot",
    subcommands("honeypot_config", "honeypot_post"),
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn honeypot(_ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    Ok(())
}

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
    crate::db::kv_set(&ctx.data().pool, &gid, honeypot_key(), &cfg.to_string()).await?;
    ctx.say(if enabled {
        "Honeypot on."
    } else {
        "Honeypot off."
    })
    .await?;
    Ok(())
}

#[poise::command(slash_command, prefix_command, rename = "post")]
pub async fn honeypot_post(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    let button = serenity::CreateButton::new(HONEYPOT_CUSTOM_ID)
        .label("Claim free nitro")
        .style(serenity::ButtonStyle::Danger);
    ctx.channel_id()
        .send_message(
            ctx.http(),
            serenity::CreateMessage::new()
                .content("Limited offer, be quick!")
                .button(button),
        )
        .await?;
    Ok(())
}

/// Lure claim handler: grace delay, then ban if still enabled.
pub async fn handle_honeypot_claim(
    ctx: &serenity::Context,
    comp: &serenity::ComponentInteraction,
    pool: &crate::db::Pool,
) -> anyhow::Result<()> {
    let Some(guild_id) = comp.guild_id else {
        return Ok(());
    };
    let gid = guild_id.get().to_string();
    let enabled: bool = crate::db::kv_get(pool, &gid, honeypot_key())
        .await
        .and_then(|s| serde_json::from_str::<serde_json::Value>(&s).ok())
        .and_then(|v| v.get("enabled").and_then(|e| e.as_bool()))
        .unwrap_or(false);
    if !enabled {
        return Ok(());
    }
    let user_id = comp.user.id;
    comp.create_response(
        &ctx.http,
        serenity::CreateInteractionResponse::Message(
            serenity::CreateInteractionResponseMessage::new()
                .content("Checking...")
                .ephemeral(true),
        ),
    )
    .await?;
    let http = ctx.http.clone();
    tokio::spawn(async move {
        tokio::time::sleep(std::time::Duration::from_secs(2)).await;
        let _ = guild_id.ban(&http, user_id, 0).await;
    });
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn key_shape() {
        assert_eq!(honeypot_key(), "GUILD.HONEYPOT");
    }
}
