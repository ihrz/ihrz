use super::*;
use poise::serenity_prelude as serenity;

/// Create the private ihorizon-logs channel. Mirrors !setup.ts.
#[poise::command(
    slash_command,
    prefix_command,
    rename = "setup",
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn gc_setup(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    let Some(guild_id) = ctx.guild_id() else {
        return Ok(());
    };
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    let exists = ctx
        .serenity_context()
        .cache
        .guild(guild_id)
        .map(|g| {
            g.channels
                .values()
                .any(|c| c.name.contains("ihorizon-logs"))
        })
        .unwrap_or(false);
    if exists {
        ctx.say(
            crate::lang::get(&code, "setup_command_error")
                .unwrap_or_else(|| "Logs channel already exists.".to_string()),
        )
        .await?;
        return Ok(());
    }
    guild_id
        .create_channel(
            ctx.http(),
            serenity::CreateChannel::new("ihorizon-logs")
                .kind(serenity::ChannelType::Text)
                .permissions(vec![serenity::PermissionOverwrite {
                    allow: serenity::Permissions::empty(),
                    deny: serenity::Permissions::VIEW_CHANNEL
                        | serenity::Permissions::SEND_MESSAGES
                        | serenity::Permissions::READ_MESSAGE_HISTORY,
                    kind: serenity::PermissionOverwriteType::Role(serenity::RoleId::new(
                        guild_id.get(),
                    )),
                }]),
        )
        .await?;
    let yes = crate::emojis::app_emoji_markup(ctx.http(), "Yes")
        .await
        .unwrap_or_default();
    ctx.say(
        crate::lang::get(&code, "setup_command_work")
            .map(|s| s.replace("${client.iHorizon_Emojis.Yes}", &yes))
            .unwrap_or_else(|| "Logs channel created.".to_string()),
    )
    .await?;
    Ok(())
}
