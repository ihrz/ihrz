use super::*;

/// List muted members.
#[poise::command(
    slash_command,
    prefix_command,
    rename = "mutelist",
    aliases("allmute", "allmutes", "alltimeout", "alltimeouts"),
    default_member_permissions = "MODERATE_MEMBERS"
)]
pub async fn mod_mutelist(
    ctx: Ctx<'_>,
    #[description = "Page"] page: Option<i64>,
) -> Result<(), anyhow::Error> {
    let Some(guild_id) = ctx.guild_id() else {
        return Ok(());
    };
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    let t = |k: &str| crate::lang::get(&code, k).unwrap_or_default();
    let muted: Vec<(String, i64)> = ctx
        .serenity_context()
        .cache
        .guild(guild_id)
        .map(|g| {
            g.members
                .values()
                .filter(|m| m.communication_disabled_until.is_some())
                .map(|m| {
                    let remaining = m
                        .communication_disabled_until
                        .map(|until| (until.unix_timestamp() * 1000 - crate::bot::now_ms()).max(0))
                        .unwrap_or(0);
                    (m.user.to_string(), remaining)
                })
                .collect()
        })
        .unwrap_or_default();
    if muted.is_empty() {
        ctx.say(t("prevnames_undetected")).await?;
        return Ok(());
    }
    let (start, end, pages) = paginate(muted.len(), LIST_PAGE_SIZE, page.unwrap_or(1));
    let cur = start / LIST_PAGE_SIZE + 1;
    let body = muted[start..end]
        .iter()
        .map(|(mention, remaining)| {
            format!(
                "{mention} - `{}`",
                crate::funcs::beautiful_ms(*remaining as f64)
            )
        })
        .collect::<Vec<_>>()
        .join("\n");
    ctx.say(format!("({cur}/{pages})\n{body}")).await?;
    Ok(())
}
