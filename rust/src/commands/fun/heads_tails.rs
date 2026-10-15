use super::*;

/// Coin flip. Mirrors !heads-tails.ts (pileouface/pile-ou-face aliases,
/// `Math.random() < 0.5`).
// No `coinflip` alias: fun.ts declares only pileouface/pile-ou-face.
#[poise::command(
    slash_command,
    prefix_command,
    category = "fun",
    rename = "heads-tails",
    aliases("pileouface", "pile-ou-face"),
    name_localized("fr", "pile-ou-face"),
    name_localized("ja", "heads-tails"),
    name_localized("ru", "heads-tails"),
    name_localized("es-ES", "heads-tails"),
    description_localized("fr", "Pile ou face ?"),
    description_localized("ja", "表か裏か？"),
    description_localized("ru", "Орел или решка?"),
    description_localized("es-ES", "Cara o cruz?")
)]
pub async fn coinflip(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    // No fun guard: `!heads-tails.ts` has no `GUILD.FUN.states` check,
    // so the flip runs even with fun disabled.
    let heads = coin_flip_random();
    // Single lang read for the three embed strings (one SQLite round-trip
    // instead of three).
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    let t = |k: &str, fb: &str| crate::lang::get(&code, k).unwrap_or_else(|| fb.to_string());
    let result = if heads {
        t("fun_coinflip_result_heads", "Heads")
    } else {
        t("fun_coinflip_result_tails", "Tails")
    };
    let embed = poise::serenity_prelude::CreateEmbed::default()
        .title(t("fun_coinflip_embed_title", "🪙 Heads or Tails"))
        .description(format!(
            "{} {result}",
            t("fun_coinflip_result_text", "The result is:")
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
