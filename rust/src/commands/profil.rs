// iHorizon Discord Bot (https://gitlab.com/ihrz/ihrz)
// Licensed under CC-BY-NC-SA-4.0.
// Mirrors src/Interaction/HybridCommands/profil/* (!show, !set-age,
// !set-description, !set-gender, !set-pronoun, !set-birthday).

use crate::bot::{Ctx, Data};
use crate::db::Pool;
use poise::serenity_prelude as serenity;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct Profil {
    #[serde(default)]
    pub description: String,
    #[serde(default)]
    pub age: Option<u8>,
    #[serde(default)]
    pub gender: Option<String>,
    #[serde(default)]
    pub pronoun: Option<String>,
    #[serde(default)]
    pub bday_day: Option<u8>,
    #[serde(default)]
    pub bday_month: Option<u8>,
    #[serde(default)]
    pub bday_year: Option<i32>,
}

fn profil_key(user_id: u64) -> String {
    format!("PROFIL.{user_id}")
}

async fn load_profil(pool: &Pool, user_id: u64) -> Profil {
    let key = profil_key(user_id);
    match crate::db::kv_get(pool, "0", &key).await {
        Some(raw) => serde_json::from_str(&raw).unwrap_or_default(),
        None => Profil::default(),
    }
}

async fn save_profil(pool: &Pool, user_id: u64, profil: &Profil) -> anyhow::Result<()> {
    let key = profil_key(user_id);
    let raw = serde_json::to_string(profil)?;
    crate::db::kv_set(pool, "0", &key, &raw).await
}

#[allow(dead_code)]
fn touch_data_type(_: &Data) {}

pub fn validate_age(age: u8) -> bool {
    (13..=120).contains(&age)
}

pub fn validate_gender(gender: &str) -> bool {
    matches!(
        gender.to_ascii_lowercase().as_str(),
        "female" | "male" | "non-binary"
    )
}

pub fn validate_pronoun(pronoun: &str) -> bool {
    let normalized = pronoun.to_ascii_lowercase().replace('-', "/");
    matches!(
        normalized.as_str(),
        "she/her" | "he/him" | "they/them" | "xe/xem" | "ze/zem" | "other"
    )
}

fn is_leap_year(year: i32) -> bool {
    (year % 4 == 0 && year % 100 != 0) || year % 400 == 0
}

fn days_in_month(month: u8, year: i32) -> u8 {
    match month {
        1 | 3 | 5 | 7 | 8 | 10 | 12 => 31,
        4 | 6 | 9 | 11 => 30,
        2 => {
            if is_leap_year(year) {
                29
            } else {
                28
            }
        }
        _ => 0,
    }
}

pub fn validate_birthday(day: u8, month: u8, year: i32) -> bool {
    if !(1900..=2100).contains(&year) {
        return false;
    }
    if !(1..=12).contains(&month) {
        return false;
    }
    let max = days_in_month(month, year);
    day >= 1 && day <= max
}

/// Parent group. Mirrors the TS `profil` HybridCommand definition.
#[poise::command(
    slash_command,
    prefix_command,
    rename = "profil",
    category = "profil",
    subcommands(
        "profil_show",
        "profil_age",
        "profil_description",
        "profil_gender",
        "profil_pronoun",
        "profil_birthday"
    )
)]
pub async fn profil(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    ctx.send(
        poise::CreateReply::default()
            .content("Use a subcommand: show, set-age, set-description, set-gender, set-pronoun, set-birthday.")
            .ephemeral(true),
    )
    .await?;
    Ok(())
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
    let p = load_profil(&ctx.data().pool, target.id.get()).await;
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let money = crate::commands::economy::load_econ(&ctx.data().pool, &gid, target.id.get()).await;
    let rank = crate::commands::ranks::load_rank(&ctx.data().pool, &gid, target.id.get()).await;

    let birthday = match (p.bday_day, p.bday_month, p.bday_year) {
        (Some(d), Some(m), Some(y)) => format!("{d:02}/{m:02}/{y}"),
        (Some(d), Some(m), None) => format!("{d:02}/{m:02}"),
        _ => "unknown".to_string(),
    };

    let embed = serenity::CreateEmbed::default()
        .title(format!("{}'s profil", target.name))
        .description(if p.description.is_empty() {
            "`No description set.`".to_string()
        } else {
            format!("`{}`", p.description)
        })
        .field("Nickname", target.name.clone(), false)
        .field(
            "Age",
            p.age
                .map(|a| a.to_string())
                .unwrap_or_else(|| "unknown".to_string()),
            false,
        )
        .field(
            "Gender",
            p.gender.clone().unwrap_or_else(|| "unknown".to_string()),
            false,
        )
        .field(
            "Pronouns",
            p.pronoun.clone().unwrap_or_else(|| "unknown".to_string()),
            false,
        )
        .field("Birthdate", birthday, false)
        .field("Money", money.money.to_string(), true)
        .field("Level", rank.level.to_string(), true);
    // Snapshot the avatar like image64.ts so the thumbnail survives
    // avatar changes; fall back to the CDN URL when offline.
    let face_url = target.face();
    let face_bytes = crate::commands::botcat::download_bytes(&face_url).await;
    let embed = if face_bytes.is_some() {
        embed.thumbnail("attachment://avatar.png")
    } else {
        embed.thumbnail(face_url)
    }
    .colour(0xFFA550);

    let mut reply = poise::CreateReply::default().embed(embed);
    if let Some(bytes) = face_bytes {
        reply = reply.attachment(serenity::CreateAttachment::bytes(bytes, "avatar.png"));
    }
    ctx.send(reply).await?;
    Ok(())
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

/// Set your description. Mirrors `!set-description.ts`.
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
    let mut p = load_profil(&ctx.data().pool, user_id).await;
    p.description = description.chars().take(500).collect();
    save_profil(&ctx.data().pool, user_id, &p).await?;
    ctx.send(
        poise::CreateReply::default()
            .content("Description saved.")
            .ephemeral(true),
    )
    .await?;
    Ok(())
}

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
    let mut p = load_profil(&ctx.data().pool, user_id).await;
    p.gender = Some(gender.to_ascii_lowercase());
    save_profil(&ctx.data().pool, user_id, &p).await?;
    ctx.send(
        poise::CreateReply::default()
            .content("Gender saved.")
            .ephemeral(true),
    )
    .await?;
    Ok(())
}

/// Set your pronoun. Mirrors `!set-pronoun.ts`.
#[poise::command(
    slash_command,
    prefix_command,
    rename = "set-pronoun",
    aliases("pronoun", "pronom"),
    category = "profil"
)]
pub async fn profil_pronoun(
    ctx: Ctx<'_>,
    #[description = "Pronoun (she/her, he/him, they/them, xe/xem, ze/zem, other)"] pronoun: String,
) -> Result<(), anyhow::Error> {
    if !validate_pronoun(&pronoun) {
        ctx.send(
            poise::CreateReply::default()
                .content("Invalid pronoun: expected she/her, he/him, they/them, xe/xem, ze/zem or other.")
                .ephemeral(true),
        )
        .await?;
        return Ok(());
    }
    let user_id = ctx.author().id.get();
    let mut p = load_profil(&ctx.data().pool, user_id).await;
    p.pronoun = Some(pronoun.to_ascii_lowercase().replace('-', "/"));
    save_profil(&ctx.data().pool, user_id, &p).await?;
    ctx.send(
        poise::CreateReply::default()
            .content("Pronoun saved.")
            .ephemeral(true),
    )
    .await?;
    Ok(())
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
    #[description = "Birth year (1900-2100)"] year: i32,
) -> Result<(), anyhow::Error> {
    if !validate_birthday(day, month, year) {
        ctx.send(
            poise::CreateReply::default()
                .content("Invalid birthday: check day/month/year (year 1900-2100).")
                .ephemeral(true),
        )
        .await?;
        return Ok(());
    }
    let user_id = ctx.author().id.get();
    let mut p = load_profil(&ctx.data().pool, user_id).await;
    p.bday_day = Some(day);
    p.bday_month = Some(month);
    p.bday_year = Some(year);
    save_profil(&ctx.data().pool, user_id, &p).await?;
    ctx.send(
        poise::CreateReply::default()
            .content("Birthday saved.")
            .ephemeral(true),
    )
    .await?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn age_accepts_valid_range() {
        assert!(validate_age(13));
        assert!(validate_age(25));
        assert!(validate_age(120));
    }

    #[test]
    fn age_rejects_out_of_range() {
        assert!(!validate_age(0));
        assert!(!validate_age(12));
    }

    #[test]
    fn gender_accepts_known_values() {
        assert!(validate_gender("female"));
        assert!(validate_gender("male"));
        assert!(validate_gender("non-binary"));
        assert!(validate_gender("Female"));
    }

    #[test]
    fn gender_rejects_unknown() {
        assert!(!validate_gender("other"));
        assert!(!validate_gender(""));
    }

    #[test]
    fn pronoun_accepts_known_values() {
        for v in [
            "she/her",
            "he/him",
            "they/them",
            "xe/xem",
            "ze/zem",
            "other",
        ] {
            assert!(validate_pronoun(v), "{v}");
        }
        assert!(validate_pronoun("she-her"));
    }

    #[test]
    fn pronoun_rejects_unknown() {
        assert!(!validate_pronoun("it/its"));
        assert!(!validate_pronoun(""));
    }

    #[test]
    fn birthday_accepts_regular_and_leap_dates() {
        assert!(validate_birthday(15, 6, 2000));
        assert!(validate_birthday(29, 2, 2000));
        assert!(validate_birthday(31, 1, 1990));
    }

    #[test]
    fn birthday_rejects_impossible_dates() {
        assert!(!validate_birthday(29, 2, 2001));
        assert!(!validate_birthday(31, 4, 2000));
        assert!(!validate_birthday(0, 1, 2000));
        assert!(!validate_birthday(1, 13, 2000));
        assert!(!validate_birthday(1, 1, 1899));
        assert!(!validate_birthday(1, 1, 2101));
    }
}
