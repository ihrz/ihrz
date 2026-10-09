use super::*;

#[poise::command(
    slash_command,
    prefix_command,
    rename = "remove",
    default_member_permissions = "MANAGE_GUILD"
)]
pub async fn blogger_remove(
    ctx: Ctx<'_>,
    #[description = "Blog id"] id: String,
) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let mut blogs = load_blogs(&ctx.data().pool, &gid).await;
    let before = blogs.len();
    blogs.retain(|b| b.id != id.trim());
    if blogs.len() == before {
        let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
        ctx.say(
            crate::lang::get(&code, "blogger_blog_remove_not_found")
                .unwrap_or_else(|| "Not found.".to_string()),
        )
        .await?;
        return Ok(());
    }
    crate::db::kv_set(
        &ctx.data().pool,
        &gid,
        "BLOGGER.blogs",
        &serde_json::to_string(&blogs)?,
    )
    .await?;
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    ctx.say(
        crate::lang::get(&code, "blogger_blog_remove_success")
            .map(|s| s.replace("${blogId}", id.trim()))
            .unwrap_or_else(|| "Blog removed.".to_string()),
    )
    .await?;
    Ok(())
}
