use super::*;

/// Partner ad (fr-only). Mirrors MessageCommands/misc/@fexini.ts.
#[poise::command(slash_command, prefix_command, category = "bot", rename = "fexini")]
pub async fn fexini(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    let locale = ctx
        .guild()
        .map(|g| g.preferred_locale.clone())
        .unwrap_or_default();
    let Some(ad) = fexini_ad_for_locale(&locale) else {
        return Ok(());
    };
    let reply = ctx.say(ad).await?;
    // TS deletes the reply and the invoking message after 10s (each
    // guarded by deletability there; delete failures are tolerated
    // here the same way).
    let invoker = match &ctx {
        Ctx::Prefix(p) => Some((p.msg.channel_id, p.msg.id)),
        _ => None,
    };
    if let Ok(sent) = reply.message().await {
        let http = ctx.serenity_context().http.clone();
        let (channel_id, message_id) = (sent.channel_id, sent.id);
        tokio::spawn(async move {
            tokio::time::sleep(std::time::Duration::from_secs(10)).await;
            let _ = http.delete_message(channel_id, message_id, None).await;
            if let Some((inv_channel_id, inv_message_id)) = invoker {
                let _ = http
                    .delete_message(inv_channel_id, inv_message_id, None)
                    .await;
            }
        });
    }
    Ok(())
}
