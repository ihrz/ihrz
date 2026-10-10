use super::*;
use super::{channel::pfps_channel, config::pfps_config};

/// Subcommand for pfps category!
#[poise::command(
    slash_command,
    prefix_command,
    category = "pfps",
    rename = "pfps",
    subcommands("pfps_channel", "pfps_config"),
    subcommand_required
)]
pub async fn pfps(_ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    Ok(())
}
