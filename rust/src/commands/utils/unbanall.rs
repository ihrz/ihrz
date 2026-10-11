use super::*;

use super::admin::{unban_all, unban_undo};

/// Run-less group root. Mirrors the TS `unban-all` command.
// (src/Interaction/HybridCommands/utils/unbanall/unbanall.ts).
#[poise::command(
    slash_command,
    prefix_command,
    category = "utils",
    rename = "unban-all",
    default_member_permissions = "ADMINISTRATOR",
    subcommands("unban_all", "unban_undo"),
    subcommand_required
)]
pub async fn unbanall(_ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    Ok(())
}
