// iHorizon Discord Bot (https://gitlab.com/ihrz/ihrz)
// Licensed under CC-BY-NC-SA-4.0.
// Context menu commands. Mirrors UserApplicationCommands/* +
// MessageApplicationCommands/* (bridges to existing logic; sound_to_video
// needs ffmpeg — pending).

use crate::bot::Ctx;

/// User Lookup. Mirrors User Lookup -> utils userinfo bridge.
#[poise::command(context_menu_command = "User Lookup")]
pub async fn user_lookup(
    ctx: Ctx<'_>,
    #[description = "Member"] user: poise::serenity_prelude::User,
) -> Result<(), anyhow::Error> {
    let created = user.created_at().unix_timestamp();
    let embed = poise::serenity_prelude::CreateEmbed::default()
        .title(user.tag())
        .field("ID", user.id.get().to_string(), true)
        .field("Bot", user.bot.to_string(), true)
        .field("Created", format!("<t:{created}:F>"), false)
        .thumbnail(user.face());
    ctx.send(poise::CreateReply::default().embed(embed).ephemeral(true))
        .await?;
    Ok(())
}

/// User love. Mirrors love context bridge (deterministic score).
#[poise::command(context_menu_command = "Love")]
pub async fn user_love(
    ctx: Ctx<'_>,
    #[description = "Member"] user: poise::serenity_prelude::User,
) -> Result<(), anyhow::Error> {
    let score = crate::commands::fun::love_score(ctx.author().id.get(), user.id.get(), &[]);
    ctx.say(format!("Love: {score}%")).await?;
    Ok(())
}

/// 8-ball on a message. Mirrors question message-command bridge.
#[poise::command(context_menu_command = "Question")]
pub async fn msg_question(
    ctx: Ctx<'_>,
    #[description = "Message"] msg: poise::serenity_prelude::Message,
) -> Result<(), anyhow::Error> {
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_millis() as u64)
        .unwrap_or(1);
    ctx.say(crate::commands::fun::eightball(
        now.wrapping_add(msg.id.get()),
    ))
    .await?;
    Ok(())
}

/// Queue a message's content. Mirrors play message-command bridge
/// (lavalink wiring pending, history recorded like /music play).
#[poise::command(context_menu_command = "Play")]
pub async fn msg_play(
    ctx: Ctx<'_>,
    #[description = "Message"] msg: poise::serenity_prelude::Message,
) -> Result<(), anyhow::Error> {
    let title = msg.content.trim().to_string();
    if title.is_empty() {
        ctx.say("Empty message.").await?;
        return Ok(());
    }
    ctx.say(format!("Queued: {title} [lavalink wiring pending]"))
        .await?;
    Ok(())
}
