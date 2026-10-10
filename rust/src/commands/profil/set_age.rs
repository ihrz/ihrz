use super::*;

/// Set your age. Mirrors `!set-age.ts`.
///
/// `getNumber("age")` accepts floats and there is no range gate — the value
/// rejects non-numeric input at parse time with a framework error, where TS
/// `method.number` on the prefix path yields NaN; that edge is framework
/// behavior, not a parity gate.)
#[poise::command(
    slash_command,
    prefix_command,
    rename = "set-age",
    aliases("age"),
    category = "profil"
)]
pub async fn profil_age(
    ctx: Ctx<'_>,
    #[description = "Your age on the iHorizon profil"] age: f64,
) -> Result<(), anyhow::Error> {
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
