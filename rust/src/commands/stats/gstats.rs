use super::*;

/// `guildStatsLeaderboard` HTML card
/// (`src/assets/html/guildStatsLeaderboard.html`, TS
/// `!gstats.ts:225`).
const GSTATS_CARD_TEMPLATE: &str =
    include_str!("../../../../src/assets/html/guildStatsLeaderboard.html");

/// html2png options mirror (TS `!gstats.ts:351-358`).
const GSTATS_OPTIONS_JSON: &str = r#"{"width":1902,"height":1080,"scaleSize":3,"elementSelector":".container","omitBackground":true,"selectElement":true}"#;

/// Fallback avatar when the member is not in cache. Mirrors the
/// `"https://cdn.discordapp.com/embed/avatars/0.png"` fallback in
/// the TS row builders.
pub const GSTATS_DEFAULT_AVATAR: &str = "https://cdn.discordapp.com/embed/avatars/0.png";

/// Every template value for the `guildStatsLeaderboard` card. The
/// three list slots carry pre-rendered row HTML (`{top_message_users}`,
/// `{top_text_channels}`, `{top_voice_channels}`); `{author_username}`
/// is filled like TS even though the template carries no such slot
/// (no-op, kept for parity).
pub struct GstatsCardData {
    pub header_h1_value: String,
    pub guild_pfp: String,
    pub author_username: String,
    pub member_count: String,
    pub current_date: String,
    pub top_message_users: String,
    pub top_text_channels: String,
    pub top_voice_channels: String,
}

/// Fill the `guildStatsLeaderboard` template. Mirrors the replace
/// chain in TS `!gstats.ts:241-350`.
pub fn guild_stats_card_html(d: &GstatsCardData) -> String {
    GSTATS_CARD_TEMPLATE
        .replace("{header_h1_value}", &d.header_h1_value)
        .replace("{guild_pfp}", &d.guild_pfp)
        .replace("{author_username}", &d.author_username)
        .replace("{member_count}", &d.member_count)
        .replace("{current_date}", &d.current_date)
        .replace("{top_message_users}", &d.top_message_users)
        .replace("{top_text_channels}", &d.top_text_channels)
        .replace("{top_voice_channels}", &d.top_voice_channels)
}

/// Parent category name for a channel card row. Mirrors
/// `interaction.guild.channels.cache.get(channelId)?.parent?.name ||
/// "N/A"` in the `!gstats.ts` channel builders.
pub fn card_channel_category(ctx: &Ctx<'_>, guild_id: Option<u64>, channel_id: u64) -> String {
    guild_id
        .and_then(|g| {
            ctx.serenity_context()
                .cache
                .guild(poise::serenity_prelude::GuildId::new(g))
        })
        .and_then(|g| {
            let ch = g
                .channels
                .get(&poise::serenity_prelude::ChannelId::new(channel_id))?;
            let parent = ch.parent_id?;
            g.channels.get(&parent).map(|p| p.name.clone())
        })
        .unwrap_or_else(|| "N/A".to_string())
}

/// See guild leaderboard
//
// Guild leaderboard, rendered through HorizonGateway with the text
// form kept as fallback.
//
// Mirrors `!gstats.ts:91-223`: per-member day/week/month message and
// voice windows over every `STATS.USER` row, leaderboard sorted by
// daily messages (`getStatsLeaderboard`), top-3 text channels by
// daily messages and top-3 voice channels by daily voice
// (`topThree`). Totals still use the aggregate counters so the
// header matches `stats_gstats_text`.
//
// New YAML keys (not added; code fallbacks render until then):
// `stats_gstats_detail_text` (${top_members}, ${top_text},
// ${top_vc}).
#[poise::command(
    slash_command,
    prefix_command,
    rename = "gstats",
    aliases("g"),
    description_localized("fr", "Regarder le classement du serveur"),
    description_localized("ja", "サーバーランキングを表示"),
    description_localized("ru", "Показать таблицу лидеров сервера"),
    description_localized("es-ES", "Ver tabla de clasificación del servidor")
)]
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
        crate::lang::get(&code, "messages_word").unwrap_or_else(|| "Messages".to_string());
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
    let text = format!("{header}\n{detail}");
    // Card leg (`!gstats.ts:225-360`): the same board as HTML via
    // HorizonGateway, attached as `gstats.png`. Gateway unset/fail
    // keeps the text reply above.
    let word = |k: &str, fb: &str| crate::lang::get(&code, k).unwrap_or_else(|| fb.to_string());
    let (guild_name, guild_icon) = guild_name_icon(&ctx);
    let gid_num = ctx.guild_id().map(|g| g.get());
    let bot_avatar = ctx.cache().current_user().avatar_url().unwrap_or_default();
    let unknown = word("var_unknown", "Unknown");
    let total_word = word("var_total", "Total");
    let minutes_word = word("minutes_word", "Minutes");
    let category_word = word("var_category", "Category");
    let user_rows = members
        .iter()
        .enumerate()
        .map(|(i, w)| {
            let (avatar, name) = match ctx.cache().user(w.user_id) {
                Some(u) => (u.face(), u.name.clone()),
                None => (GSTATS_DEFAULT_AVATAR.to_string(), unknown.clone()),
            };
            let mins = (w.monthly_voice_ms as f64 / 60_000.0).round() as u64;
            member_list_item(
                i,
                &avatar,
                &name,
                &format!(
                    "{total_word}: {} {msg_word}, {mins} {minutes_word}",
                    w.monthly_messages
                ),
                &w.daily_messages.to_string(),
                &msg_word,
            )
        })
        .collect::<String>();
    // Message counts re-read over the full logs like
    // `getChannelMessagesCount(channelId, allMessages)`.
    let all_messages: Vec<StatsMessage> =
        rows.iter().flat_map(|(_, s)| s.msg_log.clone()).collect();
    let all_voices: Vec<StatsVoice> = rows.iter().flat_map(|(_, s)| s.voice_log.clone()).collect();
    let text_rows = top_text
        .iter()
        .enumerate()
        .map(|(i, (ch, _))| {
            let n: usize = all_messages.iter().filter(|m| m.channel_id == *ch).count();
            channel_list_item(
                i,
                "#",
                &card_channel_name(&ctx, gid_num, *ch),
                &card_channel_category(&ctx, gid_num, *ch),
                &n.to_string(),
                &msg_word,
                &category_word,
            )
        })
        .collect::<String>();
    let voice_rows = top_vc
        .iter()
        .enumerate()
        .map(|(i, (ch, _))| {
            // `getChannelMinutesCount`: round-half-up total minutes.
            let total_ms: u64 = all_voices
                .iter()
                .filter(|v| v.channel_id == *ch)
                .map(|v| (v.end_ts - v.start_ts).max(0) as u64)
                .sum();
            let mins = (total_ms + 30_000) / 60_000;
            channel_list_item(
                i,
                "🎤",
                &card_channel_name(&ctx, gid_num, *ch),
                &card_channel_category(&ctx, gid_num, *ch),
                &mins.to_string(),
                &minutes_word,
                &category_word,
            )
        })
        .collect::<String>();
    let card = GstatsCardData {
        header_h1_value: word("header_h1_value", "Server Statistics"),
        guild_pfp: if guild_icon.is_empty() {
            bot_avatar
        } else {
            guild_icon
        },
        author_username: guild_name.clone(),
        member_count: ctx
            .guild_id()
            .and_then(|g| ctx.cache().guild(g))
            .map(|g| g.member_count.to_string())
            .unwrap_or_else(|| rows.len().to_string()),
        current_date: format_current_date(now_ms),
        top_message_users: user_rows,
        top_text_channels: text_rows,
        top_voice_channels: voice_rows,
    };
    if let Some((base, token)) = card_gateway(&ctx) {
        let html = guild_stats_card_html(&card);
        if let Some(png) = render_card_png(&base, &token, &html, GSTATS_OPTIONS_JSON).await {
            use poise::serenity_prelude as serenity;
            // TS `!gstats.ts:362` edits to the bare file
            // (`{ content: null, files: [image.png] }`): no embed, no
            // text — the file alone is the final shape (same class as
            // the ustats fix).
            ctx.send(
                poise::CreateReply::default()
                    .attachment(serenity::CreateAttachment::bytes(png, "image.png")),
            )
            .await?;
            return Ok(());
        }
    }
    ctx.say(text).await?;
    Ok(())
}

#[cfg(test)]
mod gstats_card_tests {
    use super::*;

    #[test]
    fn fill_replaces_every_placeholder() {
        let d = GstatsCardData {
            header_h1_value: "H".to_string(),
            guild_pfp: "P".to_string(),
            author_username: "G".to_string(),
            member_count: "3".to_string(),
            current_date: "D".to_string(),
            top_message_users: "U".to_string(),
            top_text_channels: "T".to_string(),
            top_voice_channels: "V".to_string(),
        };
        let html = guild_stats_card_html(&d);
        for ph in [
            "{header_h1_value}",
            "{guild_pfp}",
            "{author_username}",
            "{member_count}",
            "{current_date}",
            "{top_message_users}",
            "{top_text_channels}",
            "{top_voice_channels}",
        ] {
            assert!(!html.contains(ph), "placeholder left: {ph}");
        }
    }
}
