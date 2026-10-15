use super::*;

/// `userStatsPage` HTML card (`src/assets/html/userStatsPage.html`,
/// TS `!ustats.ts:152`).
const USTATS_CARD_TEMPLATE: &str = include_str!("../../../../src/assets/html/userStatsPage.html");

/// html2png options mirror (TS `!ustats.ts:350-357`).
const USTATS_OPTIONS_JSON: &str = r#"{"elementSelector":".card","omitBackground":true,"selectElement":true,"width":1920,"height":1200,"scaleSize":1}"#;

/// Every template value for the `userStatsPage` card. `messages_top`
/// / `voice_top` are the three `(name, count)` slots
/// (`{messages_topN}` / `{messages_topN_2}`, `{voice_topN}` /
/// `{voice_topN_2}`); `message_data` / `voice_data` / `time_labels`
/// are the 30-day chart arrays (`{ messageData }`, `{ voiceData }`,
/// `{ timeLabels }`).
pub struct UstatsCardData {
    pub username: String,
    pub guild_name: String,
    pub header_h1_value: String,
    pub messages_word: String,
    pub voice_activity: String,
    pub minutes_word: String,
    pub top_voice: String,
    pub top_message: String,
    pub author_username: String,
    pub author_pfp: String,
    pub messages_length: String,
    pub chart_title: String,
    pub voice_daily: String,
    pub voice_weekly: String,
    pub voice_monthly: String,
    pub message_daily: String,
    pub message_weekly: String,
    pub message_monthly: String,
    pub messages_top: [(String, String); 3],
    pub voice_top: [(String, String); 3],
    pub var_1d: String,
    pub var_7d: String,
    pub var_14d: String,
    pub message_data: Vec<u64>,
    pub voice_data: Vec<f64>,
    pub time_labels: Vec<String>,
}

/// Fill the `userStatsPage` template. Mirrors the replace chain in
/// TS `!ustats.ts:197-348` (`replaceAll` throughout, single
/// `replace` for `{message_voice_diag}`, `{ messageData }`,
/// `{ voiceData }`, `{ timeLabels }` — identical output either way).
/// `{message_voice_diag}` is the hardcoded TS literal
/// `"Votre contenu ici"`.
pub fn user_stats_card_html(d: &UstatsCardData) -> String {
    USTATS_CARD_TEMPLATE
        .replace("{username}", &d.username)
        .replace("{guild_name}", &d.guild_name)
        .replace("{header_h1_value}", &d.header_h1_value)
        .replace("{messages_word}", &d.messages_word)
        .replace("{voice_activity}", &d.voice_activity)
        .replace("{minutes_word}", &d.minutes_word)
        .replace("{top_voice}", &d.top_voice)
        .replace("{top_message}", &d.top_message)
        .replace("{author_username}", &d.author_username)
        .replace("{author_pfp}", &d.author_pfp)
        .replace("{messages_length}", &d.messages_length)
        .replace("{chart_title}", &d.chart_title)
        .replace("{voice_daily}", &d.voice_daily)
        .replace("{voice_weekly}", &d.voice_weekly)
        .replace("{voice_monthly}", &d.voice_monthly)
        .replace("{message_daily}", &d.message_daily)
        .replace("{message_weekly}", &d.message_weekly)
        .replace("{message_monthly}", &d.message_monthly)
        .replace("{messages_top1}", &d.messages_top[0].0)
        .replace("{messages_top2}", &d.messages_top[1].0)
        .replace("{messages_top3}", &d.messages_top[2].0)
        .replace("{messages_top1_2}", &d.messages_top[0].1)
        .replace("{messages_top2_2}", &d.messages_top[1].1)
        .replace("{messages_top3_2}", &d.messages_top[2].1)
        .replace("{voice_top1}", &d.voice_top[0].0)
        .replace("{voice_top2}", &d.voice_top[1].0)
        .replace("{voice_top3}", &d.voice_top[2].0)
        .replace("{voice_top1_2}", &d.voice_top[0].1)
        .replace("{voice_top2_2}", &d.voice_top[1].1)
        .replace("{voice_top3_2}", &d.voice_top[2].1)
        .replace("{var_1d}", &d.var_1d)
        .replace("{var_7d}", &d.var_7d)
        .replace("{var_14d}", &d.var_14d)
        .replace("{message_voice_diag}", "Votre contenu ici")
        .replace(
            "{ messageData }",
            &serde_json::to_string(&d.message_data).unwrap_or_else(|_| "[]".to_string()),
        )
        .replace(
            "{ voiceData }",
            &serde_json::to_string(&d.voice_data).unwrap_or_else(|_| "[]".to_string()),
        )
        .replace(
            "{ timeLabels }",
            &serde_json::to_string(&d.time_labels).unwrap_or_else(|_| "[]".to_string()),
        )
}

/// See profil
///
/// Per-user stats card, rendered through HorizonGateway with the
/// text form kept as fallback.
///
/// Mirrors `!ustats.ts`: missing `STATS.USER.<uid>` row replies
/// `unblacklist_user_is_not_exist` instead of rendering zeros.
#[poise::command(
    slash_command,
    prefix_command,
    rename = "ustats",
    aliases("u"),
    description_localized("fr", "Regarder un profil"),
    description_localized("ja", "プロフィールを表示"),
    description_localized("ru", "Посмотреть профиль"),
    description_localized("es-ES", "Ver perfil")
)]
pub async fn stats_user(
    ctx: Ctx<'_>,
    #[description_localized("fr", "L'utilisateur que vous souhaiter")]
    #[description_localized("ja", "対象のメンバー")]
    #[description_localized("ru", "Желаемый участник")]
    #[description_localized("es-ES", "El miembro que deseas")]
    #[description = "The member you want"]
    #[rename = "member"]
    user: Option<poise::serenity_prelude::User>,
) -> Result<(), anyhow::Error> {
    let target = user.as_ref().unwrap_or_else(|| ctx.author());
    let uid = target.id.get();
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
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
        // Mirrors `getChannelMinutesCount` (`Math.round(totalMs / 60000)`):
        // round-half-up to minutes, not floor.
        .map(|(ch, ms)| format!("<#{ch}> ({}m)", (ms + 30_000) / 60_000))
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
    let text = crate::lang::get(&code, "stats_ustats_text")
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
        });
    // Card leg (`!ustats.ts:152-360`): the same windows as HTML via
    // HorizonGateway, attached as `ustats.png`. Gateway unset/fail
    // keeps the text reply above.
    let display = target.display_name().to_string();
    let (guild_name, _) = guild_name_icon(&ctx);
    let gid_num = ctx.guild_id().map(|g| g.get());
    let word = |k: &str, fb: &str| crate::lang::get(&code, k).unwrap_or_else(|| fb.to_string());
    let text_tops: Vec<(u64, u64)> = top_text_channels(&s.msg_log, 3);
    let vc_tops: Vec<(u64, u64)> = top_voice_channels(&s.voice_log, 3);
    let msg_top = |i: usize| -> (String, String) {
        match text_tops.get(i) {
            Some((ch, n)) => (card_channel_name(&ctx, gid_num, *ch), n.to_string()),
            None => ("N/A".to_string(), "0".to_string()),
        }
    };
    let vc_top = |i: usize| -> (String, String) {
        match vc_tops.get(i) {
            // TS: `to_beautiful_string(getChannelMinutesCount(ch) * 60000)`.
            Some((ch, ms)) => (
                card_channel_name(&ctx, gid_num, *ch),
                beautiful_voice_ms((*ms + 30_000) / 60_000 * 60_000, &code),
            ),
            None => ("N/A".to_string(), beautiful_voice_ms(0, &code)),
        }
    };
    let card = UstatsCardData {
        username: display.clone(),
        guild_name,
        header_h1_value: word("header_h1_value", "User Statistics"),
        messages_word: word("messages_word", "Messages"),
        voice_activity: word("voice_activity", "Voice Activity"),
        minutes_word: word("minutes_word", "Minutes"),
        top_voice: word("top_voice", "Top Voice Channels"),
        top_message: word("top_message", "Top Message Channels"),
        author_username: display,
        author_pfp: target.face(),
        messages_length: s.messages.to_string(),
        chart_title: word("activity_under_30d", "Activity over the last 30 days"),
        voice_daily: beautiful_voice_ms(d_vc, &code),
        voice_weekly: beautiful_voice_ms(w_vc, &code),
        voice_monthly: beautiful_voice_ms(m_vc, &code),
        message_daily: d_msg.to_string(),
        message_weekly: w_msg.to_string(),
        message_monthly: m_msg.to_string(),
        messages_top: [msg_top(0), msg_top(1), msg_top(2)],
        voice_top: [vc_top(0), vc_top(1), vc_top(2)],
        var_1d: word("var_1d", "Daily"),
        var_7d: word("var_7d", "Weekly"),
        var_14d: word("var_14d", "Monthly"),
        message_data: message_buckets_30d(&s.msg_log, now_ms),
        voice_data: voice_buckets_30d(&s.voice_log, now_ms),
        time_labels: time_labels_30d(now_ms),
    };
    if let Some((base, token)) = card_gateway(&ctx) {
        let html = user_stats_card_html(&card);
        if let Some(png) = render_card_png(&base, &token, &html, USTATS_OPTIONS_JSON).await {
            use poise::serenity_prelude as serenity;
            let embed = serenity::CreateEmbed::default()
                .description(&text)
                .image("attachment://ustats.png");
            ctx.send(
                poise::CreateReply::default()
                    .embed(embed)
                    .attachment(serenity::CreateAttachment::bytes(png, "ustats.png")),
            )
            .await?;
            return Ok(());
        }
    }
    ctx.say(text).await?;
    Ok(())
}

#[cfg(test)]
mod ustats_card_tests {
    use super::*;

    fn sample() -> UstatsCardData {
        UstatsCardData {
            username: "U".to_string(),
            guild_name: "G".to_string(),
            header_h1_value: "H".to_string(),
            messages_word: "M".to_string(),
            voice_activity: "V".to_string(),
            minutes_word: "m".to_string(),
            top_voice: "TV".to_string(),
            top_message: "TM".to_string(),
            author_username: "U".to_string(),
            author_pfp: "P".to_string(),
            messages_length: "1".to_string(),
            chart_title: "C".to_string(),
            voice_daily: "a".to_string(),
            voice_weekly: "b".to_string(),
            voice_monthly: "c".to_string(),
            message_daily: "1".to_string(),
            message_weekly: "2".to_string(),
            message_monthly: "3".to_string(),
            messages_top: [
                ("c1".to_string(), "10".to_string()),
                ("c2".to_string(), "5".to_string()),
                ("c3".to_string(), "1".to_string()),
            ],
            voice_top: [
                ("v1".to_string(), "x".to_string()),
                ("v2".to_string(), "y".to_string()),
                ("v3".to_string(), "z".to_string()),
            ],
            var_1d: "D".to_string(),
            var_7d: "W".to_string(),
            var_14d: "M2".to_string(),
            message_data: vec![0u64; 30],
            voice_data: vec![0f64; 30],
            time_labels: vec!["Oct 1".to_string(); 30],
        }
    }

    #[test]
    fn fill_replaces_every_placeholder() {
        let html = user_stats_card_html(&sample());
        for ph in [
            "{username}",
            "{guild_name}",
            "{header_h1_value}",
            "{messages_word}",
            "{voice_activity}",
            "{minutes_word}",
            "{top_voice}",
            "{top_message}",
            "{author_username}",
            "{author_pfp}",
            "{messages_length}",
            "{chart_title}",
            "{voice_daily}",
            "{voice_weekly}",
            "{voice_monthly}",
            "{message_daily}",
            "{message_weekly}",
            "{message_monthly}",
            "{messages_top1}",
            "{messages_top2}",
            "{messages_top3}",
            "{messages_top1_2}",
            "{messages_top2_2}",
            "{messages_top3_2}",
            "{voice_top1}",
            "{voice_top2}",
            "{voice_top3}",
            "{voice_top1_2}",
            "{voice_top2_2}",
            "{voice_top3_2}",
            "{var_1d}",
            "{var_7d}",
            "{var_14d}",
            "{message_voice_diag}",
            "{ messageData }",
            "{ voiceData }",
            "{ timeLabels }",
        ] {
            assert!(!html.contains(ph), "placeholder left: {ph}");
        }
        assert!(html.contains("Votre contenu ici"));
    }
}
