use super::*;

/// Info of a tag
#[poise::command(
    slash_command,
    prefix_command,
    rename = "info",
    aliases("tag-info"),
    description_localized("fr", "Info d'un tag"),
    description_localized("ja", "タグの情報"),
    description_localized("ru", "Информация о теге"),
    description_localized("es-ES", "Información de una etiqueta")
)]
pub async fn tag_info(
    ctx: Ctx<'_>,
    #[description_localized("fr", "Nom du tag")]
    #[description_localized("ja", "タグの名前")]
    #[description_localized("ru", "Название тега")]
    #[description_localized("es-ES", "Nombre de la etiqueta")]
    #[description = "Name of the tag"]
    tag_name: String,
) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let name = tag_name.trim().to_string();
    let store = load_tags(&ctx.data().pool, &gid).await;
    let Some(e) = store.stored_tags.get(&name) else {
        ctx.say(
            crate::commands::lang_for(
                &ctx,
                "tag_doesnt_exist",
                "The tag `${tag_name}` doesn't exist!",
            )
            .await
            .replace("${tag_name}", &tag_name),
        )
        .await?;
        return Ok(());
    };
    // App-emoji markups from the boot-warmed cache (was one REST fetch).
    let http = ctx.http();
    let crown = crate::emojis::app_emoji_markup(http, "Crown")
        .await
        .unwrap_or_default();
    let sparkles = crate::emojis::app_emoji_markup(http, "Sparkles")
        .await
        .unwrap_or_default();
    let timer = crate::emojis::app_emoji_markup(http, "Timer")
        .await
        .unwrap_or_default();
    let badge = crate::emojis::app_emoji_markup(http, "Boosting24Months_Badge")
        .await
        .unwrap_or_default();
    let msg_cmd = crate::emojis::app_emoji_markup(http, "Message_Commands")
        .await
        .unwrap_or_default();
    let no_set = crate::commands::lang_for(&ctx, "var_no_set", "Not Set").await;
    let thumb = ctx
        .guild()
        .as_ref()
        .and_then(|g| g.icon_url())
        .or_else(|| Some(ctx.author().face()))
        .or_else(|| Some(ctx.serenity_context().cache.current_user().face()));
    let text = super::TagInfoText {
        title_lbl: &crate::commands::lang_for(&ctx, "tag_name", "Tag").await,
        author_lbl: &crate::commands::lang_for(&ctx, "var_author", "Author").await,
        created_lbl: &crate::commands::lang_for(&ctx, "tag_embed_created_at", "Created At").await,
        updated_lbl: &crate::commands::lang_for(&ctx, "tag_embed_last_update", "Last Update").await,
        uses_lbl: &crate::commands::lang_for(&ctx, "var_uses", "Uses").await,
        updated_by_lbl: &crate::commands::lang_for(
            &ctx,
            "tag_embed_last_updated_by",
            "Last Updated By",
        )
        .await,
        message_lbl: &crate::commands::lang_for(&ctx, "var_message", "Message").await,
        no_set: &no_set,
        crown: &crown,
        sparkles: &sparkles,
        timer: &timer,
        badge: &badge,
        msg_cmd: &msg_cmd,
    };
    let (title, desc) = super::tag_info_text(&name, e, &text);
    let mut embed = poise::serenity_prelude::CreateEmbed::default()
        .title(title)
        .colour(0x00FFFF)
        .description(desc);
    if let Some(url) = thumb {
        embed = embed.thumbnail(url);
    }
    // Second leg: the tag's stored embed rides alongside the info embed.
    // Mirrors !info.ts `embeds: [embed, embed2?.embedSource]`.
    let mut reply = poise::CreateReply::default().embed(embed);
    if crate::commands::utils::admin::embed_post::is_valid_embed_id(Some(&e.embed_id)) {
        let stored = crate::commands::owner::main::tbl_get(
            &ctx.data().pool,
            "metas",
            &crate::commands::utils::admin::embed_post::saved_embed_key(&e.embed_id),
        )
        .await
        .and_then(|s| serde_json::from_str::<serde_json::Value>(&s).ok())
        .and_then(|v| crate::commands::utils::admin::embed_post::stored_embed_source(&v).cloned());
        if let Some(source) = stored {
            reply = reply.embed(
                crate::commands::utils::admin::embed_post::create_embed_from_source(&source),
            );
        }
    }
    ctx.send(reply).await?;
    Ok(())
}
