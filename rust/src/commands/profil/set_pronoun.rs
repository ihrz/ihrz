use super::*;

/// Set your pronoun. Mirrors `!set-pronoun.ts`.
#[poise::command(
    slash_command,
    prefix_command,
    rename = "set-pronoun",
    aliases("pronoun", "pronom"),
    category = "profil"
)]
pub async fn profil_pronoun(
    ctx: Ctx<'_>,
    #[description = "Pronoun (she/her, he/him, they/them, xe/xem, ze/zem, other)"] pronoun: String,
) -> Result<(), anyhow::Error> {
    if !validate_pronoun(&pronoun) {
        ctx.send(
            poise::CreateReply::default()
                .content("Invalid pronoun: expected she/her, he/him, they/them, xe/xem, ze/zem or other.")
                .ephemeral(true),
        )
        .await?;
        return Ok(());
    }
    let user_id = ctx.author().id.get();
    let mut p = super::profil::load_profil_routed(&ctx.data().pool, user_id).await;
    p.pronoun = Some(pronoun.to_ascii_lowercase().replace('-', "/"));
    super::profil::save_profil_routed(&ctx.data().pool, user_id, &p).await?;
    ctx.send(
        poise::CreateReply::default()
            .content("Pronoun saved.")
            .ephemeral(true),
    )
    .await?;
    Ok(())
}
