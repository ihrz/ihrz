use super::*;
use poise::serenity_prelude as serenity;

/// Compare statistics between multiple users
// Mirrors stats compare: monthly counts + beautiful voice, daily/weekly/
// monthly rows. The earlier Rust "winner" line was invented (TS has none).
#[poise::command(
    slash_command,
    prefix_command,
    rename = "compare",
    aliases("cmp"),
    description_localized("fr", "Comparer les statistiques entre plusieurs utilisateurs"),
    description_localized("ja", "複数ユーザー間の統計を比較"),
    description_localized("ru", "Сравнить статистику нескольких пользователей"),
    description_localized("es-ES", "Comparar estadísticas entre múltiples usuarios")
)]
pub async fn stats_compare(
    ctx: Ctx<'_>,
    // Required on both paths, like TS (`stats.ts` declares user1/user2
    // `required: true`): missing prefix args never reach run() because
    // poise ArgumentParse routes them to the checkCommandArgs caret usage
    // embed (prefix_usage_denial), exactly like TS answers `.stats
    // compare` with no args (verified live vs prod). Option params would
    // swallow the miss and reply the plain-text invalid_users key.
    #[description_localized("fr", "Premier utilisateur à comparer")]
    #[description_localized("ja", "比較する1人目のユーザー")]
    #[description_localized("ru", "Первый пользователь для сравнения")]
    #[description_localized("es-ES", "Primer usuario a comparar")]
    #[description = "First user to compare"]
    #[rename = "user1"]
    user1: poise::serenity_prelude::User,
    #[description_localized("fr", "Deuxième utilisateur à comparer")]
    #[description_localized("ja", "比較する2人目のユーザー")]
    #[description_localized("ru", "Второй пользователь для сравнения")]
    #[description_localized("es-ES", "Segundo usuario a comparar")]
    #[description = "Second user to compare"]
    #[rename = "user2"]
    user2: poise::serenity_prelude::User,
) -> Result<(), anyhow::Error> {
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    let t = |key: &str, fallback: &str| {
        crate::lang::get(&code, key).unwrap_or_else(|| fallback.to_string())
    };
    // Both users are guaranteed by the signature now (prefix misses take
    // the caret usage embed, slash requires both): only the identity and
    // data gates below can still deny.
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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn compare_users_are_required_like_ts() {
        // TS `stats.ts` declares user1/user2 `required: true`, so
        // checkCommandArgs answers missing prefix args with the caret
        // usage embed before run(). Poise mirrors that gate only when
        // the params are required: Option params would swallow the miss
        // and reply the plain-text invalid_users key instead (divergence
        // verified live vs prod on `.stats compare` with no args).
        let cmd = stats_compare();
        let params: Vec<(&str, bool)> = cmd
            .parameters
            .iter()
            .map(|p| (p.name.as_str(), p.required))
            .collect();
        assert_eq!(params, vec![("user1", true), ("user2", true)]);
    }
}
