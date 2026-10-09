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
            let code =
                crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
            ctx.say(
                crate::lang::get(&code, "stats_channel_single_text")
                    .map(|t| {
                        t.replace("${channel}", &ch.id.get().to_string())
                            .replace("${count}", &n.to_string())
                    })
                    .unwrap_or_else(|| format!("<#{}>: {n} messages.", ch.id.get())),
            )
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
            let code =
                crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
            ctx.say(if top.is_empty() {
                crate::lang::get(&code, "stats_no_data")
                    .unwrap_or_else(|| "No statistics data available for this server.".to_string())
            } else {
                top.join("\n")
            })
            .await?;
        }
    }
    Ok(())
}
