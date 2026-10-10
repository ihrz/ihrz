use super::*;

/// Dice roll. Mirrors !dice.ts.
// Slash caps mirror the `to(7)` / `to(12)` choices in fun.ts; prefix input
// is clamped the same way.
#[poise::command(
    slash_command,
    prefix_command,
    category = "fun",
    rename = "dice",
    aliases("dé")
)]
pub async fn dice(
    ctx: Ctx<'_>,
    #[description = "Number of dice (1-7)"]
    #[min = 1]
    #[max = 7]
    number: Option<i64>,
    #[description = "Faces per die (1-12)"]
    #[min = 1]
    #[max = 12]
    faces: Option<i64>,
) -> Result<(), anyhow::Error> {
    if fun_guard(&ctx).await {
        return Ok(());
    }
    let number = number.unwrap_or(1).clamp(1, 7) as usize;
    let faces = number_faces(faces.unwrap_or(6));
    let results = roll_dice_set(number, faces);
    let total: u32 = results.iter().sum();
    let embed = poise::serenity_prelude::CreateEmbed::default()
        .title(crate::commands::lang_for(&ctx, "fun_dice_embed_title", "🎲 Dice Roll Result").await)
        .description(format!(
            "{} {number} × D{faces}\n{} {}\n{} {total}",
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

/// Clamp faces to the 1-12 slash range. Mirrors the `to(12)` choices.
pub fn number_faces(faces: i64) -> u32 {
    faces.clamp(1, 12) as u32
}

#[cfg(test)]
mod dice_tests {
    use super::*;

    #[test]
    fn faces_clamp_to_slash_range() {
        assert_eq!(number_faces(6), 6);
        assert_eq!(number_faces(0), 1);
        assert_eq!(number_faces(-3), 1);
        assert_eq!(number_faces(99), 12);
    }
}
