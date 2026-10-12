use super::*;

/// User Lookup. Mirrors User Lookup -> utils userinfo bridge.
#[poise::command(
    context_menu_command = "User Lookup",
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn user_lookup(
    ctx: Ctx<'_>,
    #[description = "Member"] user: poise::serenity_prelude::User,
) -> Result<(), anyhow::Error> {
    let created = user.created_at().unix_timestamp();
    let face_url = user.face();
    let face_bytes = crate::commands::botcat::download_bytes(&face_url).await;
    let embed = poise::serenity_prelude::CreateEmbed::default()
        .title(user.tag())
        .field("ID", user.id.get().to_string(), true)
        .field("Bot", user.bot.to_string(), true)
        .field("Created", format!("<t:{created}:F>"), false);
    let embed = if face_bytes.is_some() {
        embed.thumbnail("attachment://avatar.png")
    } else {
        embed.thumbnail(face_url)
    };
    let mut reply = poise::CreateReply::default().embed(embed).ephemeral(true);
    if let Some(bytes) = face_bytes {
        reply = reply.attachment(poise::serenity_prelude::CreateAttachment::bytes(
            bytes,
            "avatar.png",
        ));
    }
    ctx.send(reply).await?;
    Ok(())
}

/// User love.
///
/// Mirrors the "Estimate the love" user command in
/// UserApplicationCommands/love.ts (invoker + target pair, love.png
/// composite embed, always100 couples from config always score 100
/// like the TS `found` check; `love_command_error` fallback like the
/// TS catch path).
#[poise::command(context_menu_command = "Estimate the love")]
pub async fn user_love(
    ctx: Ctx<'_>,
    #[description = "Member"] user: poise::serenity_prelude::User,
) -> Result<(), anyhow::Error> {
    use crate::commands::fun::love::{love_composite_png, love_description, love_heart_url};
    let u1 = ctx.author().clone();
    let u2 = user;
    let score = crate::commands::fun::love::love_roll(
        u1.id.get(),
        u2.id.get(),
        &ctx.data().config.always100,
    );
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    // Mirrors `displayAvatarURL({ extension: "png", size: 512 })`
    // (forced PNG, like the slash /love port). The downloads run
    // concurrently: this context command never defers (`thinking: false`
    // in UserApplicationCommands/love.ts), so sequential downloads can
    // outlast the 3s interaction window and the single end reply then
    // expires with no ack.
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let (avatar_url1, avatar_url2) = (
        crate::commands::fun::avatar_png_url(&u1, 512),
        crate::commands::fun::avatar_png_url(&u2, 512),
    );
    let (avatar1, avatar2, heart, (fname, fbytes)) = tokio::join!(
        crate::commands::shared::download_bytes(&avatar_url1),
        crate::commands::shared::download_bytes(&avatar_url2),
        crate::commands::shared::download_bytes(love_heart_url()),
        crate::commands::shared::footer_parts(&ctx, &gid),
    );
    let png = match (avatar1, avatar2) {
        (Some(a1), Some(a2)) => love_composite_png(&a1, &a2, heart.as_deref()),
        _ => None,
    };
    let mut embed = poise::serenity_prelude::CreateEmbed::default()
        .colour(0xFFC0CB)
        .title("💕")
        .description(love_description(
            &crate::lang::get(&code, "love_embed_description").unwrap_or_else(|| {
                "**${user1.username}** + **${user2.username}** = __${randomNumber}%__ of love 💗"
                    .to_string()
            }),
            // Mirrors UserApplicationCommands/love.ts:76-77 (`globalName`,
            // not `username` like the slash !love.ts); falls back to the
            // username when no global name is set instead of throwing.
            u1.global_name.as_deref().unwrap_or(&u1.name),
            u2.global_name.as_deref().unwrap_or(&u2.name),
            score,
        ));
    if png.is_some() {
        embed = embed.image("attachment://love.png");
    }
    embed = crate::commands::shared::embed_with_footer(embed, &fname, fbytes.is_some())
        .timestamp(poise::serenity_prelude::Timestamp::now());
    let mut reply = poise::CreateReply::default().embed(embed);
    if let Some(bytes) = png {
        reply = reply.attachment(poise::serenity_prelude::CreateAttachment::bytes(
            bytes, "love.png",
        ));
    }
    if let Some(bytes) = fbytes {
        reply = reply.attachment(poise::serenity_prelude::CreateAttachment::bytes(
            bytes,
            "footer_icon.png",
        ));
    }
    if let Err(error) = ctx.send(reply).await {
        tracing::warn!("user_love reply failed: {error}");
        ctx.say(
            crate::lang::get(&code, "love_command_error").unwrap_or_else(|| {
                "An error occurred while trying to create the image".to_string()
            }),
        )
        .await?;
    }
    Ok(())
}

#[cfg(test)]
mod context_user_tests {
    use super::{user_lookup, user_love};

    /// Name locks: must stay identical to UserApplicationCommands/*.ts.
    /// (poise keeps the context-menu display string in `context_menu_name`.)
    #[test]
    fn context_menu_names_match_ts() {
        assert_eq!(
            user_lookup().context_menu_name.as_deref(),
            Some("User Lookup")
        );
        assert_eq!(
            user_love().context_menu_name.as_deref(),
            Some("Estimate the love")
        );
    }
}
