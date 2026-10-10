use super::*;
use super::{
    delete::authrestore_delete, force_join::authrestore_force_join, get::authrestore_get,
    roles::authrestore_roles, set::authrestore_set,
};

/// Do the same thing as authrestore with link verification button under iHorizon message
#[poise::command(
    slash_command,
    prefix_command,
    category = "authrestore",
    rename = "authrestore",
    subcommands(
        "authrestore_set",
        "authrestore_delete",
        "authrestore_get",
        "authrestore_force_join",
        "authrestore_roles"
    ),
    subcommand_required
)]
pub async fn authrestore(_ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    Ok(())
}

// ---- U-D3-NAMEDTABLES: named `authrestore` table handle ----
// `GUILD.RESTORECORD` rows keep their guild scope and key verbatim.
// Config blobs (`GuildAuthRestore`, TS key = guild id) and the global
// `saved_users` list are read from the named table first with the
// legacy full-kv parse-scan as fallback (the Rust port never writes
// those rows; the gateway owns them upstream).
use crate::commands::owner::main::{routed_del, routed_get, routed_set, tbl_all};

/// Named table mirroring TS `authRestoreTable`.
pub const AUTHRESTORE_TABLE: &str = "authrestore";
/// Legacy button-binding key, unchanged.
pub const RESTORE_RECORD_KEY: &str = "GUILD.RESTORECORD";
/// Global saved-members key, mirrors `authRestoreTable.get("saved_users")`.
pub const SAVED_USERS_KEY: &str = "saved_users";
/// Global scope for `saved_users`, mirrors the Rust "0" convention.
const SAVED_USERS_SCOPE: &str = "0";

pub async fn restore_record_get(pool: &crate::db::Pool, guild_id: &str) -> Option<RestoreRecord> {
    let raw = routed_get(pool, guild_id, guild_id, RESTORE_RECORD_KEY).await?;
    serde_json::from_str(&raw).ok()
}

pub async fn restore_record_set(
    pool: &crate::db::Pool,
    guild_id: &str,
    record: &RestoreRecord,
) -> anyhow::Result<()> {
    let raw = serde_json::to_string(record).unwrap_or_default();
    routed_set(pool, guild_id, guild_id, RESTORE_RECORD_KEY, &raw).await
}

pub async fn restore_record_del(pool: &crate::db::Pool, guild_id: &str) -> anyhow::Result<()> {
    let _ = routed_del(pool, guild_id, guild_id, RESTORE_RECORD_KEY).await;
    Ok(())
}

/// Config-blob write into the global `authrestore` table, TS-exact
/// layout (one row per guild id). Dual-writes the legacy kv row so the
/// full-kv parse-scan keeps seeing it.
pub async fn save_authrestore_blob(
    pool: &crate::db::Pool,
    guild_id: &str,
    data: &GuildAuthRestore,
) -> anyhow::Result<()> {
    let raw = serde_json::to_string(data)?;
    routed_set(pool, AUTHRESTORE_TABLE, guild_id, guild_id, &raw).await
}

/// Routed secret-code scan: global `authrestore` table first (TS-exact
/// layout: one row per guild id), then the legacy full-kv parse-scan.
/// Mirrors `authRestoreTable.all()`.
pub async fn load_authrestore_entries_routed(
    pool: &crate::db::Pool,
) -> Vec<(String, GuildAuthRestore)> {
    fn parse_blob(value: &serde_json::Value) -> Option<GuildAuthRestore> {
        match value {
            serde_json::Value::String(s) => parse_authrestore_row(s),
            v => serde_json::from_value(v.clone()).ok(),
        }
    }
    let mut out: Vec<(String, GuildAuthRestore)> = vec![];
    let mut seen = std::collections::HashSet::new();
    for (gid, value) in tbl_all(pool, AUTHRESTORE_TABLE).await {
        if gid == SAVED_USERS_KEY {
            continue;
        }
        if let Some(data) = parse_blob(&value) {
            seen.insert(gid.clone());
            out.push((gid, data));
        }
    }
    let rows: Vec<(String, String)> = crate::db::kv_scan_all(pool)
        .await
        .into_iter()
        .map(|(gid, _, value)| (gid, value))
        .collect();
    for (gid, raw) in rows {
        if seen.contains(&gid) {
            continue;
        }
        if let Some(data) = parse_authrestore_row(&raw) {
            seen.insert(gid.clone());
            out.push((gid, data));
        }
    }
    out
}

/// Routed saved-members load: named `saved_users` first, then the
/// legacy full-kv parse-scan, deduped by member id.
pub async fn load_saved_members_routed(pool: &crate::db::Pool) -> Vec<Oauth2Member> {
    let mut out: Vec<Oauth2Member> = vec![];
    let mut seen = std::collections::HashSet::new();
    if let Some(raw) = routed_get(pool, AUTHRESTORE_TABLE, SAVED_USERS_SCOPE, SAVED_USERS_KEY).await
    {
        if let Ok(list) = serde_json::from_str::<Vec<Oauth2Member>>(&raw) {
            for m in list {
                seen.insert(m.id.clone());
                out.push(m);
            }
        }
    }
    let rows: Vec<String> = crate::db::kv_scan_all(pool)
        .await
        .into_iter()
        .map(|(_, _, v)| v)
        .collect();
    for raw in rows {
        if let Ok(list) = serde_json::from_str::<Vec<Oauth2Member>>(&raw) {
            for m in list {
                if seen.insert(m.id.clone()) {
                    out.push(m);
                }
            }
        }
    }
    out
}

#[cfg(test)]
mod tests {
    use super::*;

    async fn mem_pool() -> crate::db::Pool {
        crate::db::memory_pool().await
    }

    fn sample_blob(secret: &str) -> GuildAuthRestore {
        GuildAuthRestore {
            config: AuthRestoreConfig {
                role_id: "1".to_string(),
                security_code: secret.to_string(),
                author: Oauth2Author {
                    id: "9".to_string(),
                    username: "u".to_string(),
                },
                create_date: 0,
                security_code_used: 0,
            },
            members: vec!["a".to_string()],
        }
    }

    #[tokio::test]
    async fn restore_record_roundtrip_dual_writes() {
        let pool = mem_pool().await;
        assert_eq!(restore_record_get(&pool, "g").await, None);
        let rec = RestoreRecord {
            channel_id: "c".to_string(),
            message_id: "m".to_string(),
        };
        restore_record_set(&pool, "g", &rec).await.unwrap();
        assert_eq!(restore_record_get(&pool, "g").await, Some(rec));
        // Legacy kv reader sees the unchanged key.
        assert_eq!(
            crate::db::kv_get(&pool, "g", "GUILD.RESTORECORD")
                .await
                .as_deref(),
            Some("{\"channelId\":\"c\",\"messageId\":\"m\"}")
        );
        restore_record_del(&pool, "g").await.unwrap();
        assert_eq!(restore_record_get(&pool, "g").await, None);
        assert_eq!(
            crate::db::kv_get(&pool, "g", "GUILD.RESTORECORD").await,
            None
        );
    }

    #[tokio::test]
    async fn entries_scan_merges_named_and_legacy() {
        let pool = mem_pool().await;
        // Legacy blob row anywhere in kv (gateway-written shape).
        crate::db::kv_set(
            &pool,
            "legacy-guild",
            "whatever",
            &serde_json::to_string(&sample_blob("S1")).unwrap(),
        )
        .await
        .unwrap();
        // Table blob row (TS-exact layout: keyed by guild id).
        save_authrestore_blob(&pool, "named-guild", &sample_blob("S2"))
            .await
            .unwrap();
        let entries = load_authrestore_entries_routed(&pool).await;
        assert!(find_guild_by_secret(&entries, "S1").is_some());
        assert!(find_guild_by_secret(&entries, "S2").is_some());
    }

    #[tokio::test]
    async fn saved_members_merge_named_and_legacy() {
        let pool = mem_pool().await;
        let m1 = Oauth2Member {
            token: "t".to_string(),
            id: "u1".to_string(),
            username: "a".to_string(),
            global_name: "a".to_string(),
            register_timestamp: 0,
            locale: "en-US".to_string(),
        };
        let mut m2 = m1.clone();
        m2.id = "u2".to_string();
        crate::db::kv_set(
            &pool,
            "x",
            "y",
            &serde_json::to_string(&vec![m1.clone()]).unwrap(),
        )
        .await
        .unwrap();
        crate::commands::owner::main::routed_set(
            &pool,
            AUTHRESTORE_TABLE,
            SAVED_USERS_SCOPE,
            SAVED_USERS_KEY,
            &serde_json::to_string(&vec![m1.clone(), m2.clone()]).unwrap(),
        )
        .await
        .unwrap();
        let all = load_saved_members_routed(&pool).await;
        assert_eq!(all.len(), 2);
        assert!(saved_for_guild(&all, &["u1".to_string()]).len() == 1);
    }
}
