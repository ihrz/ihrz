use super::*;
use poise::serenity_prelude as serenity;

#[poise::command(
    slash_command,
    prefix_command,
    rename = "embed",
    aliases("sticky-embed"),
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn sticky_embed(
    ctx: Ctx<'_>,
    #[description = "Channel"]
    #[channel_types("Text")]
    channel: Option<serenity::GuildChannel>,
    #[description = "Embed id"] embed_id: String,
    #[description = "Optional text"] message_content: Option<String>,
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
    let none = t("sticky_var_none");
    let embed_label = if embed_id.trim().is_empty() {
        none.clone()
    } else {
        embed_id.trim().to_string()
    };
    if load_embed_source(&ctx.data().pool, &gid, embed_id.trim())
        .await
        .is_none()
    {
        ctx.say(fill(
            &t("sticky_embed_command_embed_not_found"),
            &[
                (
                    "${client.iHorizon_Emojis.No}",
                    &no_markup(&ctx.serenity_context().http).await,
                ),
                ("${interaction.user}", &user),
                ("${embed_id}", &embed_label),
            ],
        ))
        .await?;
        return Ok(());
    }
    let previous = load_sticky(&ctx.data().pool, &gid, channel.id.get()).await;
    let cfg = StickyConfig {
        channel_id: channel.id.get().to_string(),
        content: message_content
            .as_deref()
            .map(str::trim)
            .filter(|s| !s.is_empty())
            .map(str::to_string),
        embed_id: Some(embed_id.trim().to_string()),
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
        &t("sticky_embed_command_work"),
        &[
            (
                "${client.iHorizon_Emojis.Yes}",
                &yes_markup(&ctx.serenity_context().http).await,
            ),
            ("${interaction.user}", &user),
            ("${channel}", &format!("<#{}>", channel.id.get())),
            ("${embed_id}", embed_id.trim()),
        ],
    ))
    .await?;
    Ok(())
}
