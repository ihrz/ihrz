use super::*;

/// Create a tag (name + embed + optional content).
// Mirrors !create.ts: whitelist_create gate, length>16-or-space rule,
// duplicate guard, EMBED-table existence check before storing.
#[poise::command(
    slash_command,
    prefix_command,
    rename = "create",
    aliases("tag-create")
)]
pub async fn tag_create(
    ctx: Ctx<'_>,
    #[description = "Tag name"] tag_name: String,
    #[description = "Embed id"] embed_id: String,
    #[description = "Message content"] message_content: Option<String>,
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
    let name = tag_name.trim().to_string();
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
    // The tag must point at a stored embed (TS: tag_create_embed_doesnt_exist).
    let embed_ok = crate::commands::utils::admin::embed_post::is_valid_embed_id(Some(&embed_id))
        && {
            let raw = crate::commands::owner::main::tbl_get(
                &ctx.data().pool,
                "metas",
                &crate::commands::utils::admin::embed_post::saved_embed_key(&embed_id),
            )
            .await;
            raw.and_then(|s| serde_json::from_str::<serde_json::Value>(&s).ok())
                .and_then(|v| {
                    crate::commands::utils::admin::embed_post::stored_embed_source(&v).cloned()
                })
                .is_some()
        };
    if !embed_ok {
        ctx.say(
            crate::lang::get(&code, "tag_create_embed_doesnt_exist")
                .unwrap_or_else(|| "That embed doesn't exist.".to_string()),
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
            content: message_content.unwrap_or_default(),
            create_timestamp: crate::commands::context::now_ms(),
            last_use_timestamp: crate::commands::context::now_ms(),
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
