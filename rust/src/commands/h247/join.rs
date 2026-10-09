use super::*;
use poise::serenity_prelude as serenity;

#[poise::command(
    slash_command,
    prefix_command,
    rename = "join",
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn h247_join(
    ctx: Ctx<'_>,
    #[description = "Voice channel to park in"]
    #[channel_types("Voice")]
    channel: serenity::GuildChannel,
) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    save_h247(
        &ctx.data().pool,
        &gid,
        &H247Config {
            enabled: true,
            voice_channel_id: channel.id.get().to_string(),
        },
    )
    .await?;
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    let yes = crate::emojis::app_emoji_markup(&ctx.serenity_context().http, "Yes")
        .await
        .unwrap_or_else(|| "✅".to_string());
    ctx.say(
        crate::lang::get(&code, "h247_joined")
            .map(|s| {
                s.replace("${client.iHorizon_Emojis.Yes}", &yes)
                    .replace("${voiceChannel}", &format!("<#{}>", channel.id.get()))
            })
            .unwrap_or_else(|| format!("H247 parked in <#{}>.", channel.id.get())),
    )
    .await?;
    Ok(())
}
