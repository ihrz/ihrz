use super::*;

/// Custom the bot profile in your discord server.
#[poise::command(
    slash_command,
    prefix_command,
    category = "bot",
    rename = "custom",
    subcommands("custom_name", "custom_avatar", "custom_banner", "custom_bio")
)]
pub async fn custom(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    // Container only (mirrors custom.ts); the paywall lives on the
    // bare parent, subcommands are exempt like checkCustomSdkGate.
    if !custom_sdk_gate(&ctx).await {
        return Ok(());
    }
    Ok(())
}

pub use super::avatar::custom_avatar;
pub use super::banner::custom_banner;
pub use super::bio::custom_bio;
pub use super::name::custom_name;
