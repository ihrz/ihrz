use super::*;

/// Toggle the discussion thread under each confession. Mirrors !thread.ts.
#[poise::command(
    slash_command,
    prefix_command,
    rename = "thread",
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn confession_thread(
    ctx: Ctx<'_>,
    #[description = "yes or no"] action: String,
) -> Result<(), anyhow::Error> {
    let Some(create) = parse_yes_no(&action) else {
        let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
        ctx.say(
            crate::lang::get(&code, "msg_use_yes_no").unwrap_or_else(|| "Use yes/no.".to_string()),
        )
        .await?;
        return Ok(());
    };
    let Some(gid) = ctx.guild_id().map(|g| g.get().to_string()) else {
        return Ok(());
    };
    let pool = &ctx.data().pool;
    crate::db::kv_set(
        pool,
        &gid,
        "GUILD.CONFESSION.thread",
        if create { "yes" } else { "no" },
    )
    .await?;
    let code = crate::db::guild_lang(pool, ctx.guild_id().map(|g| g.get())).await;
    let key = if create {
        "confession_thread_enabled"
    } else {
        "confession_thread_disabled"
    };
    ctx.say(crate::lang::get(&code, key).unwrap_or_else(|| key.to_string()))
        .await?;
    Ok(())
}
