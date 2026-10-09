use super::*;

#[poise::command(
    slash_command,
    prefix_command,
    rename = "list-entries",
    default_member_permissions = "MANAGE_MESSAGES"
)]
pub async fn gw_entries(
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
    // Mirrors !list-entries.ts:52-67 (missing -> end_not_find_giveaway,
    // ended -> end_command_error).
    let gw: Giveaway = match serde_json::from_str(&raw) {
        Ok(gw) => gw,
        Err(_) => {
            ctx.say(t_early("end_not_find_giveaway").replace("${gw}", message_id.trim()))
                .await?;
            return Ok(());
        }
    };
    if gw.ended {
        ctx.say(t_early("end_command_error")).await?;
        return Ok(());
    }
    let entries: Vec<String> = gw.entries.clone();
    if entries.is_empty() {
        ctx.send(
            poise::CreateReply::default()
                .content(t_early("history_no_entries"))
                .ephemeral(true),
        )
        .await?;
        return Ok(());
    }
    let http = ctx.serenity_context().http.clone();
    let Some((embed, components)) =
        render_entries_page(&http, &ctx.data().pool, &gid, t_early, mid, &entries, 0).await
    else {
        return Ok(());
    };
    ctx.send(
        poise::CreateReply::default()
            .embed(embed)
            .components(components)
            .ephemeral(true),
    )
    .await?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn ended_gate_parses_like_ts_isended() {
        let live = Giveaway {
            guild_id: "g".into(),
            channel_id: "c".into(),
            winner_count: 1,
            prize: "p".into(),
            hosted_by: "h".into(),
            expire_in_ms: 1,
            ended: false,
            entries: vec![],
            winners: vec![],
            requirement: "none".into(),
            requirement_value: String::new(),
            embed_image_url: None,
        };
        let raw = serde_json::to_string(&live).unwrap();
        let parsed: Giveaway = serde_json::from_str(&raw).unwrap();
        assert!(!parsed.ended);
        let mut ended = live;
        ended.ended = true;
        assert!(ended.ended);
    }
}
