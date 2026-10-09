use super::*;

/// Mirrors `!queue.ts`.
#[poise::command(slash_command, prefix_command, rename = "queue")]
pub async fn m_queue(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    let Some(gid) = guild_id_of(&ctx) else {
        ctx.say("This command can only be used in a server.")
            .await?;
        return Ok(());
    };
    let m = synced_mgr(&ctx).await;
    let snap = m.snapshot(gid).await;
    let (current, queue) = snap.map(|s| (s.current, s.queue)).unwrap_or((None, vec![]));
    let Some(current) = current else {
        ctx.say("Queue is empty.").await?;
        return Ok(());
    };
    // Enrich the now-playing head via metadata (single fetch); queued
    // lines are source-tagged without network fan-out, all falling back
    // to Lavalink info.
    let head = preview_for_track(&current).await;
    let head_artist = head
        .artist
        .clone()
        .unwrap_or_else(|| current.author.clone());
    let head_uri = if head.link.is_empty() {
        current.uri.as_deref()
    } else {
        Some(head.link.as_str())
    };
    let mut lines = vec![format!(
        "Now: {}",
        queue_line(0, &head.title, &head_artist, head_uri)
    )];
    for (i, t) in queue.iter().take(10).enumerate() {
        lines.push(queue_line(i + 1, &t.title, &t.author, t.uri.as_deref()));
    }
    if queue.len() > 10 {
        lines.push(format!("…and {} more.", queue.len() - 10));
    }
    ctx.say(lines.join("\n")).await?;
    Ok(())
}
