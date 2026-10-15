use super::*;

use super::welcomer::gc_welcomer;

/// Set someting/behaviours into this guild!
// Mirrors the TS `guildconfig` SlashCommand `set` SubcommandGroup
// (`guildconfig.ts:227-259`: single `welcomer` leaf — no options,
// Administrator; `someting` typo kept verbatim). `gc_welcomer` is
// that TS-exact leaf. The `joindm` / `joinrole` atomic setters had no
// TS command home (state surface is the `welcomerPanel` buttons /
// prefix flows) and no registry entry, so they were removed for
// exactness; the slash surface matches TS exactly.
#[poise::command(
    slash_command,
    prefix_command,
    category = "guildconfig",
    rename = "set",
    subcommands("gc_welcomer"),
    subcommand_required,
    description_localized("fr", "Définir quelque chose/comportements dans ce serveur"),
    description_localized("ja", "このサーバー内の何か/行動を設定！"),
    description_localized("ru", "Установить что-либо на этом сервере!"),
    description_localized("es-ES", "Establecer algo/comportamientos en este servidor!")
)]
pub async fn gc_set(_ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    Ok(())
}
