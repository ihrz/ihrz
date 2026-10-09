use super::*;

/// Server icon. Mirrors utils !serverpic.ts.
#[poise::command(
    slash_command,
    prefix_command,
    category = "utils",
    rename = "serverpic",
    default_member_permissions = "MODERATE_MEMBERS"
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
    let Some(icon) = icon else {
        let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
        ctx.say(
            crate::lang::get(&code, "msg_no_server_icon")
                .unwrap_or_else(|| "No server icon.".to_string()),
        )
        .await?;
        return Ok(());
    };
    let url = format!(
        "https://cdn.discordapp.com/icons/{}/{}.webp?size=4096",
        gid.get(),
        icon
    );
    let code = crate::db::guild_lang(&ctx.data().pool, Some(guild_id.get())).await;
    let embed = serenity::CreateEmbed::default()
        .colour(0xadd5ff)
        .title(name)
        .image(url.clone());
    let button = serenity::CreateButton::new_link(url).label(
        crate::lang::get(&code, "pfps_download_guild_button")
            .unwrap_or_else(|| "Download.".to_string()),
    );
    ctx.send(
        poise::CreateReply::default()
            .embed(embed)
            .components(vec![serenity::CreateActionRow::Buttons(vec![button])]),
    )
    .await?;
    Ok(())
}
