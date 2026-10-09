use super::*;

#[poise::command(
    slash_command,
    prefix_command,
    category = "starboard",
    rename = "skullboard",
    subcommands("skull_config", "skull_channel", "skull_threshold", "skull_thread"),
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn skullboard(_ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    Ok(())
}

board_subs!(
    "skullboard",
    skull_config,
    skull_channel,
    skull_threshold,
    skull_thread
);
