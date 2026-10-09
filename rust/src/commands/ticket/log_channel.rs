use super::*;
use poise::serenity_prelude as serenity;

/// Ticket logs channel. Mirrors !log-channel.ts (used by close transcript).
#[poise::command(
    slash_command,
    prefix_command,
    rename = "log-channel",
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn ticket_log_channel(
    ctx: Ctx<'_>,
    #[description = "Channel"]
    #[channel_types("Text")]
    channel: serenity::GuildChannel,
) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let pool = &ctx.data().pool;
    // Mirrors !log-channel.ts: disable guard.
    let code = crate::db::guild_lang(pool, ctx.guild_id().map(|g| g.get())).await;
    if ticket_guard_disabled(&ctx, pool, &gid, &code, "ticket_disabled_command").await {
        return Ok(());
    }
    crate::db::kv_set(
        &ctx.data().pool,
        &gid,
        "GUILD.TICKET.logs",
        &channel.id.get().to_string(),
    )
    .await?;
    ctx.say(
        crate::lang::get(&code, "ticket_logchannel_embed_desc")
            .map(|s| {
                s.replace(
                    "${interaction.user}",
                    &format!("<@{}>", ctx.author().id.get()),
                )
                .replace("${channel}", &format!("<#{}>", channel.id.get()))
            })
            .unwrap_or_else(|| "Ticket logs channel set.".to_string()),
    )
    .await?;
    Ok(())
}
