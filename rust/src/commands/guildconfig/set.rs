use super::*;

use super::{
    joindm::gc_joindm, joinrole::gc_joinrole, welcomer::gc_wc_channel, welcomer::gc_wc_components,
    welcomer::gc_wc_embed, welcomer::gc_wc_panel, welcomer::gc_wc_text,
};

/// Welcomer module settings.
// Mirrors the TS `guildconfig` SlashCommand `set` SubcommandGroup
// (`guildconfig.ts`: `set welcomer`). The `wc_*` leaves plus
// `joindm`/`joinrole` are the Rust split of that welcomer surface
// (TS homes are the `welcomerPanel` buttons / prefix flows, so they
// have no standalone slash home).
#[poise::command(
    slash_command,
    prefix_command,
    category = "guildconfig",
    rename = "set",
    subcommands(
        "gc_wc_channel",
        "gc_wc_embed",
        "gc_wc_text",
        "gc_wc_components",
        "gc_wc_panel",
        "gc_joindm",
        "gc_joinrole"
    ),
    subcommand_required
)]
pub async fn gc_set(_ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    Ok(())
}
