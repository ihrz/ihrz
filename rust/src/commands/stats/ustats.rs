use super::*;

/// Per-user stats card (text form).
///
/// ACCURACY NOTE (deliberate, kept): TS `!ustats.ts` renders the
/// `userStatsPage` HTML card as a PNG via `client.func.html2png`
/// (30-day charts, avatar, top channels). Chromium / the gateway are
/// outside this runtime, so this port renders the same window counts
/// (day/week/month via `msg_window_counts` / `voice_window_ms`) and the
/// same top-3 channels as text instead of pixel-matching the card.
#[poise::command(slash_command, prefix_command, rename = "ustats", aliases("u"))]
pub async fn stats_user(
    ctx: Ctx<'_>,
    #[description = "Member"]
    #[rename = "member"]
    user: Option<poise::serenity_prelude::User>,
) -> Result<(), anyhow::Error> {
    let uid = user
        .as_ref()
        .map(|u| u.id.get())
        .unwrap_or_else(|| ctx.author().id.get());
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    // Mirrors `!ustats.ts`: missing `STATS.USER.<uid>` row replies
    // `unblacklist_user_is_not_exist` instead of rendering zeros.
    if !stats_row_exists(&ctx.data().pool, &gid, uid).await {
        ctx.say(
            crate::lang::get(&code, "unblacklist_user_is_not_exist")
                .unwrap_or_else(|| "I couldn't find the user.".to_string()),
        )
        .await?;
        return Ok(());
    }
    let s = load_stats(&ctx.data().pool, &gid, uid).await;
    let now_ms = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_millis() as i64)
        .unwrap_or(0);
    let (d_msg, w_msg, m_msg, _) = msg_window_counts(&s.msg_log, now_ms);
    let (d_vc, w_vc, m_vc, _) = voice_window_ms(&s.voice_log, now_ms);
    let top_text: Vec<String> = top_text_channels(&s.msg_log, 3)
        .iter()
        .map(|(ch, n)| format!("<#{ch}> ({n})"))
        .collect();
    let top_vc: Vec<String> = top_voice_channels(&s.voice_log, 3)
        .iter()
        .map(|(ch, ms)| format!("<#{ch}> ({}m)", ms / 60_000))
        .collect();
    let top_text_str = if top_text.is_empty() {
        "-".to_string()
    } else {
        top_text.join(", ")
    };
    let top_vc_str = if top_vc.is_empty() {
        "-".to_string()
    } else {
        top_vc.join(", ")
    };
    ctx.say(
        crate::lang::get(&code, "stats_ustats_text")
            .map(|t| {
                t.replace("${messages}", &s.messages.to_string())
                    .replace("${d_msg}", &d_msg.to_string())
                    .replace("${w_msg}", &w_msg.to_string())
                    .replace("${m_msg}", &m_msg.to_string())
                    .replace("${voice}", &(s.voice_ms / 60_000).to_string())
                    .replace("${d_vc}", &(d_vc / 60_000).to_string())
                    .replace("${w_vc}", &(w_vc / 60_000).to_string())
                    .replace("${m_vc}", &(m_vc / 60_000).to_string())
                    .replace("${top_text}", &top_text_str)
                    .replace("${top_vc}", &top_vc_str)
            })
            .unwrap_or_else(|| {
                format!(
                    "Messages: {} (day {d_msg} / week {w_msg} / month {m_msg}) | Voice: {}m (day {}m / week {}m / month {}m)\nTop channels: {top_text_str}\nTop voice: {top_vc_str}",
                    s.messages,
                    s.voice_ms / 60_000,
                    d_vc / 60_000,
                    w_vc / 60_000,
                    m_vc / 60_000,
                )
            }),
    )
    .await?;
    Ok(())
}
