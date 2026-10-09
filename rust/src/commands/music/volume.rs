use super::*;

/// Mirrors `!volume.ts`.
#[poise::command(slash_command, prefix_command, rename = "volume")]
pub async fn m_volume(
    ctx: Ctx<'_>,
    #[description = "10-100"] level: i64,
) -> Result<(), anyhow::Error> {
    let Some(gid) = guild_id_of(&ctx) else {
        return Ok(());
    };
    let code = lang_code(&ctx).await;
    let m = synced_mgr(&ctx).await;
    let snap = m.snapshot(gid).await;
    if snap.as_ref().and_then(|s| s.current.clone()).is_none() || voice_channel_of(&ctx).is_none() {
        say_key(
            &ctx,
            &code,
            "pause_nothing_playing",
            "There is nothing playing",
        )
        .await?;
        return Ok(());
    }
    let v = m.with_player(gid, |p| p.set_volume(level)).await;
    if let Ok((node, session)) = m.live_node_and_session(gid).await {
        let _ = m.rest_set_volume(&node, &session, gid, v).await;
    }
    let yes = emoji_markup(&ctx, "Yes", "✅").await;
    let msg = crate::lang::get(&code, "music_volume_command_ok")
        .map(|s| {
            s.replace("${client.iHorizon_Emojis.Yes}", &yes)
                .replace("${Number(query)}", &level.to_string())
        })
        .unwrap_or_else(|| format!("Volume set to `{level}`%"));
    ctx.say(msg).await?;
    Ok(())
}
