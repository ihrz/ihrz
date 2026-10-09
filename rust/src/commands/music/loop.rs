use super::*;

/// Mirrors `!loop.ts`.
#[poise::command(slash_command, prefix_command, rename = "loop")]
pub async fn m_loop(
    ctx: Ctx<'_>,
    #[description = "off or track"] mode: String,
) -> Result<(), anyhow::Error> {
    let code = lang_code(&ctx).await;
    let Some(m) = parse_loop(&mode) else {
        ctx.say(
            crate::lang::get(&code, "msg_use_off_track")
                .unwrap_or_else(|| "Use off/track.".to_string()),
        )
        .await?;
        return Ok(());
    };
    let Some(gid) = guild_id_of(&ctx) else {
        ctx.say("This command can only be used in a server.")
            .await?;
        return Ok(());
    };
    let mgr = synced_mgr(&ctx).await;
    let live_mode: crate::lavalink::LoopMode = m.into();
    mgr.with_player(gid, |p| p.loop_mode = Some(live_mode))
        .await;
    ctx.say(format!("Loop: {m:?}.")).await?;
    Ok(())
}
