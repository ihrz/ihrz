use super::*;

use super::{restore::gc_config_restore, save::gc_config_save, show::gc_show};

/// Subcommand for iHorizon's guild config restore/save
// Mirrors the TS `guildconfig` SlashCommand `config` SubcommandGroup
// (`guildconfig.ts`: `config show`, `config restore`, `config save`).
#[poise::command(
    slash_command,
    prefix_command,
    category = "guildconfig",
    rename = "config",
    subcommands("gc_show", "gc_config_restore", "gc_config_save"),
    subcommand_required,
    description_localized(
        "fr",
        "Sous commande pour la réstauration/sauvegarde des configurations d'iHorizon"
    ),
    description_localized("ja", "iHorizonのサーバー設定の復元/保存用サブコマンド"),
    description_localized("ru", "Подкоманда для сохранения/восстановления конфигурации iHorizon"),
    description_localized(
        "es-ES",
        "Subcomando para restaurar/guardar la configuración del servidor de iHorizon"
    )
)]
pub async fn gc_config(_ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    Ok(())
}
