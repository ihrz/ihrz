use super::*;

/// Rank medal per position. Mirrors `!leaderboard.ts`
/// (`` `🥇 ` `` — the trailing space inside the code span is part of
/// the TS literal, so it lives in the medal value, not the format).
fn medal_for(rank: usize) -> &'static str {
    match rank {
        0 => "🥇 ",
        1 => "🥈 ",
        2 => "🥉 ",
        _ => "💠 ",
    }
}

/// Page count for `total` entries at `per_page` rows (10/page in TS).
fn page_count(total: usize, per_page: usize) -> usize {
    total.div_ceil(per_page.max(1))
}

/// Routed board scan: `USER.<uid>.XP_LEVELING` rows walked first, then
/// legacy-only `RANKS.<uid>` rows. Table values win on uid conflicts,
/// mirroring the D3 merged-scan precedent (economy board_rows).
async fn board_rows(pool: &crate::db::Pool, guild_id: &str) -> Vec<(u64, RankEntry)> {
    use crate::commands::owner::main::{legacy_scan, tbl_get_value};
    use std::collections::BTreeMap;
    let mut merged: BTreeMap<u64, RankEntry> = BTreeMap::new();
    // Legacy compat first (lowest priority): dual-written rows keep both.
    for (k, v) in legacy_scan(pool, guild_id, "RANKS.").await {
        let Ok(id): Result<u64, _> = k.strip_prefix("RANKS.").unwrap_or("").parse() else {
            continue;
        };
        if let Ok(e) = serde_json::from_str::<RankEntry>(&v) {
            merged.insert(id, e);
        }
    }
    if let Some(root) = tbl_get_value(pool, guild_id, "RANKS").await {
        if let Some(obj) = root.as_object() {
            for (id_s, doc) in obj {
                let Ok(id): Result<u64, _> = id_s.parse() else {
                    continue;
                };
                if let Ok(e) = serde_json::from_value::<RankEntry>(doc.clone()) {
                    merged.insert(id, e);
                }
            }
        }
    }
    for (k, v) in legacy_scan(pool, guild_id, "USER.").await {
        let rest = match k.strip_prefix("USER.") {
            Some(r) => r,
            None => continue,
        };
        let (id, tail) = match rest.split_once('.') {
            Some(p) => p,
            None => continue,
        };
        if tail != "XP_LEVELING" {
            continue;
        }
        let Ok(id): Result<u64, _> = id.parse() else {
            continue;
        };
        if let Ok(e) = serde_json::from_str::<RankEntry>(&v) {
            merged.insert(id, e);
        }
    }
    if let Some(root) = tbl_get_value(pool, guild_id, "USER").await {
        if let Some(obj) = root.as_object() {
            for (id_s, node) in obj {
                let Ok(id): Result<u64, _> = id_s.parse() else {
                    continue;
                };
                if let Some(doc) = node.get("XP_LEVELING") {
                    if let Ok(e) = serde_json::from_value::<RankEntry>(doc.clone()) {
                        merged.insert(id, e);
                    }
                }
            }
        }
    }
    let mut parsed: Vec<(u64, RankEntry)> = merged.into_iter().collect();
    parsed.sort_by_key(|a| std::cmp::Reverse(a.1.xptotal));
    parsed
}

/// Get the xp's leaderboard of the guild!
#[poise::command(
    slash_command,
    prefix_command,
    rename = "leaderboard",
    aliases("rankslb", "ranks-leaderboard")
)]
pub async fn ranks_leaderboard(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    use poise::serenity_prelude as serenity;
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    let mut parsed = board_rows(&ctx.data().pool, &gid).await;
    // Skip rows whose user is not in the gateway cache, mirroring
    // `users.cache.get(i)` + `if (!user ...) continue` in TS.
    parsed.retain(|(uid, _)| ctx.cache().user(*uid).is_some());
    if parsed.is_empty() {
        ctx.say(
            crate::lang::get(&code, "perm_list_no_user")
                .unwrap_or_else(|| "No user found".to_string()),
        )
        .await?;
        return Ok(());
    }
    let lvl_word = crate::lang::get(&code, "var_level").unwrap_or_else(|| "Level".to_string());
    let page_word = crate::lang::get(&code, "var_page").unwrap_or_else(|| "Page".to_string());
    let title = crate::lang::get(&code, "ranks_leaderboard_embed_title")
        .unwrap_or_else(|| "🏆 Server Leaderboard of Legends".to_string());
    let not_for_you = crate::lang::get(&code, "help_not_for_you")
        .unwrap_or_else(|| "This interaction is not for you".to_string());
    let lvl_label = |level: u64| {
        crate::lang::get(&code, "ranks_config_var_level")
            .map(|s| s.replace("{level}", &level.to_string()))
            .unwrap_or_else(|| format!("Level {level}"))
    };
    // Top-3 podium data (mirrors the `podiumRanksModule.html` slots):
    // username, guild-lang level label, beautified XP
    // (`formatNumber`), and an embedded avatar snapshot (never a raw
    // CDN URL). Only the top 3 hit the network; rows below reuse text.
    let mut podium: Vec<crate::cards::PodiumRankEntry> = Vec::new();
    for (uid, e) in parsed.iter().take(8) {
        // Owned snapshot first: the cache guard is not Send and must
        // drop before the avatar fetch await below.
        // U3: the `retain` above already drops off-cache users (TS
        // `if (!user ...) continue` parity, and it also drives the
        // empty-board reply), so the dead `<@uid>` fallback arm is
        // dropped: a `None` here is only a cache race and skips.
        // (Match form, not let-else: the CacheRef guard must drop
        // before the avatar-fetch await below — it is not Send.)
        let (name, face) = match ctx.cache().user(*uid) {
            Some(u) => (u.name.clone(), Some(u.face())),
            None => continue,
        };
        let avatar = if podium.len() < 3 {
            match face {
                Some(url) => crate::image64::image64_data_url(&url, "image/png").await,
                None => None,
            }
        } else {
            None
        };
        podium.push(crate::cards::PodiumRankEntry {
            name,
            level_label: lvl_label(e.level),
            xp_text: super::beautify_number(e.xptotal),
            avatar,
        });
    }
    let svg = crate::cards::podium_ranks_svg(&title, &podium);
    // Pagination setup: 10 entries per page like TS `itemsPerPage`.
    let items_per_page = 10usize;
    let total_pages = page_count(parsed.len(), items_per_page);
    let (fname, fbytes) = crate::commands::shared::footer_parts(&ctx, &gid).await;
    let mk_embed = |page: usize| {
        let start = page * items_per_page;
        let desc = parsed
            .iter()
            .skip(start)
            .take(items_per_page)
            .enumerate()
            .map(|(i, (uid, e))| {
                let rank = start + i;
                format!(
                    "`{}` **{}** ・ <@{uid}>\n  ┖  {lvl_word} **{}** (**{}** XP)",
                    medal_for(rank),
                    rank + 1,
                    e.level,
                    e.xptotal
                )
            })
            .collect::<Vec<_>>()
            .join("\n");
        let footer = crate::commands::shared::footer_page_text(
            &fname,
            &page_word,
            (page + 1) as u64,
            total_pages as u64,
        );
        serenity::CreateEmbed::default()
            .title(title.clone())
            .colour(0xFFC6FA)
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
            serenity::CreateButton::new("rk-lb-first")
                .style(serenity::ButtonStyle::Primary)
                .label("<<<")
                .disabled(page == 0),
            serenity::CreateButton::new("rk-lb-prev")
                .style(serenity::ButtonStyle::Primary)
                .label("<")
                .disabled(page == 0),
            serenity::CreateButton::new("rk-lb-page")
                .style(serenity::ButtonStyle::Secondary)
                .label(format!("{page_word} {}/{}", page + 1, total_pages))
                .disabled(true),
            serenity::CreateButton::new("rk-lb-next")
                .style(serenity::ButtonStyle::Primary)
                .label(">")
                .disabled(page + 1 >= total_pages),
            serenity::CreateButton::new("rk-lb-last")
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
    let author_id = ctx.author().id;
    // Mirrors the 15-minute button collector; only the invoker may turn
    // pages (others get the ephemeral `help_not_for_you` reply like TS).
    loop {
        let press = msg
            .await_component_interaction(ctx.serenity_context().shard.clone())
            .timeout(std::time::Duration::from_secs(60 * 15))
            .await;
        let Some(press) = press else { break };
        if !press.data.custom_id.starts_with("rk-lb-") {
            continue;
        }
        if press.user.id != author_id {
            let _ = press
                .create_response(
                    ctx.http(),
                    serenity::CreateInteractionResponse::Message(
                        serenity::CreateInteractionResponseMessage::new()
                            .content(not_for_you.clone())
                            .ephemeral(true),
                    ),
                )
                .await;
            continue;
        }
        match press.data.custom_id.as_str() {
            "rk-lb-first" => page = 0,
            "rk-lb-prev" => page = page.saturating_sub(1),
            "rk-lb-next" => {
                if page + 1 < total_pages {
                    page += 1;
                }
            }
            "rk-lb-last" => page = total_pages - 1,
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
        serenity::CreateButton::new("rk-lb-first")
            .style(serenity::ButtonStyle::Secondary)
            .label("<<<")
            .disabled(true),
        serenity::CreateButton::new("rk-lb-prev")
            .style(serenity::ButtonStyle::Secondary)
            .label("<")
            .disabled(true),
        serenity::CreateButton::new("rk-lb-page")
            .style(serenity::ButtonStyle::Primary)
            .label(format!("{page_word} {}/{}", page + 1, total_pages))
            .disabled(true),
        serenity::CreateButton::new("rk-lb-next")
            .style(serenity::ButtonStyle::Secondary)
            .label(">")
            .disabled(true),
        serenity::CreateButton::new("rk-lb-last")
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
    use super::{board_rows, medal_for, page_count};

    #[test]
    fn medals_match_ts_leaderboard() {
        assert_eq!(medal_for(0), "🥇 ");
        assert_eq!(medal_for(1), "🥈 ");
        assert_eq!(medal_for(2), "🥉 ");
        assert_eq!(medal_for(3), "💠 ");
        assert_eq!(medal_for(40), "💠 ");
    }

    #[test]
    fn ten_entries_per_page() {
        assert_eq!(page_count(0, 10), 0);
        assert_eq!(page_count(1, 10), 1);
        assert_eq!(page_count(10, 10), 1);
        assert_eq!(page_count(11, 10), 2);
        assert_eq!(page_count(25, 10), 3);
    }

    async fn mem_pool() -> crate::db::Pool {
        crate::db::memory_pool().await
    }

    #[tokio::test]
    async fn board_merges_table_and_legacy_rows_table_wins() {
        use crate::commands::owner::main::table_backend;
        let pool = mem_pool().await;
        // New-key legacy kv row.
        crate::db::kv_set(
            &pool,
            "g",
            "USER.1.XP_LEVELING",
            r#"{"level":2,"xp":10,"xptotal":210}"#,
        )
        .await
        .unwrap();
        // Leaf rows under a blob path never double-count.
        crate::db::kv_set(&pool, "g", "USER.1.XP_LEVELING.xp", "9999")
            .await
            .unwrap();
        // Table-only row (dual-written shape, no legacy row).
        table_backend(&pool)
            .table("g")
            .set(
                "USER.2.XP_LEVELING",
                serde_json::json!({"level": 1, "xp": 0, "xptotal": 100}),
            )
            .await
            .unwrap();
        let rows = board_rows(&pool, "g").await;
        assert_eq!(rows.len(), 2);
        assert_eq!(rows[0].0, 1);
        assert_eq!(rows[1].0, 2);
        assert!(board_rows(&pool, "other").await.is_empty());
        // Dual-written uid: table value wins over the legacy row.
        crate::db::kv_set(
            &pool,
            "g",
            "USER.2.XP_LEVELING",
            r#"{"level":9,"xp":0,"xptotal":9000}"#,
        )
        .await
        .unwrap();
        let rows = board_rows(&pool, "g").await;
        assert_eq!(rows[0].0, 1);
        assert_eq!(rows[0].1.xptotal, 210);
        assert_eq!(rows[1].1.xptotal, 100);
        // Legacy RANKS. rows stay visible for compat.
        crate::db::kv_set(&pool, "g", "RANKS.3", r#"{"level":1,"xp":0,"xptotal":50}"#)
            .await
            .unwrap();
        let rows = board_rows(&pool, "g").await;
        assert_eq!(rows.len(), 3);
        assert_eq!(rows[2].0, 3);
        assert_eq!(rows[2].1.xptotal, 50);
    }

    #[tokio::test]
    async fn xp_leveling_guild_leaves_new_key_wins_legacy_promotes() {
        use crate::commands::ranks::{
            migrated_get, GUILD_MESSAGE_NEW, GUILD_MESSAGE_OLD, GUILD_XPCHANNEL_NEW,
            GUILD_XPCHANNEL_OLD_LIST, GUILD_XPCHANNEL_OLD_SINGLE,
        };
        let pool = mem_pool().await;
        // Legacy-only rows read through the migrated loader and promote.
        crate::db::kv_set(&pool, "g", GUILD_XPCHANNEL_OLD_LIST, r#"["5"]"#)
            .await
            .unwrap();
        crate::db::kv_set(&pool, "g", GUILD_MESSAGE_OLD, "gg {user}")
            .await
            .unwrap();
        let raw = migrated_get(
            &pool,
            "g",
            GUILD_XPCHANNEL_NEW,
            &[GUILD_XPCHANNEL_OLD_SINGLE, GUILD_XPCHANNEL_OLD_LIST],
        )
        .await
        .unwrap();
        assert_eq!(
            serde_json::from_str::<Vec<String>>(&raw).unwrap(),
            vec!["5".to_string()]
        );
        assert_eq!(
            migrated_get(&pool, "g", GUILD_MESSAGE_NEW, &[GUILD_MESSAGE_OLD])
                .await
                .as_deref(),
            Some("gg {user}")
        );
        assert!(crate::db::kv_get(&pool, "g", GUILD_MESSAGE_NEW)
            .await
            .is_some());
        // New-key row wins over the legacy row on conflict.
        crate::commands::ranks::migrated_set(
            &pool,
            "g",
            GUILD_MESSAGE_NEW,
            &[GUILD_MESSAGE_OLD],
            "new tpl",
        )
        .await
        .unwrap();
        assert_eq!(
            migrated_get(&pool, "g", GUILD_MESSAGE_NEW, &[GUILD_MESSAGE_OLD])
                .await
                .as_deref(),
            Some("new tpl")
        );
        assert!(
            migrated_get(&pool, "g", GUILD_MESSAGE_NEW, &[GUILD_MESSAGE_OLD])
                .await
                .is_some()
                && migrated_get(&pool, "other", GUILD_MESSAGE_NEW, &[GUILD_MESSAGE_OLD])
                    .await
                    .is_none()
        );
    }
}
