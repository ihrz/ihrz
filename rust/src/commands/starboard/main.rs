use super::*;

#[poise::command(
    slash_command,
    prefix_command,
    category = "starboard",
    rename = "starboard",
    subcommands(
        "starboard_config",
        "starboard_channel",
        "starboard_threshold",
        "starboard_thread"
    ),
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn starboard(_ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    Ok(())
}

board_subs!(
    "starboard",
    starboard_config,
    starboard_channel,
    starboard_threshold,
    starboard_thread
);
