use super::*;

/// Set your age. Mirrors `!set-age.ts`.
#[poise::command(
    slash_command,
    prefix_command,
    rename = "set-age",
    aliases("age"),
    category = "profil"
)]
pub async fn profil_age(
    ctx: Ctx<'_>,
    #[description = "Your age on the iHorizon profil"] age: u8,
) -> Result<(), anyhow::Error> {
    if !validate_age(age) {
        ctx.send(
            poise::CreateReply::default()
                .content("Invalid age: must be between 13 and 120.")
                .ephemeral(true),
        )
        .await?;
        return Ok(());
    }
    let user_id = ctx.author().id.get();
    let mut p = load_profil(&ctx.data().pool, user_id).await;
    p.age = Some(age);
    save_profil(&ctx.data().pool, user_id, &p).await?;
    ctx.send(
        poise::CreateReply::default()
            .content("Age saved.")
            .ephemeral(true),
    )
    .await?;
    Ok(())
}
