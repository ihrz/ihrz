use super::*;

/// Stop a giveaway!
#[poise::command(
    slash_command,
    prefix_command,
    rename = "end",
    aliases("gstop", "gbreak", "gw-end"),
    default_member_permissions = "MANAGE_MESSAGES"
)]
pub async fn gw_end(
    ctx: Ctx<'_>,
    // Option (not required): TS reads `getString("giveaway-id")` /
    // `string(args, 0)` (both nullable, !end.ts) while the slash schema
    // marks it required (gw.ts). A missing id fails `isValid` in TS and
    // answers `end_not_find_giveaway` with `${gw}` replaced by null (JS
    // renders "null"); the bare form therefore gets the localized reply
    // instead of a poise parse error. `mid` 0 matches no board, like TS.
    #[description = "Giveaway message id"]
    #[rename = "giveaway-id"]
    message_id: Option<String>,
) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let raw_id = message_id.as_deref().unwrap_or("null");
    let mid: u64 = raw_id.trim().parse().unwrap_or(0);
    let code_early = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    let t_early = |k: &str| crate::lang::get(&code_early, k).unwrap_or_default();
    // Global board read like TS GetGiveawayData (keyed by message id,
    // not by guild); persist/delete under the owning guild scope.
    let Some((home_gid, raw)) = super::gw::store_lookup(&ctx.data().pool, &gid, mid).await else {
        ctx.say(t_early("end_not_find_giveaway").replace("${gw}", raw_id.trim()))
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
        is_valid: true,
        embed_image_url: None,
    });
    let seed = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_nanos() as u64)
        .unwrap_or(1);
    // Mirrors !end.ts: isValid first (-> end_not_find_giveaway), then
    // isEnded (-> end_command_error).
    if !gw.is_valid {
        let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
        ctx.say(
            crate::lang::get(&code, "end_not_find_giveaway")
                .unwrap_or_default()
                .replace("${gw}", raw_id.trim()),
        )
        .await?;
        return Ok(());
    }
    if gw.ended {
        let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
        ctx.say(crate::lang::get(&code, "end_command_error").unwrap_or_default())
            .await?;
        return Ok(());
    }
    // Mirrors !end.ts: `client.giveawaysManager.end(...)` is NOT
    // awaited — the confirmation goes out immediately while the shared
    // end flow (winners, board edit, winners reply) runs detached. A
    // gone board drops the row like the TS fetch catch.
    let pool = ctx.data().pool.clone();
    let http = ctx.serenity_context().http.clone();
    let code = crate::db::guild_lang(&pool, ctx.guild_id().map(|g| g.get())).await;
    let now_secs = (seed / 1_000_000_000) as i64;
    let code_task = code.clone();
    tokio::spawn(async move {
        let lived = finish_giveaway(
            &pool, &http, &home_gid, mid, &mut gw, seed, &code_task, now_secs,
        )
        .await;
        if !lived {
            let _ = super::gw::store_del(&pool, &home_gid, mid).await;
        }
    });
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
            raw_id.trim(),
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
