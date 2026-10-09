use super::*;

/// Snipe read. Mirrors utils !snipe.ts (marker stored by events_handler).
#[poise::command(
    slash_command,
    prefix_command,
    category = "utils",
    rename = "snipe",
    aliases("s", "snp")
)]
pub async fn snipe(
    ctx: Ctx<'_>,
    #[description = "Channel, defaults to current"] channel: Option<
        poise::serenity_prelude::GuildChannel,
    >,
) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let ch_id = match &channel {
        Some(c) => c.id.get(),
        None => match ctx.guild_channel().await {
            Some(c) => c.id.get(),
            None => {
                let code =
                    crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
                ctx.say(
                    crate::lang::get(&code, "msg_no_channel")
                        .unwrap_or_else(|| "No channel.".to_string()),
                )
                .await?;
                return Ok(());
            }
        },
    };
    let raw = crate::db::kv_get(&ctx.data().pool, &gid, &format!("SNIPE.{ch_id}")).await;
    if let Some(v) = raw.and_then(|r| serde_json::from_str::<serde_json::Value>(&r).ok()) {
        let author = v.get("author").and_then(|a| a.as_str()).unwrap_or("?");
        let content = v.get("content").and_then(|c| c.as_str()).unwrap_or("");
        ctx.say(format!("{author}: {content}")).await?;
        return Ok(());
    }
    let last = crate::db::kv_get(&ctx.data().pool, &gid, "SNIPE.last_deleted_id").await;
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    ctx.say(match last {
        Some(id) => format!("Last deleted message id: {id}"),
        None => crate::lang::get(&code, "snipe_no_previous_message_deleted")
            .unwrap_or_else(|| "Nothing to snipe.".to_string()),
    })
    .await?;
    Ok(())
}
