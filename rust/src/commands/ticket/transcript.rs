use super::*;
use poise::serenity_prelude as serenity;

/// Post the ticket transcript to the caller via DM.
#[poise::command(slash_command, prefix_command, rename = "transcript")]
pub async fn ticket_transcript(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let pool = &ctx.data().pool;
    let lang_code = crate::db::guild_lang(pool, ctx.guild_id().map(|g| g.get())).await;
    let channel_id = ctx.channel_id();
    // Guard order mirrors !transcript.ts: disable, then in-ticket, then
    // the guild-text check (TicketTranscript bails on non-text channels).
    if ticket_guard_disabled(&ctx, pool, &gid, &lang_code, "ticket_disabled_command").await {
        return Ok(());
    }
    if ticket_guard_in_ticket(
        &ctx,
        pool,
        &gid,
        &lang_code,
        channel_id,
        "transript_not_in_ticket",
    )
    .await
    {
        return Ok(());
    }
    if !is_guild_text_channel(ctx.http(), channel_id).await {
        return Ok(());
    }
    let t = |k: &str| crate::lang::get(&lang_code, k).unwrap_or_default();
    let http = ctx.serenity_context().http.clone();
    let (html, _count) = channel_transcript_html(&http, channel_id, true).await;
    // Favicon mirrors the TS `favicon: bot displayAvatarURL` option:
    // prefer a fetched `data:` URL (offline-portable), else the remote
    // URL (TS parity), else no tag (self-contained file).
    let html = match bot_favicon_data_url(ctx.serenity_context()).await {
        Some(data_url) => crate::transcript::insert_favicon(&html, &data_url),
        None => {
            let avatar: String = {
                let me = ctx.serenity_context().cache.current_user();
                me.avatar_url().unwrap_or_else(|| me.default_avatar_url())
            };
            crate::transcript::insert_favicon(&html, &avatar)
        }
    };
    // Mirrors TicketTranscript (ticketsManager.ts): ephemeral "check your
    // DMs" ack, then the transcript is DM'd to the caller.
    ctx.send(
        poise::CreateReply::default()
            .content(t("guildconfig_config_save_check_dm"))
            .ephemeral(true),
    )
    .await?;
    let embed = serenity::CreateEmbed::default()
        .description(t("close_title_sourcebin"))
        .colour(0x0014A8_u32);
    let sent = dm_user(
        &http,
        ctx.author().id.get(),
        serenity::CreateMessage::new()
            .embed(embed)
            .content(t("transript_command_work"))
            .add_file(serenity::CreateAttachment::bytes(
                html.into_bytes(),
                format!("{gid}-transcript.html"),
            )),
    )
    .await;
    if !sent {
        // TS catch(() => interaction.followUp({ ephemeral })) — in poise
        // the second send becomes the follow-up.
        ctx.send(
            poise::CreateReply::default()
                .content(t("ticket_transcript_failed_to_send"))
                .ephemeral(true),
        )
        .await?;
    }
    Ok(())
}

/// Best-effort bot-avatar fetch as a `data:` URL for the transcript
/// favicon (mirrors the TS `favicon` option while keeping the file
/// offline-portable). `None` on any failure; the caller falls back to
/// the remote URL.
async fn bot_favicon_data_url(ctx: &serenity::Context) -> Option<String> {
    let url: String = {
        let me = ctx.cache.current_user();
        me.avatar_url().unwrap_or_else(|| me.default_avatar_url())
    };
    let ext = url
        .split(['?', '#'])
        .next()
        .unwrap_or("")
        .rsplit('.')
        .next()
        .unwrap_or("png");
    let bytes = reqwest::get(&url).await.ok()?.bytes().await.ok()?;
    if bytes.is_empty() || bytes.len() > 512_000 {
        return None;
    }
    crate::emojis::data_uri(ext, &bytes)
}
