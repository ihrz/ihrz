use super::*;

#[poise::command(
    slash_command,
    prefix_command,
    category = "fun",
    rename = "transgender"
)]
pub async fn transgender(
    ctx: Ctx<'_>,
    #[description = "Member"] user: Option<poise::serenity_prelude::User>,
) -> Result<(), anyhow::Error> {
    if fun_guard(&ctx).await {
        return Ok(());
    }
    let u = user.unwrap_or_else(|| ctx.author().clone());
    // Mirrors `displayAvatarURL({ extension: "png", size: 1024 })` in
    // `!transgender.ts` (forced PNG, not the webp `face()` URL).
    let avatar = avatar_png_url(&u, 1024);
    // Canvas fetch pending; URL shape ported.
    ctx.say(transgender_url(&avatar)).await?;
    Ok(())
}
