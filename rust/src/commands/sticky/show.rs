use super::*;
use poise::serenity_prelude as serenity;

#[poise::command(
    slash_command,
    prefix_command,
    rename = "show",
    aliases("sticky-show"),
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn sticky_show(
    ctx: Ctx<'_>,
    #[description = "Channel"]
    #[channel_types("Text")]
    channel: Option<serenity::GuildChannel>,
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
    let chan = format!("<#{}>", channel.id.get());
    // Disabled configs stay visible here (status field) instead of
    // "not found"; refresh/disable keep the enabled-only loader.
    let Some(cfg) = super::sticky::load_sticky_any(&ctx.data().pool, &gid, channel.id.get()).await
    else {
        ctx.say(fill(
            &t("sticky_show_command_not_found"),
            &[
                (
                    "${client.iHorizon_Emojis.No}",
                    &no_markup(&ctx.serenity_context().http).await,
                ),
                ("${interaction.user}", &user),
                ("${channel}", &chan),
            ],
        ))
        .await?;
        return Ok(());
    };
    let none = t("sticky_var_none");
    let embed_id = super::sticky::present_embed_id(cfg.embed_id.as_deref());
    let (footer_name, footer_bytes) = crate::commands::utils::footer_parts(&ctx, &gid).await;
    let embed = serenity::CreateEmbed::default()
        .colour(serenity::Colour::new(0x11304c))
        .title(t("sticky_show_embed_title"))
        .field(t("sticky_show_embed_fields_channel"), chan, true)
        .field(
            t("sticky_show_embed_fields_type"),
            sticky_type_label(
                cfg.content.as_deref(),
                embed_id,
                &t("sticky_var_text"),
                &t("sticky_var_embed"),
                &t("sticky_var_text_embed"),
            ),
            true,
        )
        .field(
            t("sticky_show_embed_fields_status"),
            if cfg.enabled {
                t("sticky_var_enabled")
            } else {
                t("sticky_var_disabled")
            },
            true,
        )
        .field(
            t("sticky_show_embed_fields_message"),
            cfg.content
                .as_deref()
                .filter(|s| !s.is_empty())
                .unwrap_or(&none),
            false,
        )
        .field(
            t("sticky_show_embed_fields_embed"),
            embed_id
                .map(|id| format!("`{id}`"))
                .unwrap_or_else(|| none.clone()),
            true,
        )
        .field(
            t("sticky_show_embed_fields_last_message"),
            cfg.last_message_id
                .as_deref()
                .map(|id| format!("`{id}`"))
                .unwrap_or_else(|| none.clone()),
            true,
        );
    let embed =
        crate::commands::utils::embed_with_footer(embed, &footer_name, footer_bytes.is_some());
    let mut reply = poise::CreateReply::default().embed(embed);
    if let Some(bytes) = footer_bytes {
        reply = reply.attachment(serenity::CreateAttachment::bytes(bytes, "footer_icon.png"));
    }
    ctx.send(reply).await?;
    Ok(())
}
