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
        let msg = crate::commands::lang_for(
            &ctx,
            "msg_profil_invalid_age",
            "Invalid age: must be between 13 and 120.",
        )
        .await;
        ctx.send(poise::CreateReply::default().content(msg).ephemeral(true))
            .await?;
        return Ok(());
    }
    let user_id = ctx.author().id.get();
    let mut p = super::profil::load_profil_routed(&ctx.data().pool, user_id).await;
    p.age = Some(age);
    super::profil::save_profil_routed(&ctx.data().pool, user_id, &p).await?;
    let msg = crate::commands::lang_for(
        &ctx,
        "setprofilage_command_work",
        "**Your profile age has been updated successfully.**",
    )
    .await;
    ctx.send(poise::CreateReply::default().content(msg).ephemeral(true))
        .await?;
    Ok(())
}
