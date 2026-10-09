use super::*;
use poise::serenity_prelude as serenity;

/// Show all links about iHorizon. Mirrors link.ts (message content plus
/// website/GitLab link buttons).
#[poise::command(slash_command, prefix_command, category = "bot", aliases("link"))]
pub async fn links(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    // TS returns silently outside a guild/member/channel context.
    if ctx.guild_id().is_none() {
        return Ok(());
    }
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    let f = |k: &str, fb: &str| crate::lang::get(&code, k).unwrap_or_else(|| fb.to_string());
    ctx.send(
        poise::CreateReply::default()
            .content(f(
                "links_message",
                "Click the links below to learn more about me!",
            ))
            .components(vec![serenity::CreateActionRow::Buttons(vec![
                serenity::CreateButton::new_link("https://ihorizon.org")
                    .label(f("links_website", "My Website")),
                serenity::CreateButton::new_link("https://gitlab.com/ihrz/ihrz")
                    .label(f("links_gitlab", "My GitLab")),
            ])]),
    )
    .await?;
    Ok(())
}
