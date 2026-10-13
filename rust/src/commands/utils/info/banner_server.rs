use super::*;

/// Get the banner of the server!
// Mirrors utils banner !server.ts.
#[poise::command(
    slash_command,
    prefix_command,
    category = "utils",
    rename = "server",
    aliases("banner-server", "serverbanner"),
    description_localized("fr", "Récupérer la bannière du serveur"),
    description_localized("ja", "サーバーのバナーを取得！"),
    description_localized("ru", "Получить баннер сервера!"),
    description_localized("es-ES", "Obtener el banner del servidor!")
)]
pub async fn banner_server(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    let Some(guild_id) = ctx.guild_id() else {
        return Ok(());
    };
    let gid = guild_id.get().to_string();
    // Pin extension png + size 4096 explicitly, like
    // `bannerURL({ extension: "png", size: 4096 })` in banner !server.ts.
    let banner_hash = ctx
        .serenity_context()
        .cache
        .guild(guild_id)
        .and_then(|g| g.banner.clone());
    let Some(banner_hash) = banner_hash else {
        ctx.say(
            crate::commands::lang_for(&ctx, "banner_guild_no_banner", "The server has no banner.")
                .await,
        )
        .await?;
        return Ok(());
    };
    let banner_url = format!(
        "https://cdn.discordapp.com/banners/{}/{}.png?size=4096",
        guild_id.get(),
        banner_hash
    );
    let (footer_name, footer_bytes) = footer_parts(&ctx, &gid).await;
    let embed = poise::serenity_prelude::CreateEmbed::default()
        .colour(0xC4AFED)
        .title(
            crate::commands::lang_for(
                &ctx,
                "banner_guild_embed",
                "**This is the server's banner!**",
            )
            .await,
        )
        .image(banner_url);
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
