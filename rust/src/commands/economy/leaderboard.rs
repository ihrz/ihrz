use super::*;

// Leaderboard. Mirrors `!leaderboard.ts`.
fn medal_for(rank: usize) -> &'static str {
    match rank {
        0 => "🥇",
        1 => "🥈",
        2 => "🥉",
        _ => "💰",
    }
}

/// Keep only rows whose user is in the gateway cache. Pure predicate so
/// the filter is unit-testable without live Discord; the command passes
/// the serenity user cache (`users.cache.get` in TS).
fn filter_cached_users(
    rows: Vec<(u64, i64, i64)>,
    is_cached: &dyn Fn(u64) -> bool,
) -> Vec<(u64, i64, i64)> {
    rows.into_iter()
        .filter(|(uid, _, _)| is_cached(*uid))
        .collect()
}

#[poise::command(
    slash_command,
    prefix_command,
    rename = "leaderboard",
    aliases("eclb", "eco-lb", "economy-lb")
)]
pub async fn eco_leaderboard(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    use poise::serenity_prelude as serenity;
    if disabled_reply(&ctx).await? {
        return Ok(());
    }
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    // Blob rows only (`USER.<id>.ECONOMY` exactly); leaf rows under a
    // blob path must not double-count.
    let rows: Vec<(String, String)> = sqlx::query_as::<_, (String, String)>(
        "SELECT key_name, value FROM kv WHERE guild_id = ? AND key_name LIKE 'USER.%.ECONOMY%'",
    )
    .bind(&gid)
    .fetch_all(&ctx.data().pool)
    .await
    .unwrap_or_default();
    let mut parsed: Vec<(u64, i64, i64)> = rows
        .iter()
        .filter_map(|(k, v)| {
            let rest = k.strip_prefix("USER.")?;
            let (id, tail) = rest.split_once('.')?;
            if tail != "ECONOMY" {
                return None;
            }
            let id: u64 = id.parse().ok()?;
            let a: EconAccount = serde_json::from_str(v).ok()?;
            Some((id, a.money + a.bank, a.bank))
        })
        .collect();
    parsed.sort_by_key(|a| std::cmp::Reverse(a.1));
    // Skip rows whose user is not in the gateway cache, mirroring
    // `users.cache.get(i)` + `if (!user ...) continue` in TS.
    parsed = filter_cached_users(parsed, &|uid| ctx.cache().user(uid).is_some());
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    if parsed.is_empty() {
        ctx.say(
            crate::lang::get(&code, "perm_list_no_user")
                .unwrap_or_else(|| "No economy data.".to_string()),
        )
        .await?;
        return Ok(());
    }
    let coin = coin_markup(&ctx).await;
    let bank_name =
        crate::lang::get(&code, "balance_embed_fields1_name").unwrap_or_else(|| "Bank".to_string());
    let money_name = crate::lang::get(&code, "balance_embed_fields2_name")
        .unwrap_or_else(|| "Wallet".to_string());
    let page_word = crate::lang::get(&code, "var_page").unwrap_or_else(|| "Page".to_string());
    let title = crate::lang::get(&code, "economy_leaderboard_embed_title")
        .map(|s| s.replace("${interaction.guild.name}", &guild_name(&ctx)))
        .unwrap_or_else(|| "Economy leaderboard".to_string());
    // Text podium for the top 3, mirroring the podium PNG content
    // (username + formatted wealth).
    let podium: Vec<String> = parsed
        .iter()
        .take(3)
        .enumerate()
        .map(|(i, (uid, total, _))| {
            format!(
                "{} <@{uid}> — **{}**",
                medal_for(i),
                format_num(*total as f64)
            )
        })
        .collect();
    let items_per_page = 10usize;
    let total_pages = parsed.len().div_ceil(items_per_page);
    let (fname, fbytes) = crate::commands::shared::footer_parts(&ctx, &gid).await;
    let mk_embed = |page: usize| {
        let start = page * items_per_page;
        let lines: Vec<String> = parsed
            .iter()
            .skip(start)
            .take(items_per_page)
            .enumerate()
            .map(|(i, (uid, total, bank))| {
                let rank = start + i;
                let money = total - bank;
                format!(
                    "{} **{}** ・ <@{uid}>\n  ┖ {coin} **{}** ({bank_name}) + **{}** ({money_name})",
                    medal_for(rank),
                    rank + 1,
                    format_num(*bank as f64),
                    format_num(money as f64),
                )
            })
            .collect();
        let desc = if page == 0 {
            format!("{}\n\n{}", podium.join("\n"), lines.join("\n"))
        } else {
            lines.join("\n")
        };
        let footer = crate::commands::shared::footer_page_text(
            &fname,
            &page_word,
            (page + 1) as u64,
            total_pages as u64,
        );
        serenity::CreateEmbed::default()
            .title(title.clone())
            .colour(0xFFD700)
            .description(desc)
            .footer(
                serenity::CreateEmbedFooter::new(footer).icon_url(if fbytes.is_some() {
                    "attachment://footer_icon.png".to_string()
                } else {
                    String::new()
                }),
            )
            .timestamp(serenity::Timestamp::now())
    };
    let mk_row = |page: usize| {
        serenity::CreateActionRow::Buttons(vec![
            serenity::CreateButton::new("eco-lb-first")
                .style(serenity::ButtonStyle::Primary)
                .label("<<<")
                .disabled(page == 0),
            serenity::CreateButton::new("eco-lb-prev")
                .style(serenity::ButtonStyle::Primary)
                .label("<")
                .disabled(page == 0),
            serenity::CreateButton::new("eco-lb-page")
                .style(serenity::ButtonStyle::Secondary)
                .label(format!("{page_word} {}/{}", page + 1, total_pages))
                .disabled(true),
            serenity::CreateButton::new("eco-lb-next")
                .style(serenity::ButtonStyle::Primary)
                .label(">")
                .disabled(page + 1 >= total_pages),
            serenity::CreateButton::new("eco-lb-last")
                .style(serenity::ButtonStyle::Primary)
                .label(">>>")
                .disabled(page + 1 >= total_pages),
        ])
    };
    let mut reply = poise::CreateReply::default()
        .embed(mk_embed(0))
        .components(vec![mk_row(0)]);
    if let Some(bytes) = fbytes.clone() {
        reply = reply.attachment(serenity::CreateAttachment::bytes(bytes, "footer_icon.png"));
    }
    let handle = ctx.send(reply).await?;
    let mut msg = handle.into_message().await?;
    let mut page = 0usize;
    // Mirrors the 15-minute button collector; no author filter in TS.
    loop {
        let press = msg
            .await_component_interaction(ctx.serenity_context().shard.clone())
            .timeout(std::time::Duration::from_secs(60 * 15))
            .await;
        let Some(press) = press else { break };
        if !press.data.custom_id.starts_with("eco-lb-") {
            continue;
        }
        match press.data.custom_id.as_str() {
            "eco-lb-first" => page = 0,
            "eco-lb-prev" => page = page.saturating_sub(1),
            "eco-lb-next" => {
                if page + 1 < total_pages {
                    page += 1;
                }
            }
            "eco-lb-last" => page = total_pages - 1,
            _ => continue,
        }
        let _ = press
            .create_response(
                ctx.http(),
                serenity::CreateInteractionResponse::UpdateMessage(
                    serenity::CreateInteractionResponseMessage::new()
                        .embed(mk_embed(page))
                        .components(vec![mk_row(page)]),
                ),
            )
            .await;
    }
    // Disable the row when the collector ends, like the TS end handler.
    let end_row = serenity::CreateActionRow::Buttons(vec![
        serenity::CreateButton::new("eco-lb-first")
            .style(serenity::ButtonStyle::Secondary)
            .label("<<<")
            .disabled(true),
        serenity::CreateButton::new("eco-lb-prev")
            .style(serenity::ButtonStyle::Secondary)
            .label("<")
            .disabled(true),
        serenity::CreateButton::new("eco-lb-page")
            .style(serenity::ButtonStyle::Primary)
            .label(format!("{page_word} {}/{}", page + 1, total_pages))
            .disabled(true),
        serenity::CreateButton::new("eco-lb-next")
            .style(serenity::ButtonStyle::Secondary)
            .label(">")
            .disabled(true),
        serenity::CreateButton::new("eco-lb-last")
            .style(serenity::ButtonStyle::Secondary)
            .label(">>>")
            .disabled(true),
    ]);
    let _ = msg
        .edit(
            ctx.http(),
            serenity::EditMessage::new().components(vec![end_row]),
        )
        .await;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::filter_cached_users;

    #[test]
    fn uncached_rows_are_skipped_like_ts() {
        // Mirrors `!leaderboard.ts` (`users.cache.get(i)` +
        // `if (!user ...) continue`): rows without a cached user never
        // reach the board; survivor order is preserved.
        let rows = vec![(1u64, 300i64, 100i64), (2, 200, 50), (3, 100, 0)];
        let out = filter_cached_users(rows, &|uid| uid != 2);
        assert_eq!(out, vec![(1u64, 300i64, 100i64), (3, 100, 0)]);
        assert!(filter_cached_users(vec![], &|_| true).is_empty());
    }
}
