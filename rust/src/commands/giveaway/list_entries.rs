use super::*;
use poise::serenity_prelude as serenity;

#[poise::command(
    slash_command,
    prefix_command,
    rename = "list-entries",
    aliases("list"),
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
    let pool = &ctx.data().pool;
    let code_early = crate::db::guild_lang(pool, ctx.guild_id().map(|g| g.get())).await;
    let t_early = |k: &str| crate::lang::get(&code_early, k).unwrap_or_default();
    // Global board read like TS GetGiveawayData; !list-entries.ts gates
    // on isValid (-> end_not_find_giveaway) then isEnded
    // (-> end_command_error).
    let Some((home_gid, raw)) = super::gw::store_lookup(pool, &gid, mid).await else {
        ctx.say(t_early("end_not_find_giveaway").replace("${gw}", message_id.trim()))
            .await?;
        return Ok(());
    };
    // TS listEntries only serves the owning guild
    // (`interaction.guildId === fetch.guildId`, giveawaysManager.ts:614);
    // cross-guild reads silently return.
    if home_gid != gid {
        return Ok(());
    }
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
    if !gw.is_valid {
        ctx.say(t_early("end_not_find_giveaway").replace("${gw}", message_id.trim()))
            .await?;
        return Ok(());
    }
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
    let invoker = Some(ctx.author().id.get());
    let t = |k: &str| crate::lang::get(&code_early, k).unwrap_or_default();
    let Some((embed, components, icon)) =
        crate::commands::giveaway::render_entries_page(crate::commands::giveaway::EntriesPage {
            http: &http,
            pool,
            gid: &home_gid,
            t,
            mid,
            entries: &entries,
            page: 0,
            invoker,
        })
        .await
    else {
        return Ok(());
    };
    let mut reply = poise::CreateReply::default()
        .embed(embed)
        .components(components)
        .ephemeral(true);
    if let Some(bytes) = icon {
        reply = reply.attachment(serenity::CreateAttachment::bytes(bytes, "footer_icon.png"));
    }
    ctx.send(reply).await?;
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
            is_valid: true,
            embed_image_url: None,
        };
        let raw = serde_json::to_string(&live).unwrap();
        let parsed: Giveaway = serde_json::from_str(&raw).unwrap();
        assert!(!parsed.ended);
        assert!(parsed.is_valid);
        let mut ended = live;
        ended.ended = true;
        assert!(ended.ended);
    }
}
