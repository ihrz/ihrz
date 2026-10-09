use super::*;

#[poise::command(
    slash_command,
    prefix_command,
    rename = "message",
    default_member_permissions = "MANAGE_GUILD"
)]
pub async fn notifier_message(
    ctx: Ctx<'_>,
    #[description = "Template"] template: String,
) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    save_notifier_string(&ctx.data().pool, &gid, "NOTIFIER.message", template.trim()).await?;
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    let tick = crate::emojis::app_emoji_markup(ctx.http(), "GreenTick")
        .await
        .unwrap_or_default();
    ctx.say(
        crate::lang::get(&code, "notifier_config_message_command_work_on_enable")
            .map(|s| s.replace("${client.iHorizon_Emojis.GreenTick}", &tick))
            .unwrap_or_else(|| {
                "${client.iHorizon_Emojis.GreenTick} | Successfully set notify message.".to_string()
            }),
    )
    .await?;
    Ok(())
}
