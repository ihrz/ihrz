use super::*;

/// Mirrors `!queue.ts`.
#[poise::command(slash_command, prefix_command, rename = "queue")]
pub async fn m_queue(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    let Some(gid) = guild_id_of(&ctx) else {
        return Ok(());
    };
    let code = lang_code(&ctx).await;
    let m = synced_mgr(&ctx).await;
    let snap = m.snapshot(gid).await;
    let Some(s) = snap.clone() else {
        say_key(
            &ctx,
            &code,
            "queue_iam_not_voicec",
            "I am not in a voice channel",
        )
        .await?;
        return Ok(());
    };
    let voice = voice_channel_of(&ctx);
    if guard_same_voice(
        &ctx,
        &code,
        voice,
        bot_voice_channel(&ctx, gid, s.voice_channel),
    )
    .await
    {
        return Ok(());
    }
    let (current, queue) = (s.current, s.queue);
    if current.is_none() && queue.is_empty() {
        say_key(
            &ctx,
            &code,
            "queue_empty_queue",
            "There are no more tracks in the queue",
        )
        .await?;
        return Ok(());
    }
    // Enrich the now-playing head via metadata (single fetch); queued
    // lines are source-tagged without network fan-out, all falling back
    // to Lavalink info.
    let mut lines = vec![];
    if let Some(ref current) = current {
        let head = preview_for_track(current).await;
        let head_artist = head
            .artist
            .clone()
            .unwrap_or_else(|| current.author.clone());
        let head_uri = if head.link.is_empty() {
            current.uri.as_deref()
        } else {
            Some(head.link.as_str())
        };
        lines.push(format!(
            "Now: {}",
            queue_line(0, &head.title, &head_artist, head_uri)
        ));
    }
    for (i, t) in queue.iter().take(10).enumerate() {
        lines.push(queue_line(i + 1, &t.title, &t.author, t.uri.as_deref()));
    }
    if queue.len() > 10 {
        lines.push(format!("…and {} more.", queue.len() - 10));
    }
    let title =
        crate::lang::get(&code, "queue_embed_title").unwrap_or_else(|| "Tracks Queue".to_string());
    let embed = serenity::CreateEmbed::default()
        .title(title)
        .colour(0xFF0000)
        .description(lines.join("\n"));
    ctx.send(poise::CreateReply::default().embed(embed)).await?;
    Ok(())
}
