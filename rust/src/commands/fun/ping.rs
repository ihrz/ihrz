use super::*;

/// Network stats embed. Mirrors bot/ping.ts.
#[poise::command(
    slash_command,
    prefix_command,
    category = "fun",
    aliases("speed", "pong", "vitesse")
)]
pub async fn ping(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    let down_msg = crate::commands::lang_for(&ctx, "ping_down_msg", "**DOWN**").await;
    let template = crate::commands::lang_for(
        &ctx,
        "ping_embed_desc",
        "# Pong! ${interaction.client.user.username}'s Network Stats:\n\n**[Discord Website Ping]** >> `${_net03}` ms.\n**[Cloudflare Ping]** >> `${_net02}` ms.\n**[Google Ping]** >> `${_net01}` ms.\n\n${client.iHorizon_Emojis.Crown} **[iHorizon Website Ping]** >> `${_net04}` ms.\n${client.iHorizon_Emojis.Crown} **[Websocket Ping]** `${client.ws.ping}` ms.\n\n## ${client.iHorizon_Emojis.Pointer} **[Average]** >> (avg)`${averagePing}` ms.",
    )
    .await;
    let loading = ctx.say("...").await?;
    let ws_ms = ctx.ping().await.as_millis();
    let cfg = crate::monitor::PingConfig::default();
    let mut times: [Option<f64>; 4] = [None, None, None, None];
    for (i, host) in PING_PROBE_HOSTS.iter().enumerate() {
        if let Ok(resp) = crate::monitor::ping_execute(host, &cfg).await {
            times[i] = resp.parsed.time_ms;
        }
    }
    let nets = [
        ping_net_label(times[0], &down_msg),
        ping_net_label(times[1], &down_msg),
        ping_net_label(times[2], &down_msg),
        ping_net_label(times[3], &down_msg),
    ];
    let username = ctx.serenity_context().cache.current_user().name.clone();
    // Boot-warmed app-emoji cache (was a REST fetch per /ping call).
    let crown = crate::emojis::app_emoji_markup(ctx.http(), "Crown")
        .await
        .unwrap_or_default();
    let pointer = crate::emojis::app_emoji_markup(ctx.http(), "Pointer")
        .await
        .unwrap_or_default();
    let desc = render_ping_desc(
        &template,
        &username,
        &crown,
        &pointer,
        &nets,
        ws_ms,
        ping_average_ms(&times),
    );
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let (footer_name, footer_bytes) = crate::commands::utils::footer_parts(&ctx, &gid).await;
    let embed = poise::serenity_prelude::CreateEmbed::default()
        .colour(2829617_u32)
        .description(desc);
    let embed =
        crate::commands::utils::embed_with_footer(embed, &footer_name, footer_bytes.is_some());
    let mut reply = poise::CreateReply::default().embed(embed);
    if let Some(bytes) = footer_bytes {
        reply = reply.attachment(poise::serenity_prelude::CreateAttachment::bytes(
            bytes,
            "footer_icon.png",
        ));
    }
    loading.edit(ctx, reply).await?;
    Ok(())
}
