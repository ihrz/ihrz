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
    channel: serenity::GuildChannel,
) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    let t = |k: &str| crate::lang::get(&code, k).unwrap_or_default();
    let user = format!("<@{}", ctx.author().id.get());
    let chan = format!("<#{}>", channel.id.get());
    let Some(cfg) = load_sticky(&ctx.data().pool, &gid, channel.id.get()).await else {
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
    let (footer_name, _) = crate::commands::utils::footer_parts(&ctx, &gid).await;
    let embed = serenity::CreateEmbed::default()
        .colour(serenity::Colour::new(0x11304c))
        .title(t("sticky_show_embed_title"))
        .footer(serenity::CreateEmbedFooter::new(footer_name))
        .field(t("sticky_show_embed_fields_channel"), chan, true)
        .field(
            t("sticky_show_embed_fields_type"),
            sticky_type_label(
                cfg.content.as_deref(),
                cfg.embed_id.as_deref(),
                &t("sticky_var_text"),
                &t("sticky_var_embed"),
                &t("sticky_var_text_embed"),
            ),
            true,
        )
        .field(
            t("sticky_show_embed_fields_status"),
            t("sticky_var_enabled"),
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
            cfg.embed_id
                .as_deref()
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
    ctx.send(poise::CreateReply::default().embed(embed)).await?;
    Ok(())
}
