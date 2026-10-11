use super::*;

use super::prefix::gc_prefix;

/// Bot settings for this guild.
// Mirrors the TS `guildconfig` SlashCommand `bot` SubcommandGroup
// (`guildconfig.ts`: `bot prefix`).
#[poise::command(
    slash_command,
    prefix_command,
    category = "guildconfig",
    rename = "bot",
    subcommands("gc_prefix"),
    subcommand_required
)]
pub async fn gc_bot(_ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    Ok(())
}
