use super::*;

use super::{restore::gc_config_restore, save::gc_config_save, show::gc_show};

/// Guild config save/show/restore.
// Mirrors the TS `guildconfig` SlashCommand `config` SubcommandGroup
// (`guildconfig.ts`: `config show`, `config restore`, `config save`).
#[poise::command(
    slash_command,
    prefix_command,
    category = "guildconfig",
    rename = "config",
    subcommands("gc_show", "gc_config_restore", "gc_config_save"),
    subcommand_required
)]
pub async fn gc_config(_ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    Ok(())
}
