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
    #[description = "Giveaway message id"] message_id: String,
) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let mid: u64 = message_id.trim().parse().unwrap_or(0);
    let raw = crate::db::kv_get(&ctx.data().pool, &gid, &giveaway_key(mid)).await;
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
        let _ = crate::db::kv_del(pool, &gid, &giveaway_key(mid)).await;
        ctx.say(crate::lang::get(&code, "event_gw_finnish_cannot_msg").unwrap_or_default())
            .await?;
    }
    Ok(())
}
