use super::*;
use super::{
    channel_stats::stats_channel, compare::stats_compare, gstats::stats_guild,
    top_messages::stats_top_messages, top_voice::stats_top_voice, ustats::stats_user,
};

/// Subcommand for stats category!
#[poise::command(
    slash_command,
    prefix_command,
    category = "stats",
    rename = "stats",
    subcommands(
        "stats_user",
        "stats_compare",
        "stats_guild",
        "stats_top_messages",
        "stats_top_voice",
        "stats_channel"
    ),
    subcommand_required
)]
pub async fn stats(_ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    Ok(())
}
