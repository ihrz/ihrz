use super::*;

use super::channels::{chan_hide, chan_hideall, chan_unhide, chan_unhideall};

/// Channel operating commands
// (src/Interaction/HybridCommands/utils/chanel/channel.ts).
#[poise::command(
    slash_command,
    prefix_command,
    category = "utils",
    rename = "channel",
    default_member_permissions = "ADMINISTRATOR",
    subcommands("chan_hide", "chan_unhide", "chan_unhideall", "chan_hideall"),
    subcommand_required,
    name_localized("fr", "channel"),
    name_localized("ja", "channel"),
    name_localized("ru", "channel"),
    name_localized("es-ES", "channel"),
    description_localized("fr", "Commandes d'opérations pour salons"),
    description_localized("ja", "チャンネル操作コマンド"),
    description_localized("ru", "Команды управления каналами"),
    description_localized("es-ES", "Comandos de operación de canales")
)]
pub async fn channel(_ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    Ok(())
}
