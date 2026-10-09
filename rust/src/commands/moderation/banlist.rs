use super::*;

/// List banned members.
#[poise::command(
    slash_command,
    prefix_command,
    rename = "banlist",
    aliases("bans", "listban", "listbans", "banlists"),
    default_member_permissions = "MANAGE_GUILD"
)]
pub async fn mod_banlist(
    ctx: Ctx<'_>,
    #[description = "Page"] page: Option<i64>,
) -> Result<(), anyhow::Error> {
    let Some(guild_id) = ctx.guild_id() else {
        return Ok(());
    };
    let bans = guild_id
        .bans(ctx.http(), None, None)
        .await
        .unwrap_or_default();
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    let t = |k: &str| crate::lang::get(&code, k).unwrap_or_default();
    if bans.is_empty() {
        ctx.say(t("var_no_one_banned")).await?;
        return Ok(());
    }
    let (start, end, pages) = paginate(bans.len(), LIST_PAGE_SIZE, page.unwrap_or(1));
    let cur = start / LIST_PAGE_SIZE + 1;
    let body = bans[start..end]
        .iter()
        .map(|b| {
            format!(
                "[{}](https://discord.com/users/{}) ({})",
                b.user.id.get(),
                b.user.id.get(),
                b.user
            )
        })
        .collect::<Vec<_>>()
        .join("\n");
    ctx.say(format!(
        "{title} ({cur}/{pages})\n{body}",
        title = t("var_banned_user")
    ))
    .await?;
    Ok(())
}
