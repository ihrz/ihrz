use super::*;

/// Hug command.
#[poise::command(slash_command, prefix_command, category = "fun", rename = "hug")]
pub async fn hug(
    ctx: Ctx<'_>,
    #[description = "Member"] user: poise::serenity_prelude::User,
) -> Result<(), anyhow::Error> {
    social_gif(
        &ctx,
        &user,
        "hug",
        "hug_embed_title",
        "<@${interaction.user.id}> gives a hug to <@${hug.id}>",
        0xFFB6C1,
        "${hug.id}",
    )
    .await
}

/// Kiss command.
#[poise::command(slash_command, prefix_command, category = "fun", rename = "kiss")]
pub async fn kiss(
    ctx: Ctx<'_>,
    #[description = "Member"] user: poise::serenity_prelude::User,
) -> Result<(), anyhow::Error> {
    social_gif(
        &ctx,
        &user,
        "kiss",
        "kiss_embed_description",
        "<@${interaction.user.id}> gives a kiss to <@${kiss.id}>",
        0xFF0884,
        "${kiss.id}",
    )
    .await
}

/// Slap command.
#[poise::command(slash_command, prefix_command, category = "fun", rename = "slap")]
pub async fn slap(
    ctx: Ctx<'_>,
    #[description = "Member"] user: poise::serenity_prelude::User,
) -> Result<(), anyhow::Error> {
    social_gif(
        &ctx,
        &user,
        "slap",
        "slap_embed_description",
        "<@${interaction.user.id}> slaps <@${slap.id}>",
        0x42FF08,
        "${slap.id}",
    )
    .await
}

/// Love command.
#[poise::command(slash_command, prefix_command, category = "fun", rename = "love")]
pub async fn love(
    ctx: Ctx<'_>,
    #[description = "First user"] user1: poise::serenity_prelude::User,
    #[description = "Second user"] user2: Option<poise::serenity_prelude::User>,
) -> Result<(), anyhow::Error> {
    let b = user2
        .map(|u| u.id.get())
        .unwrap_or_else(|| ctx.author().id.get());
    let score = love_score(user1.id.get(), b, &[]);
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    ctx.say(
        crate::lang::get(&code, "love_embed_description")
            .map(|s| {
                s.replace("${user1.username}", &user1.tag())
                    .replace("${user2.username}", &format!("<@{b}>"))
                    .replace("${randomNumber}", &score.to_string())
            })
            .unwrap_or_else(|| format!("Love between {} and <@{b}>: {score}%", user1.tag())),
    )
    .await?;
    Ok(())
}

/// Gay rate. Mirrors fun !gay.ts.
#[poise::command(slash_command, prefix_command, category = "fun", rename = "gay")]
pub async fn gay(
    ctx: Ctx<'_>,
    #[description = "Member"] user: Option<poise::serenity_prelude::User>,
) -> Result<(), anyhow::Error> {
    percent_user(
        &ctx,
        user,
        "fun_gay_command_ok",
        "The user ${user} is **${random}%** gay",
    )
    .await
}

/// Stench rate. Mirrors fun !stench.ts.
#[poise::command(
    slash_command,
    prefix_command,
    category = "fun",
    rename = "stench",
    aliases("odeur", "odeurs", "puanteurs", "puanteur", "arf", "pue")
)]
pub async fn stench(
    ctx: Ctx<'_>,
    #[description = "Member"] user: Option<poise::serenity_prelude::User>,
) -> Result<(), anyhow::Error> {
    percent_user(
        &ctx,
        user,
        "fun_stench_command_ok",
        "The user ${user} is **${random}%** stinky",
    )
    .await
}

/// Rate something X/10. Mirrors fun !rate.ts (alias note).
#[poise::command(
    slash_command,
    prefix_command,
    category = "fun",
    rename = "rate",
    aliases("note")
)]
pub async fn rate(
    ctx: Ctx<'_>,
    #[description = "Thing to rate"] the_things: String,
) -> Result<(), anyhow::Error> {
    use rand::Rng;
    let random: u32 = rand::thread_rng().gen_range(0..10);
    ctx.say(
        crate::commands::lang_for(
            &ctx,
            "fun_rate_command_ok",
            "I rate ${the_things} ${random}/10.",
        )
        .await
        .replace("${the_things}", &the_things)
        .replace("${random}", &random.to_string()),
    )
    .await?;
    Ok(())
}
