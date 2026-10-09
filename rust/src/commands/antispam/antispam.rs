use super::*;
use super::{
    bypass_roles::as_bypass_roles, ignore_channels::as_ignore_channels, manage::as_config,
};

#[poise::command(
    slash_command,
    prefix_command,
    category = "antispam",
    rename = "antispam",
    subcommands("as_config", "as_bypass_roles", "as_ignore_channels")
)]
pub async fn antispam(_ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    Ok(())
}
