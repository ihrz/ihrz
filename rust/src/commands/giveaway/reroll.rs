use super::*;
use poise::serenity_prelude as serenity;

/// Reroll a giveaway winner(s)!
#[poise::command(
    slash_command,
    prefix_command,
    rename = "reroll",
    aliases("re"),
    default_member_permissions = "MANAGE_GUILD"
)]
pub async fn gw_reroll(
    ctx: Ctx<'_>,
    #[description = "Giveaway message id"]
    #[rename = "giveaway-id"]
    message_id: String,
) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let mid: u64 = message_id.trim().parse().unwrap_or(0);
    let code_early = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    let t_early = |k: &str| crate::lang::get(&code_early, k).unwrap_or_default();
    // Global board read like TS GetGiveawayData; persist/delete under
    // the owning guild scope.
    let Some((home_gid, raw)) = super::gw::store_lookup(&ctx.data().pool, &gid, mid).await else {
        ctx.say(t_early("reroll_dont_find_giveaway").replace("{args}", message_id.trim()))
            .await?;
        return Ok(());
    };
    let mut gw: Giveaway = serde_json::from_str(&raw).unwrap_or_else(|_| Giveaway {
        guild_id: gid.clone(),
        channel_id: String::new(),
        winner_count: 1,
        prize: String::new(),
        hosted_by: String::new(),
        expire_in_ms: 0,
        ended: true,
        entries: vec![],
        winners: vec![],
        requirement: "none".to_string(),
        requirement_value: String::new(),
        is_valid: true,
        embed_image_url: None,
    });
    let seed = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_nanos() as u64)
        .unwrap_or(1)
        .wrapping_add(1);
    let pool = &ctx.data().pool;
    let code = crate::db::guild_lang(pool, ctx.guild_id().map(|g| g.get())).await;
    let t = |k: &str| crate::lang::get(&code, k).unwrap_or_default();
    // Mirrors !reroll.ts: isValid first (-> reroll_dont_find_giveaway),
    // then isEnded (-> reroll_giveaway_not_over).
    if !gw.is_valid {
        ctx.say(t("reroll_dont_find_giveaway").replace("{args}", message_id.trim()))
            .await?;
        return Ok(());
    }
    if !gw.ended {
        ctx.say(t("reroll_giveaway_not_over")).await?;
        return Ok(());
    }
    // Fresh winners excluding past ones, like selectWinners.
    // Mirrors reroll().
    gw.winners = pick_winners(
        &gw.entries,
        &gw.winners.clone(),
        gw.winner_count as usize,
        seed,
    );
    let winners_now = gw.winners.clone();
    let _ = super::gw::store_set(pool, &home_gid, mid, &serde_json::to_string(&gw)?).await;
    let http = &ctx.serenity_context().http;
    let Ok(channel) = gw.channel_id.parse::<u64>() else {
        return Ok(());
    };
    let channel = serenity::ChannelId::new(channel);
    let Ok(message) = channel.message(http, serenity::MessageId::new(mid)).await else {
        // Board message gone: drop the row like the TS fetch catch.
        let _ = super::gw::store_del(pool, &home_gid, mid).await;
        return Ok(());
    };
    let (ended, time2) = stamp_pair(gw.expire_in_ms);
    // Empty rerolls stay an empty string like reroll()
    // (`winners.toString()`); only finish() uses the none-word.
    let desc = t("event_gw_ended_word")
        .replace("${winners}", &reroll_winners_text(&winners_now))
        .replace("${ended}", &ended)
        .replace("${time2}", &time2)
        .replace("${hostedBy}", &gw.hosted_by)
        .replace("${entries}", &gw.entries.len().to_string());
    let (footer_name, footer_icon) = giveaway_footer(pool, http, &home_gid).await;
    let embed = ended_board_shell(
        &gw.prize,
        desc,
        gw.embed_image_url.as_deref(),
        &footer_name,
        footer_icon.is_some(),
        crate::commands::schedule::main::now_ms() / 1000,
    );
    let mut edit = serenity::EditMessage::new().embed(embed);
    if let Some(icon) = footer_icon {
        edit = edit.attachments(crate::commands::embed::embed_builder::edit_attachments(
            vec![serenity::CreateAttachment::bytes(icon, "footer_icon.png")],
        ));
    }
    let _ = channel.edit_message(http, message.id, edit).await;
    // Mirrors reroll(): `if (winner && winner[0] !== "None")` posts
    // the win message, else the cannot message. An empty pick
    // (`winner = []`, so `winner[0]` is undefined) still posts
    // `event_gw_reroll_win_msg` with an empty winners string — unlike
    // finish(), which falls back to the cannot message when empty.
    if winners_now.first().map(|w| w.as_str()) == Some("None") {
        let _ = message.reply(http, t("event_gw_finnish_cannot_msg")).await;
    } else {
        let content = t("event_gw_reroll_win_msg")
            .replace(
                "${winners}",
                &winners_now
                    .iter()
                    .map(|w| format!("<@{w}>"))
                    .collect::<Vec<_>>()
                    .join(","),
            )
            .replace("${fetch[channelId][messageId].prize}", &gw.prize);
        let _ = message.reply(http, content).await;
    }
    // Success confirmation, then the audit log. Mirrors !reroll.ts.
    ctx.say(
        crate::lang::get(&code, "reroll_command_work")
            .unwrap_or_else(|| "Giveaway relaunched!".to_string()),
    )
    .await?;
    super::create::post_gw_log(
        &ctx,
        &crate::lang::get(&code, "reroll_logs_embed_title")
            .unwrap_or_else(|| "Giveaways Logs".to_string()),
        &render_reroll_log(
            &crate::lang::get(&code, "reroll_logs_embed_description").unwrap_or_else(|| {
                "<@${interaction.user.id}> rerolled giveaways with this ID: ${giveaway.messageID}"
                    .to_string()
            }),
            ctx.author().id.get(),
            message_id.trim(),
        ),
    )
    .await;
    Ok(())
}

/// Render the reroll audit-log description
/// (`reroll_logs_embed_description`).
pub fn render_reroll_log(template: &str, user_id: u64, message_id: &str) -> String {
    template
        .replace("${interaction.user.id}", &user_id.to_string())
        .replace("${giveaway.messageID}", message_id)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn reroll_log_render() {
        assert_eq!(
            render_reroll_log(
                "<@${interaction.user.id}> rerolled giveaways with this ID: ${giveaway.messageID}",
                42,
                "123"
            ),
            "<@42> rerolled giveaways with this ID: 123"
        );
    }
}
