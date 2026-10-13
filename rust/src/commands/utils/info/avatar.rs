use super::*;

/// Pick the avatar of a user!
// Mirrors utils !avatar.ts.
#[poise::command(
    slash_command,
    prefix_command,
    category = "utils",
    rename = "avatar",
    aliases("pfp", "pp", "pic"),
    description_localized("fr", "Récuperer l'avatar d'un utilisateur"),
    description_localized("ja", "ユーザーのアバターを取得！"),
    description_localized("ru", "Взять аватар пользователя!"),
    description_localized("es-ES", "Tomar el avatar de un usuario!")
)]
pub async fn avatar(
    ctx: Ctx<'_>,
    #[description_localized("fr", "L'utilisateur")]
    #[description_localized("ja", "ユーザー")]
    #[description_localized("ru", "Пользователь")]
    #[description_localized("es-ES", "El usuario")]
    #[description = "The user"]
    user: Option<poise::serenity_prelude::User>,
) -> Result<(), anyhow::Error> {
    let u = user.as_ref().unwrap_or_else(|| ctx.author());
    let url = match &u.avatar {
        Some(hash) => format!(
            "https://cdn.discordapp.com/avatars/{}/{}.png?size=512",
            u.id.get(),
            hash
        ),
        None => u.default_avatar_url(),
    };
    // Title placeholder mirrors `mentionedUser.displayName` in !avatar.ts:62-65:
    // guild-nickname-aware (server nick first), then global name, then username.
    let display = ctx
        .guild_id()
        .and_then(|gid| {
            ctx.serenity_context()
                .cache
                .guild(gid)
                .and_then(|g| g.members.get(&u.id).and_then(|m| m.nick.clone()))
        })
        .or_else(|| u.global_name.clone())
        .unwrap_or_else(|| u.name.clone());
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let (footer_name, footer_bytes) = footer_parts(&ctx, &gid).await;
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    let mut embed = poise::serenity_prelude::CreateEmbed::default()
        .colour(0xadd5ff)
        .title(
            crate::lang::get(&code, "avatar_embed_title")
                .map(|s| s.replace("${mentionedUser.username}", &display))
                .unwrap_or_else(|| format!("{}'s avatar", u.tag())),
        )
        .description(
            crate::lang::get(&code, "avatar_embed_description")
                .unwrap_or_else(|| "Look at this amazing avatar! :D".to_string()),
        )
        .image(url)
        .timestamp(poise::serenity_prelude::Timestamp::now());
    embed = embed_with_footer(embed, &footer_name, footer_bytes.is_some());
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
