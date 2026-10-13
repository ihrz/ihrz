use super::*;

/// Get the banner of a specified user!
// Mirrors utils banner !user.ts.
// Animated `a_` hashes use gif (see `user_banner_url`).
#[poise::command(
    slash_command,
    prefix_command,
    category = "utils",
    rename = "user",
    aliases("banner-user", "userbanner", "ubanner"),
    description_localized(
        "fr",
        "Récuperer la bannière des éléments spécifiés (serveur/utilisateur)"
    ),
    description_localized("ja", "指定ユーザーのバナーを取得！"),
    description_localized("ru", "Получить баннер указанного пользователя!"),
    description_localized("es-ES", "Obtener el banner de un usuario especificado!")
)]
pub async fn banner_user(
    ctx: Ctx<'_>,
    #[description_localized("fr", "Qu'est-ce que l'utilisateur alors ?")]
    #[description_localized("ja", "どのユーザーですか？")]
    #[description_localized("ru", "Какой пользователь?")]
    #[description_localized("es-ES", "Cual es el usuario entonces?")]
    #[description = "What the user then?"]
    user: Option<poise::serenity_prelude::User>,
) -> Result<(), anyhow::Error> {
    let u = user.as_ref().unwrap_or_else(|| ctx.author());
    let token = crate::config::bot_token().unwrap_or_default();
    let hash = fetch_user_banner_hash(&token, u.id.get()).await;
    let Some(hash) = hash else {
        ctx.say(
            crate::commands::lang_for(&ctx, "banner_user_no_banner", "This user has no banner.")
                .await,
        )
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
            crate::commands::lang_for(
                &ctx,
                "banner_user_embed",
                "**This is ${user?.username}'s banner!**",
            )
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
