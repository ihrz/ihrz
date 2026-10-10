use super::*;
use poise::serenity_prelude as serenity;

/// Compare statistics between multiple users
// Mirrors stats compare: monthly counts + beautiful voice, daily/weekly/
// monthly rows. The earlier Rust "winner" line was invented (TS has none).
#[poise::command(slash_command, prefix_command, rename = "compare", aliases("cmp"))]
pub async fn stats_compare(
    ctx: Ctx<'_>,
    // Optional on both paths so the prefix leg can miss a user, like TS
    // `!compare.ts` (`args` with < 2 mentions). A missing user replies
    // `stats_compare_invalid_users`; slash callers must still pass both
    // (TS declares both options `required: true`).
    #[description = "First user to compare"]
    #[rename = "user1"]
    user1: Option<poise::serenity_prelude::User>,
    #[description = "Second user to compare"]
    #[rename = "user2"]
    user2: Option<poise::serenity_prelude::User>,
) -> Result<(), anyhow::Error> {
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    let t = |key: &str, fallback: &str| {
        crate::lang::get(&code, key).unwrap_or_else(|| fallback.to_string())
    };
    // Mirrors `!compare.ts:71-75` (`if (!user1Id || !user2Id)`).
    let (Some(user1), Some(user2)) = (user1, user2) else {
        ctx.say(t(
            "stats_compare_invalid_users",
            "Please provide two valid users to compare.",
        ))
        .await?;
        return Ok(());
    };
    if user1.id == user2.id {
        // DELIBERATE divergence (kept): TS `!compare.ts` has no
        // same-user guard and would render a user-against-themselves
        // card; this port short-circuits with `stats_compare_same_user`
        // instead of emitting a meaningless identical-columns embed.
        ctx.say(t("stats_compare_same_user", "Compare two different users."))
            .await?;
        return Ok(());
    }
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    // Mirrors `!compare.ts:90-94`: either `STATS.USER.<uid>` row absent
    // replies `stats_compare_no_data` instead of rendering zeros.
    if !stats_row_exists(&ctx.data().pool, &gid, user1.id.get()).await
        || !stats_row_exists(&ctx.data().pool, &gid, user2.id.get()).await
    {
        ctx.say(t(
            "stats_compare_no_data",
            "One or both users don't have statistics data.",
        ))
        .await?;
        return Ok(());
    }
    let a = load_stats(&ctx.data().pool, &gid, user1.id.get()).await;
    let b = load_stats(&ctx.data().pool, &gid, user2.id.get()).await;
    let now_ms = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_millis() as i64)
        .unwrap_or(0);
    // TS timeouts in !compare.ts (monthly = 30 days here).
    let (day_to, week_to, month_to) = (86_400_000i64, 604_800_000i64, 2_592_000_000i64);
    let name1 = user1
        .global_name
        .clone()
        .unwrap_or_else(|| user1.name.clone());
    let name2 = user2
        .global_name
        .clone()
        .unwrap_or_else(|| user2.name.clone());
    let msg_word = t("messages_word", "Messages");
    let row = |s: &UserStats, timeout: i64| {
        (
            msg_window_count(&s.msg_log, now_ms, timeout),
            beautiful_voice_ms(voice_window_total(&s.voice_log, now_ms, timeout), &code),
        )
    };
    let (a_d_msg, a_d_vc) = row(&a, day_to);
    let (b_d_msg, b_d_vc) = row(&b, day_to);
    let (a_w_msg, a_w_vc) = row(&a, week_to);
    let (b_w_msg, b_w_vc) = row(&b, week_to);
    let (a_m_msg, a_m_vc) = row(&a, month_to);
    let (b_m_msg, b_m_vc) = row(&b, month_to);
    // Mirrors `!compare.ts` `.setThumbnail(guild.iconURL({ size: 512 }))`.
    let guild_icon = ctx
        .guild()
        .map(|g| g.icon_url().unwrap_or_default())
        .unwrap_or_default();
    let mut embed = serenity::CreateEmbed::default()
        .title(t("stats_compare_title", "Statistics Comparison"))
        .colour(0x5865F2_u32)
        .description(format!("{name1} vs {name2}"))
        .field(
            format!("📨 {}", t("messages_word", "Messages")),
            format!("**{name1}**: {a_m_msg} | **{name2}**: {b_m_msg}"),
            true,
        )
        .field(
            format!("🎤 {}", t("voice_activity", "Voice Activity")),
            format!("**{name1}**: {a_m_vc} | **{name2}**: {b_m_vc}"),
            true,
        )
        .field(
            t("var_1d", "1 day"),
            format!(
                "**{name1}**: {a_d_msg} {msg_word}, {a_d_vc}\n**{name2}**: {b_d_msg} {msg_word}, {b_d_vc}"
            ),
            false,
        )
        .field(
            t("var_7d", "7 days"),
            format!(
                "**{name1}**: {a_w_msg} {msg_word}, {a_w_vc}\n**{name2}**: {b_w_msg} {msg_word}, {b_w_vc}"
            ),
            false,
        )
        .field(
            t("var_14d", "14 days"),
            format!(
                "**{name1}**: {a_m_msg} {msg_word}, {a_m_vc}\n**{name2}**: {b_m_msg} {msg_word}, {b_m_vc}"
            ),
            false,
        )
        .timestamp(serenity::Timestamp::now());
    if !guild_icon.is_empty() {
        embed = embed.thumbnail(guild_icon);
    }
    ctx.send(poise::CreateReply::default().embed(embed)).await?;
    Ok(())
}
