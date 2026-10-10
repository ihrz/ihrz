use super::*;

/// Tracks per page, mirroring TS `chunkSize = 10`.
pub const QUEUE_PAGE_SIZE: usize = 10;
/// Collector lifetime, mirroring TS `time: 300000` (5 minutes).
pub const QUEUE_COLLECTOR_SECS: u64 = 300;

/// Split embed lines into 10-per-page chunks (pure, unit-testable).
pub fn queue_pages(lines: &[String]) -> Vec<Vec<String>> {
    lines.chunks(QUEUE_PAGE_SIZE).map(|c| c.to_vec()).collect()
}

/// Mirrors `!queue.ts` (paged embeds + buttons, see below).
// 10-per-page embeds with previous/next/close buttons, an invoker-only
// 5-minute collector, and footer pagination.
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
    // Upcoming-only lines, mirroring `!queue.ts:84-87`
    // (`**${++idx})** [${title}](${uri})` over `player.queue.tracks`).
    // No Now-playing head, no author/tag suffixes.
    // Nullish-vs-empty split mirrors `!queue.ts:77-95`: a missing queue
    // state (`!player.queue.tracks`) answers `queue_no_queue`, while a
    // present but drained list answers `queue_empty_queue`. The local
    // snapshot always carries a `Vec`, so the nullish arm is the
    // no-current-track-nothing-queued state.
    let queue = s.queue;
    if queue.is_empty() && s.current.is_none() {
        say_key(&ctx, &code, "queue_no_queue", "There is no queue").await?;
        return Ok(());
    }
    if queue.is_empty() {
        say_key(
            &ctx,
            &code,
            "queue_empty_queue",
            "There are no more tracks in the queue",
        )
        .await?;
        return Ok(());
    }
    let lines: Vec<String> = queue
        .iter()
        .enumerate()
        .map(|(i, t)| queue_line(i + 1, &t.title, t.uri.as_deref()))
        .collect();
    let pages = queue_pages(&lines);
    let total_pages = pages.len().max(1);
    let title =
        crate::lang::get(&code, "queue_embed_title").unwrap_or_else(|| "Tracks Queue".to_string());
    let empty_desc = crate::lang::get(&code, "queue_embed_description_empty")
        .unwrap_or_else(|| "**No more queued songs**".to_string());
    let page_word = crate::lang::get(&code, "var_page").unwrap_or_else(|| "Page".to_string());
    let (fname, _) = crate::commands::shared::footer_parts(&ctx, &gid.to_string()).await;
    let mk_embed = |idx: usize| {
        let desc = pages
            .get(idx)
            .map(|p| p.join("\n"))
            .filter(|d| !d.trim().is_empty())
            .unwrap_or_else(|| empty_desc.clone());
        serenity::CreateEmbed::default()
            .title(title.clone())
            .colour(0xFF0000)
            .description(desc)
            .footer(serenity::CreateEmbedFooter::new(
                crate::commands::shared::footer_page_text(
                    &fname,
                    &page_word,
                    (idx + 1) as u64,
                    total_pages as u64,
                ),
            ))
    };
    // Single page: no buttons, no collector (TS returns early with the
    // plain paged embed, `!queue.ts:150-154`).
    if total_pages == 1 {
        ctx.send(poise::CreateReply::default().embed(mk_embed(0)))
            .await?;
        return Ok(());
    }
    let mk_row = |idx: usize| {
        serenity::CreateActionRow::Buttons(vec![
            serenity::CreateButton::new("queue_previous")
                .label("<<<")
                .style(serenity::ButtonStyle::Secondary)
                .disabled(idx == 0),
            serenity::CreateButton::new("queue_next")
                .label(">>>")
                .style(serenity::ButtonStyle::Secondary)
                .disabled(idx + 1 >= total_pages),
            serenity::CreateButton::new("queue_close")
                .emoji(serenity::ReactionType::Unicode("🗑️".to_string()))
                .style(serenity::ButtonStyle::Danger),
        ])
    };
    let handle = ctx
        .send(
            poise::CreateReply::default()
                .embed(mk_embed(0))
                .components(vec![mk_row(0)]),
        )
        .await?;
    let Ok(mut msg) = handle.into_message().await else {
        return Ok(());
    };
    let mut index = 0usize;
    let author_id = ctx.author().id;
    let not_for_you = crate::lang::get(&code, "help_not_for_you")
        .unwrap_or_else(|| "This interaction is not for you".to_string());
    loop {
        let press = msg
            .await_component_interaction(ctx.serenity_context().shard.clone())
            .timeout(std::time::Duration::from_secs(QUEUE_COLLECTOR_SECS))
            .await;
        let Some(press) = press else { break };
        if !press.data.custom_id.starts_with("queue_") {
            continue;
        }
        if press.user.id != author_id {
            let _ = press
                .create_response(
                    ctx.http(),
                    serenity::CreateInteractionResponse::Message(
                        serenity::CreateInteractionResponseMessage::new()
                            .content(not_for_you.clone())
                            .ephemeral(true),
                    ),
                )
                .await;
            continue;
        }
        match press.data.custom_id.as_str() {
            "queue_previous" => {
                index = index.saturating_sub(1);
            }
            "queue_next" => {
                if index + 1 < total_pages {
                    index += 1;
                }
            }
            // TS `queue_close` stops the collector; the end leg clears
            // the components.
            "queue_close" => break,
            _ => continue,
        }
        let _ = press
            .create_response(
                ctx.http(),
                serenity::CreateInteractionResponse::UpdateMessage(
                    serenity::CreateInteractionResponseMessage::new()
                        .embed(mk_embed(index))
                        .components(vec![mk_row(index)]),
                ),
            )
            .await;
    }
    let _ = msg
        .edit(ctx.http(), serenity::EditMessage::new().components(vec![]))
        .await;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::{queue_pages, QUEUE_PAGE_SIZE};

    #[test]
    fn ten_lines_per_page_like_ts_chunksize() {
        let lines: Vec<String> = (0..25).map(|i| format!("track {i}")).collect();
        let pages = queue_pages(&lines);
        assert_eq!(pages.len(), 3);
        assert_eq!(pages[0].len(), QUEUE_PAGE_SIZE);
        assert_eq!(pages[1].len(), QUEUE_PAGE_SIZE);
        assert_eq!(pages[2].len(), 5);
    }

    #[test]
    fn exact_page_boundary_has_no_remainder() {
        let lines: Vec<String> = (0..20).map(|i| format!("track {i}")).collect();
        let pages = queue_pages(&lines);
        assert_eq!(pages.len(), 2);
        assert!(pages.iter().all(|p| p.len() == QUEUE_PAGE_SIZE));
    }

    #[test]
    fn empty_queue_has_no_pages() {
        assert!(queue_pages(&[]).is_empty());
    }
}
