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
    rows: Vec<(u64, f64, f64, f64)>,
    is_cached: &dyn Fn(u64) -> bool,
) -> Vec<(u64, f64, f64, f64)> {
    rows.into_iter()
        .filter(|(uid, _, _, _)| is_cached(*uid))
        .collect()
}

/// Top-3 podium rows for the SVG card: mention + non-negative wealth.
/// Pure so the mapping is unit-testable without Discord.
/// Mirrors the `{1,2,3_username}` / `{1,2,3_wealth}` slots of the
/// `podiumEconomyModule` card in `economy/!leaderboard.ts:111-125`.
/// DELIBERATE KEEP (differs from `economy/!leaderboard.ts:81-86`): TS
/// sums `(bank || 0) + (money || 0)` raw, so a debted account renders a
/// negative podium wealth. The Rust side saturates at 0 — the TS
/// negative is a display bug (an SVG bar cannot render a negative
/// width), not data; stored balances are untouched.
fn podium_entries(rows: &[(u64, f64, f64, f64)]) -> Vec<(String, u64)> {
    rows.iter()
        .take(3)
        .map(|(uid, total, _, _)| (format!("<@{uid}>"), total.max(0.0) as u64))
        .collect()
}

/// Routed board scan: table `USER` root walked first, then legacy-only
/// blob rows (`USER.<id>.ECONOMY` exactly; leaf rows under a blob path
/// must not double-count). Table values win on uid conflicts.
/// Mirrors the D3 merged-scan precedent (schedule user_entry_texts).
/// Rows carry `(uid, total, money, bank)`: the wallet leg is the stored
/// `money` field like TS (`entry.money` in `!leaderboard.ts`), never
/// recomputed as `total - bank` (float subtraction drifts on
/// fractional balances).
async fn board_rows(pool: &crate::db::Pool, guild_id: &str) -> Vec<(u64, f64, f64, f64)> {
    use crate::commands::owner::main::{legacy_scan, tbl_get_value};
    use std::collections::BTreeMap;
    let mut merged: BTreeMap<u64, (f64, f64, f64)> = BTreeMap::new();
    for (k, v) in legacy_scan(pool, guild_id, "USER.").await {
        let rest = match k.strip_prefix("USER.") {
            Some(r) => r,
            None => continue,
        };
        let (id, tail) = match rest.split_once('.') {
            Some(p) => p,
            None => continue,
        };
        if tail != "ECONOMY" {
            continue;
        }
        let Ok(id): Result<u64, _> = id.parse() else {
            continue;
        };
        if let Ok(a) = serde_json::from_str::<EconAccount>(&v) {
            merged.insert(id, (a.money + a.bank, a.money, a.bank));
        }
    }
    if let Some(root) = tbl_get_value(pool, guild_id, "USER").await {
        if let Some(obj) = root.as_object() {
            for (id_s, node) in obj {
                let Ok(id): Result<u64, _> = id_s.parse() else {
                    continue;
                };
                if let Some(doc) = node.get("ECONOMY") {
                    if let Ok(a) = serde_json::from_value::<EconAccount>(doc.clone()) {
                        merged.insert(id, (a.money + a.bank, a.money, a.bank));
                    }
                }
            }
        }
    }
    let mut parsed: Vec<(u64, f64, f64, f64)> = merged
        .into_iter()
        .map(|(id, (total, money, bank))| (id, total, money, bank))
        .collect();
    // Mirrors `!leaderboard.ts:79` (`b.totalWealth - a.totalWealth`,
    // descending); NaN sorts last instead of sticking in place.
    parsed.sort_by(|a, b| b.1.partial_cmp(&a.1).unwrap_or(std::cmp::Ordering::Equal));
    parsed
}

/// Get the xp's leaderboard of the guild!
#[poise::command(
    slash_command,
    prefix_command,
    rename = "leaderboard",
    aliases("eclb", "eco-lb", "economy-lb", "economy-leaderboard")
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
    let mut parsed = board_rows(&ctx.data().pool, &gid).await;
    // Skip rows whose user is not in the gateway cache, mirroring
    // `users.cache.get(i)` + `if (!user ...) continue` in TS.
    parsed = filter_cached_users(parsed, &|uid| ctx.cache().user(uid).is_some());
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    if parsed.is_empty() {
        ctx.say(
            crate::lang::get(&code, "perm_list_no_user")
                .unwrap_or_else(|| "No user found".to_string()),
        )
        .await?;
        return Ok(());
    }
    let coin = coin_markup(&ctx).await;
    let bank_name =
        crate::lang::get(&code, "balance_embed_fields1_name").unwrap_or_else(|| "Bank".to_string());
    let money_name = crate::lang::get(&code, "balance_embed_fields2_name")
        .unwrap_or_else(|| "In Balance".to_string());
    let page_word = crate::lang::get(&code, "var_page").unwrap_or_else(|| "Page".to_string());
    let title = crate::lang::get(&code, "economy_leaderboard_embed_title")
        // TS also runs a backtick-quoted title replace when building the
        // PNG html (`` `${interaction.guild.name}` ``) which matches
        // nothing (no-op); the working `${...}` replace in `createEmbed`
        // is the one mirrored here.
        .map(|s| s.replace("${interaction.guild.name}", &guild_name(&ctx)))
        .unwrap_or_else(|| "Economy leaderboard".to_string());
    // Rows only on every page like TS (`createEmbed`: the podium lives in
    // the attached card, never as embed text).
    let items_per_page = 10usize;
    let total_pages = parsed.len().div_ceil(items_per_page);
    let (fname, fbytes) = crate::commands::shared::footer_parts(&ctx, &gid).await;
    // Podium card mirroring the `podiumEconomyModule` PNG content (top
    // usernames + wealth). Chromium/html2png rendering is unavailable, so
    // the self-contained SVG from cards.rs is attached instead of rendering
    // PNG — same pattern as the ranks leaderboard. No PNG render attempted.
    let svg = crate::cards::podium_svg_with_unit(&podium_entries(&parsed), "coins");
    let mk_embed = |page: usize| {
        let start = page * items_per_page;
        let lines: Vec<String> = parsed
            .iter()
            .skip(start)
            .take(items_per_page)
            .enumerate()
            .map(|(i, (uid, _, money, bank))| {
                let rank = start + i;
                format!(
                    "{} **{}** ・ <@{uid}>\n  ┖ {coin} **{}** ({bank_name}) + **{}** ({money_name})",
                    medal_for(rank),
                    rank + 1,
                    format_num(*bank),
                    format_num(*money),
                )
            })
            .collect();
        let desc = lines.join("\n");
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
            .image("attachment://podium.svg")
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
        .components(vec![mk_row(0)])
        .attachment(serenity::CreateAttachment::bytes(
            svg.into_bytes(),
            "podium.svg",
        ));
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
    use super::board_rows;
    use super::filter_cached_users;
    use super::podium_entries;

    #[test]
    fn podium_maps_mentions_and_clamps_negative_wealth() {
        let rows = vec![(1u64, 300.0f64, 200.0f64, 100.0f64), (2, -50.0, -50.0, 0.0)];
        assert_eq!(
            podium_entries(&rows),
            vec![("<@1>".to_string(), 300u64), ("<@2>".to_string(), 0u64),]
        );
        assert!(podium_entries(&[]).is_empty());
        // SVG card only takes the top 3, like the TS podium card.
        let many: Vec<(u64, f64, f64, f64)> = (1..=10).map(|i| (i, 100.0, 100.0, 0.0)).collect();
        assert_eq!(podium_entries(&many).len(), 3);
    }

    async fn mem_pool() -> crate::db::Pool {
        crate::db::memory_pool().await
    }

    #[test]
    fn uncached_rows_are_skipped_like_ts() {
        // Mirrors `!leaderboard.ts` (`users.cache.get(i)` +
        // `if (!user ...) continue`): rows without a cached user never
        // reach the board; survivor order is preserved.
        let rows = vec![
            (1u64, 300.0f64, 200.0f64, 100.0f64),
            (2, 200.0, 150.0, 50.0),
            (3, 100.0, 100.0, 0.0),
        ];
        let out = filter_cached_users(rows, &|uid| uid != 2);
        assert_eq!(
            out,
            vec![(1u64, 300.0f64, 200.0f64, 100.0f64), (3, 100.0, 100.0, 0.0)]
        );
        assert!(filter_cached_users(vec![], &|_| true).is_empty());
    }

    #[tokio::test]
    async fn board_merges_table_and_legacy_rows_table_wins() {
        use crate::commands::owner::main::{legacy_scan, table_backend};
        let pool = mem_pool().await;
        // Legacy-only blob row.
        crate::db::kv_set(&pool, "g", "USER.1.ECONOMY", r#"{"money":100,"bank":50}"#)
            .await
            .unwrap();
        // Legacy leaf rows under a blob path never double-count.
        crate::db::kv_set(&pool, "g", "USER.1.ECONOMY.money", "9999")
            .await
            .unwrap();
        // Table-only row (dual-written shape, no legacy row).
        table_backend(&pool)
            .table("g")
            .set(
                "USER.2.ECONOMY",
                serde_json::json!({"money": 10, "bank": 5}),
            )
            .await
            .unwrap();
        let rows = board_rows(&pool, "g").await;
        // Rows carry (uid, total, money, bank): the wallet leg is the
        // stored money field, never total - bank.
        assert_eq!(
            rows,
            vec![(1u64, 150.0f64, 100.0f64, 50.0f64), (2, 15.0, 10.0, 5.0)]
        );
        // Other guilds are isolated.
        assert!(board_rows(&pool, "other").await.is_empty());
        // Dual-written uid: table value wins over the legacy row.
        crate::db::kv_set(&pool, "g", "USER.2.ECONOMY", r#"{"money":1000,"bank":0}"#)
            .await
            .unwrap();
        let rows = board_rows(&pool, "g").await;
        assert_eq!(rows[0], (1u64, 150.0f64, 100.0f64, 50.0f64));
        assert_eq!(rows[1], (2u64, 15.0f64, 10.0f64, 5.0f64));
        assert!(!legacy_scan(&pool, "g", "USER.").await.is_empty());
    }
}
