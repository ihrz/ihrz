use super::*;

/// Custom the bot profile in your discord server.
#[poise::command(
    slash_command,
    prefix_command,
    category = "bot",
    rename = "custom",
    subcommands("custom_name", "custom_avatar", "custom_banner", "custom_bio")
)]
pub async fn custom(_ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    // Paywall OFF. Mirrors commandExecutor.ts:405-406, where the
    // checkCustomSdkGate call is commented out ("Anais disabled that
    // paywall"), so the bare parent allows everyone and both sides
    // agree. Subcommands stay exempt as before; custom_sdk_gate in
    // mod.rs is kept for a future re-enable, just not called.
    Ok(())
}

pub use super::avatar::custom_avatar;
pub use super::banner::custom_banner;
pub use super::bio::custom_bio;
pub use super::name::custom_name;
