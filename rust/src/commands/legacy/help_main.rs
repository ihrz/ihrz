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
#[poise::command(slash_command, prefix_command, category = "bot")]
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
        owned.len(),
        owner1,
        owner2,
        &pin,
        &badge,
        &crown,
        &region,
    );
    let year = chrono_year();
    let embed = serenity::CreateEmbed::default()
        .description(desc)
        .colour(serenity::Colour::from_rgb(0x00, 0x1e, 0xff))
        .footer(serenity::CreateEmbedFooter::new(format!(
            "© iHorizon {year}"
        )));
    let (first, second) = help_main_row_bounds(cats.len());
    let mut rows = Vec::new();
    for (ri, bounds) in [first, second].into_iter().enumerate() {
        let mut options = Vec::new();
        for c in &cats[bounds] {
            let mut opt =
                serenity::CreateSelectMenuOption::new(c.title.clone(), help_cat_key(&c.title))
                    .description(super::help::help_option_desc(&code, c.fields.len()));
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
        // Same page on both rows; the suffix only keeps the custom
        // id unique. The router falls back to page 0 when the
        // suffix after HELP_SELECT_PREFIX is not a number.
        let custom_id = if ri == 0 {
            format!("{HELP_SELECT_PREFIX}0")
        } else {
            format!("{HELP_SELECT_PREFIX}0r2")
        };
        let select = serenity::CreateSelectMenu::new(
            custom_id,
            serenity::CreateSelectMenuKind::String { options },
        )
        .placeholder(super::help::help_select_placeholder(&code));
        rows.push(serenity::CreateActionRow::SelectMenu(select));
    }
    let reply = ctx
        .send(poise::CreateReply::default().embed(embed).components(rows))
        .await?;
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
}
