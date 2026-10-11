use super::*;

use super::{blockbot::gc_blockbot, tonew::gc_toonew};

/// Block/protect behaviours in this guild.
// Mirrors the TS `guildconfig` SlashCommand `block` SubcommandGroup
// (`guildconfig.ts`: `block bot`, `block too-new-account`).
#[poise::command(
    slash_command,
    prefix_command,
    category = "guildconfig",
    rename = "block",
    subcommands("gc_blockbot", "gc_toonew"),
    subcommand_required
)]
pub async fn gc_block(_ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    Ok(())
}
