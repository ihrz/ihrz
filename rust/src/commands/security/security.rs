use super::*;
use super::{
    channel::security_channel, config::security_config, role_to_give::security_give,
    role_to_remove::security_remove,
};

/// Subcommand for security category!
#[poise::command(
    slash_command,
    prefix_command,
    category = "security",
    rename = "security",
    subcommands(
        "security_channel",
        "security_config",
        "security_give",
        "security_remove"
    ),
    subcommand_required
)]
pub async fn security(_ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    Ok(())
}
