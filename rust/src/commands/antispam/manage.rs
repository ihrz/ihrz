use super::*;

#[poise::command(
    slash_command,
    prefix_command,
    rename = "config",
    aliases("mng", "antimng"),
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn as_config(
    ctx: Ctx<'_>,
    #[description = "on or off"] action: String,
    #[description = "messages threshold"] threshold: Option<i64>,
) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let raw = crate::db::kv_get(&ctx.data().pool, &gid, ANTISPAM_KEY).await;
    let mut cfg: AntispamConfig = raw
        .and_then(|s| serde_json::from_str(&s).ok())
        .unwrap_or_default();
    cfg.enabled = matches!(action.to_ascii_lowercase().as_str(), "on" | "power on");
    if let Some(t) = threshold {
        cfg.threshold = t.clamp(2, 20) as u32;
    }
    crate::db::kv_set(
        &ctx.data().pool,
        &gid,
        ANTISPAM_KEY,
        &serde_json::to_string(&cfg)?,
    )
    .await?;
    ctx.say(format!(
        "Antispam {} (threshold {})",
        if cfg.enabled { "on" } else { "off" },
        cfg.threshold
    ))
    .await?;
    Ok(())
}
