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
    let mut cfg: AntispamConfig = load_antispam(&ctx.data().pool, &gid).await;
    cfg.enabled = matches!(action.to_ascii_lowercase().as_str(), "on" | "power on");
    if let Some(t) = threshold {
        cfg.threshold = t.clamp(2, 20) as u32;
    }
    save_antispam(&ctx.data().pool, &gid, &cfg).await?;
    ctx.say(format!(
        "Antispam {} (threshold {})",
        if cfg.enabled { "on" } else { "off" },
        cfg.threshold
    ))
    .await?;
    Ok(())
}
