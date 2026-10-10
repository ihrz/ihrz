use super::*;
use super::{config::lastfm_config, login::lastfm_login, status::lastfm_status};

/// Subcommand for lastfm category!
#[poise::command(
    slash_command,
    prefix_command,
    category = "lastfm",
    rename = "lastfm",
    subcommands("lastfm_login", "lastfm_config", "lastfm_status"),
    subcommand_required
)]
pub async fn lastfm(_ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    Ok(())
}
