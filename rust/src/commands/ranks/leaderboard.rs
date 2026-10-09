use super::*;

#[poise::command(
    slash_command,
    prefix_command,
    rename = "leaderboard",
    aliases("rankslb")
)]
pub async fn ranks_leaderboard(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    let rows: Vec<(String, String)> = sqlx::query_as::<_, (String, String)>(
        "SELECT key_name, value FROM kv WHERE guild_id = ? AND key_name LIKE 'RANKS.%'",
    )
    .bind(&gid)
    .fetch_all(&ctx.data().pool)
    .await
    .unwrap_or_default();
    let mut parsed: Vec<(u64, RankEntry)> = rows
        .iter()
        .filter_map(|(k, v)| {
            let id: u64 = k.strip_prefix("RANKS.")?.parse().ok()?;
            Some((id, serde_json::from_str(v).ok()?))
        })
        .collect();
    parsed.sort_by_key(|a| std::cmp::Reverse(a.1.xptotal));
    let svg = crate::cards::podium_svg(
        &parsed
            .iter()
            .take(8)
            .map(|(uid, e)| (format!("<@{uid}>"), e.xptotal))
            .collect::<Vec<_>>(),
    );
    let lvl_word = crate::lang::get(&code, "var_level").unwrap_or_else(|| "lvl".to_string());
    let top: Vec<String> = parsed
        .iter()
        .take(15)
        .enumerate()
        .map(|(i, (uid, e))| {
            format!(
                "{}. <@{uid}> — {lvl_word} {} ({} XP)",
                i + 1,
                e.level,
                e.xptotal
            )
        })
        .collect();
    ctx.send(
        poise::CreateReply::default()
            .content(if top.is_empty() {
                crate::lang::get(&code, "perm_list_no_user")
                    .unwrap_or_else(|| "No ranks.".to_string())
            } else {
                top.join("\n")
            })
            .attachment(poise::serenity_prelude::CreateAttachment::bytes(
                svg.into_bytes(),
                "podium.svg",
            )),
    )
    .await?;
    Ok(())
}
