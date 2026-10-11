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
    subcommand_required,
    description_localized("fr", "Définir quelque chose/comportements dans le bot!"),
    description_localized("ja", "ボット内の何か/行動を設定！"),
    description_localized("ru", "Установить что-либо в боте!"),
    description_localized("es-ES", "Establecer algo/comportamientos en el bot!")
)]
pub async fn gc_bot(_ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    Ok(())
}
