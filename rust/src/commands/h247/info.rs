use super::*;

#[poise::command(slash_command, prefix_command, rename = "info")]
pub async fn h247_info(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let cfg = load_h247(&ctx.data().pool, &gid).await;
    ctx.say(if cfg.enabled {
        format!("H247 enabled in <#{}>.", cfg.voice_channel_id)
    } else {
        "H247 disabled.".to_string()
    })
    .await?;
    Ok(())
}
