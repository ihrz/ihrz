use super::*;

/// Browse all commands by category.
// Rich `/help` main menu (tip embed + two category select rows).
// Mirrors the initial run in HybridCommands/bot/help.ts: the tip
// embed (help_tip_embed + replaceAll chain, slash-command token
// filled with the TOTAL content length) with the two select rows
// split via `Math.ceil(categories.length / 2)`.
//
// Slash-name note: `botcat::help` owns rename `help` (mirrors
// HybridCommands/bot/help.ts), so this entry point registers as
// `help_main` (no rename collision). The rows
// reuse the routed browser protocol (`HELP_SELECT_PREFIX` +
// `helpmsg_key` gate, handled by `handle_help_component`), so
// picking a category lands on the same module page as `/h`: no new
// custom ids, no events_handler change.
#[poise::command(
    slash_command,
    prefix_command,
    category = "bot",
    description_localized("fr", "..."),
    description_localized("ja", "..."),
    description_localized("ru", "..."),
    description_localized("es-ES", "...")
)]
pub async fn help_main(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    let Some(guild_id) = ctx.guild_id() else {
        return Ok(());
    };
    let gid = guild_id.get().to_string();
    let pool = &ctx.data().pool;
    let prefix =
        crate::db::guild_prefix(pool, Some(guild_id.get()), &ctx.data().config.prefix).await;
    let code = crate::db::guild_lang(pool, Some(guild_id.get())).await;
    let t = |k: &str| crate::lang::get(&code, k).unwrap_or_default();
    let all = crate::commands::all();
    let owned: Vec<(String, String, String)> = all
        .iter()
        .map(|c| {
            (
                c.category.clone().unwrap_or_default(),
                c.name.clone(),
                c.description.clone().unwrap_or_default(),
            )
        })
        .collect();
    let reg_refs: Vec<(&str, &str, &str)> = owned
        .iter()
        .map(|(a, b, c)| (a.as_str(), b.as_str(), c.as_str()))
        .collect();
    let table: Vec<(&str, &str, &str, &str, u32)> = HELP_CATEGORIES.to_vec();
    let cats = collect_help_cats(&reg_refs, &table, &|k| t(k), &prefix);
    if cats.is_empty() {
        return Ok(());
    }
    let http = ctx.http();
    let bot_name = ctx.serenity_context().cache.current_user().name.clone();
    let owners = &ctx.data().config.owners;
    let owner1 = owners.first().map(String::as_str).unwrap_or("");
    // Initial run quirk: missing second owner renders empty
    // (the back-branch falls back to owners[0] instead).
    let owner2 = owners.get(1).map(String::as_str).unwrap_or("");
    let pin = crate::emojis::app_emoji_markup(http, "Pin")
        .await
        .unwrap_or_default();
    let badge = crate::emojis::app_emoji_markup(http, "Slash_Bot_Badge")
        .await
        .unwrap_or_default();
    let crown = crate::emojis::app_emoji_markup(http, "Crown")
        .await
        .unwrap_or_default();
    let region = crate::emojis::app_emoji_markup(http, "VC_Region")
        .await
        .unwrap_or_default();
    let desc = super::help::help_tip_embed(
        &code,
        &bot_name,
        cats.len(),
        crate::commands::content_leaf_count(&all),
        owner1,
        owner2,
        &pin,
        &badge,
        &crown,
        &region,
    );
    let (footer_name, icon) = crate::commands::shared::footer_parts(&ctx, &gid).await;
    let with_icon = icon.is_some();
    let search = crate::emojis::app_emoji_markup(http, "Search")
        .await
        .unwrap_or_default();
    let embed = serenity::CreateEmbed::default()
        .description(desc)
        .colour(serenity::Colour::from_rgb(0x00, 0x1e, 0xff))
        .image(crate::funcs::guild_banner_url(pool, &gid).await)
        .footer(
            serenity::CreateEmbedFooter::new(footer_name).icon_url(if with_icon {
                "attachment://footer_icon.png".to_string()
            } else {
                String::new()
            }),
        )
        .thumbnail("attachment://footer_icon.png")
        .timestamp(chrono::Utc::now());
    let (first, second) = help_main_row_bounds(cats.len());
    let rows = build_help_main_rows(http, &code, &cats, first, second).await;
    let mut reply = poise::CreateReply::default()
        .embed(embed)
        .components(rows)
        .content(format!("> {search}  **https://www.ihorizon.org/search/**"));
    if let Some(bytes) = icon {
        reply = reply.attachment(poise::serenity_prelude::CreateAttachment::bytes(
            bytes,
            "footer_icon.png",
        ));
    }
    let reply = ctx.send(reply).await?;
    let mid = reply.message().await?.id.get();
    let _ = crate::commands::owner::main::routed_set(
        pool,
        &gid,
        &gid,
        &helpmsg_key(mid),
        &ctx.author().id.get().to_string(),
    )
    .await;
    Ok(())
}

/// Split category indices across the two main-menu select rows.
/// Mirrors `Math.ceil(categories.length / 2)` (two rows).
pub fn help_main_row_bounds(total: usize) -> (std::ops::Range<usize>, std::ops::Range<usize>) {
    let per = super::help::help_menus_split(total).min(total);
    (0..per, per..total)
}

/// Custom ids for the two /help overview select rows. Verbatim TS ids
/// (`help-menu-1` / `help-menu-2`); routed by `handle_help_component`
/// to the overview path (index values + back navigation), NOT the
/// `h`-browser page protocol.
pub fn help_overview_select_ids() -> (String, String) {
    (
        super::help::HELP_OVERVIEW_SELECT_1.to_string(),
        super::help::HELP_OVERVIEW_SELECT_2.to_string(),
    )
}

/// Build the two /help overview select rows. Mirrors help.ts:455-489:
/// each row carries back first, then its slice of the NAME-SORTED
/// categories with global index values, per-category emoji, and
/// command-count descriptions. `cats` must already be name-sorted
/// (see `super::help::sort_help_cats_by_name`); the split reuses the
/// same `Math.ceil(len / 2)` bounds as the browser rows.
pub async fn build_help_overview_rows<C: super::help::OverviewCat>(
    http: &serenity::Http,
    code: &str,
    cats: &[C],
) -> Vec<serenity::CreateActionRow> {
    let (first, second) = help_main_row_bounds(cats.len());
    let (first_id, second_id) = help_overview_select_ids();
    let mut rows = Vec::new();
    for (bounds, custom_id) in [(first, first_id), (second, second_id)] {
        let mut options = Vec::new();
        for o in super::help::help_overview_options(code, cats, bounds) {
            let mut opt =
                serenity::CreateSelectMenuOption::new(o.label, o.value).description(o.description);
            if let Some((id, name, _animated)) =
                crate::emojis::cached_emoji_entry(http, &o.emoji_name).await
            {
                opt = opt.emoji(serenity::ReactionType::Custom {
                    animated: false,
                    id: serenity::EmojiId::new(id),
                    name: Some(name),
                });
            }
            options.push(opt);
        }
        let select = serenity::CreateSelectMenu::new(
            custom_id,
            serenity::CreateSelectMenuKind::String { options },
        )
        .placeholder(super::help::help_select_placeholder(code));
        rows.push(serenity::CreateActionRow::SelectMenu(select));
    }
    rows
}
/// Custom ids for the two main-menu category select rows.
/// Same page on both rows; the suffix only keeps the custom id
/// unique. The router falls back to page 0 when the suffix after
/// HELP_SELECT_PREFIX is not a number.
pub fn help_main_select_ids() -> (String, String) {
    (
        format!("{HELP_SELECT_PREFIX}0"),
        format!("{HELP_SELECT_PREFIX}0r2"),
    )
}

/// Build the two category select rows for the `help_main` browser menu
/// (routed through `handle_help_component` on the title-key protocol).
pub async fn build_help_main_rows(
    http: &serenity::Http,
    code: &str,
    cats: &[HelpBrowserCat],
    first: std::ops::Range<usize>,
    second: std::ops::Range<usize>,
) -> Vec<serenity::CreateActionRow> {
    let (first_id, second_id) = help_main_select_ids();
    let mut rows = Vec::new();
    for (bounds, custom_id) in [(first, first_id), (second, second_id)] {
        let mut options = Vec::new();
        for c in &cats[bounds] {
            let mut opt =
                serenity::CreateSelectMenuOption::new(c.title.clone(), help_cat_key(&c.title))
                    .description(super::help::help_option_desc(code, c.fields.len()));
            if let Some((id, name, _animated)) =
                crate::emojis::cached_emoji_entry(http, &c.emoji_name).await
            {
                opt = opt.emoji(serenity::ReactionType::Custom {
                    animated: false,
                    id: serenity::EmojiId::new(id),
                    name: Some(name),
                });
            }
            options.push(opt);
        }
        if options.is_empty() {
            continue;
        }
        let select = serenity::CreateSelectMenu::new(
            custom_id,
            serenity::CreateSelectMenuKind::String { options },
        )
        .placeholder(super::help::help_select_placeholder(code));
        rows.push(serenity::CreateActionRow::SelectMenu(select));
    }
    rows
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn main_menu_rows_cover_all_categories_once() {
        assert_eq!(help_main_row_bounds(26), (0..13, 13..26));
        assert_eq!(help_main_row_bounds(1), (0..1, 1..1));
        assert_eq!(help_main_row_bounds(0), (0..0, 0..0));
        for n in [2usize, 3, 25, 27, 50] {
            let (a, b) = help_main_row_bounds(n);
            assert_eq!(a.start, 0);
            assert_eq!(a.end, b.start);
            assert_eq!(b.end, n);
            assert_eq!(a.len() + b.len(), n);
        }
    }

    #[test]
    fn main_menu_select_ids_route_shaped() {
        let (first, second) = help_main_select_ids();
        assert!(first.starts_with(HELP_SELECT_PREFIX));
        assert!(second.starts_with(HELP_SELECT_PREFIX));
        assert_ne!(first, second);
        // Router strips the prefix and parses the page, falling back
        // to page 0 for the non-numeric `0r2` suffix.
        assert_eq!(
            first
                .strip_prefix(HELP_SELECT_PREFIX)
                .unwrap()
                .parse::<usize>()
                .unwrap(),
            0
        );
        assert_eq!(
            second
                .strip_prefix(HELP_SELECT_PREFIX)
                .unwrap()
                .parse::<usize>()
                .unwrap_or(0),
            0
        );
    }

    #[test]
    fn overview_select_ids_are_ts_parity() {
        // Verbatim TS custom ids, on their own protocol (never the
        // browser prefix, so the router can tell them apart).
        let (first, second) = help_overview_select_ids();
        assert_eq!(first, "help-menu-1");
        assert_eq!(second, "help-menu-2");
        assert_ne!(first, second);
        assert!(!first.starts_with(HELP_SELECT_PREFIX));
        assert!(!second.starts_with(HELP_SELECT_PREFIX));
        assert!(super::super::help::is_help_overview_select(&first));
        assert!(super::super::help::is_help_overview_select(&second));
        // Same ceil(len / 2) split as the TS overview menus.
        assert_eq!(help_main_row_bounds(26), (0..13, 13..26));
    }
}
