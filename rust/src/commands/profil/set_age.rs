use super::*;

/// Parse the age the TS prefix path way. `method.number` in `method.ts`
/// is `parseInt`-based with NaN -> 0 and `!set-age.ts` applies no `||`
/// fallback on top, so missing or non-numeric prefix input stores 0. The
/// slash path (`getNumber`, floats accepted) goes through the same manual
/// parse so both paths behave alike; fractional input truncates like
/// parseInt. A typed `f64` param would reject non-numeric prefix input
/// with a framework error where TS stores 0.
fn parse_age(raw: Option<String>) -> f64 {
    raw.as_deref()
        .unwrap_or("")
        .trim()
        .parse::<f64>()
        .map(|f| f.trunc())
        .unwrap_or(0.0)
}

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
    #[description = "Your age on the iHorizon profil"] age: Option<String>,
) -> Result<(), anyhow::Error> {
    let age = parse_age(age);
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

#[cfg(test)]
mod set_age_tests {
    use super::parse_age;

    #[test]
    fn non_numeric_ages_default_to_zero_like_ts() {
        // Missing / non-numeric prefix input stores 0 via method.number.
        assert_eq!(parse_age(None), 0.0);
        assert_eq!(parse_age(Some("abc".to_string())), 0.0);
        assert_eq!(parse_age(Some(String::new())), 0.0);
        // Plain values pass through; fractions truncate like parseInt.
        assert_eq!(parse_age(Some("25".to_string())), 25.0);
        assert_eq!(parse_age(Some("25.9".to_string())), 25.0);
    }
}
