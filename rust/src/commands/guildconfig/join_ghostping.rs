use super::*;

use super::{ghost::gc_ghost_add, ghost::gc_ghost_list, ghost::gc_ghost_remove};

/// Join ghostping channel list.
// Mirrors the TS `join-ghostping` SlashCommand
// (`SlashCommands/guildconfig/join-ghostping/`: `channel add`,
// `channel remove`); `ghost-list` is the Rust-side reader with
// no TS slash home, kept beside its siblings.
#[poise::command(
    slash_command,
    prefix_command,
    category = "guildconfig",
    rename = "join-ghostping",
    subcommands("gc_ghost_add", "gc_ghost_remove", "gc_ghost_list"),
    subcommand_required
)]
pub async fn gc_join_ghostping(_ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    Ok(())
}
