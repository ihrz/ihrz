use super::*;
use poise::serenity_prelude as serenity;

#[poise::command(
    slash_command,
    prefix_command,
    rename = "warnlist",
    aliases("warns", "listwarns", "listwarn", "warnslist", "sanctions"),
    default_member_permissions = "MODERATE_MEMBERS"
)]
pub async fn mod_warnlist(
    ctx: Ctx<'_>,
    #[description = "Member"] user: serenity::User,
    #[description = "Page"] page: Option<i64>,
) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let warns = load_warns(&ctx.data().pool, &gid, user.id.get()).await;
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    let t = |k: &str| crate::lang::get(&code, k).unwrap_or_default();
    if warns.is_empty() {
        let no = emoji(&ctx, "No", "❌").await;
        ctx.say(
            crate::lang::get(&code, "warnlist_no_data")
                .map(|s| {
                    s.replace("${client.iHorizon_Emojis.No}", &no)
                        .replace("${member?.toString()}", &user.to_string())
                })
                .unwrap_or_else(|| "No warns.".to_string()),
        )
        .await?;
        return Ok(());
    }
    // Plain-text pages (5 per page like TS); page state only, no collectors.
    let (start, end, pages) = paginate(warns.len(), LIST_PAGE_SIZE, page.unwrap_or(1));
    let cur = start / LIST_PAGE_SIZE + 1;
    let name = user
        .global_name
        .clone()
        .unwrap_or_else(|| user.name.clone());
    let title = t("warnlist_embed_title")
        .replace("${member?.user.globalName}", &name)
        .replace(
            "${i / usersPerPage + 1}",
            &((start / LIST_PAGE_SIZE) + 1).to_string(),
        );
    let unknown = t("var_unknown");
    let body = warns[start..end]
        .iter()
        .map(|w| {
            t("warnlist_embed_desc")
                .replace("${x.id}", &w.id)
                .replace(
                    "${format(x.timestamp, 'DD/MM/YYYY')}",
                    &crate::funcs::format_date(w.at / 1000, "DD/MM/YYYY"),
                )
                .replace("${x.authorID}", &unknown)
                .replace("${x.reason}", &w.reason)
        })
        .collect::<Vec<_>>()
        .join("\n");
    ctx.say(format!("{title} ({cur}/{pages})\n{body}")).await?;
    Ok(())
}
