use super::*;
use poise::serenity_prelude as serenity;

/// Get the transript of a ticket message!
#[poise::command(
    slash_command,
    prefix_command,
    rename = "transcript",
    description_localized("fr", "Obtenir la transcription d'un message de ticket"),
    description_localized("ja", "チケットメッセージのトランスクリプトを取得！"),
    description_localized("ru", "Получить транскрипт тикета!"),
    description_localized("es-ES", "Obtener la transcripción de un mensaje de ticket!")
)]
pub async fn ticket_transcript(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let pool = &ctx.data().pool;
    let lang_code = crate::db::guild_lang(pool, ctx.guild_id().map(|g| g.get())).await;
    let channel_id = ctx.channel_id();
    // Defer up front: transcript generation walks the channel history
    // plus a bot-avatar fetch, past the 3s interaction token. This puts
    // the flow in the `interaction.deferred` state, so the check-DMs ack
    // below mirrors the deferred branch of TicketTranscript
    // (ticketsManager.ts:1524-1529, `editReply` with
    // `guildconfig_config_save_check_dm`): poise renders the post-defer
    // send as the follow-up carrying that same content, while the guard
    // replies below stay public (non-ephemeral follow-ups, like their
    // TS `interactionSend` forms).
    ctx.defer().await?;
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
    // Single fetch path (PERF): `channel_transcript_html(enriched)`
    // already walks history once and inlines the bot-avatar favicon
    // (TS `favicon` option) plus avatar/image data-URIs. No second
    // avatar fetch here.
    let (html, _count) = channel_transcript_html(&http, channel_id, true).await;
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
