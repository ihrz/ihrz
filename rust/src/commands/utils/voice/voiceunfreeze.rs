use super::*;

/// Clear the active voice freeze. Mirrors util !unfreeze.ts.
#[poise::command(
    slash_command,
    prefix_command,
    category = "utils",
    rename = "unfreeze",
    aliases("defreeze"),
    default_member_permissions = "MOVE_MEMBERS"
)]
pub async fn voiceunfreeze(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    let raw = crate::commands::owner::main::routed_get(
        &ctx.data().pool,
        &gid,
        &gid,
        "UTILS.VOICE_FREEZE",
    )
    .await;
    let has_freeze: bool = raw
        .and_then(|s| serde_json::from_str::<serde_json::Value>(&s).ok())
        .and_then(|v| {
            v.get("channelId")
                .and_then(|c| c.as_str())
                .map(|s| !s.is_empty())
        })
        .unwrap_or(false);
    if !has_freeze {
        ctx.say(
            crate::lang::get(&code, "util_unfreeze_no_freeze").unwrap_or_else(|| {
                "There is no active frozen voice channel in this guild.".to_string()
            }),
        )
        .await?;
        return Ok(());
    }
    let _ = crate::commands::owner::main::routed_del(
        &ctx.data().pool,
        &gid,
        &gid,
        "UTILS.VOICE_FREEZE",
    )
    .await;
    ctx.say(
        crate::lang::get(&code, "util_unfreeze_command_work")
            .unwrap_or_else(|| "The voice channel is no longer frozen.".to_string()),
    )
    .await?;
    Ok(())
}
