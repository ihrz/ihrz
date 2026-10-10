use super::*;

/// Coin flip. Mirrors !heads-tails.ts (pileouface/pile-ou-face aliases,
/// `Math.random() < 0.5`).
// No `coinflip` alias: fun.ts declares only pileouface/pile-ou-face.
#[poise::command(
    slash_command,
    prefix_command,
    category = "fun",
    rename = "heads-tails",
    aliases("pileouface", "pile-ou-face")
)]
pub async fn coinflip(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    if fun_guard(&ctx).await {
        return Ok(());
    }
    let heads = coin_flip_random();
    let result = if heads {
        crate::commands::lang_for(&ctx, "fun_coinflip_result_heads", "Heads").await
    } else {
        crate::commands::lang_for(&ctx, "fun_coinflip_result_tails", "Tails").await
    };
    let embed = poise::serenity_prelude::CreateEmbed::default()
        .title(
            crate::commands::lang_for(&ctx, "fun_coinflip_embed_title", "🪙 Heads or Tails").await,
        )
        .description(format!(
            "{} {result}",
            crate::commands::lang_for(&ctx, "fun_coinflip_result_text", "The result is:").await
        ))
        .colour(random_colour());
    ctx.send(poise::CreateReply::default().embed(embed)).await?;
    Ok(())
}

#[cfg(test)]
mod coinflip_tests {
    use super::*;

    #[test]
    fn random_flip_hits_both_sides() {
        let mut heads = 0;
        for _ in 0..200 {
            if coin_flip_random() {
                heads += 1;
            }
        }
        assert!(heads > 0 && heads < 200, "flip looks stuck: {heads}/200");
    }
}
