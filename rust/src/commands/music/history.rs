use super::*;

/// Mirrors `!history.ts`.
#[poise::command(
    slash_command,
    prefix_command,
    rename = "history",
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn m_history(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let raw = crate::db::kv_get(&ctx.data().pool, &gid, HISTORY_KEY).await;
    let list: Vec<HistoryEntry> = raw
        .and_then(|s| serde_json::from_str(&s).ok())
        .unwrap_or_default();
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    ctx.say(if list.is_empty() {
        crate::lang::get(&code, "history_no_entries")
            .unwrap_or_else(|| "There are no entries in the music history.".to_string())
    } else {
        list.iter()
            .rev()
            .take(10)
            .map(|e| e.title.clone())
            .collect::<Vec<_>>()
            .join("\n")
    })
    .await?;
    Ok(())
}
