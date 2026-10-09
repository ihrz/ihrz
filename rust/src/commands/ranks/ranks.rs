use super::*;
use super::{
    channel::{ranks_channel, ranks_xp_channels},
    config::ranks_config,
    greset::ranks_greset,
    ignore_channels::{ranks_ignore_add, ranks_ignore_list},
    leaderboard::ranks_leaderboard,
    message::ranks_msg,
    roles::{ranks_role_add, ranks_role_list},
    show::ranks_show,
    ureset::ranks_ureset,
};

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
        "ranks_xp_channels"
    )
)]
pub async fn ranks(_ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    Ok(())
}
