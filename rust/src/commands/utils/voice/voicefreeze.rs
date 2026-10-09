use super::*;

/// Freeze your current voice channel. Mirrors util !freeze.ts.
#[poise::command(
    slash_command,
    prefix_command,
    category = "utils",
    rename = "freeze",
    aliases("voicefreeze", "vcfreeze"),
    default_member_permissions = "MOVE_MEMBERS"
)]
pub async fn voicefreeze(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    let Some(guild_id) = ctx.guild_id() else {
        return Ok(());
    };
    let channel_id = ctx.serenity_context().cache.guild(guild_id).and_then(|g| {
        g.voice_states
            .get(&ctx.author().id)
            .and_then(|v| v.channel_id)
    });
    let code = crate::db::guild_lang(&ctx.data().pool, Some(guild_id.get())).await;
    let Some(channel_id) = channel_id else {
        ctx.say(
            crate::lang::get(&code, "util_not_in_vc")
                .unwrap_or_else(|| "The members are not in a voice channel".to_string()),
        )
        .await?;
        return Ok(());
    };
    let gid = guild_id.get().to_string();
    crate::db::kv_set(
        &ctx.data().pool,
        &gid,
        "UTILS.VOICE_FREEZE",
        &serde_json::json!({
            "channelId": channel_id.get().to_string(),
            "enabledBy": ctx.author().id.get().to_string(),
            "createdAt": crate::commands::shared::now_ms(),
            "allowedUsers": [],
        })
        .to_string(),
    )
    .await?;
    ctx.say(
        crate::lang::get(&code, "util_freeze_command_work")
            .map(|s| {
                s.replace(
                    "${voiceChannel.toString()}",
                    &format!("<#{}>", channel_id.get()),
                )
            })
            .unwrap_or_else(|| {
                "The voice channel ${voiceChannel.toString()} is now frozen.".to_string()
            }),
    )
    .await?;
    Ok(())
}
