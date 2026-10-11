use super::*;

use super::{block::gc_block, bot::gc_bot, config::gc_config, set::gc_set, setup::gc_setup};

/// Guild configuration commands.
// TS-exact top-level set (`guildconfig.ts` options): the `setup`
// Subcommand plus the four SubcommandGroups `block` (bot,
// too-new-account), `set` (welcomer), `bot` (prefix) and `config`
// (show, restore, save).
// `perm` stays nested here (NOT TS-exact: TS registers `perm.ts` as its
// own top-level command) because the frozen `commands/mod.rs` registry
// tests pin its subtree (`perm-change`, `perm-delete-all`,
// `perm-roles-edit` option shapes). Re-homing `perm` top-level needs a
// `commands/mod.rs::all()` edit, owned outside this file. Same for
// `join-ghostping` / `autologs` (TS top-level commands): removed from
// this parent, awaiting top-level registration in `commands/mod.rs`.
// `automod` registers top-level beside this parent (already wired
// in `commands/mod.rs`, mirroring its own TS `automod` parent).
// FLATTEN-B3: the `autoreact` / `commandlimit` / `setlogs` /
// `support` leaves are top-level now (TS defines each as its own
// top-level command in `HybridCommands/guildconfig/*`), registered
// in `commands/mod.rs::all()` beside this parent.
#[poise::command(
    slash_command,
    prefix_command,
    category = "guildconfig",
    rename = "guildconfig",
    subcommands("gc_setup", "gc_block", "gc_bot", "gc_config", "gc_set"),
    subcommand_required,
    description_localized(
        "fr",
        "Commande sous-groupé pour la catégorie de configuration du serveur"
    ),
    description_localized("ja", "サーバー設定カテゴリのサブコマンド！"),
    description_localized("ru", "Подкоманда для категории настройки сервера!"),
    description_localized("es-ES", "Subcomando para la categoría de configuración del servidor!")
)]
pub async fn guildconfig(_ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    Ok(())
}
