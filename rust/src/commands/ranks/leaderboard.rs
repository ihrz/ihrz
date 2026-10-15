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
    aliases("rankslb", "ranks-leaderboard"),
    name_localized("fr", "classement"),
    name_localized("ja", "leaderboard"),
    name_localized("ru", "leaderboard"),
    name_localized("es-ES", "leaderboard"),
    description_localized("fr", "Obtenez le classement XP du serveur"),
    description_localized("ja", "サーバーのXPランキングを取得！"),
    description_localized("ru", "Получить таблицу лидеров по XP!"),
    description_localized("es-ES", "Obtener la tabla de clasificación de XP del servidor!")
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
    // (`formatNumber`). No avatar-image leg: the SVG card renders the
    // initial-circle fallback for every slot, like the economy podium
    // (mention + wealth only, no per-user network fetch).
    let mut podium: Vec<crate::cards::PodiumRankEntry> = Vec::new();
    for (uid, e) in parsed.iter().take(8) {
        // U3: the `retain` above already drops off-cache users (TS
        // `if (!user ...) continue` parity, and it also drives the
        // empty-board reply), so the dead `<@uid>` fallback arm is
        // dropped: a `None` here is only a cache race and skips.
        let Some(user) = ctx.cache().user(*uid) else {
            continue;
        };
        let name = user.name.clone();
        podium.push(crate::cards::PodiumRankEntry {
            name,
            level_label: lvl_label(e.level),
            xp_text: super::beautify_number(e.xptotal),
            avatar: None,
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
            .footer(if fbytes.is_some() {
                serenity::CreateEmbedFooter::new(footer).icon_url("attachment://footer_icon.png")
            } else {
                // No icon means no icon_url at all, never an empty string.
                serenity::CreateEmbedFooter::new(footer)
            })
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

/// `podiumRanksModule` HTML template
/// (`src/assets/html/podiumRanksModule.html`, TS
/// `!leaderboard.ts:86`). The Rust render path reuses the
/// self-contained `cards::podium_ranks_svg` output (already wired
/// above), so this fill exists to pin the TS placeholder mapping;
/// it is covered by `podium_ranks_html_fill_replaces_every_placeholder`.
const PODIUM_RANKS_TEMPLATE: &str =
    include_str!("../../../../src/assets/html/podiumRanksModule.html");

/// One podium slot for the HTML fill: pre-rendered username, level
/// label, avatar URL and beautified XP.
pub struct PodiumRankSlot {
    pub username: String,
    pub level: String,
    pub avatar: String,
    pub xp: String,
}

/// Fill the `podiumRanksModule` template. Mirrors the replace chain
/// in TS `!leaderboard.ts:94-157` (`replaceAll` throughout; the
/// `{title}` replace runs
/// `lang.ranks_leaderboard_embed_title.replace("${interaction.guild?.name}",
/// guild.name)` first, which the caller pre-renders).
pub fn podium_ranks_card_html(
    title: &str,
    first: &PodiumRankSlot,
    second: &PodiumRankSlot,
    third: &PodiumRankSlot,
) -> String {
    PODIUM_RANKS_TEMPLATE
        .replace("{title}", title)
        .replace("{1_username}", &first.username)
        .replace("{2_username}", &second.username)
        .replace("{3_username}", &third.username)
        .replace("{1_level}", &first.level)
        .replace("{2_level}", &second.level)
        .replace("{3_level}", &third.level)
        .replace("{1_avatar}", &first.avatar)
        .replace("{2_avatar}", &second.avatar)
        .replace("{3_avatar}", &third.avatar)
        .replace("{1_xp}", &first.xp)
        .replace("{2_xp}", &second.xp)
        .replace("{3_xp}", &third.xp)
}

#[cfg(test)]
mod podium_ranks_html_tests {
    use super::{podium_ranks_card_html, PodiumRankSlot};

    #[test]
    fn podium_ranks_html_fill_replaces_every_placeholder() {
        let slot = |u: &str| PodiumRankSlot {
            username: u.to_string(),
            level: "Level 1".to_string(),
            avatar: "AV".to_string(),
            xp: "100".to_string(),
        };
        let html = podium_ranks_card_html("T", &slot("a"), &slot("b"), &slot("c"));
        for ph in [
            "{title}",
            "{1_username}",
            "{2_username}",
            "{3_username}",
            "{1_level}",
            "{2_level}",
            "{3_level}",
            "{1_avatar}",
            "{2_avatar}",
            "{3_avatar}",
            "{1_xp}",
            "{2_xp}",
            "{3_xp}",
        ] {
            assert!(!html.contains(ph), "placeholder left: {ph}");
        }
    }
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
