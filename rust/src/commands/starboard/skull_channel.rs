use super::*;

/// Change the board channel. Mirrors skullboard !channel.ts.
#[poise::command(
    slash_command,
    prefix_command,
    rename = "channel",
    aliases("skullboardchannel"),
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn skull_channel(
    ctx: Ctx<'_>,
    #[description = "Target channel"]
    #[channel_types("Text", "News")]
    #[rename = "to"]
    channel: serenity::GuildChannel,
) -> Result<(), anyhow::Error> {
    // Prefix native-permission gate (U-MSV-FIX14): TS `checkNativePermission`
    // enforces the Administrator leaf on both paths; Discord covers slash,
    // so the body gates prefix here with the same `var_dont_have_perm` denial.
    if crate::commands::shared::deny_without_prefix_perm(
        &ctx,
        poise::serenity_prelude::Permissions::ADMINISTRATOR,
    )
    .await
    {
        return Ok(());
    }
    let Some(gid) = ctx.guild_id().map(|g| g.get().to_string()) else {
        return Ok(());
    };
    let mut cfg = load_board(&ctx.data().pool, &gid, "skullboard").await;
    cfg.channel = channel.id.get().to_string();
    save_board(&ctx.data().pool, &gid, "skullboard", &cfg).await?;
    let yes = yes_markup(ctx.http()).await;
    let chan = format!("<#{}>", channel.id.get());
    let text = crate::commands::lang_for(
        &ctx,
        "skullboard_channel_command_ok",
        "${client.iHorizon_Emojis.Yes} | **Skullboard channel is now defined to be: ${channel.toString()}**. Now, when server members react '💀' to messages and the threshold of **`${baseData.threshold}`** is exceeded, the message is sent to ${channel.toString()}!",
    )
    .await
    .replace("${client.iHorizon_Emojis.Yes}", &yes)
    .replace("${channel.toString()}", &chan)
    .replace("${baseData.threshold}", &cfg.threshold.to_string());
    ctx.say(text).await?;
    Ok(())
}
