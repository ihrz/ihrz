use super::*;
use super::{
    channel::confession_channel, config::confession_config, cooldown::confession_cooldown,
    list::confession_list, thread::confession_thread,
};

#[poise::command(
    slash_command,
    prefix_command,
    category = "confession",
    rename = "confession",
    subcommands(
        "confession_channel",
        "confession_config",
        "confession_thread",
        "confession_cooldown",
        "confession_list"
    )
)]
pub async fn confession(_ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    Ok(())
}
