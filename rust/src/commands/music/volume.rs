use super::*;

// Mirrors `!volume.ts` (`parseInt(String(query))`, `setVolume` +
// `customVolume` re-apply). Two recorded differences: non-numeric
// input is refused instead of storing NaN, and the reply shows the
// clamped level actually applied (TS echoes the raw query, so
// `!volume 500` would claim 500% while playing 100).
//
// The slash autocomplete surfaces the fixed VOLUMES list from
// `music.ts:30-43` (12 levels). Suggestions only (Discord autocomplete,
// not hard choices — poise inline `#[choices]` literals only fit `&str`
// params, which prefix parsing rejects): both paths stay free text,
// like the TS prefix leg.
//
/// Set the playback volume (10-100).
#[poise::command(slash_command, prefix_command, rename = "volume")]
pub async fn m_volume(
    ctx: Ctx<'_>,
    #[description = "10-100"]
    #[autocomplete = "volume_autocomplete"]
    level: String,
) -> Result<(), anyhow::Error> {
    let Some(gid) = guild_id_of(&ctx) else {
        return Ok(());
    };
    let code = lang_code(&ctx).await;
    let Some(want) = parse_volume_query(&level) else {
        say_key(
            &ctx,
            &code,
            "music_volume_invalid",
            "Invalid volume: give a number between 10 and 100.",
        )
        .await?;
        return Ok(());
    };
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
    let v = m.with_player(gid, |p| p.set_volume(i64::from(want))).await;
    if let Ok((node, session)) = m.live_node_and_session(gid).await {
        let _ = m.rest_set_volume(&node, &session, gid, v).await;
    }
    let yes = emoji_markup(&ctx, "Yes", "✅").await;
    let msg = crate::lang::get(&code, "music_volume_command_ok")
        .map(|s| {
            s.replace("${client.iHorizon_Emojis.Yes}", &yes)
                .replace("${Number(query)}", &v.to_string())
        })
        .unwrap_or_else(|| format!("Volume set to `{v}`%"));
    ctx.say(msg).await?;
    Ok(())
}

/// Slash autocomplete for `level`: the fixed VOLUMES levels from
/// `music.ts:30-43`, filtered by the typed prefix. Values match the TS
/// choice values (`10`, ...); free text still parses via
/// [`parse_volume_query`].
async fn volume_autocomplete<'a>(
    _ctx: Ctx<'a>,
    partial: &'a str,
) -> impl Iterator<Item = String> + 'a {
    const VOLUMES: [&str; 12] = [
        "10", "20", "30", "35", "45", "55", "60", "70", "80", "90", "95", "100",
    ];
    VOLUMES
        .into_iter()
        .filter(move |v| v.starts_with(partial))
        .map(|v| v.to_string())
}
