use super::*;
use super::{
    create::backup_create, delete::backup_delete, list::backup_list, load::backup_load,
    manage::backup_manage,
};

#[poise::command(
    slash_command,
    prefix_command,
    category = "backup",
    rename = "backup",
    subcommands(
        "backup_create",
        "backup_list",
        "backup_load",
        "backup_delete",
        "backup_manage"
    )
)]
pub async fn backup(_ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    Ok(())
}

// ---- U-D3-NAMEDTABLES: backup table handle ----
// Table `{gid}-backups` (sibling convention: table = legacy scope)
// with `BACKUP.<id>` keys unchanged. Dotted keys nest under the
// `BACKUP` root, so the bulk loop walks the root and merges legacy kv
// rows. The legacy config-snapshot writer in mod.rs still writes kv
// directly (locked file): routed reads merge it back.
use crate::commands::owner::main::{
    legacy_scan, routed_del, routed_get, routed_set, tbl_get_value, walk_path,
};
use std::collections::HashSet;

/// Key prefix for the per-guild bulk loop.
pub const BACKUP_PREFIX: &str = "BACKUP.";
/// Nested root holding every snapshot of one guild table.
pub const BACKUP_ROOT: &str = "BACKUP";

/// Legacy scope preserved verbatim: `{gid}-backups`.
pub fn backup_scope(gid: &str) -> String {
    format!("{gid}-backups")
}

pub async fn bkp_get(pool: &crate::db::Pool, gid: &str, backup_id: &str) -> Option<String> {
    routed_get(
        pool,
        &backup_scope(gid),
        &backup_scope(gid),
        &backup_key(backup_id),
    )
    .await
}

pub async fn bkp_set(
    pool: &crate::db::Pool,
    gid: &str,
    backup_id: &str,
    value: &str,
) -> anyhow::Result<()> {
    routed_set(
        pool,
        &backup_scope(gid),
        &backup_scope(gid),
        &backup_key(backup_id),
        value,
    )
    .await
}

pub async fn bkp_del(pool: &crate::db::Pool, gid: &str, backup_id: &str) -> anyhow::Result<()> {
    let _ = routed_del(
        pool,
        &backup_scope(gid),
        &backup_scope(gid),
        &backup_key(backup_id),
    )
    .await;
    Ok(())
}

/// Bulk loop for one guild: table root walked first (sorted by backup
/// id), then legacy-only rows merged. Table values win on conflicts.
pub async fn bkp_scan(pool: &crate::db::Pool, gid: &str) -> Vec<(String, String)> {
    let scope = backup_scope(gid);
    let mut out: Vec<(String, String)> = vec![];
    let mut seen: HashSet<String> = HashSet::new();
    if let Some(root) = tbl_get_value(pool, &scope, BACKUP_ROOT).await {
        if let Some(obj) = root.as_object() {
            let mut ids: Vec<&String> = obj.keys().collect();
            ids.sort();
            for id in ids {
                if let Some(s) = walk_path(&root, &[id.as_str()]).and_then(|v| v.as_str()) {
                    let key = format!("{BACKUP_PREFIX}{id}");
                    seen.insert(key.clone());
                    out.push((key, s.to_string()));
                }
            }
        }
    }
    for (k, v) in legacy_scan(pool, &scope, BACKUP_PREFIX).await {
        if seen.insert(k.clone()) {
            out.push((k, v));
        }
    }
    out
}

#[cfg(test)]
mod tests {
    use super::super::{backup_key, gen_backup_id};
    use super::{backup_scope, bkp_del, bkp_get, bkp_scan, bkp_set, BACKUP_ROOT};

    async fn mem_pool() -> crate::db::Pool {
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
    fn scope_and_keys_unchanged() {
        assert_eq!(backup_scope("123"), "123-backups");
        assert_eq!(backup_key("abc"), "BACKUP.abc");
        assert_eq!(BACKUP_ROOT, "BACKUP");
        assert_eq!(gen_backup_id().len(), 16);
    }

    #[tokio::test]
    async fn bkp_roundtrip_dual_writes() {
        let pool = mem_pool().await;
        assert_eq!(bkp_get(&pool, "g", "id1").await, None);
        bkp_set(&pool, "g", "id1", "{\"n\":1}").await.unwrap();
        assert_eq!(
            bkp_get(&pool, "g", "id1").await.as_deref(),
            Some("{\"n\":1}")
        );
        // Legacy scope/key preserved for the locked kv writer+readers.
        assert_eq!(
            crate::db::kv_get(&pool, "g-backups", "BACKUP.id1")
                .await
                .as_deref(),
            Some("{\"n\":1}")
        );
        bkp_del(&pool, "g", "id1").await.unwrap();
        assert_eq!(bkp_get(&pool, "g", "id1").await, None);
        assert_eq!(
            crate::db::kv_get(&pool, "g-backups", "BACKUP.id1").await,
            None
        );
    }

    #[tokio::test]
    async fn bkp_scan_merges_legacy_snapshot_writer() {
        let pool = mem_pool().await;
        // Row written by the locked legacy snapshot path (kv only).
        crate::db::kv_set(&pool, "g-backups", "BACKUP.old", "snap")
            .await
            .unwrap();
        bkp_set(&pool, "g", "new", "full").await.unwrap();
        let mut rows = bkp_scan(&pool, "g").await;
        rows.sort();
        assert_eq!(
            rows,
            vec![
                ("BACKUP.new".to_string(), "full".to_string()),
                ("BACKUP.old".to_string(), "snap".to_string()),
            ]
        );
    }
}
