use super::*;

/// Allow a member in the frozen channel. Mirrors util !wlvc.ts.
#[poise::command(
    slash_command,
    prefix_command,
    category = "utils",
    rename = "wlvc",
    aliases("allowvc"),
    default_member_permissions = "MOVE_MEMBERS"
)]
pub async fn wlvc(
    ctx: Ctx<'_>,
    #[description = "Allowed member"] member: Option<poise::serenity_prelude::User>,
) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    let Some(target) = member else {
        ctx.say(
            crate::lang::get(&code, "util_wlvc_no_member").unwrap_or_else(|| {
                "You must specify a member to allow in the frozen voice channel.".to_string()
            }),
        )
        .await?;
        return Ok(());
    };
    let raw = crate::db::kv_get(&ctx.data().pool, &gid, "UTILS.VOICE_FREEZE").await;
    let mut cfg: serde_json::Value = raw
        .and_then(|s| serde_json::from_str(&s).ok())
        .unwrap_or(serde_json::json!({}));
    let has_freeze = cfg
        .get("channelId")
        .and_then(|c| c.as_str())
        .map(|s| !s.is_empty())
        .unwrap_or(false);
    if !has_freeze {
        ctx.say(
            crate::lang::get(&code, "util_wlvc_no_freeze").unwrap_or_else(|| {
                "There is no active frozen voice channel in this guild.".to_string()
            }),
        )
        .await?;
        return Ok(());
    }
    let mut allowed: Vec<String> = cfg
        .get("allowedUsers")
        .and_then(|v| serde_json::from_value(v.clone()).ok())
        .unwrap_or_default();
    let id = target.id.get().to_string();
    if !allowed.contains(&id) {
        allowed.push(id);
    }
    cfg["allowedUsers"] = serde_json::Value::from(allowed);
    crate::db::kv_set(
        &ctx.data().pool,
        &gid,
        "UTILS.VOICE_FREEZE",
        &cfg.to_string(),
    )
    .await?;
    ctx.say(
        crate::lang::get(&code, "util_wlvc_command_work")
            .map(|s| s.replace("${member.toString()}", &format!("<@{}>", target.id.get())))
            .unwrap_or_else(|| "Voice freeze channel set.".to_string()),
    )
    .await?;
    Ok(())
}
