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
    // TS stores whatever `getNumber("age")` yields (floats included, no
    // range gate), so age is f64 here too; whole values serialize
    // int-shaped (`25`, not `25.0`) to match the TS DB shape.
    #[serde(
        default,
        deserialize_with = "de_opt_age",
        serialize_with = "ser_opt_age"
    )]
    pub age: Option<f64>,
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

/// Tolerant age parse: the shared DB is written by TS with JS numbers
/// (floats possible via `getNumber`), so ints, floats and numeric strings
/// all load; null/missing/garbage become None instead of failing the blob.
fn de_opt_age<'de, D>(d: D) -> Result<Option<f64>, D::Error>
where
    D: serde::Deserializer<'de>,
{
    use serde::de::{self, Visitor};
    struct V;
    impl<'de> Visitor<'de> for V {
        type Value = Option<f64>;
        fn expecting(&self, f: &mut std::fmt::Formatter) -> std::fmt::Result {
            f.write_str("an age number or null")
        }
        fn visit_none<E: de::Error>(self) -> Result<Option<f64>, E> {
            Ok(None)
        }
        fn visit_unit<E: de::Error>(self) -> Result<Option<f64>, E> {
            Ok(None)
        }
        fn visit_i64<E: de::Error>(self, v: i64) -> Result<Option<f64>, E> {
            Ok(Some(v as f64))
        }
        fn visit_u64<E: de::Error>(self, v: u64) -> Result<Option<f64>, E> {
            Ok(Some(v as f64))
        }
        fn visit_f64<E: de::Error>(self, v: f64) -> Result<Option<f64>, E> {
            Ok(Some(v))
        }
        fn visit_str<E: de::Error>(self, v: &str) -> Result<Option<f64>, E> {
            Ok(v.trim().parse::<f64>().ok())
        }
        fn visit_some<D2>(self, d: D2) -> Result<Option<f64>, D2::Error>
        where
            D2: serde::Deserializer<'de>,
        {
            d.deserialize_any(V)
        }
    }
    d.deserialize_option(V)
}

/// Integer-valued ages serialize int-shaped so the shared-DB shape matches
/// what TS writes (`25`, not `25.0`).
fn ser_opt_age<S: serde::Serializer>(v: &Option<f64>, s: S) -> Result<S::Ok, S::Error> {
    match v {
        None => s.serialize_none(),
        Some(f) if f.is_finite() && f.fract() == 0.0 => s.serialize_i64(*f as i64),
        Some(f) if f.is_finite() => s.serialize_f64(*f),
        Some(_) => s.serialize_none(),
    }
}

/// Exact gender gate. Mirrors the `!set-gender.ts` slash `choices`
/// (`female` | `male` | `non-binary`) and the case-sensitive `switch` on
/// the prefix path: only the exact lowercase spellings act, anything
/// else writes nothing (see `set_gender::gender_stored_value`).
pub fn validate_gender(gender: &str) -> bool {
    matches!(gender, "female" | "male" | "non-binary")
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
    fn age_parses_ts_number_shapes() {
        // `getNumber("age")` may store floats; all numeric shapes load.
        let p: Profil = serde_json::from_str(r#"{"age":25}"#).unwrap();
        assert_eq!(p.age, Some(25.0));
        let p: Profil = serde_json::from_str(r#"{"age":25.5}"#).unwrap();
        assert_eq!(p.age, Some(25.5));
        let p: Profil = serde_json::from_str(r#"{"age":null}"#).unwrap();
        assert_eq!(p.age, None);
        assert_eq!(Profil::default().age, None);
    }

    #[test]
    fn age_serializes_int_shaped_like_ts() {
        let p = Profil {
            age: Some(25.0),
            ..Profil::default()
        };
        let raw = serde_json::to_string(&p).unwrap();
        assert!(raw.contains(r#""age":25"#), "{raw}");
        assert!(!raw.contains("25.0"), "{raw}");
        let p = Profil {
            age: Some(25.5),
            ..Profil::default()
        };
        assert!(serde_json::to_string(&p).unwrap().contains(r#""age":25.5"#));
    }

    #[test]
    fn gender_accepts_known_values() {
        assert!(validate_gender("female"));
        assert!(validate_gender("male"));
        assert!(validate_gender("non-binary"));
    }

    #[test]
    fn gender_rejects_unknown() {
        assert!(!validate_gender("other"));
        assert!(!validate_gender(""));
        // Exact like the TS switch: case variants match nothing.
        assert!(!validate_gender("Female"));
        assert!(!validate_gender("MALE"));
        assert!(!validate_gender("Non-Binary"));
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
