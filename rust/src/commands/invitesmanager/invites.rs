use super::*;
use super::{
    addinvites::inv_add, leaderboard::inv_lb, removeinvites::inv_remove, reset::inv_reset,
    see::inv_see,
};

/// Subcommand for invites manager category!
// TS order (`invites.ts:39-213`): addinvites, leaderboard, invites,
// reset, removeinvites.
#[poise::command(
    slash_command,
    prefix_command,
    category = "invitemanager",
    rename = "inv",
    subcommands("inv_add", "inv_lb", "inv_see", "inv_reset", "inv_remove"),
    subcommand_required,
    description_localized("fr", "Commande sous-groupé pour la catégorie d'InviteManager"),
    description_localized("ja", "招待管理カテゴリのサブコマンド！"),
    description_localized("ru", "Подкоманда для категории управления приглашениями!"),
    description_localized("es-ES", "Subcomando para la categoría de gestor de invitaciones!")
)]
pub async fn inv(_ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    Ok(())
}
