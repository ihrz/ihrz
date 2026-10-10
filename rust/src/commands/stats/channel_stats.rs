use super::*;

/// Channel stats aggregated from `STATS.USER` rows (text form).
///
/// Mirrors `!channel-stats.ts:49-91`: the optional `channel` option
/// falls back to the invoking channel (`interaction.channel`), never
/// to a top-10 list. Counts come from filtering every user's
/// `messages`/`voices` by `channelId` (`aggregate_channel`), not from
/// `STATS.CHANNEL` counters (TS has no such writer; see
/// `Events/stats/onNewMessage.ts`).
///
/// ACCURACY NOTE (deliberate, kept): TS renders the `channelStatsPage`
/// HTML card as a PNG via `client.func.html2png` (Chromium/gateway are
/// outside this runtime), so this port renders the same windows
/// (day/week/month/total), active-user count and top-5 users as text.
///
/// New YAML keys (not added; code fallbacks render until then):
/// `stats_channel_stats_text` (${channel}, ${d_msg}, ${w_msg},
/// ${m_msg}, ${total_msg}, ${d_vc}, ${w_vc}, ${m_vc}, ${total_vc},
/// ${active}, ${top_msg}, ${top_vc}).
#[poise::command(
    slash_command,
    prefix_command,
    rename = "channel-stats",
    aliases("cstats", "chstats")
)]
pub async fn stats_channel(
    ctx: Ctx<'_>,
    #[description = "Channel"] channel: Option<poise::serenity_prelude::GuildChannel>,
) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    // TS `!channel-stats.ts:52-68`: explicit option, else the invoking
    // channel (slash `interaction.channel`, prefix parsed-or-current).
    let target_id = channel
        .as_ref()
        .map(|c| c.id.get())
        .unwrap_or_else(|| ctx.channel_id().get());
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    let rows = load_all_user_stats(&ctx.data().pool, &gid).await;
    if rows.is_empty() {
        ctx.say(
            crate::lang::get(&code, "stats_no_data")
                .unwrap_or_else(|| "No statistics data available for this server.".to_string()),
        )
        .await?;
        return Ok(());
    }
    let now_ms = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_millis() as i64)
        .unwrap_or(0);
    let agg = aggregate_channel(&rows, target_id, now_ms);
    let top_msg = if agg.top_message_users.is_empty() {
        "-".to_string()
    } else {
        agg.top_message_users
            .iter()
            .enumerate()
            .map(|(i, (uid, n))| format!("{}. <@{uid}> — {n}", i + 1))
            .collect::<Vec<_>>()
            .join("\n")
    };
    let top_vc = if agg.top_voice_users.is_empty() {
        "-".to_string()
    } else {
        agg.top_voice_users
            .iter()
            .enumerate()
            .map(|(i, (uid, ms))| {
                format!("{}. <@{uid}> — {}", i + 1, beautiful_voice_ms(*ms, &code))
            })
            .collect::<Vec<_>>()
            .join("\n")
    };
    ctx.say(
        crate::lang::get(&code, "stats_channel_stats_text")
            .map(|t| {
                t.replace("${channel}", &target_id.to_string())
                    .replace("${d_msg}", &agg.daily_messages.to_string())
                    .replace("${w_msg}", &agg.weekly_messages.to_string())
                    .replace("${m_msg}", &agg.monthly_messages.to_string())
                    .replace("${total_msg}", &agg.total_messages.to_string())
                    .replace("${d_vc}", &beautiful_voice_ms(agg.daily_voice_ms, &code))
                    .replace("${w_vc}", &beautiful_voice_ms(agg.weekly_voice_ms, &code))
                    .replace("${m_vc}", &beautiful_voice_ms(agg.monthly_voice_ms, &code))
                    .replace("${total_vc}", &beautiful_voice_ms(agg.total_voice_ms, &code))
                    .replace("${active}", &agg.active_users.to_string())
                    .replace("${top_msg}", &top_msg)
                    .replace("${top_vc}", &top_vc)
            })
            .unwrap_or_else(|| {
                format!(
                    "<#{target_id}> — messages: day {} / week {} / month {} / total {} | voice: day {} / week {} / month {} / total {} | active users: {}\nTop messages:\n{top_msg}\nTop voice:\n{top_vc}",
                    agg.daily_messages,
                    agg.weekly_messages,
                    agg.monthly_messages,
                    agg.total_messages,
                    beautiful_voice_ms(agg.daily_voice_ms, &code),
                    beautiful_voice_ms(agg.weekly_voice_ms, &code),
                    beautiful_voice_ms(agg.monthly_voice_ms, &code),
                    beautiful_voice_ms(agg.total_voice_ms, &code),
                    agg.active_users,
                )
            }),
    )
    .await?;
    Ok(())
}
