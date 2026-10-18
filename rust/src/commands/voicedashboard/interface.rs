use super::*;
use super::{
    category::vd_category, lobby::vd_lobby, name::vd_name, panel::vd_panel, position::vd_position,
    staff::vd_staff,
};

/// Manage voice's interface
// Mirrors the TS `interface` SubcommandGroup (voicedashboard.ts:36-54).
#[poise::command(
    slash_command,
    prefix_command,
    category = "voicedashboard",
    rename = "interface",
    subcommands(
        "vd_lobby",
        "vd_panel",
        "vd_category",
        "vd_name",
        "vd_position",
        "vd_staff"
    ),
    subcommand_required,
    name_localized("fr", "gérer"),
    name_localized("ja", "interface"),
    name_localized("ru", "interface"),
    name_localized("es-ES", "interface"),
    description_localized("fr", "Gérer les interfaces de créations de canaux vocaux"),
    description_localized("ja", "ボイスインターフェースを管理"),
    description_localized("ru", "Управление голосовым интерфейсом"),
    description_localized("es-ES", "Gestionar la interfaz de voz")
)]
pub async fn vd_interface(_ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    Ok(())
}
