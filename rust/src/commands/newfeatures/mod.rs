// iHorizon Discord Bot (https://gitlab.com/ihrz/ihrz)
// Licensed under CC-BY-NC-SA-4.0.
// Mirrors src/Interaction/HybridCommands/newfeatures/* (nightmode, gitlines,
// counter). Nightmode collector UI flattened to config subs; the 60s
// scheduler tick lives in scheduler.rs.

use crate::bot::Ctx;

use poise::serenity_prelude as serenity;

use serde::{Deserialize, Serialize};

/// Nightmode blob. Mirrors DatabaseStructure.NightMode
/// (`UTILS.NIGHT_MODE`): enabled/notify/time[4]/wlBots/derankBot/utc.
/// The 60s scheduler tick (scheduler.rs sweep_nightmode) reads this
/// exact shape, so writers must keep it — the earlier
/// start_hour/end_hour struct never matched the tick reader.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct NightmodeConfig {
    #[serde(default)]
    pub enabled: bool,
    #[serde(default = "default_true")]
    pub notify: bool,
    /// [startHour, startMinute, endHour, endMinute]. TS default [21,0,9,0].
    #[serde(default = "default_time")]
    pub time: [u8; 4],
    #[serde(rename = "wlBots", default)]
    pub wl_bots: Vec<String>,
    #[serde(rename = "derankBot", default = "default_true")]
    pub derank_bot: bool,
    #[serde(default = "default_utc")]
    pub utc: i8,
}

fn default_true() -> bool {
    true
}

fn default_time() -> [u8; 4] {
    [21, 0, 9, 0]
}

fn default_utc() -> i8 {
    1
}

pub fn valid_hour(h: i64) -> bool {
    (0..=23).contains(&h)
}

/// Night window check, overnight wrap included (e.g. 22h-7h).
/// Mirrors nightmodeManager tick.
pub fn night_active(start_hour: u8, end_hour: u8, now_hour: u8) -> bool {
    if start_hour == end_hour {
        return false;
    }
    if start_hour < end_hour {
        (start_hour..end_hour).contains(&now_hour)
    } else {
        now_hour >= start_hour || now_hour < end_hour
    }
}

/// Last counter record. Mirrors COUNTER_DATA {amount, userId}
/// (plus the legacy bare-number shape, attributed to nobody).
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct CounterData {
    pub amount: i64,
    pub user_id: Option<String>,
}

pub fn parse_counter_data(raw: Option<&str>) -> CounterData {
    let fallback = CounterData {
        amount: 0,
        user_id: None,
    };
    let Some(raw) = raw else {
        return fallback;
    };
    let Ok(value) = serde_json::from_str::<serde_json::Value>(raw) else {
        return fallback;
    };
    if let Some(n) = value.as_i64() {
        return CounterData {
            amount: n,
            user_id: None,
        };
    }
    CounterData {
        amount: value.get("amount").and_then(|a| a.as_i64()).unwrap_or(0),
        user_id: value
            .get("userId")
            .and_then(|u| u.as_str())
            .map(|s| s.to_string()),
    }
}

pub fn counter_data_json(data: &CounterData) -> String {
    serde_json::json!({"amount": data.amount, "userId": data.user_id}).to_string()
}

/// TS `Number()` semantics for the counter: blank never counts;
/// hex/binary/octal literals, exact-case `Infinity` (optional sign)
/// and decimal/exponent forms parse like JS; Rust-only spellings
/// (`inf`, `nan`, lowercase `infinity`) and signed non-decimal
/// literals (`+0x10`) stay non-numeric, exactly like `Number()`.
/// Trimming uses the shared JS set (`funcs::js_trim`), so U+0085
/// padding does NOT trim (TS keeps it, `Number()` then fails).
pub fn counter_number(content: &str) -> Option<f64> {
    let trimmed = crate::funcs::js_trim(content);
    if trimmed.is_empty() {
        return None;
    }
    let (neg, rest) = match trimmed.strip_prefix('-') {
        Some(r) => (true, r),
        None => (false, trimmed.strip_prefix('+').unwrap_or(trimmed)),
    };
    if rest == "Infinity" {
        return Some(if neg {
            f64::NEG_INFINITY
        } else {
            f64::INFINITY
        });
    }
    if rest.len() == trimmed.len() {
        // No sign: unsigned hex/binary/octal legs (`Number("0x10")`
        // is 16, but `Number("+0x10")` is NaN).
        let rest_bytes = rest.as_bytes();
        if rest_bytes.len() > 2 && rest_bytes[0] == b'0' {
            let radix = match rest_bytes[1] {
                b'x' | b'X' => 16,
                b'b' | b'B' => 2,
                b'o' | b'O' => 8,
                _ => 0,
            };
            if radix != 0 {
                return radix_value(&rest[2..], radix);
            }
        }
    }
    let n: f64 = trimmed.parse().ok()?;
    if n.is_finite() {
        Some(n)
    } else {
        // Rust-only spellings (`inf`, `nan`, ...) parse but JS
        // `Number()` rejects them: non-numeric either way.
        None
    }
}

/// Unsigned integer-literal value for the `counter_number` radix
/// legs. Exact through u128 (every game-reachable literal); longer
/// digit strings fold in f64 (last-ulp only past 2^128, unreachable
/// from a counting channel).
fn radix_value(digits: &str, radix: u32) -> Option<f64> {
    if digits.is_empty() {
        return None;
    }
    if let Ok(v) = u128::from_str_radix(digits, radix) {
        #[allow(clippy::cast_precision_loss)]
        return Some(v as f64);
    }
    let mut acc = 0.0f64;
    for c in digits.chars() {
        acc = acc * f64::from(radix) + f64::from(c.to_digit(radix)?);
    }
    Some(acc)
}

/// JS `String(number)` rendering for f64 (used for the `${number}`
/// fill in the counter repeat-count reply): Rust `Display` never
/// emits exponents (`inf`, 22-digit expansions, `-0`), while TS
/// prints `Infinity`, `1e+21`-style exponents and `0`. Shortest
/// round-trip digits agree both sides, so the Rust expansion is
/// re-cut with the JS magnitude rules (plain while `k <= n <= 21`
/// or `0 < n <= 21`, fraction while `-6 < n <= 0`, exponential
/// otherwise with an always-signed exponent).
pub fn js_number_to_string(n: f64) -> String {
    if n.is_nan() {
        return "NaN".to_string();
    }
    if n.is_infinite() {
        if n.is_sign_positive() {
            return "Infinity".to_string();
        }
        return "-Infinity".to_string();
    }
    if n == 0.0 {
        // Collapses `-0`: `String(-0)` is `"0"`.
        return "0".to_string();
    }
    let mut out = String::new();
    if n.is_sign_negative() {
        out.push('-');
    }
    // Shortest round-trip positional expansion (ASCII digits only).
    let rendered = n.abs().to_string();
    let (int_part, frac_part) = match rendered.split_once('.') {
        Some((i, f)) => (i, f),
        None => (rendered.as_str(), ""),
    };
    let int_len = int_part.len() as i64;
    let all = format!("{int_part}{frac_part}");
    let stripped = all.len() as i64 - all.trim_start_matches('0').len() as i64;
    let digits = &all[stripped as usize..];
    let pos = int_len - stripped;
    let k = digits.len() as i64;
    if k <= pos && pos <= 21 {
        out.push_str(digits);
        out.extend(std::iter::repeat_n('0', (pos - k) as usize));
    } else if 0 < pos && pos <= 21 {
        out.push_str(&digits[..pos as usize]);
        out.push('.');
        out.push_str(&digits[pos as usize..]);
    } else if -6 < pos && pos <= 0 {
        out.push_str("0.");
        out.extend(std::iter::repeat_n('0', (-pos) as usize));
        out.push_str(digits);
    } else {
        // Shortest mantissa: drop the positional trailing zeros the
        // Rust expansion carries (`1e21` expands to `1000...0`).
        let mant = digits.trim_end_matches('0');
        out.push_str(&mant[..1]);
        if mant.len() > 1 {
            out.push('.');
            out.push_str(&mant[1..]);
        }
        out.push('e');
        let exp = pos - 1;
        out.push_str(&format!("{exp:+}"));
    }
    out
}

/// One counting-game step. Mirrors Events/counter/onNewMessage.ts:
/// exact next integer by a different user accepts; anything else
/// resets to zero (wrong number or repeat by the same user replies
/// with its own text, non-numbers get the syntax error).
#[derive(Debug, Clone, PartialEq)]
pub enum CounterOutcome {
    Accept { number: i64 },
    WrongNumber { same_user: bool, number: f64 },
    NotNumber,
}

pub fn counter_step(last: &CounterData, author_id: &str, content: &str) -> CounterOutcome {
    let Some(n) = counter_number(content) else {
        return CounterOutcome::NotNumber;
    };
    let is_next = n.fract() == 0.0 && n as i64 == last.amount + 1;
    let same_user = last.user_id.as_deref() == Some(author_id);
    if is_next && !same_user {
        CounterOutcome::Accept { number: n as i64 }
    } else {
        CounterOutcome::WrongNumber {
            same_user,
            number: n,
        }
    }
}

/// Rolesaver config (TS `GUILD.GUILD_CONFIG.rolesaver` blob
/// `{enable, timeout, admin}`; falls back to this bot's legacy
/// flat `.enable` row).
#[derive(Debug, Clone, Default)]
pub struct RolesaverCfg {
    pub enabled: bool,
    pub skip_admin: bool,
}

fn truthy(v: &serde_json::Value) -> bool {
    match v {
        serde_json::Value::Bool(b) => *b,
        serde_json::Value::Number(n) => n.as_i64().unwrap_or(0) != 0,
        serde_json::Value::String(s) => matches!(s.as_str(), "1" | "true"),
        _ => false,
    }
}

/// Admin-role skip for the rolesaver leave snapshot. Mirrors
/// Events/rolesaver/onMemberLeave.ts exactly: the role is skipped only
/// when it carries Administrator AND the stored `admin` flag is the
/// literal string `"no"` (strict `===` — `"No"`, `""`, booleans and a
/// missing flag all keep admin roles).
pub fn rolesaver_skip_admin(admin: Option<&str>) -> bool {
    admin == Some("no")
}

/// Join-restore gate for rolesaver/onMemberJoin.ts
/// `if (!array || array.length === 0) return`: a missing row (None) or an
/// empty snapshot restores nothing AND deletes nothing (the row is kept).
/// DELTAS (unreachable: both sides only ever write JSON id arrays):
/// a corrupt non-array row (`"abc"`, `{}`) has a non-zero/undefined
/// `.length` in TS so the set is attempted (and rejects) and the row is
/// still deleted, while here the parse fails to an empty vec so the row is
/// kept; a mixed valid+junk array rejects the whole TS `roles.set` (valid
/// roles NOT restored) while the live site restores the parseable subset
/// per-role (numeric-but-deleted ids fail silently per role instead of
/// failing the batch — deliberate per-role best-effort superset).
pub fn rolesaver_restore_proceeds(row: Option<&[String]>) -> bool {
    row.map(|r| !r.is_empty()).unwrap_or(false)
}

pub async fn load_rolesaver_cfg(pool: &crate::db::Pool, guild_id: &str) -> RolesaverCfg {
    if let Some(raw) = crate::db::tbl_get(pool, guild_id, "GUILD.GUILD_CONFIG.rolesaver").await {
        if let Ok(v) = serde_json::from_str::<serde_json::Value>(&raw) {
            return RolesaverCfg {
                enabled: v.get("enable").map(truthy).unwrap_or(false),
                skip_admin: rolesaver_skip_admin(v.get("admin").and_then(|a| a.as_str())),
            };
        }
    }
    RolesaverCfg {
        enabled: rolesaver_enabled(pool, guild_id).await,
        skip_admin: false,
    }
}

pub async fn rolesaver_enabled(pool: &crate::db::Pool, guild_id: &str) -> bool {
    crate::db::tbl_get(pool, guild_id, "GUILD.GUILD_CONFIG.rolesaver.enable")
        .await
        .map(|v| v == "1")
        .unwrap_or(false)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn hours_validate() {
        assert!(valid_hour(0) && valid_hour(23));
        assert!(!valid_hour(-1) && !valid_hour(24));
    }

    #[test]
    fn night_window_wraps_midnight() {
        assert!(night_active(22, 7, 23));
        assert!(night_active(22, 7, 3));
        assert!(!night_active(22, 7, 12));
        assert!(night_active(9, 17, 12));
        assert!(!night_active(9, 17, 20));
        assert!(!night_active(8, 8, 8));
    }

    #[test]
    fn counter_game_steps_mirror_ts() {
        let fresh = CounterData {
            amount: 0,
            user_id: None,
        };
        // First count by anyone accepts.
        assert_eq!(
            counter_step(&fresh, "u1", "1"),
            CounterOutcome::Accept { number: 1 }
        );
        let one = CounterData {
            amount: 1,
            user_id: Some("u1".to_string()),
        };
        // Same user twice: wrong, flagged same_user.
        assert_eq!(
            counter_step(&one, "u1", "2"),
            CounterOutcome::WrongNumber {
                same_user: true,
                number: 2.0
            }
        );
        // Wrong number by another user.
        assert_eq!(
            counter_step(&one, "u2", "3"),
            CounterOutcome::WrongNumber {
                same_user: false,
                number: 3.0
            }
        );
        // Correct continuation.
        assert_eq!(
            counter_step(&one, "u2", "2"),
            CounterOutcome::Accept { number: 2 }
        );
        // Non-numbers and blanks never count.
        assert_eq!(counter_step(&one, "u2", "hi"), CounterOutcome::NotNumber);
        assert_eq!(counter_step(&one, "u2", "   "), CounterOutcome::NotNumber);
        // Fractions never accept.
        assert!(matches!(
            counter_step(&fresh, "u1", "1.5"),
            CounterOutcome::WrongNumber { .. }
        ));
    }

    #[test]
    fn counter_number_grammar_matches_ts_battery() {
        // Battery: slice-w7s3-counter.js replicates isNumber/Number verbatim.
        assert_eq!(counter_number("0x10"), Some(16.0));
        assert_eq!(counter_number("0XFF"), Some(255.0));
        assert_eq!(counter_number("0b11"), Some(3.0));
        assert_eq!(counter_number("0o17"), Some(15.0));
        assert_eq!(counter_number("+0x10"), None);
        assert_eq!(counter_number("-0x10"), None);
        assert_eq!(counter_number("0b102"), None);
        assert_eq!(counter_number("0x"), None);
        assert_eq!(counter_number("Infinity"), Some(f64::INFINITY));
        assert_eq!(counter_number("+Infinity"), Some(f64::INFINITY));
        assert_eq!(counter_number("-Infinity"), Some(f64::NEG_INFINITY));
        assert_eq!(counter_number("infinity"), None);
        assert_eq!(counter_number("inf"), None);
        assert_eq!(counter_number("NaN"), None);
        assert_eq!(counter_number("1_000"), None);
        assert_eq!(counter_number("1e3"), Some(1000.0));
        assert_eq!(counter_number("  5  "), Some(5.0));
        assert_eq!(counter_number("5."), Some(5.0));
        assert_eq!(counter_number(".5"), Some(0.5));
        assert_eq!(counter_number("\u{a0}5\u{a0}"), Some(5.0)); // NBSP padding: both sides trim, then 5
        assert_eq!(counter_number("\u{85}5\u{85}"), None); // NEL padding: TS keeps, Number fails
        assert_eq!(counter_number(""), None);
        assert_eq!(counter_number("   "), None);
        // Full-verdict legs through counter_step.
        let base = CounterData {
            amount: 15,
            user_id: Some("u9".to_string()),
        };
        assert_eq!(
            counter_step(&base, "u1", "0x10"),
            CounterOutcome::Accept { number: 16 }
        );
        let mine = CounterData {
            amount: 0,
            user_id: Some("u1".to_string()),
        };
        assert_eq!(
            counter_step(&mine, "u1", "Infinity"),
            CounterOutcome::WrongNumber {
                same_user: true,
                number: f64::INFINITY
            }
        );
        assert_eq!(
            counter_step(&base, "u1", "Infinity"),
            CounterOutcome::WrongNumber {
                same_user: false,
                number: f64::INFINITY
            }
        );
        assert_eq!(
            counter_step(&base, "u1", "1_000"),
            CounterOutcome::NotNumber
        );
        let neg = CounterData {
            amount: -1,
            user_id: Some("u9".to_string()),
        };
        assert_eq!(
            counter_step(&neg, "u3", "-0"),
            CounterOutcome::Accept { number: 0 }
        );
    }

    #[test]
    fn js_number_to_string_matches_ts_string_ctor() {
        // Literals verified against node String(n), same order as probe.
        let cases: &[(f64, &str)] = &[
            (16.0, "16"),
            (f64::INFINITY, "Infinity"),
            (f64::NEG_INFINITY, "-Infinity"),
            (f64::NAN, "NaN"),
            (-0.0, "0"),
            (1e21, "1e+21"),
            (1e30, "1e+30"),
            (1e-7, "1e-7"),
            (1.5e-7, "1.5e-7"),
            (1e-6, "0.000001"),
            (5e-7, "5e-7"),
            (100.0, "100"),
            (2.5, "2.5"),
            (123.456, "123.456"),
            (-123.456, "-123.456"),
            (0.5, "0.5"),
            (0.30000000000000004, "0.30000000000000004"),
            (1e20, "100000000000000000000"),
            (1e22, "1e+22"),
            (123456789012345680000.0, "123456789012345680000"),
            (123456789012345678.0, "123456789012345680"),
            (f64::MAX, "1.7976931348623157e+308"),
            (5e-324, "5e-324"),
        ];
        for (n, want) in cases {
            assert_eq!(js_number_to_string(*n), *want, "n = {n}");
        }
    }

    #[test]
    fn counter_data_parses_shapes() {
        assert_eq!(
            parse_counter_data(None),
            CounterData {
                amount: 0,
                user_id: None
            }
        );
        // Legacy bare-number row.
        assert_eq!(
            parse_counter_data(Some("4")),
            CounterData {
                amount: 4,
                user_id: None
            }
        );
        let row = parse_counter_data(Some(r#"{"amount":7,"userId":"u9"}"#));
        assert_eq!(row.amount, 7);
        assert_eq!(row.user_id.as_deref(), Some("u9"));
        let reset = CounterData {
            amount: 0,
            user_id: None,
        };
        let json: serde_json::Value = serde_json::from_str(&counter_data_json(&reset)).unwrap();
        assert_eq!(json["amount"], 0);
        assert!(json["userId"].is_null());
    }

    async fn mem_pool() -> crate::db::Pool {
        crate::db::memory_pool().await
    }

    #[tokio::test]
    async fn rolesaver_cfg_reads_legacy_blob() {
        let pool = mem_pool().await;
        crate::db::kv_set(
            &pool,
            "g",
            "GUILD.GUILD_CONFIG.rolesaver",
            r#"{"enable":true,"timeout":"None","admin":"no"}"#,
        )
        .await
        .unwrap();
        let cfg = load_rolesaver_cfg(&pool, "g").await;
        assert!(cfg.enabled);
        assert!(cfg.skip_admin);
    }

    #[tokio::test]
    async fn rolesaver_cfg_prefers_table_blob() {
        let pool = mem_pool().await;
        crate::db::kv_set(
            &pool,
            "g",
            "GUILD.GUILD_CONFIG.rolesaver",
            r#"{"enable":false,"timeout":"None","admin":"yes"}"#,
        )
        .await
        .unwrap();
        crate::db::tbl_set_json(
            &pool,
            "g",
            "GUILD.GUILD_CONFIG.rolesaver",
            &serde_json::json!({"enable": true, "timeout": "None", "admin": "no"}),
        )
        .await
        .unwrap();
        let cfg = load_rolesaver_cfg(&pool, "g").await;
        assert!(cfg.enabled);
        assert!(cfg.skip_admin);
    }

    #[tokio::test]
    async fn rolesaver_enabled_falls_back_to_legacy_flat_row() {
        let pool = mem_pool().await;
        assert!(!rolesaver_enabled(&pool, "g").await);
        crate::db::kv_set(&pool, "g", "GUILD.GUILD_CONFIG.rolesaver.enable", "1")
            .await
            .unwrap();
        assert!(rolesaver_enabled(&pool, "g").await);
    }

    #[test]
    fn rolesaver_skip_admin_matches_ts_strict_no_legs() {
        // onMemberLeave.ts `admin === "no"`: only the literal skips.
        assert!(rolesaver_skip_admin(Some("no")));
        assert!(!rolesaver_skip_admin(Some("yes")));
        assert!(!rolesaver_skip_admin(Some("No")));
        assert!(!rolesaver_skip_admin(Some("")));
        assert!(!rolesaver_skip_admin(None));
    }

    #[test]
    fn rolesaver_restore_gate_matches_ts_join_legs() {
        // slice-w7s64-rolesaver.cjs: `!array || array.length === 0` skips
        // restore AND delete (row kept); anything else restores + deletes.
        assert!(!rolesaver_restore_proceeds(None));
        assert!(!rolesaver_restore_proceeds(Some(&[])));
        assert!(rolesaver_restore_proceeds(Some(&["10".to_string()])));
        assert!(rolesaver_restore_proceeds(Some(&[
            "10".to_string(),
            "30".to_string()
        ])));
    }
}

pub mod counter;
pub mod git;
pub mod nightmode;
pub mod punishpub;
pub mod report;
pub mod rolesaver;
