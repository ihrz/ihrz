use super::*;

#[poise::command(slash_command, prefix_command, rename = "ustats", aliases("u"))]
pub async fn stats_user(
    ctx: Ctx<'_>,
    #[description = "Member"] user: Option<poise::serenity_prelude::User>,
) -> Result<(), anyhow::Error> {
    let uid = user
        .as_ref()
        .map(|u| u.id.get())
        .unwrap_or_else(|| ctx.author().id.get());
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
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
    ctx.say(format!(
        "Messages: {} (day {d_msg} / week {w_msg} / month {m_msg}) | Voice: {}m (day {}m / week {}m / month {}m)\nTop channels: {}\nTop voice: {}",
        s.messages,
        s.voice_ms / 60_000,
        d_vc / 60_000,
        w_vc / 60_000,
        m_vc / 60_000,
        if top_text.is_empty() {
            "-".to_string()
        } else {
            top_text.join(", ")
        },
        if top_vc.is_empty() {
            "-".to_string()
        } else {
            top_vc.join(", ")
        },
    ))
    .await?;
    Ok(())
}
