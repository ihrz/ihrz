// iHorizon Discord Bot (https://gitlab.com/ihrz/ihrz)
// Licensed under CC-BY-NC-SA-4.0.
// Shared cross-command helpers (U-LAYOUT-TS-PARITY Phase 1).
// Canonical home for helpers previously defined in one command module
// but used across several: clock, duration parsing, bot footer/profile
// store, permission loaders, guild config blob. The original modules
// re-export these names so existing `crate::commands::<module>::<helper>`
// paths keep resolving.
//
// Storage (U-D1-SHARED): guild-scoped dotted keys on the default db, like
// TS `client.db.get(`${guildId}.BOT.botName`)`. Every helper below routes
// through a per-guild `Table` handle (`table(guild_id)`) with the suffix
// keys unchanged (`BOT.botName`, `UTILS.PERMS.<cmd>`, ...). Signatures are
// unchanged so all existing callers keep compiling.

use crate::bot::Ctx;

/// Owned backend over the shared pool for guild-table routing.
/// Every DB helper below clones the pool into one of these and reads /
/// writes through `backend.table(guild_id)` with the suffix keys
/// unchanged, mirroring the TS default-db dotted key
/// `${guildId}.<suffix>`.
fn guild_backend(pool: &crate::db::Pool) -> crate::backends::Backend {
    crate::backends::Backend::sqlite(pool.clone())
}

/// Read one key from the guild table, falling back to the legacy flat kv
/// row. Cutover helper: writers migrate to tables in D-batches (see
/// roadmap D1-D9); until then legacy rows are still the live store for
/// most commands, so table-only reads would silently miss them.
/// Legacy rows hold plain strings: valid JSON decodes, anything else
/// becomes `Value::String` (matches the old kv_get call sites).
async fn table_value_or_legacy(
    table: &crate::backends::Table<'_>,
    pool: &crate::db::Pool,
    gid: &str,
    key: &str,
) -> Option<serde_json::Value> {
    if let Ok(Some(v)) = table.get::<serde_json::Value>(key).await {
        return Some(v);
    }
    let s = crate::db::kv_get(pool, gid, key).await?;
    serde_json::from_str(&s)
        .ok()
        .or(Some(serde_json::Value::String(s)))
}

/// Current time in unix milliseconds. Mirrors TS Date.now().
/// Canonical copy; schedule/context/economy previously each defined this.
pub fn now_ms() -> i64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_millis() as i64)
        .unwrap_or(0)
}

/// Parse a simple duration ("10s", "5m", "2h", "7d") into milliseconds.
/// Mirrors TS `client.timeCalculator.to_ms(message.content)` for the
/// single-unit case.
pub fn parse_duration_ms(raw: &str) -> Option<i64> {
    let s = raw.trim().to_ascii_lowercase();
    if s.is_empty() {
        return None;
    }
    let (num_part, mult) = if let Some(stripped) = s.strip_suffix("ms") {
        (stripped, 1_i64)
    } else if let Some(stripped) = s.strip_suffix('s') {
        (stripped, 1_000_i64)
    } else if let Some(stripped) = s.strip_suffix('m') {
        (stripped, 60_000_i64)
    } else if let Some(stripped) = s.strip_suffix('h') {
        (stripped, 3_600_000_i64)
    } else if let Some(stripped) = s.strip_suffix('d') {
        (stripped, 86_400_000_i64)
    } else {
        (s.as_str(), 1_000_i64)
    };
    let n: i64 = num_part.trim().parse().ok()?;
    if n <= 0 {
        return None;
    }
    n.checked_mul(mult)
}

/// Per-guild bot profile store keys. Mirrors `${guildId}.BOT.botName`
/// / `BOT.botPFP` in bot/custom/!name.ts and !avatar.ts.
pub const BOT_NAME_KEY: &str = "BOT.botName";
pub const BOT_PFP_KEY: &str = "BOT.botPFP";

/// Resolve the embed footer text. Mirrors displayBotName.footerBuilder
/// (stored BOT.botName, default "iHorizon").
pub fn bot_footer_name(stored: Option<&str>) -> String {
    stored
        .map(|s| s.trim())
        .filter(|s| !s.is_empty())
        .map(|s| s.to_string())
        .unwrap_or_else(|| "iHorizon".to_string())
}

/// Resolve the footer icon attachment bytes. Mirrors
/// displayBotName.footerAttachmentBuilder + displayBotPP: a stored
/// BOT.botPFP base64 blob becomes footer_icon.png bytes; otherwise the
/// caller falls back to the live bot avatar URL (type 1 branch).
pub fn footer_icon_bytes(stored: Option<&str>) -> Option<Vec<u8>> {
    stored.and_then(crate::emojis::base64_decode)
}

/// Paginated footer text. Mirrors footerPaginationBuilder.
pub fn footer_page_text(name: &str, page_word: &str, page: u64, max: u64) -> String {
    format!("{name} • {page_word} {page}/{max}")
}

/// Download raw bytes (avatar attachments, current bot avatar).
pub async fn download_bytes(url: &str) -> Option<Vec<u8>> {
    reqwest::Client::new()
        .get(url)
        .send()
        .await
        .ok()?
        .bytes()
        .await
        .ok()
        .map(|b| b.to_vec())
}

/// Footer text plus optional footer_icon.png bytes.
/// Mirrors displayBotName footerBuilder/footerAttachmentBuilder
/// (stored BOT.botPFP base64 wins, else a bot avatar snapshot;
// TS attaches the avatar URL, we attach its bytes so the icon renders).
pub async fn footer_parts(ctx: &Ctx<'_>, guild_id: &str) -> (String, Option<Vec<u8>>) {
    let backend = guild_backend(&ctx.data().pool);
    let table = backend.table(guild_id);
    let name = bot_footer_name(
        table_value_or_legacy(&table, &ctx.data().pool, guild_id, BOT_NAME_KEY)
            .await
            .as_ref()
            .and_then(|v| v.as_str()),
    );
    let stored: Option<String> =
        table_value_or_legacy(&table, &ctx.data().pool, guild_id, BOT_PFP_KEY)
            .await
            .as_ref()
            .and_then(|v| v.as_str())
            .map(|s| s.to_string());
    if let Some(bytes) = footer_icon_bytes(stored.as_deref()) {
        return (name, Some(bytes));
    }
    let face = ctx.serenity_context().cache.current_user().face();
    let bytes = download_bytes(&face).await;
    (name, bytes)
}

/// Apply the shared footer (text + optional icon attachment) to an embed.
pub fn embed_with_footer(
    embed: poise::serenity_prelude::CreateEmbed,
    name: &str,
    with_icon: bool,
) -> poise::serenity_prelude::CreateEmbed {
    embed.footer(
        poise::serenity_prelude::CreateEmbedFooter::new(name.to_string()).icon_url(if with_icon {
            "attachment://footer_icon.png".to_string()
        } else {
            String::new()
        }),
    )
}

/// Custom per-command permissions. Mirrors perm/!command.ts
/// (UTILS.PERMS.<command> {users, roles, level}).
pub fn perm_key(command: &str) -> String {
    format!("UTILS.PERMS.{command}")
}

pub async fn load_cmd_perms(
    pool: &crate::db::Pool,
    guild_id: &str,
    command: &str,
) -> Option<crate::executor::CmdPerms> {
    let backend = guild_backend(pool);
    let table = backend.table(guild_id);
    let raw: serde_json::Value =
        table_value_or_legacy(&table, pool, guild_id, &perm_key(command)).await?;
    parse_cmd_perms_value(&raw)
}

/// Decode one `UTILS.PERMS.<command>` value. Mirrors the read branches
/// in !command.ts: a JSON object first, then the legacy bare-number
/// (PermLevel) form.
fn parse_cmd_perms_value(raw: &serde_json::Value) -> Option<crate::executor::CmdPerms> {
    if let serde_json::Value::String(s) = raw {
        if let Ok(p) = serde_json::from_str(s) {
            return Some(p);
        }
        // Legacy bare-number format (PermLevel). Mirrors the
        // `typeof existingPerms === "number"` branch in !command.ts.
        return s
            .trim()
            .parse::<u8>()
            .ok()
            .map(|n| crate::executor::CmdPerms {
                level: Some(n),
                ..Default::default()
            });
    }
    if let Ok(p) = serde_json::from_value(raw.clone()) {
        return Some(p);
    }
    raw.as_u64()
        .and_then(|n| u8::try_from(n).ok())
        .map(|n| crate::executor::CmdPerms {
            level: Some(n),
            ..Default::default()
        })
}

/// True when the entry restricts anything. Mirrors
/// has(Permission|CommandPermission)Requirements.
pub fn has_perm_requirements(perms: &crate::executor::CmdPerms) -> bool {
    !perms.users.is_empty() || !perms.roles.is_empty() || perms.level.unwrap_or(0) > 0
}

/// Load every per-command permission row: (command, perms).
/// Mirrors reading the whole `UTILS.PERMS` subtree in !command.ts.
/// Table-routed: dotted writes merge under the `UTILS` root, so the
/// subtree is read from the decoded object, not a key-prefix scan.
pub async fn load_all_cmd_perms(
    pool: &crate::db::Pool,
    gid: &str,
) -> Vec<(String, crate::executor::CmdPerms)> {
    let backend = guild_backend(pool);
    let table = backend.table(gid);
    let root: Option<serde_json::Value> = table.get("UTILS").await.unwrap_or(None);
    let mut out = vec![];
    let Some(perms) = root
        .as_ref()
        .and_then(|r| r.get("PERMS"))
        .and_then(|p| p.as_object())
    else {
        return out;
    };
    for (cmd, raw) in perms {
        if cmd.is_empty() || cmd.contains('.') {
            continue;
        }
        if let Some(p) = parse_cmd_perms_value(raw) {
            out.push((cmd.to_string(), p));
        }
    }
    out.sort_by(|a, b| a.0.cmp(&b.0));
    out
}

/// Load the guild config blob. Mirrors the GUILD.GUILD_CONFIG object
/// read by the welcomer panel and the join/leave emitters.
pub async fn load_guild_config(pool: &crate::db::Pool, gid: &str) -> serde_json::Value {
    let backend = guild_backend(pool);
    let table = backend.table(gid);
    match table_value_or_legacy(&table, pool, gid, "GUILD.GUILD_CONFIG").await {
        Some(v) if v.is_object() => v,
        _ => serde_json::json!({}),
    }
}

pub async fn save_guild_config(
    pool: &crate::db::Pool,
    gid: &str,
    cfg: &serde_json::Value,
) -> anyhow::Result<()> {
    let backend = guild_backend(pool);
    backend.table(gid).set("GUILD.GUILD_CONFIG", cfg).await
}

/// Set or remove a blob field. Mirrors the panel set/delete pairs
/// (message/embed/channel/toggle keys).
pub fn welcomer_set(cfg: &mut serde_json::Value, field: &str, value: Option<serde_json::Value>) {
    match value {
        Some(v) => cfg[field] = v,
        None => {
            if let Some(map) = cfg.as_object_mut() {
                map.remove(field);
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    async fn memory_pool() -> crate::db::Pool {
        use sqlx::sqlite::{SqliteConnectOptions, SqlitePoolOptions};
        use std::str::FromStr;
        let opts = SqliteConnectOptions::from_str("sqlite::memory:")
            .unwrap()
            .create_if_missing(true);
        let pool = SqlitePoolOptions::new()
            .max_connections(1)
            .connect_with(opts)
            .await
            .unwrap();
        sqlx::query(
            "CREATE TABLE kv (guild_id TEXT NOT NULL, key_name TEXT NOT NULL, value TEXT NOT NULL, PRIMARY KEY (guild_id, key_name))",
        )
        .execute(&pool)
        .await
        .unwrap();
        pool
    }

    #[test]
    fn keys_match_ts_dotted_suffixes() {
        assert_eq!(BOT_NAME_KEY, "BOT.botName");
        assert_eq!(BOT_PFP_KEY, "BOT.botPFP");
        assert_eq!(perm_key("ban"), "UTILS.PERMS.ban");
    }

    #[tokio::test]
    async fn guild_config_roundtrips_through_guild_table() {
        let pool = memory_pool().await;
        assert_eq!(load_guild_config(&pool, "g1").await, serde_json::json!({}));
        let cfg = serde_json::json!({"joinmessage": "hi", "join": true});
        save_guild_config(&pool, "g1", &cfg).await.unwrap();
        assert_eq!(load_guild_config(&pool, "g1").await, cfg);
        // Other guilds are isolated.
        assert_eq!(load_guild_config(&pool, "g2").await, serde_json::json!({}));
    }

    #[tokio::test]
    async fn guild_table_routing_uses_table_scope_not_legacy_guild_scope() {
        let pool = memory_pool().await;
        let cfg = serde_json::json!({"join": true});
        save_guild_config(&pool, "g1", &cfg).await.unwrap();
        // Table-routed rows live under the `tbl:<guild>` scope with the
        // dotted root as key_name, never as a flat legacy (guild, key) row.
        let legacy: Option<String> = sqlx::query_scalar::<_, String>(
            "SELECT value FROM kv WHERE guild_id = 'g1' AND key_name = 'GUILD.GUILD_CONFIG'",
        )
        .fetch_optional(&pool)
        .await
        .unwrap();
        assert_eq!(legacy, None);
        let routed: String = sqlx::query_scalar::<_, String>(
            "SELECT value FROM kv WHERE guild_id = 'tbl:g1' AND key_name = 'GUILD'",
        )
        .fetch_optional(&pool)
        .await
        .unwrap()
        .unwrap();
        assert_eq!(
            serde_json::from_str::<serde_json::Value>(&routed).unwrap(),
            serde_json::json!({"GUILD_CONFIG": {"join": true}})
        );
    }

    #[tokio::test]
    async fn cmd_perms_object_and_legacy_number_forms() {
        let pool = memory_pool().await;
        let backend = guild_backend(&pool);
        backend
            .table("g1")
            .set(
                &perm_key("ban"),
                serde_json::json!({"level": 3, "users": ["u1"]}),
            )
            .await
            .unwrap();
        backend
            .table("g1")
            .set(&perm_key("kick"), serde_json::json!(2))
            .await
            .unwrap();
        let ban = load_cmd_perms(&pool, "g1", "ban").await.unwrap();
        assert_eq!(ban.level, Some(3));
        assert_eq!(ban.users, vec!["u1".to_string()]);
        let kick = load_cmd_perms(&pool, "g1", "kick").await.unwrap();
        assert_eq!(kick.level, Some(2));
        assert!(load_cmd_perms(&pool, "g1", "missing").await.is_none());
        assert!(load_cmd_perms(&pool, "g2", "ban").await.is_none());
    }

    #[tokio::test]
    async fn all_cmd_perms_lists_sorted_subtree() {
        let pool = memory_pool().await;
        let backend = guild_backend(&pool);
        backend
            .table("g1")
            .set(&perm_key("ban"), serde_json::json!({"level": 3}))
            .await
            .unwrap();
        backend
            .table("g1")
            .set(&perm_key("kick"), serde_json::json!(1))
            .await
            .unwrap();
        let all = load_all_cmd_perms(&pool, "g1").await;
        let names: Vec<&str> = all.iter().map(|(n, _)| n.as_str()).collect();
        assert_eq!(names, vec!["ban", "kick"]);
        assert_eq!(all[1].1.level, Some(1));
        assert!(load_all_cmd_perms(&pool, "g2").await.is_empty());
    }

    #[test]
    fn footer_name_defaults_and_trims() {
        assert_eq!(bot_footer_name(None), "iHorizon");
        assert_eq!(bot_footer_name(Some("  ")), "iHorizon");
        assert_eq!(bot_footer_name(Some(" Bob ")), "Bob");
    }

    #[test]
    fn footer_icon_rejects_non_base64() {
        assert_eq!(footer_icon_bytes(None), None);
        assert_eq!(footer_icon_bytes(Some("!!!not-base64!!!")), None);
        let bytes = vec![1u8, 2, 3, 4];
        let encoded = crate::emojis::base64_encode(&bytes);
        assert_eq!(footer_icon_bytes(Some(&encoded)), Some(bytes));
    }
}
