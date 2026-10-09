use super::*;

/// Set your birthday. Mirrors `!set-birthday.ts` (modal flow flattened to args).
#[poise::command(
    slash_command,
    prefix_command,
    rename = "set-birthday",
    aliases("birthday", "anniversaire"),
    category = "profil"
)]
pub async fn profil_birthday(
    ctx: Ctx<'_>,
    #[description = "Birth day (1-31)"] day: u8,
    #[description = "Birth month (1-12)"] month: u8,
    #[description = "Birth year (1900-2100)"] year: i32,
) -> Result<(), anyhow::Error> {
    if !validate_birthday(day, month, year) {
        let msg = crate::commands::lang_for(
            &ctx,
            "msg_profil_birthday_invalid",
            "Invalid birthday: check day/month/year (year 1900-2100).",
        )
        .await;
        ctx.send(poise::CreateReply::default().content(msg).ephemeral(true))
            .await?;
        return Ok(());
    }
    let user_id = ctx.author().id.get();
    let mut p = super::profil::load_profil_routed(&ctx.data().pool, user_id).await;
    p.bday_day = Some(day);
    p.bday_month = Some(month);
    p.bday_year = Some(year);
    super::profil::save_profil_routed(&ctx.data().pool, user_id, &p).await?;
    let msg = crate::commands::lang_for(&ctx, "msg_profil_birthday_saved", "Birthday saved.").await;
    ctx.send(poise::CreateReply::default().content(msg).ephemeral(true))
        .await?;
    Ok(())
}
