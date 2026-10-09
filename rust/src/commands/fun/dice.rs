use super::*;

/// Dice roll. Mirrors !dice.ts (number x Dfaces results + total embed).
#[poise::command(
    slash_command,
    prefix_command,
    category = "fun",
    rename = "dice",
    aliases("dé")
)]
pub async fn dice(
    ctx: Ctx<'_>,
    #[description = "Number of dice"] number: Option<f64>,
    #[description = "Faces per die"] faces: Option<f64>,
) -> Result<(), anyhow::Error> {
    if fun_guard(&ctx).await {
        return Ok(());
    }
    let number = number.unwrap_or(1.0).max(1.0) as usize;
    let faces = (faces.unwrap_or(6.0).max(2.0)) as u32;
    let results = roll_dice_set(number, faces);
    let total: u32 = results.iter().sum();
    let embed = poise::serenity_prelude::CreateEmbed::default()
        .title(crate::commands::lang_for(&ctx, "fun_dice_embed_title", "🎲 Dice Roll Result").await)
        .description(format!(
            "{} {number} x D{faces}\n{} {}\n{} {total}",
            crate::commands::lang_for(&ctx, "fun_dice_var_rolled_dices", "**Rolled Dice:**").await,
            crate::commands::lang_for(&ctx, "fun_dice_var_results", "**Results:**").await,
            results
                .iter()
                .map(|r| r.to_string())
                .collect::<Vec<_>>()
                .join(", "),
            crate::commands::lang_for(&ctx, "fun_dice_var_total", "**Total:**").await,
        ))
        .colour(random_colour());
    ctx.send(poise::CreateReply::default().embed(embed)).await?;
    Ok(())
}
