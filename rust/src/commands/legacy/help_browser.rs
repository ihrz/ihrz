use super::*;

/// The `h` category browser. Mirrors MessageCommands/bot @h.ts.
// Prefix-only like the TS source (`type: "PREFIX_IHORIZON_COMMAND"`):
// no slash registration; prefix help keeps the localizations.
#[poise::command(
    prefix_command,
    category = "bot",
    rename = "h",
    description_localized("fr", "Un menu de help tah les matrixé"),
    description_localized("ja", "OGユーザー向けヘルプメニュー（笑）"),
    description_localized("ru", "меню помощи для OG пользователей"),
    description_localized("es-ES", "menú de ayuda para usuario OG lol")
)]
pub async fn help_browser(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
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
    // TS @h.ts lists one row per client.content leaf (`mod ban`, never
    // the bare roots): reuse the leaf walker, keeping only the
    // prefix-capable rows (messageCmd 1|2, same filter as @h.ts).
    let leaf_cats = crate::commands::legacy::help::collect_help_leaves(
        &all,
        crate::commands::legacy::HELP_CATEGORIES,
        &|k| t(k),
    );
    let owned: Vec<(String, String, String)> = leaf_cats
        .iter()
        .flat_map(|c| {
            c.leaves
                .iter()
                .filter(|l| l.message_cmd != 0)
                .map(|l| (c.name.clone(), l.qualified.clone(), l.desc.clone()))
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
    let year = chrono_year();
    let footer = format!("© iHorizon {year}");
    let desc_tpl = t("hybridcommands_embed_footer_text").replace("${botPrefix}", &prefix);
    let suite_tpl = t("h_suite");
    let suite_desc = t("h_suite_desc");
    render_help_page(
        &ctx,
        pool,
        &gid,
        &cats,
        0,
        None,
        &prefix,
        &desc_tpl,
        &footer,
        &suite_tpl,
        &suite_desc,
    )
    .await
}
