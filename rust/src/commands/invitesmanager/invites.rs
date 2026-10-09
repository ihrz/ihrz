use super::*;
use super::{
    addinvites::inv_add, leaderboard::inv_lb, removeinvites::inv_remove, reset::inv_reset,
    see::inv_see,
};

#[poise::command(
    slash_command,
    prefix_command,
    category = "invitemanager",
    rename = "inv",
    subcommands("inv_see", "inv_add", "inv_remove", "inv_lb", "inv_reset")
)]
pub async fn inv(_ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    Ok(())
}
