use super::*;
use poise::serenity_prelude as serenity;

/// Point every server log at one channel. Mirrors autologs preset.
#[poise::command(
    slash_command,
    prefix_command,
    rename = "autologs",
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn gc_autologs(
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
    for t in LOG_TYPES.iter().filter(|t| **t != "all") {
        crate::db::kv_set(
            &ctx.data().pool,
            &gid,
            &format!("GUILD.SERVER_LOGS.{t}"),
            &channel.id.get().to_string(),
        )
        .await?;
    }
    let mention = format!("<#{}>", channel.id.get());
    let types = LOG_TYPES
        .iter()
        .filter(|t| **t != "all")
        .copied()
        .collect::<Vec<_>>()
        .join(", ");
    ctx.say(
        crate::lang::get(&code, "setlogschannel_utils_command_work")
            .map(|s| {
                s.replace("${argsid.id}", &mention)
                    .replace("${typeOfLogs}", &types)
            })
            .unwrap_or_else(|| {
                "You have successfully set up the `${typeOfLogs}` in ${argsid.id}!".to_string()
            }),
    )
    .await?;
    Ok(())
}
