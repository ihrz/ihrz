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
    subcommand_required,
    name_localized("fr", "unbanall"),
    name_localized("ja", "unban-all"),
    name_localized("ru", "unban-all"),
    name_localized("es-ES", "unban-all"),
    description_localized("fr", "Action de masse pour débannir"),
    description_localized("ja", "一斉バン解除アクション"),
    description_localized("ru", "Массовое действие по разбану"),
    description_localized("es-ES", "Acción masiva sobre desbaneo")
)]
pub async fn unbanall(_ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    Ok(())
}
