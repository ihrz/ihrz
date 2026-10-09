use super::*;

#[poise::command(
    slash_command,
    prefix_command,
    category = "utils",
    rename = "unwlvc",
    aliases("removevcwl"),
    default_member_permissions = "MOVE_MEMBERS"
)]
pub async fn unwlvc(
    ctx: Ctx<'_>,
    #[description = "Member to remove"] member: Option<poise::serenity_prelude::User>,
) -> Result<(), anyhow::Error> {
    let Some(guild_id) = ctx.guild_id() else {
        return Ok(());
    };
    let gid = guild_id.get().to_string();
    let code = crate::db::guild_lang(&ctx.data().pool, Some(guild_id.get())).await;
    let Some(target) = member else {
        ctx.say(
            crate::lang::get(&code, "util_unwlvc_no_member").unwrap_or_else(|| {
                "You must specify a member to remove from the frozen voice channel whitelist."
                    .to_string()
            }),
        )
        .await?;
        return Ok(());
    };
    let raw = crate::commands::owner::main::routed_get(
        &ctx.data().pool,
        &gid,
        &gid,
        "UTILS.VOICE_FREEZE",
    )
    .await;
    let mut cfg: serde_json::Value = raw
        .and_then(|s| serde_json::from_str(&s).ok())
        .unwrap_or(serde_json::json!({}));
    let channel_id = cfg
        .get("channelId")
        .and_then(|c| c.as_str())
        .map(str::to_string);
    let Some(channel_id) = channel_id.filter(|s| !s.is_empty()) else {
        ctx.say(
            crate::lang::get(&code, "util_unwlvc_no_freeze").unwrap_or_else(|| {
                "There is no active frozen voice channel in this guild.".to_string()
            }),
        )
        .await?;
        return Ok(());
    };
    let allowed: Vec<String> = cfg
        .get("allowedUsers")
        .and_then(|v| serde_json::from_value(v.clone()).ok())
        .unwrap_or_default();
    if !allowed.contains(&target.id.get().to_string()) {
        ctx.say(
            crate::lang::get(&code, "util_unwlvc_not_whitelisted")
                .map(|s| s.replace("${member.toString()}", &format!("<@{}>", target.id.get())))
                .unwrap_or_else(|| {
                    "${member.toString()} is not allowed in the frozen voice channel.".to_string()
                }),
        )
        .await?;
        return Ok(());
    }
    let kept: Vec<String> = allowed
        .into_iter()
        .filter(|id| id != &target.id.get().to_string())
        .collect();
    cfg["allowedUsers"] = serde_json::Value::from(kept);
    crate::commands::owner::main::routed_set(
        &ctx.data().pool,
        &gid,
        &gid,
        "UTILS.VOICE_FREEZE",
        &cfg.to_string(),
    )
    .await?;
    ctx.say(
        crate::lang::get(&code, "util_unwlvc_command_work")
            .map(|s| s.replace("${member.toString()}", &format!("<@{}>", target.id.get())))
            .unwrap_or_else(|| {
                "${member.toString()} can no longer join the frozen voice channel.".to_string()
            }),
    )
    .await?;
    // Mirror !unwlvc.ts: disconnect the member when they sit in the
    // frozen channel.
    let in_frozen = ctx
        .serenity_context()
        .cache
        .guild(guild_id)
        .and_then(|g| g.voice_states.get(&target.id).and_then(|v| v.channel_id))
        .map(|c| c.get().to_string() == channel_id)
        .unwrap_or(false);
    if in_frozen {
        let _ = guild_id.disconnect_member(ctx.http(), target.id).await;
    }
    Ok(())
}
