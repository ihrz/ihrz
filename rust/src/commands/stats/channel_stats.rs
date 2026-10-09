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
            let n: u64 = load_channel_count(&ctx.data().pool, &gid, ch.id.get()).await;
            ctx.say(format!("<#{}>: {n} messages.", ch.id.get()))
                .await?;
        }
        None => {
            let parsed: Vec<(String, u64)> = load_all_channel_counts(&ctx.data().pool, &gid).await;
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
