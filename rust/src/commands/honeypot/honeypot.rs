use super::*;
use super::{config::honeypot_config, post::honeypot_post};

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
