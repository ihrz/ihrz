use super::*;
use poise::serenity_prelude as serenity;

/// Disable a sticky message in one channel
#[poise::command(
    slash_command,
    prefix_command,
    rename = "disable",
    aliases("sticky-disable"),
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn sticky_disable(
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
    let Some(cfg) = load_sticky(&ctx.data().pool, &gid, channel.id.get()).await else {
        ctx.say(fill(
            &t("sticky_disable_command_not_found"),
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
    if let Some(last) = cfg
        .last_message_id
        .as_deref()
        .and_then(|s| s.parse::<u64>().ok())
    {
        let _ = channel
            .id
            .delete_message(&ctx.http(), serenity::MessageId::new(last))
            .await;
    }
    delete_sticky(&ctx.data().pool, &gid, channel.id.get()).await;
    ctx.say(fill(
        &t("sticky_disable_command_work"),
        &[
            ("${interaction.user}", &user),
            ("${channel}", &chan),
            (
                "${client.iHorizon_Emojis.Yes}",
                &yes_markup(&ctx.serenity_context().http).await,
            ),
        ],
    ))
    .await?;
    Ok(())
}
