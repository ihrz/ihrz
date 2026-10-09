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

/// User love. Mirrors the "Estimate the love" user command in
/// UserApplicationCommands/love.ts (invoker + target pair, always100
/// couples from config always score 100 like the TS `found` check).
#[poise::command(context_menu_command = "Estimate the love")]
pub async fn user_love(
    ctx: Ctx<'_>,
    #[description = "Member"] user: poise::serenity_prelude::User,
) -> Result<(), anyhow::Error> {
    let score = crate::commands::fun::love::love_roll(
        ctx.author().id.get(),
        user.id.get(),
        &ctx.data().config.always100,
    );
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    ctx.say(
        crate::lang::get(&code, "msg_love_score")
            .map(|s| s.replace("{score}", &score.to_string()))
            .unwrap_or_else(|| format!("Love: {score}%")),
    )
    .await?;
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
