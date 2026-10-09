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
    let t = |k: &str| crate::lang::get(&lang_code, k).unwrap_or_default();
    let http = ctx.serenity_context().http.clone();
    let (html, _count) = channel_transcript_html(&http, channel_id).await;
    ctx.say(t("guildconfig_config_save_check_dm")).await?;
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
        ctx.say(t("ticket_transcript_failed_to_send")).await?;
    }
    Ok(())
}
