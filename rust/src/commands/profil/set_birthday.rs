use super::*;

/// Current calendar year. Mirrors `new Date().getFullYear()` in the
/// `!set-birthday.ts` modal flow (year must be `1900..=now`).
pub fn current_year() -> i32 {
    chrono::Local::now()
        .format("%Y")
        .to_string()
        .parse()
        // Clock broken: fall back to the old static bound.
        .unwrap_or(2100)
}

/// TS-aligned birthday check: the mod.rs range/leap rules plus the
/// `year <= current year` upper bound from the TS modal flow.
pub fn validate_birthday_ts(day: u8, month: u8, year: i32) -> bool {
    validate_birthday(day, month, year) && year <= current_year()
}

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
    #[description = "Birth year (1900-current year)"] year: i32,
) -> Result<(), anyhow::Error> {
    if !validate_birthday_ts(day, month, year) {
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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn birthday_caps_year_at_current_year_like_ts() {
        let now = current_year();
        assert!(validate_birthday_ts(15, 6, now));
        assert!(validate_birthday_ts(15, 6, 1900));
        assert!(!validate_birthday_ts(15, 6, now + 1));
        assert!(!validate_birthday_ts(15, 6, 1899));
    }

    #[test]
    fn birthday_keeps_day_month_rules() {
        let now = current_year();
        assert!(!validate_birthday_ts(31, 4, now));
        assert!(!validate_birthday_ts(1, 13, now));
    }
}
