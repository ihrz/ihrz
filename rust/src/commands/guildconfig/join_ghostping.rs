use super::*;

use super::{ghost::gc_ghost_add, ghost::gc_ghost_list, ghost::gc_ghost_remove};

/// Channel manipulation for the Join GhostPing Module.
// Mirrors the TS `join-ghostping` SlashCommand `channel`
// SubcommandGroup (`join-ghostping.ts:43-53`): a nested poise
// command with subcommands renders as a SubcommandGroup on
// Discord, so add/remove sit at `/join-ghostping channel <add|remove>`
// exactly like TS. `ghost-list` is the Rust-side reader with no TS
// slash home, kept prefix-only beside its siblings.
#[poise::command(
    slash_command,
    prefix_command,
    category = "guildconfig",
    rename = "channel",
    subcommands("gc_ghost_add", "gc_ghost_remove"),
    subcommand_required,
    description_localized("fr", "Manipulation de salons pour le module Join GhostPing"),
    description_localized("ja", "Join GhostPingモジュールのチャンネル操作"),
    description_localized("ru", "Управление каналами для модуля Join GhostPing"),
    description_localized("es-ES", "Manipulación de canales para el módulo Join GhostPing")
)]
pub async fn gc_ghost_channel(_ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    Ok(())
}

/// Join ghostping channel list.
// Mirrors the TS `join-ghostping` SlashCommand
// (`SlashCommands/guildconfig/join-ghostping/join-ghostping.ts`);
// the only slash child is the `channel` group above.
#[poise::command(
    slash_command,
    prefix_command,
    category = "guildconfig",
    rename = "join-ghostping",
    subcommands("gc_ghost_channel", "gc_ghost_list"),
    subcommand_required,
    description_localized(
        "fr",
        "Commande sous-groupé pour la catégorie de configuration du serveur"
    ),
    description_localized("ja", "サーバー設定カテゴリのサブコマンド！"),
    description_localized("ru", "Подкоманда для категории настройки сервера!"),
    description_localized("es-ES", "Subcomando para la categoría de configuración del servidor!")
)]
pub async fn gc_join_ghostping(_ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    Ok(())
}
