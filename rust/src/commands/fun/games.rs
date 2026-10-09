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
    let template = crate::commands::lang_for(&ctx, "ping_embed_desc", "Pong!").await;
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

/// Dice roll. Mirrors !dice.ts (number x Dfaces results + total embed).
#[poise::command(
    slash_command,
    prefix_command,
    category = "fun",
    rename = "dice",
    aliases("dé")
)]
pub async fn dice(
    ctx: Ctx<'_>,
    #[description = "Number of dice"] number: Option<f64>,
    #[description = "Faces per die"] faces: Option<f64>,
) -> Result<(), anyhow::Error> {
    let number = number.unwrap_or(1.0).max(1.0) as usize;
    let faces = (faces.unwrap_or(6.0).max(2.0)) as u32;
    let results = roll_dice_set(number, faces);
    let total: u32 = results.iter().sum();
    let embed = poise::serenity_prelude::CreateEmbed::default()
        .title(crate::commands::lang_for(&ctx, "fun_dice_embed_title", "Dice Roll Result").await)
        .description(format!(
            "{} {number} x D{faces}\n{} {}\n{} {total}",
            crate::commands::lang_for(&ctx, "fun_dice_var_rolled_dices", "Rolled Dice:").await,
            crate::commands::lang_for(&ctx, "fun_dice_var_results", "Results:").await,
            results
                .iter()
                .map(|r| r.to_string())
                .collect::<Vec<_>>()
                .join(", "),
            crate::commands::lang_for(&ctx, "fun_dice_var_total", "Total:").await,
        ))
        .colour(random_colour());
    ctx.send(poise::CreateReply::default().embed(embed)).await?;
    Ok(())
}

/// Coin flip. Mirrors !heads-tails.ts (pileouface/pile-ou-face aliases).
#[poise::command(
    slash_command,
    prefix_command,
    category = "fun",
    rename = "heads-tails",
    aliases("pileouface", "pile-ou-face", "coinflip")
)]
pub async fn coinflip(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    let heads = coin_flip(now_ms_sys()) == "heads";
    let result = if heads {
        crate::commands::lang_for(&ctx, "fun_coinflip_result_heads", "Heads").await
    } else {
        crate::commands::lang_for(&ctx, "fun_coinflip_result_tails", "Tails").await
    };
    let embed = poise::serenity_prelude::CreateEmbed::default()
        .title(crate::commands::lang_for(&ctx, "fun_coinflip_embed_title", "Heads or Tails").await)
        .description(format!(
            "{} {result}",
            crate::commands::lang_for(&ctx, "fun_coinflip_result_text", "The result is:").await
        ))
        .colour(random_colour());
    ctx.send(poise::CreateReply::default().embed(embed)).await?;
    Ok(())
}

/// Random number command.
#[poise::command(slash_command, prefix_command, category = "fun", rename = "number")]
pub async fn number(
    ctx: Ctx<'_>,
    #[description = "Min"] min: Option<i64>,
    #[description = "Max"] max: Option<i64>,
) -> Result<(), anyhow::Error> {
    ctx.say(roll_range(now_ms_sys(), min.unwrap_or(1), max.unwrap_or(100)).to_string())
        .await?;
    Ok(())
}

/// 8-ball command.
#[poise::command(
    slash_command,
    prefix_command,
    category = "fun",
    rename = "question",
    aliases("8ball")
)]
pub async fn question(
    ctx: Ctx<'_>,
    #[description = "Your question"] _q: String,
) -> Result<(), anyhow::Error> {
    ctx.say(eightball(now_ms_sys())).await?;
    Ok(())
}

/// Morse command.
#[poise::command(slash_command, prefix_command, category = "fun", rename = "morse")]
pub async fn morse(
    ctx: Ctx<'_>,
    #[description = "Text"] text: String,
) -> Result<(), anyhow::Error> {
    ctx.say(morse_encode(&text)).await?;
    Ok(())
}

/// Poll command (options as comma list; reactions tallied by clients).
#[poise::command(slash_command, prefix_command, category = "fun", rename = "poll")]
pub async fn poll(
    ctx: Ctx<'_>,
    #[description = "Comma-separated options"] options: String,
) -> Result<(), anyhow::Error> {
    let opts: Vec<String> = options
        .split(',')
        .map(|s| s.trim().to_string())
        .filter(|s| !s.is_empty())
        .collect();
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    if opts.len() < 2 {
        ctx.say(
            crate::lang::get(&code, "msg_give_at_least_2_options")
                .unwrap_or_else(|| "Give at least 2 options.".to_string()),
        )
        .await?;
        return Ok(());
    }
    ctx.say(
        opts.iter()
            .enumerate()
            .map(|(i, o)| format!("{}. {o}", i + 1))
            .collect::<Vec<_>>()
            .join("\n"),
    )
    .await?;
    Ok(())
}

#[poise::command(slash_command, prefix_command, category = "fun", rename = "hack")]
pub async fn hack(
    ctx: Ctx<'_>,
    #[description = "Member"] user: poise::serenity_prelude::User,
) -> Result<(), anyhow::Error> {
    ctx.say(hack_lines(&user.tag()).join("\n")).await?;
    Ok(())
}
