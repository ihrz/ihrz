use super::*;

/// Recreate a channel now (clone + delete). Mirrors !renew.ts.
// The clone preserves name, parent, permission overwrites, topic,
// nsfw, rate limit and position; the system-channel pointer follows
// the clone; the bot-permission and failure paths answer
// `renew_dont_have_permission`; success is sent in the new channel
// with `renew_channel_send_success`.
#[poise::command(
    slash_command,
    prefix_command,
    category = "utils",
    rename = "renew",
    aliases("r", "rnw"),
    default_member_permissions = "MANAGE_CHANNELS"
)]
pub async fn renew(
    ctx: Ctx<'_>,
    #[description = "Channel, defaults to current"] channel: Option<
        poise::serenity_prelude::GuildChannel,
    >,
) -> Result<(), anyhow::Error> {
    use poise::serenity_prelude as serenity;
    let Some(guild_id) = ctx.guild_id() else {
        return Ok(());
    };
    let code = crate::db::guild_lang(&ctx.data().pool, Some(guild_id.get())).await;
    // TS `channel.deletable` gate: the bot must be able to manage and
    // delete this channel.
    if !bot_guild_permissions(&ctx, guild_id).manage_channels() {
        send_renew_denied(&ctx, &code).await;
        return Ok(());
    }
    let ch = match channel {
        Some(c) => c,
        None => match ctx.guild_channel().await {
            Some(c) => c.clone(),
            None => return Ok(()),
        },
    };
    let old_id = ch.id;
    let was_system = ctx
        .serenity_context()
        .cache
        .guild(guild_id)
        .and_then(|g| g.system_channel_id)
        == Some(old_id);
    // Clone field-for-field like `channel.clone({...})` in !renew.ts.
    let mut builder = serenity::CreateChannel::new(ch.name.clone())
        .kind(ch.kind)
        .permissions(ch.permission_overwrites.clone())
        .nsfw(ch.nsfw)
        .position(ch.position);
    if let Some(parent) = ch.parent_id {
        builder = builder.category(parent);
    }
    if let Some(topic) = ch.topic.clone() {
        builder = builder.topic(topic);
    }
    if let Some(secs) = ch.rate_limit_per_user {
        builder = builder.rate_limit_per_user(secs);
    }
    let author = ctx.author().id;
    let reason = format!("Channel re-create by {author} ({})", author.get());
    let new_ch = match guild_id
        .create_channel(ctx.http(), builder.audit_log_reason(&reason))
        .await
    {
        Ok(c) => c,
        Err(_) => {
            send_renew_denied(&ctx, &code).await;
            return Ok(());
        }
    };
    // The system-channel pointer follows the clone, like TS.
    if was_system {
        let _ = guild_id
            .edit(
                ctx.http(),
                serenity::EditGuild::new().system_channel_id(Some(new_ch.id)),
            )
            .await;
    }
    if old_id.delete(ctx.http()).await.is_err() {
        send_renew_denied(&ctx, &code).await;
        return Ok(());
    }
    // TS sends the success message in the re-created channel.
    let text = crate::lang::get(&code, "renew_channel_send_success")
        .map(|s| s.replace("${interaction.user}", &format!("<@{author}>")))
        .filter(|s| !s.is_empty())
        .unwrap_or_else(|| format!("Renewed as <#{}>.", new_ch.id.get()));
    let _ = new_ch
        .id
        .send_message(ctx.http(), serenity::CreateMessage::new().content(text))
        .await;
    Ok(())
}

/// Ephemeral `renew_dont_have_permission` reply. Mirrors the TS
/// `!channel.deletable` early return and the catch-all error path.
async fn send_renew_denied(ctx: &Ctx<'_>, code: &str) {
    let msg = crate::lang::get(code, "renew_dont_have_permission")
        .unwrap_or_else(|| "Can't `Don't have permission!`".to_string());
    let _ = ctx
        .send(poise::CreateReply::default().content(msg).ephemeral(true))
        .await;
}
