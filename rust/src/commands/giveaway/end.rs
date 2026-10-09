use super::*;

#[poise::command(
    slash_command,
    prefix_command,
    rename = "end",
    aliases("gstop", "gbreak"),
    default_member_permissions = "MANAGE_MESSAGES"
)]
pub async fn gw_end(
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
    let raw = super::gw::store_get(&ctx.data().pool, &gid, mid).await;
    let code_early = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    let t_early = |k: &str| crate::lang::get(&code_early, k).unwrap_or_default();
    let Some(raw) = raw else {
        ctx.say(t_early("end_not_find_giveaway").replace("${gw}", message_id.trim()))
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
        ended: false,
        entries: vec![],
        winners: vec![],
        requirement: "none".to_string(),
        requirement_value: String::new(),
        embed_image_url: None,
    });
    let seed = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_nanos() as u64)
        .unwrap_or(1);
    if gw.ended {
        let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
        ctx.say(crate::lang::get(&code, "end_command_error").unwrap_or_default())
            .await?;
        return Ok(());
    }
    // Shared end flow: winners, board edit, winners reply.
    // Mirrors end() -> finish().
    let pool = &ctx.data().pool;
    let code = crate::db::guild_lang(pool, ctx.guild_id().map(|g| g.get())).await;
    let now_secs = seed / 1_000_000_000;
    let lived = finish_giveaway(
        pool,
        &ctx.serenity_context().http,
        &gid,
        mid,
        &mut gw,
        seed,
        &code,
        now_secs as i64,
    )
    .await;
    if !lived {
        // Board message gone: drop the row like the TS fetch catch.
        let _ = super::gw::store_del(pool, &gid, mid).await;
        ctx.say(crate::lang::get(&code, "event_gw_finnish_cannot_msg").unwrap_or_default())
            .await?;
        return Ok(());
    }
    // Success confirmation first, then the audit log. Mirrors !end.ts
    // (`end_confirmation_message` with ${timeEstimate} -> "0").
    ctx.say(render_end_confirmation(
        &crate::lang::get(&code, "end_confirmation_message").unwrap_or_else(|| {
            "The giveaway will end in less than (${timeEstimate}) seconds...".to_string()
        }),
    ))
    .await?;
    super::create::post_gw_log(
        &ctx,
        &crate::lang::get(&code, "end_logs_embed_title")
            .unwrap_or_else(|| "Giveaway Logs".to_string()),
        &render_end_log(
            &crate::lang::get(&code, "end_logs_embed_description").unwrap_or_else(|| {
                "<@${interaction.user.id}> ended giveaways with this ID: ${giveaway.messageID}"
                    .to_string()
            }),
            ctx.author().id.get(),
            message_id.trim(),
        ),
    )
    .await;
    Ok(())
}

/// Render the end confirmation (`end_confirmation_message`, TS sends
/// it with `${timeEstimate}` replaced by `"0"`).
pub fn render_end_confirmation(template: &str) -> String {
    template.replace("${timeEstimate}", "0")
}

/// Render the end audit-log description (`end_logs_embed_description`).
pub fn render_end_log(template: &str, user_id: u64, message_id: &str) -> String {
    template
        .replace("${interaction.user.id}", &user_id.to_string())
        .replace("${giveaway.messageID}", message_id)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn end_confirmation_and_log_renders() {
        assert_eq!(
            render_end_confirmation(
                "The giveaway will end in less than (${timeEstimate}) seconds..."
            ),
            "The giveaway will end in less than (0) seconds..."
        );
        assert_eq!(
            render_end_log(
                "<@${interaction.user.id}> ended giveaways with this ID: ${giveaway.messageID}",
                42,
                "123"
            ),
            "<@42> ended giveaways with this ID: 123"
        );
    }
}
