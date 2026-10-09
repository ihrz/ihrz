use super::*;

/// Channel stats. Mirrors stats channel-stats (message counts per channel).
#[poise::command(
    slash_command,
    prefix_command,
    rename = "channel-stats",
    aliases("cstats", "chstats")
)]
pub async fn stats_channel(
    ctx: Ctx<'_>,
    #[description = "Channel"] channel: Option<poise::serenity_prelude::GuildChannel>,
) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    match channel {
        Some(ch) => {
            let n: u64 = crate::db::kv_get(
                &ctx.data().pool,
                &gid,
                &crate::events::channel_stats_key(ch.id.get()),
            )
            .await
            .and_then(|v| v.parse().ok())
            .unwrap_or(0);
            ctx.say(format!("<#{}>: {n} messages.", ch.id.get()))
                .await?;
        }
        None => {
            let rows: Vec<(String, String)> = sqlx::query_as::<_, (String, String)>(
                "SELECT key_name, value FROM kv WHERE guild_id = ? AND key_name LIKE 'STATS.CHANNEL.%'",
            )
            .bind(&gid)
            .fetch_all(&ctx.data().pool)
            .await
            .unwrap_or_default();
            let mut parsed: Vec<(String, u64)> = rows
                .iter()
                .filter_map(|(k, v)| {
                    let id = k.strip_prefix("STATS.CHANNEL.")?.to_string();
                    Some((id, v.parse().ok()?))
                })
                .collect();
            parsed.sort_by_key(|a| std::cmp::Reverse(a.1));
            let top: Vec<String> = parsed
                .iter()
                .take(10)
                .enumerate()
                .map(|(i, (id, n))| format!("{}. <#{id}> — {n}", i + 1))
                .collect();
            ctx.say(if top.is_empty() {
                "No data.".to_string()
            } else {
                top.join("\n")
            })
            .await?;
        }
    }
    Ok(())
}
