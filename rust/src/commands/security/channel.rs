use super::*;
use poise::serenity_prelude as serenity;

#[poise::command(
    slash_command,
    prefix_command,
    rename = "channel",
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn security_channel(
    ctx: Ctx<'_>,
    #[description = "Verification channel"]
    #[channel_types("Text")]
    channel: serenity::GuildChannel,
) -> Result<(), anyhow::Error> {
    let Some(gid) = guild_id_str(&ctx).await else {
        return Ok(());
    };
    crate::db::kv_set(
        &ctx.data().pool,
        &gid,
        "SECURITY.channel",
        &channel.id.get().to_string(),
    )
    .await?;
    let lang = ctx.data().pool.clone();
    let code = crate::db::guild_lang(&lang, ctx.guild_id().map(|g| g.get())).await;
    let msg = crate::lang::get(&code, "security_channel_command_work")
        .map(|s| {
            s.replace("${interaction.user}", &ctx.author().to_string())
                .replace("${channel}", &format!("<#{}>", channel.id.get()))
        })
        .unwrap_or_else(|| "Security channel set.".to_string());
    ctx.say(msg).await?;
    Ok(())
}
