use super::*;
use chrono::Datelike;
use poise::serenity_prelude as serenity;

/// Discord relative-timestamp for this year's birthday, mirroring
/// `!show.ts` (`time(new Date(year, month - 1, day), "R")`).
/// `year` is injected (callers pass the current local year) so the
/// conversion stays unit-testable.
///
/// NOTE on date rollover: the JS `Date` constructor rolls overflowing
/// month/day values forward (e.g. `new Date(2025, 1, 29)` becomes Mar 1
/// 2025) instead of erroring, and this mirrors that: the month is
/// normalized with Euclidean wraparound, then `day - 1` days are added
/// onto the first of the month, so Feb 29 on a common year renders as
/// Mar 1 exactly like TS. None only when the normalized year itself is
/// out of chrono range.
pub fn birthday_discord_timestamp(day: u8, month: u8, year: i32) -> Option<i64> {
    use chrono::{Local, TimeZone};
    let m0 = month as i32 - 1;
    let (yn, mn) = (
        year.saturating_add(m0.div_euclid(12)),
        m0.rem_euclid(12) + 1,
    );
    let first = chrono::NaiveDate::from_ymd_opt(yn, mn as u32, 1)?;
    let date = first + chrono::Duration::days(day as i64 - 1);
    let naive = date.and_hms_opt(0, 0, 0)?;
    match Local.from_local_datetime(&naive) {
        chrono::LocalResult::Single(dt) => Some(dt.timestamp()),
        _ => None,
    }
}

/// fr-ME easter egg (`profil/!show.ts:70-77`): hardcoded TS display
/// overrides, not YAML keys.
pub fn fr_me_gender(gender: &str, lang_code: &str) -> String {
    if lang_code == "fr-ME" {
        match gender {
            "♀ Female" => "une grosse teuch".to_string(),
            "♂ Male" => "une belle bite wAllah".to_string(),
            "⚧ Non-binary" => "jsp".to_string(),
            _ => gender.to_string(),
        }
    } else {
        gender.to_string()
    }
}

/// Age display. Mirrors `if (!age) age = unknown` + `age + suffix` in
/// `!show.ts:65-66,126`: missing, 0 and NaN read as unknown; whole floats
/// print int-shaped (`25`, not `25.0`), matching the TS display.
pub fn age_display(age: Option<f64>, unknown: &str) -> String {
    age.filter(|a| *a != 0.0 && !a.is_nan())
        .map(|a| a.to_string())
        .unwrap_or_else(|| unknown.to_string())
}

/// See the iHorizon profil of a member. Mirrors `!show.ts`.
#[poise::command(
    slash_command,
    prefix_command,
    rename = "show",
    aliases("me", "prof"),
    category = "profil"
)]
pub async fn profil_show(
    ctx: Ctx<'_>,
    #[description = "The user you want to lookup"] user: Option<serenity::User>,
) -> Result<(), anyhow::Error> {
    let target = user.as_ref().unwrap_or_else(|| ctx.author());
    let lang_code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    let p = super::profil::load_profil_routed(&ctx.data().pool, target.id.get()).await;
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let money = crate::commands::economy::balance::load_econ_routed(
        &ctx.data().pool,
        &gid,
        target.id.get(),
    )
    .await;
    let rank =
        crate::commands::ranks::main::load_rank(&ctx.data().pool, &gid, target.id.get()).await;

    let t = |k: &str| crate::lang::get(&lang_code, k).unwrap_or_default();
    let unknown = t("profil_unknown");
    let unknown = if unknown.is_empty() {
        "Unknown".to_string()
    } else {
        unknown
    };
    let no_desc = crate::lang::get(&lang_code, "profil_not_description_set")
        .unwrap_or_else(|| "No description set!".to_string());
    let pin = crate::emojis::app_emoji_markup(ctx.http(), "Pin")
        .await
        .unwrap_or_default();
    let title = crate::lang::get(&lang_code, "profil_embed_title")
        .map(|s| {
            s.replace("${member.tag}", &target.name)
                .replace("${client.iHorizon_Emojis.Pin}", &pin)
        })
        .unwrap_or_else(|| format!("{}'s profil", target.name));
    // Mirrors `time(new Date(...), "R")`: this year's month/day as a
    // Discord relative timestamp.
    let birthday = match (p.bday_day, p.bday_month) {
        (Some(d), Some(m)) => {
            let year = chrono::Local::now().date_naive().year();
            birthday_discord_timestamp(d, m, year)
                .map(|ts| format!("<t:{ts}:R>"))
                .unwrap_or_else(|| unknown.clone())
        }
        _ => unknown.clone(),
    };

    // Field order and inline flags mirror `!show.ts` exactly: nickname,
    // money, xplevels, age, gender, pronouns, birthdate — all non-inline.
    let field = |key: &str, fallback: &str| {
        let v = t(key);
        if v.is_empty() {
            fallback.to_string()
        } else {
            v
        }
    };
    // Mirrors `if (!age)` in `!show.ts:66`: 0 and NaN read as unknown.
    let age_str = age_display(p.age, &unknown);
    let embed = serenity::CreateEmbed::default()
        .title(title)
        .description(if p.description.is_empty() {
            format!("`{no_desc}`")
        } else {
            format!("`{}`", p.description)
        })
        .field(
            field("profil_embed_fields_nickname", "Nickname"),
            target.name.clone(),
            false,
        )
        .field(
            field("profil_embed_fields_money", "Money"),
            format!(
                "{}{}",
                crate::commands::economy::fmt_num(money.money),
                t("profil_embed_fields_money_value")
            ),
            false,
        )
        .field(
            field("profil_embed_fields_xplevels", "Level"),
            format!("{}{}", rank.level, t("profil_embed_fields_xplevels_value")),
            false,
        )
        .field(
            field("profil_embed_fields_age", "Age"),
            format!("{age_str}{}", t("profil_embed_fields_age_value")),
            false,
        )
        .field(
            field("profil_embed_fields_gender", "Gender"),
            fr_me_gender(
                &p.gender.clone().unwrap_or_else(|| unknown.clone()),
                &lang_code,
            ),
            false,
        )
        .field(
            field("profil_embed_fields_pronouns", "Pronouns"),
            p.pronoun
                .as_deref()
                .map(super::set_pronoun::pronoun_display_value)
                .unwrap_or_else(|| unknown.clone()),
            false,
        )
        .field(
            field("profil_embed_fields_birthdate", "Birthdate"),
            birthday,
            false,
        )
        .colour(0xFFA550)
        .timestamp(serenity::Timestamp::now());
    // Snapshot the avatar via the shared image64 helper so the thumbnail
    // survives avatar changes; fall back to the CDN URL when offline.
    let face_url = target.face();
    let face_bytes = crate::image64::image64(&face_url).await;
    let embed = if face_bytes.is_some() {
        embed.thumbnail("attachment://avatar.png")
    } else {
        embed.thumbnail(face_url)
    };
    let (fname, fbytes) = crate::commands::shared::footer_parts(&ctx, &gid).await;
    let embed = crate::commands::shared::embed_with_footer(embed, &fname, fbytes.is_some());

    let mut reply = poise::CreateReply::default().embed(embed);
    if let Some(bytes) = face_bytes {
        reply = reply.attachment(serenity::CreateAttachment::bytes(bytes, "avatar.png"));
    }
    if let Some(bytes) = fbytes {
        reply = reply.attachment(serenity::CreateAttachment::bytes(bytes, "footer_icon.png"));
    }
    ctx.send(reply).await?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::{age_display, birthday_discord_timestamp, fr_me_gender};
    use chrono::{Datelike, Local, TimeZone};

    #[test]
    fn age_display_matches_ts_falsy_and_concat_rules() {
        assert_eq!(age_display(Some(25.0), "?"), "25");
        assert_eq!(age_display(Some(25.5), "?"), "25.5");
        assert_eq!(age_display(None, "?"), "?");
        assert_eq!(age_display(Some(0.0), "?"), "?");
        assert_eq!(age_display(Some(f64::NAN), "?"), "?");
    }

    #[test]
    fn fr_me_easter_egg_overrides_stored_gender() {
        assert_eq!(fr_me_gender("♀ Female", "fr-ME"), "une grosse teuch");
        assert_eq!(fr_me_gender("♂ Male", "fr-ME"), "une belle bite wAllah");
        assert_eq!(fr_me_gender("⚧ Non-binary", "fr-ME"), "jsp");
        assert_eq!(fr_me_gender("♀ Female", "en-US"), "♀ Female");
        assert_eq!(fr_me_gender("Unknown", "fr-ME"), "Unknown");
    }

    #[test]
    fn birthday_renders_this_year_month_day() {
        let ts = birthday_discord_timestamp(15, 6, 2024).unwrap();
        let dt = Local.timestamp_opt(ts, 0).single().unwrap();
        assert_eq!((dt.day(), dt.month(), dt.year()), (15, 6, 2024));
    }

    #[test]
    fn birthday_rolls_over_like_js_date() {
        // JS `new Date(2025, 1, 29)` rolls forward to Mar 1 2025.
        let ts = birthday_discord_timestamp(29, 2, 2025).unwrap();
        let dt = Local.timestamp_opt(ts, 0).single().unwrap();
        assert_eq!((dt.day(), dt.month(), dt.year()), (1, 3, 2025));
        assert!(birthday_discord_timestamp(31, 4, 2024).is_some());
        assert!(birthday_discord_timestamp(29, 2, 2024).is_some());
    }
}
