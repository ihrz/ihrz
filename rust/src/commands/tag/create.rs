use super::*;

#[poise::command(slash_command, prefix_command, rename = "create")]

pub async fn tag_create(
    ctx: Ctx<'_>,
    #[description = "Tag name"] tag_name: String,
    #[description = "Embed id"] embed_id: String,
) -> Result<(), anyhow::Error> {
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    if !tag_allowed(&ctx, "whitelist_create").await {
        ctx.say(
            crate::lang::get(&code, "tag_create_not_permited")
                .unwrap_or_else(|| "Not allowed.".to_string()),
        )
        .await?;
        return Ok(());
    }
    let name = tag_name.trim().to_ascii_lowercase();
    if !valid_tag_name(&name) {
        ctx.say(
            crate::lang::get(&code, "tag_create_not_good_name").unwrap_or_else(|| {
                "The tag name must not include spaces and must not exceed 16 characters."
                    .to_string()
            }),
        )
        .await?;
        return Ok(());
    }
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let mut store = load_tags(&ctx.data().pool, &gid).await;
    if store.stored_tags.contains_key(&name) {
        ctx.say(
            crate::lang::get(&code, "tag_create_already_exist")
                .unwrap_or_else(|| "The tag already exists.".to_string()),
        )
        .await?;
        return Ok(());
    }
    store.stored_tags.insert(
        name.clone(),
        TagEntry {
            embed_id,
            create_by: ctx.author().id.get().to_string(),
            uses: 0,
            content: String::new(),
            create_timestamp: crate::commands::context::now_ms(),
            last_use_timestamp: 0,
            last_use_by: String::new(),
        },
    );
    save_tags(&ctx.data().pool, &gid, &store).await?;
    ctx.say(
        crate::lang::get(&code, "tag_create_command_work")
            .map(|s| s.replace("${tag_name}", &name))
            .unwrap_or_else(|| format!("Tag `{name}` created.")),
    )
    .await?;
    Ok(())
}
