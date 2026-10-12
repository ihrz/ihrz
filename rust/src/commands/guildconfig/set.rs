use super::*;

use super::{
    joindm::gc_joindm, joinrole::gc_joinrole, welcomer::gc_wc_channel, welcomer::gc_wc_components,
    welcomer::gc_wc_embed, welcomer::gc_wc_panel, welcomer::gc_wc_text, welcomer::gc_welcomer,
};

/// Set someting/behaviours into this guild!
// Mirrors the TS `guildconfig` SlashCommand `set` SubcommandGroup
// (`guildconfig.ts`: `set welcomer` — no options, Administrator;
// `someting` typo kept verbatim). `gc_welcomer` is that TS-exact
// leaf (delegates to the `wc-panel` summary); the `wc_*` leaves plus
// `joindm`/`joinrole` are the Rust split of that welcomer surface
// (TS homes are the `welcomerPanel` buttons / prefix flows, so they
// have no standalone slash home).
#[poise::command(
    slash_command,
    prefix_command,
    category = "guildconfig",
    rename = "set",
    subcommands(
        "gc_welcomer",
        "gc_wc_channel",
        "gc_wc_embed",
        "gc_wc_text",
        "gc_wc_components",
        "gc_wc_panel",
        "gc_joindm",
        "gc_joinrole"
    ),
    subcommand_required,
    description_localized("fr", "Définir quelque chose/comportements dans ce serveur"),
    description_localized("ja", "このサーバー内の何か/行動を設定！"),
    description_localized("ru", "Установить что-либо на этом сервере!"),
    description_localized("es-ES", "Establecer algo/comportamientos en este servidor!")
)]
pub async fn gc_set(_ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    Ok(())
}
