use super::*;

/// Renew your current voice channel now. Mirrors !renewvc.ts.
#[poise::command(
    slash_command,
    prefix_command,
    category = "utils",
    rename = "renewvc",
    aliases("rvc"),
    default_member_permissions = "MANAGE_CHANNELS"
)]
pub async fn renewvc(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    let Some(guild_id) = ctx.guild_id() else {
        return Ok(());
    };
    let target = ctx.serenity_context().cache.guild(guild_id).and_then(|g| {
        g.voice_states
            .get(&ctx.author().id)
            .and_then(|v| v.channel_id)
    });
    let code = crate::db::guild_lang(&ctx.data().pool, Some(guild_id.get())).await;
    let Some(target) = target else {
        let no = crate::emojis::app_emoji_markup(&ctx.serenity_context().http, "No")
            .await
            .unwrap_or_else(|| "❌".to_string());
        ctx.say(
            crate::lang::get(&code, "renewvc_not_in_voice")
                .map(|s| s.replace("${client.iHorizon_Emojis.No}", &no))
                .unwrap_or_else(|| "Join a voice channel first.".to_string()),
        )
        .await?;
        return Ok(());
    };
    let Some(ch) = ctx
        .serenity_context()
        .cache
        .guild(guild_id)
        .and_then(|g| g.channels.get(&target).cloned())
    else {
        return Ok(());
    };
    let mut builder = poise::serenity_prelude::CreateChannel::new(ch.name.clone()).kind(ch.kind);
    if let Some(parent) = ch.parent_id {
        builder = builder.category(parent);
    }
    let new_ch = guild_id.create_channel(ctx.http(), builder).await?;
    // Move occupants over, then delete the old channel.
    let occupants: Vec<poise::serenity_prelude::UserId> = ctx
        .serenity_context()
        .cache
        .guild(guild_id)
        .map(|g| {
            g.voice_states
                .iter()
                .filter(|(_, v)| v.channel_id == Some(target))
                .map(|(uid, _)| *uid)
                .collect()
        })
        .unwrap_or_default();
    for uid in occupants {
        let _ = guild_id.move_member(ctx.http(), uid, new_ch.id).await;
    }
    let _ = target.delete(ctx.http()).await;
    let code = crate::db::guild_lang(&ctx.data().pool, Some(guild_id.get())).await;
    ctx.say(
        crate::lang::get(&code, "renew_channel_send_success")
            .map(|s| {
                s.replace(
                    "${interaction.user}",
                    &format!("<@{}>", ctx.author().id.get()),
                )
            })
            .unwrap_or_else(|| format!("Renewed as <#{}>.", new_ch.id.get())),
    )
    .await?;
    Ok(())
}
