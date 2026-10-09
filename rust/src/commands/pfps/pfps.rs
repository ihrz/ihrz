use super::*;
use super::{channel::pfps_channel, config::pfps_config};

#[poise::command(
    slash_command,
    prefix_command,
    category = "pfps",
    rename = "pfps",
    subcommands("pfps_channel", "pfps_config")
)]
pub async fn pfps(_ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    Ok(())
}
