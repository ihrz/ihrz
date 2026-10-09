use super::*;

#[poise::command(slash_command, prefix_command, rename = "use")]
pub async fn tag_use(
    ctx: Ctx<'_>,
    #[description = "Tag name"] tag_name: String,
) -> Result<(), anyhow::Error> {
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    let name = tag_name.trim().to_ascii_lowercase();
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    if !tag_allowed(&ctx, "whitelist_use").await {
        let create_by = load_tags(&ctx.data().pool, &gid)
            .await
            .stored_tags
            .get(&name)
            .map(|e| e.create_by.clone())
            .unwrap_or_default();
        ctx.say(
            crate::lang::get(&code, "tag_use_not_allowed")
                .map(|s| {
                    s.replace("${tag_name}", &name)
                        .replace("${tag.createBy}", &create_by)
                })
                .unwrap_or_else(|| "Not allowed.".to_string()),
        )
        .await?;
        return Ok(());
    }
    let mut store = load_tags(&ctx.data().pool, &gid).await;
    let Some(entry) = store.stored_tags.get_mut(&name) else {
        ctx.say(
            crate::lang::get(&code, "tag_doesnt_exist")
                .map(|s| s.replace("${tag_name}", &name))
                .unwrap_or_else(|| "Tag doesn't exist.".to_string()),
        )
        .await?;
        return Ok(());
    };
    entry.uses += 1;
    let uses = entry.uses;
    entry.last_use_timestamp = crate::commands::context::now_ms();
    entry.last_use_by = ctx.author().id.get().to_string();
    save_tags(&ctx.data().pool, &gid, &store).await?;
    ctx.say(
        crate::lang::get(&code, "tag_use_command_work")
            .map(|s| s.replace("${tag_name}", &name))
            .unwrap_or_else(|| format!("Tag `{name}` (uses {uses}).")),
    )
    .await?;
    Ok(())
}
