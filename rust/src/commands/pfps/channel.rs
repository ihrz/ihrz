use super::*;
use poise::serenity_prelude as serenity;

/// Set the channel where user earn new xp level message!
#[poise::command(
    slash_command,
    prefix_command,
    rename = "channel",
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn pfps_channel(
    ctx: Ctx<'_>,
    #[description = "PFPS channel"]
    #[channel_types("Text")]
    channel: serenity::GuildChannel,
) -> Result<(), anyhow::Error> {
    let Some(gid) = ctx.guild_id().map(|g| g.get().to_string()) else {
        return Ok(());
    };
    save_pfps_string(
        &ctx.data().pool,
        &gid,
        "PFPS.channel",
        &channel.id.get().to_string(),
    )
    .await?;
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    let msg = crate::lang::get(&code, "pfps_channel_command_work")
        .map(|s| {
            s.replace("${interaction.user}", &ctx.author().to_string())
                .replace("${channel}", &format!("<#{}>", channel.id.get()))
        })
        .unwrap_or_else(|| "${interaction.user}, you have successfully set the PFPS module to the channel ${channel}!".to_string());
    ctx.say(msg).await?;
    Ok(())
}
