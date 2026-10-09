use super::*;

/// The `h` category browser. Mirrors MessageCommands/bot @h.ts.
#[poise::command(slash_command, prefix_command, category = "bot", rename = "h")]
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
