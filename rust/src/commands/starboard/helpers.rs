// iHorizon Discord Bot (https://gitlab.com/ihrz/ihrz)
// Licensed under CC-BY-NC-SA-4.0.
// Mirrors src/Interaction/HybridCommands/starboard/* (+ skullboard mirror).
//
// TS key: <guild>.GUILD.STARBOARD {channel, createThread, enabled, threshold}
// with threshold clamped 2..=10. Skullboard uses GUILD.SKULLBOARD.

use poise::serenity_prelude as serenity;

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct BoardConfig {
    #[serde(default)]
    pub channel: String,
    #[serde(default)]
    pub create_thread: bool,
    #[serde(default = "default_enabled")]
    pub enabled: String,
    #[serde(default = "default_threshold")]
    pub threshold: i64,
}

fn default_enabled() -> String {
    "no".to_string()
}

fn default_threshold() -> i64 {
    2
}

impl Default for BoardConfig {
    fn default() -> Self {
        Self {
            channel: String::new(),
            create_thread: false,
            enabled: default_enabled(),
            threshold: default_threshold(),
        }
    }
}

pub fn clamp_threshold(amount: i64) -> i64 {
    amount.clamp(2, 10)
}

/// TS `!threshold.ts` quirk: only out-of-range amounts are stored.
/// In-range amounts (2..=10) leave the stored threshold untouched while
/// the reply still echoes the requested amount. Returns
/// (reply_amount, stored_threshold_or_None).
pub fn resolve_threshold_reply_and_store(amount: i64) -> (i64, Option<i64>) {
    let clamped = clamp_threshold(amount);
    let store = if clamped == amount {
        None
    } else {
        Some(clamped)
    };
    (clamped, store)
}

pub fn board_key(board: &str) -> String {
    match board {
        "skullboard" => "GUILD.SKULLBOARD".to_string(),
        _ => "GUILD.STARBOARD".to_string(),
    }
}

/// Board data array key: GUILD.STARBOARD_DATA / GUILD.SKULLBOARD_DATA.
pub fn board_data_key(board: &str) -> String {
    match board {
        "skullboard" => "GUILD.SKULLBOARD_DATA".to_string(),
        _ => "GUILD.STARBOARD_DATA".to_string(),
    }
}

/// One posted board message. Mirrors StarboardData (camelCase wire
/// keys: channelId/messageId/number/author).
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct BoardEntry {
    pub channel_id: String,
    pub message_id: String,
    pub number: String,
    #[serde(default)]
    pub author: String,
}

/// Guild-table backend for D1 routing (keys unchanged).
fn guild_backend(pool: &crate::db::Pool) -> crate::backends::Backend {
    crate::backends::Backend::sqlite(pool.clone())
}

/// Table-routed read with legacy flat-row fallback. Writers store under
/// `tbl:<gid>`; legacy `(gid, key)` rows stay readable.
async fn table_value_or_legacy(
    pool: &crate::db::Pool,
    guild_id: &str,
    key: &str,
) -> Option<serde_json::Value> {
    let backend = guild_backend(pool);
    let table = backend.table(guild_id);
    if let Ok(Some(v)) = table.get::<serde_json::Value>(key).await {
        return Some(v);
    }
    let s = crate::db::kv_get(pool, guild_id, key).await?;
    serde_json::from_str(&s)
        .ok()
        .or(Some(serde_json::Value::String(s)))
}

pub async fn load_entries(pool: &crate::db::Pool, guild_id: &str, board: &str) -> Vec<BoardEntry> {
    table_value_or_legacy(pool, guild_id, &board_data_key(board))
        .await
        .and_then(|v| serde_json::from_value(v).ok())
        .unwrap_or_default()
}

pub async fn save_entries(
    pool: &crate::db::Pool,
    guild_id: &str,
    board: &str,
    entries: &[BoardEntry],
) {
    let _ = guild_backend(pool)
        .table(guild_id)
        .set(&board_data_key(board), entries)
        .await;
}

/// Find the board entry for one source message. Mirrors the
/// starboardData.find(messageId+channelId) in all four event files.
pub fn find_entry<'a>(
    entries: &'a [BoardEntry],
    channel_id: &str,
    message_id: &str,
) -> Option<&'a BoardEntry> {
    entries
        .iter()
        .find(|e| e.message_id == message_id && e.channel_id == channel_id)
}

/// Board message content line. Mirrors `⭐ **n** | <#channel>`
/// (💀 for skullboard).
pub fn board_content(emoji: &str, count: i64, channel_id: u64) -> String {
    format!("{emoji} **{count}** | <#{channel_id}>")
}

/// Board embed color. Mirrors #ffac33 (star) / #2b2d31 (skull).
pub fn board_color(board: &str) -> u32 {
    match board {
        "skullboard" => 0x2b2d31,
        _ => 0xffac33,
    }
}

/// Board trigger emoji. Mirrors the emoji.name gates.
pub fn board_emoji(board: &str) -> &'static str {
    match board {
        "skullboard" => "💀",
        _ => "⭐",
    }
}

/// Exact mirror of the config gate shared by all four board event files:
/// `if (!baseData || baseData.enabled === "no" || !baseData.channel) return;`
/// `None` is the missing row (TS null). `enabled` is a strict `=== "no"`
/// compare, so a missing/non-string `enabled` PROCEEDS (unlike the typed
/// `load_board` default `"no"`); `channel` is a JS-truthiness leg, so only
/// a non-empty string proceeds. Writers (`!channel/!config/!create-thread/`
/// `!threshold.ts`) always persist full `{channel, createThread, enabled,`
/// `threshold}` rows, so the missing-`enabled` proceed leg is
/// manual-DB-only here: the live call sites keep the typed
/// `load_board` gate (convergent on every writer-produced value).
pub fn board_config_gate_passes(raw: Option<&serde_json::Value>) -> bool {
    let Some(v) = raw else { return false };
    if v.get("enabled").and_then(|e| e.as_str()) == Some("no") {
        return false;
    }
    v.get("channel")
        .and_then(|c| c.as_str())
        .map(|s| !s.is_empty())
        .unwrap_or(false)
}

/// Exact mirror of the onNewReact threshold gate:
/// `if (!reaction.count || reaction.count < threshold) return;`
/// `None` is the null-count leg (TS skips). The falsy leg matters past
/// the writer clamp: a manual-DB `threshold <= 0` row posts a zero-count
/// message in a naive `count < threshold` mirror but TS skips it.
pub fn board_add_threshold_reached(count: Option<i64>, threshold: i64) -> bool {
    matches!(count, Some(c) if c != 0 && c >= threshold)
}

/// Exact mirror of the onDeletedReact remove branch:
/// `const reactionCount = reaction.count || 0;`
/// `reactionCount < threshold ? delete : re-render`.
pub fn board_remove_deletes(count: Option<i64>, threshold: i64) -> bool {
    count.unwrap_or(0) < threshold
}

/// JS truthiness of the stored `createThread` leaf, mirroring
/// `if (baseData.createThread)` on the new-post leg. Writers store real
/// booleans (convergent with the typed `bool` field); truthy strings
/// (`"false"`), nonzero numbers, and arrays/objects are manual-DB-only.
pub fn board_thread_truthy(v: &serde_json::Value) -> bool {
    match v {
        serde_json::Value::Null => false,
        serde_json::Value::Bool(b) => *b,
        serde_json::Value::Number(n) => n.as_f64().map(|f| f != 0.0).unwrap_or(false),
        serde_json::Value::String(s) => !s.is_empty(),
        serde_json::Value::Array(_) | serde_json::Value::Object(_) => true,
    }
}

/// Exact mirror of the first-attachment image leg shared by all four
/// board event files: ONLY `attachments.first()` is consulted
/// (`attachment.contentType?.startsWith("image/")`); a later image
/// behind a non-image first attachment is ignored.
pub fn board_first_attachment_is_image(first_content_type: Option<&str>) -> bool {
    first_content_type
        .map(|ct| ct.starts_with("image/"))
        .unwrap_or(false)
}

/// App-emoji Yes markup with a static fallback. Mirrors the
/// `${client.iHorizon_Emojis.Yes}` interpolation in board replies.
pub async fn yes_markup(http: &serenity::Http) -> String {
    crate::emojis::app_emoji_markup(http, "Yes")
        .await
        .unwrap_or_else(|| "✅".to_string())
}

pub async fn load_board(pool: &crate::db::Pool, guild_id: &str, board: &str) -> BoardConfig {
    table_value_or_legacy(pool, guild_id, &board_key(board))
        .await
        .and_then(|v| serde_json::from_value(v).ok())
        .unwrap_or_default()
}

pub async fn save_board(
    pool: &crate::db::Pool,
    guild_id: &str,
    board: &str,
    cfg: &BoardConfig,
) -> anyhow::Result<()> {
    guild_backend(pool)
        .table(guild_id)
        .set(&board_key(board), cfg)
        .await
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn threshold_clamps_like_ts() {
        assert_eq!(clamp_threshold(1), 2);
        assert_eq!(clamp_threshold(2), 2);
        assert_eq!(clamp_threshold(5), 5);
        assert_eq!(clamp_threshold(10), 10);
        assert_eq!(clamp_threshold(99), 10);
    }

    #[test]
    fn threshold_stores_only_out_of_range_like_ts() {
        // In-range amounts echo back but leave the stored value alone.
        assert_eq!(resolve_threshold_reply_and_store(5), (5, None));
        assert_eq!(resolve_threshold_reply_and_store(2), (2, None));
        assert_eq!(resolve_threshold_reply_and_store(10), (10, None));
        // Out-of-range amounts clamp and store.
        assert_eq!(resolve_threshold_reply_and_store(1), (2, Some(2)));
        assert_eq!(resolve_threshold_reply_and_store(99), (10, Some(10)));
    }

    #[test]
    fn board_keys_mirror_ts() {
        assert_eq!(board_key("starboard"), "GUILD.STARBOARD");
        assert_eq!(board_key("skullboard"), "GUILD.SKULLBOARD");
        assert_eq!(board_key("other"), "GUILD.STARBOARD");
        assert_eq!(board_data_key("starboard"), "GUILD.STARBOARD_DATA");
        assert_eq!(board_data_key("skullboard"), "GUILD.SKULLBOARD_DATA");
    }

    #[test]
    fn board_render_helpers_match_ts() {
        assert_eq!(board_content("⭐", 5, 123), "⭐ **5** | <#123>");
        assert_eq!(board_content("💀", 2, 7), "💀 **2** | <#7>");
        assert_eq!(board_color("starboard"), 0xffac33);
        assert_eq!(board_color("skullboard"), 0x2b2d31);
        assert_eq!(board_emoji("starboard"), "⭐");
        assert_eq!(board_emoji("skullboard"), "💀");
        let entries = vec![
            BoardEntry {
                channel_id: "10".to_string(),
                message_id: "20".to_string(),
                number: "30".to_string(),
                author: "40".to_string(),
            },
            BoardEntry {
                channel_id: "11".to_string(),
                message_id: "21".to_string(),
                number: "31".to_string(),
                author: "41".to_string(),
            },
        ];
        assert_eq!(find_entry(&entries, "10", "20").unwrap().number, "30");
        assert!(find_entry(&entries, "10", "21").is_none());
        assert!(find_entry(&entries, "11", "20").is_none());
        // Wire shape mirrors StarboardData (camelCase).
        let json = serde_json::to_string(&entries[0]).unwrap();
        assert!(json.contains("\"channelId\":\"10\""));
        assert!(json.contains("\"messageId\":\"20\""));
        assert!(json.contains("\"number\":\"30\""));
    }

    #[test]
    fn starboard_event_gates_match_ts_battery() {
        // Mirrors scratch/slice-w7s19-starboard.js (55/55 green): the
        // config gate, add falsy-gate, remove ||0 branch, createThread
        // truthiness, and first-attachment legs of all four board files.
        use serde_json::json;
        // Config gate: !baseData || enabled === "no" || !channel -> skip.
        assert!(!board_config_gate_passes(None));
        assert!(!board_config_gate_passes(Some(&json!({}))));
        assert!(board_config_gate_passes(Some(&json!({"channel": "1"}))));
        assert!(board_config_gate_passes(Some(
            &json!({"enabled": "yes", "channel": "1"})
        )));
        assert!(!board_config_gate_passes(Some(
            &json!({"enabled": "no", "channel": "1"})
        )));
        assert!(board_config_gate_passes(Some(
            &json!({"enabled": "No", "channel": "1"})
        )));
        assert!(board_config_gate_passes(Some(
            &json!({"enabled": "", "channel": "1"})
        )));
        assert!(board_config_gate_passes(Some(
            &json!({"enabled": false, "channel": "1"})
        )));
        assert!(!board_config_gate_passes(Some(
            &json!({"enabled": "yes", "channel": ""})
        )));
        assert!(!board_config_gate_passes(Some(&json!({"enabled": "yes"}))));
        assert!(board_config_gate_passes(Some(
            &json!({"enabled": "yes", "channel": "0"})
        )));
        // Add gate: !count || count < threshold -> skip.
        assert!(!board_add_threshold_reached(None, 2));
        assert!(!board_add_threshold_reached(Some(0), 2));
        assert!(!board_add_threshold_reached(Some(0), 0));
        assert!(!board_add_threshold_reached(Some(0), -1));
        assert!(!board_add_threshold_reached(Some(1), 2));
        assert!(board_add_threshold_reached(Some(2), 2));
        assert!(board_add_threshold_reached(Some(3), 2));
        assert!(board_add_threshold_reached(Some(1), 0));
        // Remove branch: (count || 0) < threshold -> delete.
        assert!(board_remove_deletes(None, 2));
        assert!(board_remove_deletes(Some(0), 2));
        assert!(board_remove_deletes(Some(1), 2));
        assert!(!board_remove_deletes(Some(2), 2));
        assert!(!board_remove_deletes(Some(5), 3));
        assert!(!board_remove_deletes(Some(0), 0));
        assert!(!board_remove_deletes(None, 0));
        // createThread truthiness on the new-post leg.
        assert!(board_thread_truthy(&json!(true)));
        assert!(!board_thread_truthy(&json!(false)));
        assert!(board_thread_truthy(&json!("false")));
        assert!(!board_thread_truthy(&json!("")));
        assert!(!board_thread_truthy(&json!(0)));
        assert!(board_thread_truthy(&json!(1)));
        assert!(!board_thread_truthy(&json!(null)));
        // First-attachment image leg: later images are ignored.
        assert!(!board_first_attachment_is_image(None));
        assert!(board_first_attachment_is_image(Some("image/png")));
        assert!(!board_first_attachment_is_image(Some("application/pdf")));
        assert!(!board_first_attachment_is_image(Some("IMAGE/PNG")));
        assert!(!board_first_attachment_is_image(Some("")));
        // Entry find: channel+message pair, first-hit-wins.
        let entries = vec![
            BoardEntry {
                channel_id: "10".to_string(),
                message_id: "20".to_string(),
                number: "30".to_string(),
                author: "40".to_string(),
            },
            BoardEntry {
                channel_id: "11".to_string(),
                message_id: "20".to_string(),
                number: "31".to_string(),
                author: "41".to_string(),
            },
        ];
        assert_eq!(find_entry(&entries, "10", "20").unwrap().number, "30");
        assert_eq!(find_entry(&entries, "11", "20").unwrap().number, "31");
        assert!(find_entry(&entries, "10", "99").is_none());
    }

    #[test]
    fn default_config_matches_ts_fallback() {
        let cfg = BoardConfig::default();
        assert_eq!(cfg.threshold, 2);
        assert_eq!(cfg.enabled, "no");
        assert!(!cfg.create_thread);
    }

    #[test]
    fn config_wire_shape_matches_ts_camelcase() {
        // TS StarboardConfigSchema uses `createThread` (database_structure.d.ts).
        let cfg = BoardConfig {
            channel: "5".into(),
            create_thread: true,
            enabled: "yes".into(),
            threshold: 4,
        };
        let json = serde_json::to_string(&cfg).unwrap();
        assert!(json.contains("\"createThread\":true"), "{json}");
        assert!(!json.contains("create_thread"), "{json}");
        // TS-written rows read back with the thread flag intact.
        let back: BoardConfig = serde_json::from_str(
            r#"{"channel":"","createThread":true,"enabled":"no","threshold":2}"#,
        )
        .unwrap();
        assert!(back.create_thread);
    }

    #[tokio::test]
    async fn board_roundtrip_json() {
        let pool = crate::db::memory_pool().await;
        let mut cfg = load_board(&pool, "g", "starboard").await;
        assert_eq!(cfg.threshold, 2);
        cfg.threshold = clamp_threshold(99);
        save_board(&pool, "g", "starboard", &cfg).await.unwrap();
        let re = load_board(&pool, "g", "starboard").await;
        assert_eq!(re.threshold, 10);
    }

    #[tokio::test]
    async fn table_routing_with_legacy_fallback() {
        let pool = crate::db::memory_pool().await;
        let cfg = BoardConfig {
            channel: "5".into(),
            create_thread: false,
            enabled: "yes".into(),
            threshold: 4,
        };
        save_board(&pool, "g1", "starboard", &cfg).await.unwrap();
        // Table-routed rows live under `tbl:<gid>`, never as flat legacy rows.
        let legacy: Option<String> = crate::db::kv_get(&pool, "g1", "GUILD.STARBOARD").await;
        assert_eq!(legacy, None);
        let routed: String = crate::db::kv_get(&pool, "tbl:g1", "GUILD").await.unwrap();
        assert!(routed.contains("STARBOARD"));
        // Legacy rows still read, table wins over legacy.
        crate::db::kv_set(
            &pool,
            "g2",
            &board_key("starboard"),
            r#"{"threshold":7,"enabled":"yes"}"#,
        )
        .await
        .unwrap();
        assert_eq!(load_board(&pool, "g2", "starboard").await.threshold, 7);
        crate::db::kv_set(
            &pool,
            "g1",
            &board_key("starboard"),
            r#"{"threshold":9,"enabled":"yes"}"#,
        )
        .await
        .unwrap();
        assert_eq!(load_board(&pool, "g1", "starboard").await.threshold, 4);
        // Entries round-trip with legacy fallback.
        save_entries(
            &pool,
            "g1",
            "starboard",
            &[BoardEntry {
                channel_id: "1".into(),
                message_id: "2".into(),
                number: "3".into(),
                author: "4".into(),
            }],
        )
        .await;
        assert_eq!(load_entries(&pool, "g1", "starboard").await.len(), 1);
        crate::db::kv_set(
            &pool,
            "g2",
            &board_data_key("starboard"),
            r#"[{"channelId":"1","messageId":"2","number":"3"}]"#,
        )
        .await
        .unwrap();
        assert_eq!(load_entries(&pool, "g2", "starboard").await.len(), 1);
    }
}
