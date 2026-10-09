use super::*;

/// Love command.
#[poise::command(slash_command, prefix_command, category = "fun", rename = "love")]
pub async fn love(
    ctx: Ctx<'_>,
    #[description = "First user"] user1: poise::serenity_prelude::User,
    #[description = "Second user"] user2: Option<poise::serenity_prelude::User>,
) -> Result<(), anyhow::Error> {
    if fun_guard(&ctx).await {
        return Ok(());
    }
    let b = user2
        .map(|u| u.id.get())
        .unwrap_or_else(|| ctx.author().id.get());
    let score = love_score(user1.id.get(), b, &[]);
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    ctx.say(
        crate::lang::get(&code, "love_embed_description")
            .unwrap_or_else(|| {
                "**${user1.username}** + **${user2.username}** = __${randomNumber}%__ of love 💗"
                    .to_string()
            })
            .replace("${user1.username}", &user1.tag())
            .replace("${user2.username}", &format!("<@{b}>"))
            .replace("${randomNumber}", &score.to_string()),
    )
    .await?;
    Ok(())
}
