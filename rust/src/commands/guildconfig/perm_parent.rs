use super::*;

use super::perm::{
    gc_perm_change, gc_perm_delete, gc_perm_delete_all, gc_perm_list, gc_perm_list_all,
    gc_perm_reset, gc_perm_roles_create, gc_perm_roles_edit, gc_perm_set, gc_perm_user,
};

/// Command permission settings.
// Mirrors the TS `perm` SlashCommand
// (`SlashCommands/guildconfig/perm/perm.ts`: `set-user`, `command`,
// `list`, `edit-roles`, `create-roles`); the Rust leaves split
// `command` into its per-action rows.
#[poise::command(
    slash_command,
    prefix_command,
    category = "guildconfig",
    rename = "perm",
    subcommands(
        "gc_perm_set",
        "gc_perm_user",
        "gc_perm_list",
        "gc_perm_reset",
        "gc_perm_change",
        "gc_perm_delete",
        "gc_perm_list_all",
        "gc_perm_delete_all",
        "gc_perm_roles_create",
        "gc_perm_roles_edit"
    ),
    subcommand_required
)]
pub async fn gc_perm(_ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    Ok(())
}
