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

/// `podiumEconomyModule` HTML card (`src/assets/html/podiumEconomyModule.html`,
/// TS `economy/!leaderboard.ts:96`). Rendered through HorizonGateway
/// like the TS `html2png` call (`!leaderboard.ts:187-192`); the
/// text board stays as fallback when the gateway is unset/fails.
const PODIUM_ECONOMY_TEMPLATE: &str =
    include_str!("../../../../src/assets/html/podiumEconomyModule.html");

/// html2png options mirror (TS `!leaderboard.ts:187-192`).
const PODIUM_ECONOMY_OPTIONS_JSON: &str = r#"{"elementSelector":"body","omitBackground":true,"selectElement":false,"width":1024,"height":512}"#;

/// Avatar fallback when the member is not in cache. Mirrors the
/// `"https://www.ihorizon.org/assets/img/unknown-user.png"` fallback
/// in the TS podium replaces.
pub const PODIUM_AVATAR_FALLBACK: &str = "https://www.ihorizon.org/assets/img/unknown-user.png";

/// One podium slot for the HTML fill: pre-rendered username,
/// beautified wealth and avatar URL.
pub struct PodiumEcoSlot {
    pub username: String,
    pub wealth: String,
    pub avatar: String,
}

/// Fill the `podiumEconomyModule` template. Mirrors the replace
/// chain in TS `economy/!leaderboard.ts:101-141` (`replaceAll`
/// throughout; the `{title}` source replace is the backtick-quoted
/// no-op, so the caller passes the same title as the embed).
pub fn podium_economy_card_html(
    title: &str,
    first: &PodiumEcoSlot,
    second: &PodiumEcoSlot,
    third: &PodiumEcoSlot,
    coin_emoji: &str,
) -> String {
    PODIUM_ECONOMY_TEMPLATE
        .replace("{title}", title)
        .replace("{1_username}", &first.username)
        .replace("{2_username}", &second.username)
        .replace("{3_username}", &third.username)
        .replace("{1_wealth}", &first.wealth)
        .replace("{2_wealth}", &second.wealth)
        .replace("{3_wealth}", &third.wealth)
        .replace("{1_avatar}", &first.avatar)
        .replace("{2_avatar}", &second.avatar)
        .replace("{3_avatar}", &third.avatar)
        .replace("{coin_emoji}", coin_emoji)
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

/// Pager button custom ids. Byte-exact with `!leaderboard.ts`
/// (`first`/`previous`/`page_info`/`next`/`last`); the end-handler reuses
/// the same ids with flipped styles.
pub const LB_FIRST: &str = "first";
pub const LB_PREV: &str = "previous";
pub const LB_PAGE: &str = "page_info";
pub const LB_NEXT: &str = "next";
pub const LB_LAST: &str = "last";

/// Get the users balance's leaderboard of the guild!
#[poise::command(
    slash_command,
    prefix_command,
    category = "economy",
    rename = "leaderboard",
    aliases("eclb", "eco-lb", "economy-lb"),
    description_localized("fr", "Obtenez le classement du solde des utilisateurs du serveur"),
    description_localized("ja", "サーバーのユーザー残高ランキングを取得！"),
    description_localized("ru", "Получить таблицу лидеров по балансу!"),
    description_localized("es-ES", "Obtener la tabla de clasificación de saldos del servidor!")
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
    // the attached PNG card, never as embed text). The card renders
    // through HorizonGateway (`!leaderboard.ts:187-192`); gateway
    // unset/fail keeps the text-only board.
    let unknown =
        crate::lang::get(&code, "profil_unknown").unwrap_or_else(|| "Unknown".to_string());
    let eco_slot = |(uid, total, _, _): &(u64, f64, f64, f64)| {
        let (username, avatar) = match ctx.cache().user(*uid) {
            Some(u) => (
                u.name.clone(),
                crate::commands::fun::avatar_png_url(&u, 128),
            ),
            None => (unknown.clone(), PODIUM_AVATAR_FALLBACK.to_string()),
        };
        PodiumEcoSlot {
            username,
            wealth: format_num(*total),
            avatar,
        }
    };
    let pad_slot = || PodiumEcoSlot {
        username: unknown.clone(),
        wealth: format_num(0.0),
        avatar: PODIUM_AVATAR_FALLBACK.to_string(),
    };
    let (s1, s2, s3) = (
        parsed.first().map(&eco_slot).unwrap_or_else(&pad_slot),
        parsed.get(1).map(&eco_slot).unwrap_or_else(&pad_slot),
        parsed.get(2).map(&eco_slot).unwrap_or_else(&pad_slot),
    );
    let card_png: Option<Vec<u8>> = match ctx
        .data()
        .config
        .gateway_internal()
        .map(|base| (base, crate::config::api_token().unwrap_or_default()))
    {
        Some((base, token)) => {
            let html = podium_economy_card_html(&title, &s1, &s2, &s3, &coin);
            crate::funcs::gateway_render_html(
                &base,
                &token,
                &html,
                PODIUM_ECONOMY_OPTIONS_JSON,
                &[],
                Some(std::time::Duration::from_secs(30)),
            )
            .await
            .ok()
        }
        None => None,
    };
    let items_per_page = 10usize;
    let total_pages = parsed.len().div_ceil(items_per_page);
    let (fname, fbytes) = crate::commands::shared::footer_parts(&ctx, &gid).await;
    // Copy the flag out: `mk_embed` borrows it across later uses of `card_png`.
    let has_card = card_png.is_some();
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
        let mut embed = serenity::CreateEmbed::default()
            .title(title.clone())
            .colour(0xFFD700)
            .description(desc);
        // The podium PNG is attached once at send time (like TS);
        // page updates reuse it, so the image leg is always armed
        // when the render succeeded.
        if has_card {
            embed = embed.image("attachment://image.png");
        }
        embed
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
            serenity::CreateButton::new(LB_FIRST)
                .style(serenity::ButtonStyle::Primary)
                .label("<<<")
                .disabled(page == 0),
            serenity::CreateButton::new(LB_PREV)
                .style(serenity::ButtonStyle::Primary)
                .label("<")
                .disabled(page == 0),
            serenity::CreateButton::new(LB_PAGE)
                .style(serenity::ButtonStyle::Secondary)
                .label(format!("{page_word} {}/{}", page + 1, total_pages))
                .disabled(true),
            serenity::CreateButton::new(LB_NEXT)
                .style(serenity::ButtonStyle::Primary)
                .label(">")
                .disabled(page + 1 >= total_pages),
            serenity::CreateButton::new(LB_LAST)
                .style(serenity::ButtonStyle::Primary)
                .label(">>>")
                .disabled(page + 1 >= total_pages),
        ])
    };
    let mut reply = poise::CreateReply::default()
        .embed(mk_embed(0))
        .components(vec![mk_row(0)]);
    // Podium card (`economy/!leaderboard.ts:187-195`, `image.png`).
    if let Some(png) = card_png {
        reply = reply.attachment(serenity::CreateAttachment::bytes(png, "image.png"));
    }
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
        // Mirrors the TS switch (`first`/`previous`/`next`/`last`): no
        // author filter, no custom-id prefilter. Unknown ids fall through
        // and re-render the same page, like the TS update below the switch.
        match press.data.custom_id.as_str() {
            id if id == LB_FIRST => page = 0,
            id if id == LB_PREV => page = page.saturating_sub(1),
            id if id == LB_NEXT => {
                if page + 1 < total_pages {
                    page += 1;
                }
            }
            id if id == LB_LAST => page = total_pages - 1,
            _ => {}
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
        serenity::CreateButton::new(LB_FIRST)
            .style(serenity::ButtonStyle::Secondary)
            .label("<<<")
            .disabled(true),
        serenity::CreateButton::new(LB_PREV)
            .style(serenity::ButtonStyle::Secondary)
            .label("<")
            .disabled(true),
        serenity::CreateButton::new(LB_PAGE)
            .style(serenity::ButtonStyle::Primary)
            .label(format!("{page_word} {}/{}", page + 1, total_pages))
            .disabled(true),
        serenity::CreateButton::new(LB_NEXT)
            .style(serenity::ButtonStyle::Secondary)
            .label(">")
            .disabled(true),
        serenity::CreateButton::new(LB_LAST)
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
mod podium_economy_html_tests {
    use super::{podium_economy_card_html, PodiumEcoSlot};

    #[test]
    fn podium_economy_fill_replaces_every_placeholder() {
        let slot = |u: &str, w: &str| PodiumEcoSlot {
            username: u.to_string(),
            wealth: w.to_string(),
            avatar: "AV".to_string(),
        };
        let html =
            podium_economy_card_html("T", &slot("a", "1"), &slot("b", "2"), &slot("c", "3"), "🪙");
        for ph in [
            "{title}",
            "{1_username}",
            "{2_username}",
            "{3_username}",
            "{1_wealth}",
            "{2_wealth}",
            "{3_wealth}",
            "{1_avatar}",
            "{2_avatar}",
            "{3_avatar}",
            "{coin_emoji}",
        ] {
            assert!(!html.contains(ph), "placeholder left: {ph}");
        }
    }
}

#[cfg(test)]
mod tests {
    use super::board_rows;
    use super::filter_cached_users;
    use super::{LB_FIRST, LB_LAST, LB_NEXT, LB_PAGE, LB_PREV};

    #[test]
    fn pager_custom_ids_are_byte_exact_with_ts() {
        // `!leaderboard.ts` setCustomId values, live row and end handler.
        assert_eq!(
            (LB_FIRST, LB_PREV, LB_PAGE, LB_NEXT, LB_LAST),
            ("first", "previous", "page_info", "next", "last")
        );
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
