use super::*;

/// Anti-pub spam config (amount/type/state).
#[poise::command(
    slash_command,
    prefix_command,
    category = "newfeatures",
    rename = "punishpub",
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn punishpub(
    ctx: Ctx<'_>,
    #[description = "Flags before sanction"] amount: Option<i64>,
    #[description = "ban, kick or mute"] punishment: Option<String>,
    #[description = "on or off"] action: Option<String>,
) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let raw = crate::db::kv_get(&ctx.data().pool, &gid, "GUILD.PUNISH.PUNISH_PUB").await;
    let mut cfg: serde_json::Value = raw
        .and_then(|s| serde_json::from_str(&s).ok())
        .unwrap_or(serde_json::json!({}));
    if let Some(a) = amount {
        cfg["amountMax"] = serde_json::Value::from(a.max(1) - 1);
    }
    if let Some(p) = punishment {
        cfg["punishementType"] = serde_json::Value::String(p.trim().to_string());
    }
    if let Some(a) = action {
        cfg["state"] = serde_json::Value::String(
            if a.trim().eq_ignore_ascii_case("on") {
                "true"
            } else {
                "false"
            }
            .to_string(),
        );
    }
    crate::db::kv_set(
        &ctx.data().pool,
        &gid,
        "GUILD.PUNISH.PUNISH_PUB",
        &cfg.to_string(),
    )
    .await?;
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    ctx.say(
        crate::lang::get(&code, "msg_punishpub_updated")
            .unwrap_or_else(|| "Punishpub updated.".to_string()),
    )
    .await?;
    Ok(())
}
