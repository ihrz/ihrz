use super::interface::vd_interface;
use super::*;

/// Subcommand group for voice's manager
#[poise::command(
    slash_command,
    prefix_command,
    category = "voicedashboard",
    rename = "voice",
    subcommands("vd_interface"),
    subcommand_required,
    description_localized("fr", "Commande sous-groupé pour la gestion de canaux vocaux"),
    description_localized("ja", "ボイス管理のサブコマンドグループ"),
    description_localized("ru", "Группа подкоманд для управления голосом"),
    description_localized("es-ES", "Grupo de subcomando para el gestor de voz")
)]
pub async fn voicedashboard(_ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    Ok(())
}
