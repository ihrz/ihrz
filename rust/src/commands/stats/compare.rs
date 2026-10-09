use super::*;

#[poise::command(slash_command, prefix_command, rename = "compare", aliases("cmp"))]
pub async fn stats_compare(
    ctx: Ctx<'_>,
    #[description = "First user"] user1: poise::serenity_prelude::User,
    #[description = "Second user"] user2: poise::serenity_prelude::User,
) -> Result<(), anyhow::Error> {
    if user1.id == user2.id {
        let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
        ctx.say(
            crate::lang::get(&code, "stats_compare_same_user")
                .unwrap_or_else(|| "Compare two different users.".to_string()),
        )
        .await?;
        return Ok(());
    }
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let a = load_stats(&ctx.data().pool, &gid, user1.id.get()).await;
    let b = load_stats(&ctx.data().pool, &gid, user2.id.get()).await;
    let winner = if a.messages + a.voice_ms >= b.messages + b.voice_ms {
        &user1
    } else {
        &user2
    };
    ctx.say(
        crate::lang::get(
            &crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await,
            "stats_compare_text",
        )
        .map(|t| {
            t.replace("${user1}", &user1.tag())
                .replace("${a_messages}", &a.messages.to_string())
                .replace("${a_voice}", &(a.voice_ms / 60_000).to_string())
                .replace("${user2}", &user2.tag())
                .replace("${b_messages}", &b.messages.to_string())
                .replace("${b_voice}", &(b.voice_ms / 60_000).to_string())
                .replace("${winner}", &winner.tag())
        })
        .unwrap_or_else(|| {
            format!(
                "{}: {}msg/{}m vs {}: {}msg/{}m — winner {}",
                user1.tag(),
                a.messages,
                a.voice_ms / 60_000,
                user2.tag(),
                b.messages,
                b.voice_ms / 60_000,
                winner.tag()
            )
        }),
    )
    .await?;
    Ok(())
}
