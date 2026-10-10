use super::*;
use super::{
    channel::ranks_channel,
    config::ranks_config,
    greset::ranks_greset,
    ignore_channels::{ranks_ignore_add, ranks_ignore_list},
    leaderboard::ranks_leaderboard,
    message::ranks_msg,
    roles::{ranks_role_add, ranks_role_list, ranks_role_remove},
    show::ranks_show,
    ureset::ranks_ureset,
};

/// Subcommand for ranks category!
#[poise::command(
    slash_command,
    prefix_command,
    category = "ranks",
    rename = "ranks",
    subcommands(
        "ranks_show",
        "ranks_leaderboard",
        "ranks_config",
        "ranks_channel",
        "ranks_ureset",
        "ranks_greset",
        "ranks_ignore_add",
        "ranks_ignore_list",
        "ranks_msg",
        "ranks_role_add",
        "ranks_role_list",
        "ranks_role_remove"
    ),
    subcommand_required
)]
pub async fn ranks(_ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    Ok(())
}
