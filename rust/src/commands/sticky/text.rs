use super::*;
use poise::serenity_prelude as serenity;

#[poise::command(
    slash_command,
    prefix_command,
    rename = "text",
    aliases("sticky-text"),
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn sticky_text(
    ctx: Ctx<'_>,
    #[description = "Channel"]
    #[channel_types("Text")]
    channel: Option<serenity::GuildChannel>,
    #[description = "Message"] message: String,
) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    let t = |k: &str| crate::lang::get(&code, k).unwrap_or_default();
    let user = format!("<@{}>", ctx.author().id.get());
    let Some(channel) = channel else {
        ctx.say(
            super::sticky::invalid_channel_text(
                &ctx.serenity_context().http,
                &t("sticky_channel_command_error"),
                &user,
            )
            .await,
        )
        .await?;
        return Ok(());
    };
    if message.trim().is_empty() {
        ctx.say(fill(
            &t("sticky_text_command_missing_message"),
            &[
                (
                    "${client.iHorizon_Emojis.No}",
                    &no_markup(&ctx.serenity_context().http).await,
                ),
                ("${interaction.user}", &user),
            ],
        ))
        .await?;
        return Ok(());
    }
    let previous = load_sticky(&ctx.data().pool, &gid, channel.id.get()).await;
    let cfg = StickyConfig {
        channel_id: channel.id.get().to_string(),
        content: Some(message),
        embed_id: None,
        last_message_id: previous.and_then(|p| p.last_message_id),
        enabled: true,
    };
    save_sticky(&ctx.data().pool, &gid, &cfg).await?;
    if let Some(guild_id) = ctx.guild_id() {
        let sctx = ctx.serenity_context();
        refresh_queued(
            &sctx.http,
            &sctx.cache,
            &ctx.data().pool,
            &gid,
            guild_id,
            channel.id,
        )
        .await;
    }
    ctx.say(fill(
        &t("sticky_text_command_work"),
        &[
            (
                "${client.iHorizon_Emojis.Yes}",
                &yes_markup(&ctx.serenity_context().http).await,
            ),
            ("${interaction.user}", &user),
            ("${channel}", &format!("<#{}>", channel.id.get())),
        ],
    ))
    .await?;
    Ok(())
}
