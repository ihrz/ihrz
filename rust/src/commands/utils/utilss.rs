use super::*;

use super::voice::renewvc;

/// Run-less group root. Mirrors the TS `utilss` command.
// (src/Interaction/HybridCommands/utils/utilss/utilss.ts).
#[poise::command(
    slash_command,
    prefix_command,
    category = "utils",
    rename = "utilss",
    subcommands("renewvc"),
    subcommand_required,
    description_localized("fr", "Commande sous groupé pour la catégorie utilitaire"),
    description_localized("ja", "ユーティリティコマンドのサブコマンドカテゴリ"),
    description_localized("ru", "Категория подкоманд для утилит"),
    description_localized("es-ES", "Categoría de subcomando para comandos de utilidad")
)]
pub async fn utilss(_ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    Ok(())
}
