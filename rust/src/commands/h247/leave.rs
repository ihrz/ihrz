use super::*;

#[poise::command(
    slash_command,
    prefix_command,
    rename = "leave",
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn h247_leave(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    save_h247(&ctx.data().pool, &gid, &H247Config::default()).await?;
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    let yes = crate::emojis::app_emoji_markup(ctx.http(), "Yes")
        .await
        .unwrap_or_else(|| "✅".to_string());
    ctx.say(
        crate::lang::get(&code, "h247_left")
            .map(|s| s.replace("${client.iHorizon_Emojis.Yes}", &yes))
            .unwrap_or_else(|| "H247 left.".to_string()),
    )
    .await?;
    Ok(())
}
