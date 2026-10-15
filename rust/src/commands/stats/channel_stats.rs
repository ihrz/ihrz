use super::*;

/// `channelStatsPage` HTML card (`src/assets/html/channelStatsPage.html`,
/// TS `!channel-stats.ts:195`).
const CHANNEL_STATS_CARD_TEMPLATE: &str =
    include_str!("../../../../src/assets/html/channelStatsPage.html");

/// html2png options mirror (TS `!channel-stats.ts:322-329`).
const CHANNEL_STATS_OPTIONS_JSON: &str = r#"{"width":1902,"height":1400,"scaleSize":3,"elementSelector":".container","omitBackground":true,"selectElement":true}"#;

/// Every template value for the `channelStatsPage` card. The two
/// list slots carry pre-rendered row HTML (`{top_message_users}`,
/// `{top_voice_users}`); `{show_messages_section}` /
/// `{show_voice_section}` are `"block"`/`"none"` like TS.
pub struct ChannelStatsCardData {
    pub header_h1_value: String,
    pub guild_pfp: String,
    pub author_username: String,
    pub channel_name: String,
    pub current_date: String,
    pub daily_messages: String,
    pub weekly_messages: String,
    pub monthly_messages: String,
    pub daily_voice: String,
    pub weekly_voice: String,
    pub monthly_voice: String,
    pub total_messages: String,
    pub total_voice: String,
    pub active_users: String,
    pub var_1d: String,
    pub var_7d: String,
    pub var_14d: String,
    pub var_total: String,
    pub messages_word: String,
    pub voice_activity: String,
    pub top_message_users: String,
    pub top_voice_users: String,
    pub show_messages_section: String,
    pub show_voice_section: String,
    pub top_messages_title: String,
    pub top_voice_title: String,
    pub channel_stats_title: String,
    pub top_active_users_title: String,
    pub active_users_title: String,
}

/// Fill the `channelStatsPage` template. Mirrors the replace chain
/// in TS `!channel-stats.ts:209-320`.
pub fn channel_stats_card_html(d: &ChannelStatsCardData) -> String {
    CHANNEL_STATS_CARD_TEMPLATE
        .replace("{header_h1_value}", &d.header_h1_value)
        .replace("{guild_pfp}", &d.guild_pfp)
        .replace("{author_username}", &d.author_username)
        .replace("{channel_name}", &d.channel_name)
        .replace("{current_date}", &d.current_date)
        .replace("{daily_messages}", &d.daily_messages)
        .replace("{weekly_messages}", &d.weekly_messages)
        .replace("{monthly_messages}", &d.monthly_messages)
        .replace("{daily_voice}", &d.daily_voice)
        .replace("{weekly_voice}", &d.weekly_voice)
        .replace("{monthly_voice}", &d.monthly_voice)
        .replace("{total_messages}", &d.total_messages)
        .replace("{total_voice}", &d.total_voice)
        .replace("{active_users}", &d.active_users)
        .replace("{var_1d}", &d.var_1d)
        .replace("{var_7d}", &d.var_7d)
        .replace("{var_14d}", &d.var_14d)
        .replace("{var_total}", &d.var_total)
        .replace("{messages_word}", &d.messages_word)
        .replace("{voice_activity}", &d.voice_activity)
        .replace("{top_message_users}", &d.top_message_users)
        .replace("{top_voice_users}", &d.top_voice_users)
        .replace("{show_messages_section}", &d.show_messages_section)
        .replace("{show_voice_section}", &d.show_voice_section)
        .replace("{top_messages_title}", &d.top_messages_title)
        .replace("{top_voice_title}", &d.top_voice_title)
        .replace("{channel_stats_title}", &d.channel_stats_title)
        .replace("{top_active_users_title}", &d.top_active_users_title)
        .replace("{active_users_title}", &d.active_users_title)
}

/// See statistics for a specific channel
//
// Channel stats aggregated from `STATS.USER` rows, rendered through
// HorizonGateway with the text form kept as fallback.
//
// Mirrors `!channel-stats.ts:49-91`: the optional `channel` option
// falls back to the invoking channel (`interaction.channel`), never
// to a top-10 list. Counts come from filtering every user's
// `messages`/`voices` by `channelId` (`aggregate_channel`), not from
// `STATS.CHANNEL` counters (TS has no such writer; see
// `Events/stats/onNewMessage.ts`).
//
// New YAML keys (not added; code fallbacks render until then):
// `stats_channel_stats_text` (${channel}, ${d_msg}, ${w_msg},
// ${m_msg}, ${total_msg}, ${d_vc}, ${w_vc}, ${m_vc}, ${total_vc},
// ${active}, ${top_msg}, ${top_vc}).
#[poise::command(
    slash_command,
    prefix_command,
    rename = "channel-stats",
    aliases("cstats", "chstats"),
    description_localized("fr", "Voir les statistiques d'un canal spécifique"),
    description_localized("ja", "特定のチャンネルの統計を表示"),
    description_localized("ru", "Посмотреть статистику канала"),
    description_localized("es-ES", "Ver estadísticas de un canal específico")
)]
pub async fn stats_channel(
    ctx: Ctx<'_>,
    #[description_localized("fr", "Le canal à analyser")]
    #[description_localized("ja", "分析するチャンネル")]
    #[description_localized("ru", "Канал для анализа")]
    #[description_localized("es-ES", "El canal a analizar")]
    #[description = "The channel to analyze"]
    channel: Option<poise::serenity_prelude::GuildChannel>,
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
    let text = crate::lang::get(&code, "stats_channel_stats_text")
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
        });
    // Card leg (`!channel-stats.ts:195-330`): the same windows as
    // HTML via HorizonGateway, attached as `channel-stats.png`.
    // Gateway unset/fail keeps the text reply above.
    use poise::serenity_prelude::ChannelType;
    let kind = channel.as_ref().map(|c| c.kind);
    // Mirrors `targetChannel instanceof TextChannel / VoiceChannel`.
    let is_text = matches!(kind, Some(ChannelType::Text));
    let is_voice = matches!(kind, Some(ChannelType::Voice));
    let word = |k: &str, fb: &str| crate::lang::get(&code, k).unwrap_or_else(|| fb.to_string());
    let msg_word = word("messages_word", "Messages");
    let unknown = word("var_unknown", "Unknown");
    let none_word = word("var_none", "None");
    let (guild_name, guild_icon) = guild_name_icon(&ctx);
    let bot_avatar = ctx.cache().current_user().avatar_url().unwrap_or_default();
    let user_row = |(i, (uid, label, detail)): (usize, (u64, String, String))| {
        let (avatar, name) = match ctx.cache().user(uid) {
            Some(u) => (u.face(), u.name.clone()),
            None => (
                super::gstats::GSTATS_DEFAULT_AVATAR.to_string(),
                unknown.clone(),
            ),
        };
        member_list_item(i, &avatar, &name, &detail, &label, &msg_word)
    };
    let top_message_users = if is_text && !agg.top_message_users.is_empty() {
        agg.top_message_users
            .iter()
            .enumerate()
            .map(|(i, (uid, n))| user_row((i, (*uid, n.to_string(), format!("{n} {msg_word}")))))
            .collect::<String>()
    } else {
        // Mirrors the TS 📭 empty-state literal (no text leg).
        "<div class=\"empty-state\"><div class=\"empty-state-icon\">📭</div><div></div></div>"
            .to_string()
    };
    let top_voice_users = if is_voice && !agg.top_voice_users.is_empty() {
        agg.top_voice_users
            .iter()
            .enumerate()
            .map(|(i, (uid, ms))| {
                let dur = beautiful_voice_ms(*ms, &code);
                user_row((i, (*uid, dur.clone(), dur)))
            })
            .collect::<String>()
    } else {
        // Mirrors the TS 🔇 empty-state literal (`lang.var_none`).
        format!(
            "<div class=\"empty-state\"><div class=\"empty-state-icon\">🔇</div><div>{none_word}</div></div>"
        )
    };
    let card = ChannelStatsCardData {
        header_h1_value: word("channel_stats_title", "Channel Statistics"),
        guild_pfp: if guild_icon.is_empty() {
            bot_avatar
        } else {
            guild_icon
        },
        author_username: guild_name,
        channel_name: channel
            .as_ref()
            .map(|c| c.name.clone())
            .unwrap_or_else(|| format!("{target_id}")),
        current_date: format_current_date(now_ms),
        daily_messages: agg.daily_messages.to_string(),
        weekly_messages: agg.weekly_messages.to_string(),
        monthly_messages: agg.monthly_messages.to_string(),
        daily_voice: beautiful_voice_ms(agg.daily_voice_ms, &code),
        weekly_voice: beautiful_voice_ms(agg.weekly_voice_ms, &code),
        monthly_voice: beautiful_voice_ms(agg.monthly_voice_ms, &code),
        total_messages: agg.total_messages.to_string(),
        total_voice: beautiful_voice_ms(agg.total_voice_ms, &code),
        active_users: agg.active_users.to_string(),
        var_1d: word("var_1d", "Daily"),
        var_7d: word("var_7d", "Weekly"),
        var_14d: word("var_14d", "Monthly"),
        var_total: word("var_total", "Total"),
        messages_word: msg_word,
        voice_activity: word("voice_activity", "Voice Activity"),
        top_message_users,
        top_voice_users,
        show_messages_section: if is_text { "block" } else { "none" }.to_string(),
        show_voice_section: if is_voice { "block" } else { "none" }.to_string(),
        top_messages_title: word("top_messages_title", "Top Messages"),
        top_voice_title: word("top_voice_title", "Top Voice"),
        channel_stats_title: word("channel_stats_title", "Channel Statistics"),
        top_active_users_title: word("top_active_users_title", "Most Active Users"),
        active_users_title: word("active_users_title", "Active Users"),
    };
    if let Some((base, token)) = card_gateway(&ctx) {
        let html = channel_stats_card_html(&card);
        if let Some(png) = render_card_png(&base, &token, &html, CHANNEL_STATS_OPTIONS_JSON).await {
            use poise::serenity_prelude as serenity;
            let embed = serenity::CreateEmbed::default()
                .description(&text)
                .image("attachment://channel-stats.png");
            ctx.send(
                poise::CreateReply::default()
                    .embed(embed)
                    .attachment(serenity::CreateAttachment::bytes(png, "channel-stats.png")),
            )
            .await?;
            return Ok(());
        }
    }
    ctx.say(text).await?;
    Ok(())
}

#[cfg(test)]
mod channel_stats_card_tests {
    use super::*;

    #[test]
    fn fill_replaces_every_placeholder() {
        let s = |v: &str| v.to_string();
        let d = ChannelStatsCardData {
            header_h1_value: s("H"),
            guild_pfp: s("P"),
            author_username: s("G"),
            channel_name: s("C"),
            current_date: s("D"),
            daily_messages: s("1"),
            weekly_messages: s("2"),
            monthly_messages: s("3"),
            daily_voice: s("a"),
            weekly_voice: s("b"),
            monthly_voice: s("c"),
            total_messages: s("9"),
            total_voice: s("z"),
            active_users: s("4"),
            var_1d: s("1d"),
            var_7d: s("7d"),
            var_14d: s("14d"),
            var_total: s("T"),
            messages_word: s("M"),
            voice_activity: s("V"),
            top_message_users: s("U"),
            top_voice_users: s("W"),
            show_messages_section: s("block"),
            show_voice_section: s("none"),
            top_messages_title: s("TM"),
            top_voice_title: s("TV"),
            channel_stats_title: s("CS"),
            top_active_users_title: s("TA"),
            active_users_title: s("AU"),
        };
        let html = channel_stats_card_html(&d);
        for ph in [
            "{header_h1_value}",
            "{guild_pfp}",
            "{author_username}",
            "{channel_name}",
            "{current_date}",
            "{daily_messages}",
            "{weekly_messages}",
            "{monthly_messages}",
            "{daily_voice}",
            "{weekly_voice}",
            "{monthly_voice}",
            "{total_messages}",
            "{total_voice}",
            "{active_users}",
            "{var_1d}",
            "{var_7d}",
            "{var_14d}",
            "{var_total}",
            "{messages_word}",
            "{voice_activity}",
            "{top_message_users}",
            "{top_voice_users}",
            "{show_messages_section}",
            "{show_voice_section}",
            "{top_messages_title}",
            "{top_voice_title}",
            "{channel_stats_title}",
            "{top_active_users_title}",
            "{active_users_title}",
        ] {
            assert!(!html.contains(ph), "placeholder left: {ph}");
        }
    }
}
