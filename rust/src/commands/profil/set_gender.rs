use super::*;

/// Set your gender. Mirrors `!set-gender.ts` (female | male | non-binary).
#[poise::command(
    slash_command,
    prefix_command,
    rename = "set-gender",
    aliases("gender"),
    category = "profil"
)]
pub async fn profil_gender(
    ctx: Ctx<'_>,
    #[description = "Gender that fits you the most (female, male, non-binary)"] gender: String,
) -> Result<(), anyhow::Error> {
    if !validate_gender(&gender) {
        ctx.send(
            poise::CreateReply::default()
                .content("Invalid gender: expected female, male or non-binary.")
                .ephemeral(true),
        )
        .await?;
        return Ok(());
    }
    let user_id = ctx.author().id.get();
    let mut p = super::profil::load_profil_routed(&ctx.data().pool, user_id).await;
    p.gender = Some(gender.to_ascii_lowercase());
    super::profil::save_profil_routed(&ctx.data().pool, user_id, &p).await?;
    ctx.send(
        poise::CreateReply::default()
            .content("Gender saved.")
            .ephemeral(true),
    )
    .await?;
    Ok(())
}
