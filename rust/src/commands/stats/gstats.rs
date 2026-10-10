use super::*;

/// Guild leaderboard (text form).
///
/// Mirrors `!gstats.ts:91-223`: per-member day/week/month message and
/// voice windows over every `STATS.USER` row, leaderboard sorted by
/// daily messages (`getStatsLeaderboard`), top-3 text channels by
/// daily messages and top-3 voice channels by daily voice
/// (`topThree`). Totals still use the aggregate counters so the
/// header matches `stats_gstats_text`.
///
/// ACCURACY NOTE (deliberate, kept): TS renders the
/// `guildStatsLeaderboard` HTML card as a PNG via
/// `client.func.html2png` (Chromium/gateway are outside this
/// runtime), so this port renders the same data as text.
///
/// New YAML keys (not added; code fallbacks render until then):
/// `stats_gstats_detail_text` (${top_members}, ${top_text},
/// ${top_vc}).
#[poise::command(slash_command, prefix_command, rename = "gstats", aliases("g"))]
pub async fn stats_guild(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let rows = load_all_user_stats(&ctx.data().pool, &gid).await;
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    if rows.is_empty() {
        ctx.say(
            crate::lang::get(&code, "stats_no_data")
                .unwrap_or_else(|| "No statistics data available for this server.".to_string()),
        )
        .await?;
        return Ok(());
    }
    let mut messages = 0u64;
    let mut voice_ms = 0u64;
    for (_, s) in &rows {
        messages += s.messages;
        voice_ms += s.voice_ms;
    }
    let now_ms = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_millis() as i64)
        .unwrap_or(0);
    // Leaderboard like `getStatsLeaderboard` in userStatsUtils.ts: the
    // full TS tiebreak chain (daily > weekly > monthly messages, then
    // daily > weekly > monthly voice). The sort is stable and rows scan
    // uid-ascending, so full ties keep that order like the TS sort.
    let mut members = guild_member_windows(&rows, now_ms);
    members.sort_by(|a, b| {
        b.daily_messages
            .cmp(&a.daily_messages)
            .then(b.weekly_messages.cmp(&a.weekly_messages))
            .then(b.monthly_messages.cmp(&a.monthly_messages))
            .then(b.daily_voice_ms.cmp(&a.daily_voice_ms))
            .then(b.weekly_voice_ms.cmp(&a.weekly_voice_ms))
            .then(b.monthly_voice_ms.cmp(&a.monthly_voice_ms))
    });
    let msg_word =
        crate::lang::get(&code, "messages_word").unwrap_or_else(|| "messages".to_string());
    let top_members = members
        .iter()
        .take(10)
        .enumerate()
        .map(|(i, w)| {
            format!(
                "{}. <@{}> — day {} {msg_word} / {} | week {} / {} | month {} / {}",
                i + 1,
                w.user_id,
                w.daily_messages,
                beautiful_voice_ms(w.daily_voice_ms, &code),
                w.weekly_messages,
                beautiful_voice_ms(w.weekly_voice_ms, &code),
                w.monthly_messages,
                beautiful_voice_ms(w.monthly_voice_ms, &code),
            )
        })
        .collect::<Vec<_>>()
        .join("\n");
    let (top_text, top_vc) = guild_top_channels(&rows, now_ms);
    let top_text_str = if top_text.is_empty() {
        "-".to_string()
    } else {
        top_text
            .iter()
            .enumerate()
            .map(|(i, (ch, n))| format!("{}. <#{ch}> — {n} {msg_word}", i + 1))
            .collect::<Vec<_>>()
            .join("\n")
    };
    let top_vc_str = if top_vc.is_empty() {
        "-".to_string()
    } else {
        top_vc
            .iter()
            .enumerate()
            .map(|(i, (ch, ms))| format!("{}. <#{ch}> — {}", i + 1, beautiful_voice_ms(*ms, &code)))
            .collect::<Vec<_>>()
            .join("\n")
    };
    let header = crate::lang::get(&code, "stats_gstats_text")
        .map(|t| {
            t.replace("${count}", &rows.len().to_string())
                .replace("${messages}", &messages.to_string())
                .replace("${voice}", &(voice_ms / 60_000).to_string())
        })
        .unwrap_or_else(|| {
            format!(
                "Members tracked: {} | Messages: {} | Voice: {}m",
                rows.len(),
                messages,
                voice_ms / 60_000
            )
        });
    let detail = crate::lang::get(&code, "stats_gstats_detail_text")
        .map(|t| {
            t.replace("${top_members}", &top_members)
                .replace("${top_text}", &top_text_str)
                .replace("${top_vc}", &top_vc_str)
        })
        .unwrap_or_else(|| {
            format!("Top members:\n{top_members}\nTop channels:\n{top_text_str}\nTop voice:\n{top_vc_str}")
        });
    ctx.say(format!("{header}\n{detail}")).await?;
    Ok(())
}
