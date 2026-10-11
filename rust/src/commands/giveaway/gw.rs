use super::*;
use super::{
    create::gw_create, end::gw_end, get_all::gw_get_all, get_data::gw_get_data,
    list_entries::gw_entries, reroll::gw_reroll,
};

/// Subcommand for giveaway category!
#[poise::command(
    slash_command,
    prefix_command,
    category = "giveaway",
    rename = "gw",
    subcommands(
        "gw_create",
        "gw_end",
        "gw_reroll",
        "gw_entries",
        "gw_get_data",
        "gw_get_all"
    ),
    subcommand_required,
    description_localized("fr", "Commande sous-groupé pour la catégorie de giveaway"),
    description_localized("ja", "ギブアウェイカテゴリのサブコマンド！"),
    description_localized("ru", "Подкоманда для категории розыгрышей!"),
    description_localized("es-ES", "Subcomando para la categoría de sorteos!")
)]
pub async fn giveaway(_ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    Ok(())
}

// ---- U-D3-NAMEDTABLES: giveaway table handle ----
// Guild-scoped table (sibling convention: `table(gid)`), keys
// `GIVEAWAY.<mid>` unchanged. Dotted keys nest under the `GIVEAWAY`
// root, so the bulk loop walks the root and merges legacy kv rows
// like `giveawaysTable.all()`. Button handlers in mod.rs read via
// `load_giveaway`, which is table-first through `store_get` below.
use crate::commands::owner::main::{
    legacy_scan, routed_del, routed_get, routed_set, tbl_get_value, walk_path,
};
use std::collections::HashSet;

/// Key prefix for the per-guild bulk loop.
pub const GIVEAWAY_PREFIX: &str = "GIVEAWAY.";
/// Nested root holding every board of one guild table.
pub const GIVEAWAY_ROOT: &str = "GIVEAWAY";

pub async fn store_get(pool: &crate::db::Pool, gid: &str, mid: u64) -> Option<String> {
    routed_get(pool, gid, gid, &giveaway_key(mid)).await
}

/// Global board read by message id. Mirrors TS `GetGiveawayData`,
/// which is keyed by message id alone (not per guild): try the
/// invoker guild scope first, then scan every scope for the board.
/// Returns the owning guild id with the row.
pub async fn store_lookup(pool: &crate::db::Pool, gid: &str, mid: u64) -> Option<(String, String)> {
    if let Some(raw) = routed_get(pool, gid, gid, &giveaway_key(mid)).await {
        return Some((gid.to_string(), raw));
    }
    let key = giveaway_key(mid);
    let rows: Vec<(String, String)> = crate::db::kv_scan_all(pool)
        .await
        .into_iter()
        .filter(|(_, k, _)| k == &key)
        .map(|(g, _, v)| (g, v))
        .collect();
    rows.into_iter().next()
}

pub async fn store_set(
    pool: &crate::db::Pool,
    gid: &str,
    mid: u64,
    value: &str,
) -> anyhow::Result<()> {
    routed_set(pool, gid, gid, &giveaway_key(mid), value).await
}

pub async fn store_del(pool: &crate::db::Pool, gid: &str, mid: u64) -> anyhow::Result<()> {
    let _ = routed_del(pool, gid, gid, &giveaway_key(mid)).await;
    Ok(())
}

/// Bulk loop for one guild: table root walked first (sorted by board
/// id), then legacy-only rows merged. Table values win on conflicts.
/// Mirrors `giveawaysTable.all()` (the Rust port scopes rows per
/// guild; each value carries its own guild_id).
pub async fn store_scan(pool: &crate::db::Pool, gid: &str) -> Vec<(String, String)> {
    let mut out: Vec<(String, String)> = vec![];
    let mut seen: HashSet<String> = HashSet::new();
    if let Some(root) = tbl_get_value(pool, gid, GIVEAWAY_ROOT).await {
        if let Some(obj) = root.as_object() {
            let mut mids: Vec<&String> = obj.keys().collect();
            mids.sort();
            for mid in mids {
                if let Some(s) = walk_path(&root, &[mid.as_str()]).and_then(|v| v.as_str()) {
                    let key = format!("{GIVEAWAY_PREFIX}{mid}");
                    seen.insert(key.clone());
                    out.push((key, s.to_string()));
                }
            }
        }
    }
    for (k, v) in legacy_scan(pool, gid, GIVEAWAY_PREFIX).await {
        if seen.insert(k.clone()) {
            out.push((k, v));
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

    #[test]
    fn keys_unchanged() {
        assert_eq!(giveaway_key(42), "GIVEAWAY.42");
        assert_eq!(GIVEAWAY_PREFIX, "GIVEAWAY.");
        assert_eq!(GIVEAWAY_ROOT, "GIVEAWAY");
    }

    #[tokio::test]
    async fn store_roundtrip_dual_writes() {
        let pool = mem_pool().await;
        assert_eq!(store_get(&pool, "g", 1).await, None);
        store_set(&pool, "g", 1, "{\"a\":1}").await.unwrap();
        assert_eq!(store_get(&pool, "g", 1).await.as_deref(), Some("{\"a\":1}"));
        // Legacy kv reader sees the same row under the unchanged key.
        assert_eq!(
            crate::db::kv_get(&pool, "g", "GIVEAWAY.1").await.as_deref(),
            Some("{\"a\":1}")
        );
        store_del(&pool, "g", 1).await.unwrap();
        assert_eq!(store_get(&pool, "g", 1).await, None);
        assert_eq!(crate::db::kv_get(&pool, "g", "GIVEAWAY.1").await, None);
    }

    #[tokio::test]
    async fn store_falls_back_to_legacy_and_promotes() {
        let pool = mem_pool().await;
        crate::db::kv_set(&pool, "g", "GIVEAWAY.5", "legacy")
            .await
            .unwrap();
        assert_eq!(store_get(&pool, "g", 5).await.as_deref(), Some("legacy"));
        crate::db::kv_del(&pool, "g", "GIVEAWAY.5").await.unwrap();
        assert_eq!(store_get(&pool, "g", 5).await.as_deref(), Some("legacy"));
    }

    #[tokio::test]
    async fn bulk_loop_merges_named_and_legacy() {
        let pool = mem_pool().await;
        crate::db::kv_set(&pool, "g", "GIVEAWAY.1", "a")
            .await
            .unwrap();
        crate::db::kv_set(&pool, "g", "GIVEAWAY.2", "b")
            .await
            .unwrap();
        crate::db::kv_set(&pool, "other", "GIVEAWAY.9", "z")
            .await
            .unwrap();
        store_set(&pool, "g", 2, "B").await.unwrap();
        store_set(&pool, "g", 3, "C").await.unwrap();
        let rows = store_scan(&pool, "g").await;
        // Guild-scoped: no cross-guild leak; table wins; no dupes.
        // Table root walks sorted by board id, legacy-only rows appended.
        assert_eq!(
            rows,
            vec![
                ("GIVEAWAY.2".to_string(), "B".to_string()),
                ("GIVEAWAY.3".to_string(), "C".to_string()),
                ("GIVEAWAY.1".to_string(), "a".to_string()),
            ]
        );
    }

    #[tokio::test]
    async fn mod_reader_is_table_first_with_legacy_fallback() {
        let pool = mem_pool().await;
        // Table-written row visible through the mod.rs button reader.
        store_set(&pool, "g", 7, r#"{"entries":["1"]}"#)
            .await
            .unwrap();
        let v = load_giveaway(&pool, "g", 7).await.expect("table row");
        assert_eq!(
            v.get("entries").and_then(|e| e.as_array()).map(|a| a.len()),
            Some(1)
        );
        // Legacy-only row (pre-migration board) still visible.
        crate::db::kv_set(&pool, "g", "GIVEAWAY.8", r#"{"entries":[]}"#)
            .await
            .unwrap();
        let v = load_giveaway(&pool, "g", 8).await.expect("legacy row");
        assert_eq!(
            v.get("entries").and_then(|e| e.as_array()).map(|a| a.len()),
            Some(0)
        );
        assert!(load_giveaway(&pool, "g", 9).await.is_none());
    }
}
