use super::*;

#[poise::command(
    slash_command,
    prefix_command,
    rename = "list-entries",
    default_member_permissions = "MANAGE_MESSAGES"
)]
pub async fn gw_entries(
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
        ctx.say(t_early("reroll_dont_find_giveaway").replace("{args}", message_id.trim()))
            .await?;
        return Ok(());
    };
    let entries: Vec<String> = serde_json::from_str::<serde_json::Value>(&raw)
        .ok()
        .and_then(|v| v.get("entries").cloned())
        .and_then(|e| serde_json::from_value(e).ok())
        .unwrap_or_default();
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
