use super::*;

/// Set your description. Mirrors `!set-description.ts`.
///
/// The TS stores the text verbatim (`profilTable.set(..., desc)`) with no
#[poise::command(
    slash_command,
    prefix_command,
    rename = "set-description",
    aliases("desc", "description"),
    category = "profil"
)]
pub async fn profil_description(
    ctx: Ctx<'_>,
    #[description = "Your description on the iHorizon profil"] description: String,
) -> Result<(), anyhow::Error> {
    let user_id = ctx.author().id.get();
    let mut p = super::profil::load_profil_routed(&ctx.data().pool, user_id).await;
    p.description = description;
    super::profil::save_profil_routed(&ctx.data().pool, user_id, &p).await?;
    let msg = crate::commands::lang_for(
        &ctx,
        "setprofildescriptions_command_work",
        "**Your description has been updated successfully.**",
    )
    .await;
    ctx.send(poise::CreateReply::default().content(msg).ephemeral(true))
        .await?;
    Ok(())
}
