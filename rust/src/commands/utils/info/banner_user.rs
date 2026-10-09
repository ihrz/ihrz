use super::*;

/// Show a member's banner. Mirrors utils banner !user.ts.
#[poise::command(
    slash_command,
    prefix_command,
    category = "utils",
    rename = "banner-user",
    aliases("userbanner", "ubanner")
)]
pub async fn banner_user(
    ctx: Ctx<'_>,
    #[description = "Member"] user: Option<poise::serenity_prelude::User>,
) -> Result<(), anyhow::Error> {
    let u = user.as_ref().unwrap_or_else(|| ctx.author());
    let token = crate::config::bot_token().unwrap_or_default();
    let hash = fetch_user_banner_hash(&token, u.id.get()).await;
    let Some(hash) = hash else {
        ctx.say(crate::commands::lang_for(&ctx, "banner_user_no_banner", "No banner.").await)
            .await?;
        return Ok(());
    };
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let (footer_name, footer_bytes) = footer_parts(&ctx, &gid).await;
    let embed = poise::serenity_prelude::CreateEmbed::default()
        .colour(0xC4AFED)
        .title(
            crate::commands::lang_for(&ctx, "banner_user_embed", "${user?.username}")
                .await
                .replace("${user?.username}", &u.name),
        )
        .image(user_banner_url(u.id.get(), &hash));
    let embed = embed_with_footer(embed, &footer_name, footer_bytes.is_some());
    let mut reply = poise::CreateReply::default().embed(embed);
    if let Some(bytes) = footer_bytes {
        reply = reply.attachment(poise::serenity_prelude::CreateAttachment::bytes(
            bytes,
            "footer_icon.png",
        ));
    }
    ctx.send(reply).await?;
    Ok(())
}
