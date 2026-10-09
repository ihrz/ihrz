// iHorizon Discord Bot (https://gitlab.com/ihrz/ihrz)
// Licensed under CC-BY-NC-SA-4.0.
// Mirrors src/Interaction/HybridCommands/profil/* (!show, !set-age,
// !set-description, !set-gender, !set-pronoun, !set-birthday).

use crate::bot::{Ctx, Data};
use crate::db::Pool;
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

#[allow(clippy::module_inception)]
pub mod profil;
pub mod set_age;
pub mod set_birthday;
pub mod set_description;
pub mod set_gender;
pub mod set_pronoun;
pub mod show;

/// Old registry path (`profil::main::*`) kept working.
#[allow(unused_imports)]
pub mod main {
    pub use super::profil::*;
    pub use super::set_age::*;
    pub use super::set_birthday::*;
    pub use super::set_description::*;
    pub use super::set_gender::*;
    pub use super::set_pronoun::*;
    pub use super::show::*;
    pub use super::*;
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
