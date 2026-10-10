use super::*;

/// Post a tag (content + embed + optional mention).
// Mirrors !use.ts order: existence check first, then the
// Administrator-or-whitelist_use gate; post as reply when message_id
// fetches, else channel message; confirm + bump counters afterwards.
#[poise::command(slash_command, prefix_command, rename = "use")]
pub async fn tag_use(
    ctx: Ctx<'_>,
    #[description = "Tag name"] tag_name: String,
    #[description = "Member to mention"] mention: Option<poise::serenity_prelude::User>,
    #[description = "Message id to reply to"] message_id: Option<String>,
) -> Result<(), anyhow::Error> {
    use poise::serenity_prelude::CreateMessage;
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    let name = tag_name.trim().to_ascii_lowercase();
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let mut store = load_tags(&ctx.data().pool, &gid).await;
    let Some(entry) = store.stored_tags.get(&name) else {
        ctx.say(
            crate::lang::get(&code, "tag_doesnt_exist")
                .map(|s| s.replace("${tag_name}", &name))
                .unwrap_or_else(|| "The tag `${tag_name}` doesn't exist!".to_string()),
        )
        .await?;
        return Ok(());
    };
    let create_by = entry.create_by.clone();
    let content = entry.content.clone();
    let embed_id = entry.embed_id.clone();
    if !tag_allowed(&ctx, "whitelist_use").await {
        ctx.say(
            crate::lang::get(&code, "tag_use_not_allowed")
                .map(|s| {
                    s.replace("${tag_name}", &name)
                        .replace("${tag.createBy}", &create_by)
                })
                .unwrap_or_else(|| "You are not allowed to use the tag `${tag_name}`.\nYou need the Administrator permission, or you can ask the tag owner <@${tag.createBy}> to add you to the whitelist (`tag wlroles-use`).".to_string()),
        )
        .await?;
        return Ok(());
    }
    // Stored embed payload (metas EMBED.<id>), tolerating a missing row.
    let stored = if crate::commands::utils::admin::embed_post::is_valid_embed_id(Some(&embed_id)) {
        crate::commands::owner::main::tbl_get(
            &ctx.data().pool,
            "metas",
            &crate::commands::utils::admin::embed_post::saved_embed_key(&embed_id),
        )
        .await
        .and_then(|s| serde_json::from_str::<serde_json::Value>(&s).ok())
        .and_then(|v| crate::commands::utils::admin::embed_post::stored_embed_source(&v).cloned())
    } else {
        None
    };
    // Mention wins over stored content, like the TS ternary.
    let text = match (&mention, content.trim().is_empty()) {
        (Some(user), _) => Some(format!("<@{}>", user.id.get())),
        (None, false) => Some(content.clone()),
        (None, true) => None,
    };
    let build = || {
        let mut b = CreateMessage::default();
        if let Some(text) = text.clone() {
            b = b.content(text);
        }
        if let Some(source) = &stored {
            b = b
                .embed(crate::commands::utils::admin::embed_post::create_embed_from_source(source));
        }
        b
    };
    // Reply leg first (TS message.reply); channel-send fallback when no
    // message_id was given or the fetch fails.
    let reply_target = match message_id.as_deref().map(str::trim) {
        Some(s) if !s.is_empty() => s
            .parse::<u64>()
            .ok()
            .map(poise::serenity_prelude::MessageId::new),
        _ => None,
    };
    let mut sent = false;
    if let Some(target) = reply_target {
        if ctx.channel_id().message(ctx.http(), target).await.is_ok() {
            let builder = build().reference_message((ctx.channel_id(), target));
            sent = ctx
                .channel_id()
                .send_message(ctx.http(), builder)
                .await
                .is_ok();
        }
    }
    if !sent {
        ctx.channel_id().send_message(ctx.http(), build()).await?;
    }
    ctx.say(
        crate::lang::get(&code, "tag_use_command_work")
            .map(|s| s.replace("${tag_name}", &name))
            .unwrap_or_else(|| format!("Tag `{name}` sent.")),
    )
    .await?;
    if let Some(entry) = store.stored_tags.get_mut(&name) {
        entry.uses += 1;
        entry.last_use_timestamp = crate::commands::context::now_ms();
        entry.last_use_by = ctx.author().id.get().to_string();
    }
    save_tags(&ctx.data().pool, &gid, &store).await?;
    Ok(())
}
