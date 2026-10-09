use super::*;

/// Show all links about iHorizon. Mirrors link.ts.
#[poise::command(slash_command, prefix_command, category = "bot", aliases("link"))]
pub async fn links(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    let f = |k: &str, fb: &str| crate::lang::get(&code, k).unwrap_or_else(|| fb.to_string());
    ctx.say(format!(
        "{}\n{}: https://ihorizon.org\n{}: https://gitlab.com/ihrz/ihrz",
        f(
            "links_message",
            "Click the links below to learn more about me!"
        ),
        f("links_website", "My Website"),
        f("links_gitlab", "My GitLab"),
    ))
    .await?;
    Ok(())
}
