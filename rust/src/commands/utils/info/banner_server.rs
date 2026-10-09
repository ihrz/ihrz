use super::*;

/// Show the server's banner. Mirrors utils banner !server.ts.
#[poise::command(
    slash_command,
    prefix_command,
    category = "utils",
    rename = "banner-server",
    aliases("serverbanner")
)]
pub async fn banner_server(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    let Some(guild_id) = ctx.guild_id() else {
        return Ok(());
    };
    let gid = guild_id.get().to_string();
    let banner_url = ctx.guild().as_ref().and_then(|g| g.banner_url());
    let Some(banner_url) = banner_url else {
        ctx.say(crate::commands::lang_for(&ctx, "banner_guild_no_banner", "No banner.").await)
            .await?;
        return Ok(());
    };
    let (footer_name, footer_bytes) = footer_parts(&ctx, &gid).await;
    let embed = poise::serenity_prelude::CreateEmbed::default()
        .colour(0xC4AFED)
        .title(crate::commands::lang_for(&ctx, "banner_guild_embed", "Server banner").await)
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
