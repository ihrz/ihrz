use super::*;
use super::{
    channel::ranks_channel, config::ranks_config, greset::ranks_greset,
    ignore_channels::ranks_ignore_channels, leaderboard::ranks_leaderboard, message::ranks_msg,
    roles::ranks_roles, show::ranks_show, ureset::ranks_ureset,
};

/// Subcommand for ranks category!
// TS order (`ranks.ts:42-372`): roles, config, show, ureset, greset,
// channel, leaderboard, ignore-channels, message.
#[poise::command(
    slash_command,
    prefix_command,
    category = "ranks",
    rename = "ranks",
    subcommands(
        "ranks_roles",
        "ranks_config",
        "ranks_show",
        "ranks_ureset",
        "ranks_greset",
        "ranks_channel",
        "ranks_leaderboard",
        "ranks_ignore_channels",
        "ranks_msg"
    ),
    subcommand_required,
    description_localized("fr", "Commande sous-groupé pour la catégorie de niveau (message)"),
    description_localized("ja", "ランクカテゴリのサブコマンド！"),
    description_localized("ru", "Подкоманда для категории рангов!"),
    description_localized("es-ES", "Subcomando para la categoría de rangos!")
)]
pub async fn ranks(_ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    Ok(())
}
