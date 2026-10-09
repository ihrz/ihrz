use super::*;
use poise::serenity_prelude as serenity;

#[poise::command(
    slash_command,
    prefix_command,
    rename = "channel",
    default_member_permissions = "MANAGE_GUILD"
)]
pub async fn notifier_channel(
    ctx: Ctx<'_>,
    #[description = "Channel"]
    #[channel_types("Text", "News")]
    channel: serenity::GuildChannel,
) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    save_notifier_string(
        &ctx.data().pool,
        &gid,
        "NOTIFIER.channelId",
        &channel.id.get().to_string(),
    )
    .await?;
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    ctx.say(
        crate::lang::get(&code, "notifier_config_message_command_ok")
            .map(|s| s.replace("${channel.toString()}", &format!("<#{}>", channel.id.get())))
            .unwrap_or_else(|| "Now, when a streamer or YouTuber publishes a video, I will send a message in ${channel.toString()}".to_string()),
    )
    .await?;
    Ok(())
}
