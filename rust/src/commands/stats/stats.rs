use super::*;
use super::{
    channel_stats::stats_channel, compare::stats_compare, gstats::stats_guild,
    top_messages::stats_top_messages, top_voice::stats_top_voice, ustats::stats_user,
};

/// Subcommand for stats category!
// TS order (`stats.ts:39-330`): ustats, gstats, top-messages,
// top-voice, compare, channel-stats (`reset` is commented out at
// stats.ts:330-352, not registered).
#[poise::command(
    slash_command,
    prefix_command,
    category = "stats",
    rename = "stats",
    subcommands(
        "stats_user",
        "stats_guild",
        "stats_top_messages",
        "stats_top_voice",
        "stats_compare",
        "stats_channel"
    ),
    subcommand_required,
    description_localized(
        "fr",
        "Commande sous-groupé pour la catégorie des statistique des utilisateurs!"
    ),
    description_localized("ja", "統計カテゴリのサブコマンド！"),
    description_localized("ru", "Подкоманда для категории статистики!"),
    description_localized("es-ES", "Subcomando para la categoría de estadísticas!")
)]
pub async fn stats(_ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    Ok(())
}
