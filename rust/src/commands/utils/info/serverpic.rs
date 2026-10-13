use super::*;

/// Sending the guild image
// Mirrors utils !serverpic.ts.
#[poise::command(
    slash_command,
    prefix_command,
    category = "utils",
    rename = "serverpic",
    default_member_permissions = "MODERATE_MEMBERS",
    description_localized("fr", "Envoie le logo du serveur"),
    description_localized("ja", "サーバー画像を送信"),
    description_localized("ru", "Отправить изображение сервера"),
    description_localized("es-ES", "Enviar la imagen del servidor")
)]
pub async fn serverpic(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    use poise::serenity_prelude as serenity;
    let Some(guild_id) = ctx.guild_id() else {
        return Ok(());
    };
    let snapshot = ctx
        .serenity_context()
        .cache
        .guild(guild_id)
        .map(|g| (g.name.clone(), g.icon, g.id));
    let Some((name, icon, gid)) = snapshot else {
        return Ok(());
    };
    // Null-icon path mirrors !serverpic.ts:50-73 exactly: `setImage(null)`
    // is a null-effect (no image set), and the download button falls back
    // to the unknown-user.png URL.
    let url = icon.map(|h| {
        format!(
            "https://cdn.discordapp.com/icons/{}/{}.webp?size=4096",
            gid.get(),
            h
        )
    });
    let code = crate::db::guild_lang(&ctx.data().pool, Some(guild_id.get())).await;
    let mut embed = serenity::CreateEmbed::default()
        .colour(0xadd5ff)
        .title(name);
    if let Some(ref icon_url) = url {
        embed = embed.image(icon_url.clone());
    }
    let button_url =
        url.unwrap_or_else(|| "https://www.ihorizon.org/assets/img/unknown-user.png".to_string());
    let button = serenity::CreateButton::new_link(button_url).label(
        crate::lang::get(&code, "pfps_download_guild_button")
            .unwrap_or_else(|| "Download Guild Avatar".to_string()),
    );
    ctx.send(
        poise::CreateReply::default()
            .embed(embed)
            .components(vec![serenity::CreateActionRow::Buttons(vec![button])]),
    )
    .await?;
    Ok(())
}
