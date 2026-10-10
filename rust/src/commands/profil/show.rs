use super::*;
use chrono::Datelike;
use poise::serenity_prelude as serenity;

/// Discord relative-timestamp for this year's birthday, mirroring
/// `!show.ts` (`time(new Date(year, month - 1, day), "R")`).
/// `year` is injected (callers pass the current local year) so the
/// conversion stays unit-testable. None when the date is impossible
/// (e.g. Feb 29 on a common year).
pub fn birthday_discord_timestamp(day: u8, month: u8, year: i32) -> Option<i64> {
    use chrono::{Local, TimeZone};
    let date = chrono::NaiveDate::from_ymd_opt(year, month as u32, day as u32)?;
    let naive = date.and_hms_opt(0, 0, 0)?;
    match Local.from_local_datetime(&naive) {
        chrono::LocalResult::Single(dt) => Some(dt.timestamp()),
        _ => None,
    }
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
    let age_str = p
        .age
        .map(|a| a.to_string())
        .unwrap_or_else(|| unknown.clone());
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
            format!("{}{}", money.money, t("profil_embed_fields_money_value")),
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
            p.gender.clone().unwrap_or_else(|| unknown.clone()),
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
    use super::birthday_discord_timestamp;
    use chrono::{Datelike, Local, TimeZone};

    #[test]
    fn birthday_renders_this_year_month_day() {
        let ts = birthday_discord_timestamp(15, 6, 2024).unwrap();
        let dt = Local.timestamp_opt(ts, 0).single().unwrap();
        assert_eq!((dt.day(), dt.month(), dt.year()), (15, 6, 2024));
    }

    #[test]
    fn birthday_rejects_impossible_dates() {
        // Feb 29 on a common year has no midnight mapping target.
        assert!(birthday_discord_timestamp(29, 2, 2025).is_none());
        assert!(birthday_discord_timestamp(31, 4, 2024).is_none());
        assert!(birthday_discord_timestamp(29, 2, 2024).is_some());
    }
}
