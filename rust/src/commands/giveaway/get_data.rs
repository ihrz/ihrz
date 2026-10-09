use super::*;

/// Show one giveaway's data. Mirrors !get-data.ts.
#[poise::command(
    slash_command,
    prefix_command,
    rename = "get-data",
    default_member_permissions = "MANAGE_MESSAGES"
)]
pub async fn gw_get_data(
    ctx: Ctx<'_>,
    #[description = "Giveaway message id"] message_id: String,
) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let mid: u64 = message_id.trim().parse().unwrap_or(0);
    let raw = crate::db::kv_get(&ctx.data().pool, &gid, &giveaway_key(mid)).await;
    match raw.and_then(|r| serde_json::from_str::<Giveaway>(&r).ok()) {
        Some(gw) => {
            ctx.say(format!(
                "Prize: {} | Winners: {} | Ended: {} | Entries: {}",
                gw.prize,
                gw.winner_count,
                gw.ended,
                gw.entries.len()
            ))
            .await?
        }
        None => {
            let code =
                crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
            ctx.say(
                crate::lang::get(&code, "gw_doesnt_exit")
                    .unwrap_or_else(|| "Giveaway not found.".to_string()),
            )
            .await?
        }
    };
    Ok(())
}
