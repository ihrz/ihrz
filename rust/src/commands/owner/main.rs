#[allow(unused_imports)]
pub use super::{
    blacklist::*, bledit::*, blinfo::*, entry::*, eval::*, helpers::*, owner::*, scope::*,
    store::*, unblacklist::*, unowner::*,
};

#[cfg(test)]
mod tests {
    use super::*;

    async fn mem_pool() -> crate::db::Pool {
        crate::db::memory_pool().await
    }

    #[test]
    fn key_layout() {
        assert_eq!(blacklist_key(1), "BLACKLIST.1");
        assert_eq!(BLACKLIST_TABLE, "blacklist");
    }

    #[test]
    fn dotted_keys_walk_nested_docs() {
        let v: serde_json::Value = serde_json::json!({"7": "spam"});
        assert_eq!(walk_path(&v, &["7"]).and_then(|x| x.as_str()), Some("spam"));
        assert_eq!(walk_path(&v, &["9"]), None);
    }

    #[tokio::test]
    async fn table_handle_roundtrip_nests_and_deletes_cleanly() {
        let pool = mem_pool().await;
        assert_eq!(tbl_get(&pool, BLACKLIST_TABLE, "BLACKLIST.7").await, None);
        tbl_set(&pool, BLACKLIST_TABLE, "BLACKLIST.7", "spam")
            .await
            .unwrap();
        assert_eq!(
            tbl_get(&pool, BLACKLIST_TABLE, "BLACKLIST.7")
                .await
                .as_deref(),
            Some("spam")
        );
        // Dotted keys nest under the root instead of flat rows.
        let root = tbl_get_value(&pool, BLACKLIST_TABLE, "BLACKLIST")
            .await
            .unwrap();
        assert_eq!(
            walk_path(&root, &["7"]).and_then(|x| x.as_str()),
            Some("spam")
        );
        assert!(tbl_del(&pool, BLACKLIST_TABLE, "BLACKLIST.7")
            .await
            .unwrap());
        assert!(!tbl_del(&pool, BLACKLIST_TABLE, "BLACKLIST.7")
            .await
            .unwrap());
        assert_eq!(tbl_get(&pool, BLACKLIST_TABLE, "BLACKLIST.7").await, None);
    }

    #[tokio::test]
    async fn blacklist_roundtrip_hits_table_handle() {
        let pool = mem_pool().await;
        assert_eq!(bl_get(&pool, 7).await, None);
        bl_set(&pool, 7, "spam").await.unwrap();
        assert_eq!(bl_get(&pool, 7).await.as_deref(), Some("spam"));
        // Dual-write: legacy kv readers (db.rs gate, member-join guard)
        // still see the row under the unchanged key.
        assert_eq!(
            crate::db::kv_get(&pool, "0", &blacklist_key(7))
                .await
                .as_deref(),
            Some("spam")
        );
        // And the table handle serves the same row.
        assert_eq!(
            tbl_get(&pool, BLACKLIST_TABLE, &blacklist_key(7))
                .await
                .as_deref(),
            Some("spam")
        );
        bl_del(&pool, 7).await.unwrap();
        assert_eq!(bl_get(&pool, 7).await, None);
        assert_eq!(crate::db::kv_get(&pool, "0", &blacklist_key(7)).await, None);
    }

    #[tokio::test]
    async fn blacklist_falls_back_to_legacy_kv_and_promotes() {
        let pool = mem_pool().await;
        // Legacy-only row (written before the migration, no named table).
        crate::db::kv_set(&pool, "0", &blacklist_key(9), "old")
            .await
            .unwrap();
        assert_eq!(bl_get(&pool, 9).await.as_deref(), Some("old"));
        // Promoted: a second read hits the named table even when the
        // legacy row is gone.
        crate::db::kv_del(&pool, "0", &blacklist_key(9))
            .await
            .unwrap();
        assert_eq!(bl_get(&pool, 9).await.as_deref(), Some("old"));
    }

    #[tokio::test]
    async fn routed_del_reports_existence_across_stores() {
        let pool = mem_pool().await;
        assert!(!routed_del(&pool, BLACKLIST_TABLE, "0", &blacklist_key(3))
            .await
            .unwrap());
        crate::db::kv_set(&pool, "0", &blacklist_key(3), "x")
            .await
            .unwrap();
        assert!(routed_del(&pool, BLACKLIST_TABLE, "0", &blacklist_key(3))
            .await
            .unwrap());
        assert!(!routed_del(&pool, BLACKLIST_TABLE, "0", &blacklist_key(3))
            .await
            .unwrap());
    }

    #[test]
    fn bl_entry_roundtrip_and_legacy_fallback() {
        let json = bl_entry_json("spam", 42, 1_700_000_000_000);
        let e = parse_bl_entry(&json);
        assert_eq!(e.reason.as_deref(), Some("spam"));
        assert_eq!(e.owner.as_deref(), Some("42"));
        assert_eq!(e.created_at_ms, Some(1_700_000_000_000));
        // Legacy plain-string row reads as its own reason.
        let legacy = parse_bl_entry("old reason");
        assert_eq!(legacy.reason.as_deref(), Some("old reason"));
        assert_eq!(legacy.owner, None);
        assert_eq!(legacy.created_at_ms, None);
    }

    #[test]
    fn bl_entry_reason_edit_preserves_owner_and_date() {
        let json = bl_entry_json("v1", 7, 1_700_000_000_000);
        let updated = bl_entry_with_reason(&json, "v2");
        let e = parse_bl_entry(&updated);
        assert_eq!(e.reason.as_deref(), Some("v2"));
        assert_eq!(e.owner.as_deref(), Some("7"));
        assert_eq!(e.created_at_ms, Some(1_700_000_000_000));
    }

    #[test]
    fn transphobia_guard_matches_ts_check() {
        assert!(is_transphobia_reason(
            "iHorizon Project Blacklist - Transphobia"
        ));
        assert!(is_transphobia_reason("TRANSPHOBIA toward staff"));
        assert!(!is_transphobia_reason("spam"));
    }

    #[test]
    fn bl_date_formats_mmm_dd_yyyy() {
        assert_eq!(format_bl_date(0), "Jan 01 1970");
        // 2026-10-10 00:00:00 UTC.
        assert_eq!(format_bl_date(1_791_590_400_000), "Oct 10 2026");
    }

    #[test]
    fn bl_pages_chunk_five_and_fill_title() {
        let entries: Vec<(u64, BlEntry)> = (1..=6)
            .map(|i| {
                (
                    i,
                    BlEntry {
                        reason: Some(format!("r{i}")),
                        owner: Some("9".to_string()),
                        created_at_ms: Some(0),
                    },
                )
            })
            .collect();
        let pages = bl_pages(
            &entries,
            "Blacklist - Page ${i / usersPerPage + 1}",
            "Unknown",
            "No reason found",
        );
        assert_eq!(pages.len(), 2);
        assert_eq!(pages[0].0, "Blacklist - Page 1");
        assert_eq!(pages[1].0, "Blacklist - Page 2");
        assert!(pages[0].1.contains("<@1>"));
        assert!(pages[0].1.contains("Jan 01 1970"));
        assert!(pages[0].1.contains("`r1`"));
        assert!(pages[0].1.contains("By 9"));
        assert!(pages[1].1.contains("<@6>"));
    }

    #[test]
    fn bl_line_falls_back_to_unknown_and_no_reason() {
        let line = format_bl_line(3, &BlEntry::default(), "Unknown", "No reason found");
        assert_eq!(
            line,
            "<@3>\n├─ Unknown\n├─ `No reason found`\n├─ By Unknown"
        );
    }

    #[test]
    fn bot_dev_matches_config_list() {
        let owners = vec!["111".to_string(), "222".to_string()];
        assert!(is_bot_dev(&owners, 111));
        assert!(!is_bot_dev(&owners, 333));
    }

    #[tokio::test]
    async fn entry_store_reads_back_reason_and_lists() {
        let pool = mem_pool().await;
        bl_set(&pool, 7, &bl_entry_json("spam", 9, 1_700_000_000_000))
            .await
            .unwrap();
        // Reason lookup unwraps the entry shape (member-join DM parity).
        assert_eq!(bl_get(&pool, 7).await.as_deref(), Some("spam"));
        let rows = bl_list(&pool).await;
        assert_eq!(rows.len(), 1);
        assert_eq!(rows[0].0, 7);
        assert_eq!(rows[0].1.reason.as_deref(), Some("spam"));
        assert_eq!(rows[0].1.owner.as_deref(), Some("9"));
        // Guild scope is disjoint from the global table.
        gbl_set(&pool, "g1", 7, &bl_entry_json("gspam", 9, 0))
            .await
            .unwrap();
        assert_eq!(gbl_get(&pool, "g1", 7).await.as_deref(), Some("gspam"));
        assert_eq!(bl_get(&pool, 7).await.as_deref(), Some("spam"));
        let grows = gbl_list(&pool, "g1").await;
        assert_eq!(grows.len(), 1);
        // Delete-first reports existence (unblacklist guild-leg parity).
        assert!(gbl_del(&pool, "g1", 7).await.unwrap());
        assert!(!gbl_del(&pool, "g1", 7).await.unwrap());
        assert_eq!(gbl_get(&pool, "g1", 7).await, None);
        bl_del(&pool, 7).await.unwrap();
    }

    #[tokio::test]
    async fn legacy_scan_lists_scope_prefix() {
        let pool = mem_pool().await;
        crate::db::kv_set(&pool, "g", "GIVEAWAY.1", "a")
            .await
            .unwrap();
        crate::db::kv_set(&pool, "g", "GIVEAWAY.2", "b")
            .await
            .unwrap();
        crate::db::kv_set(&pool, "g", "OTHER.3", "c").await.unwrap();
        let rows = legacy_scan(&pool, "g", "GIVEAWAY.").await;
        assert_eq!(
            rows,
            vec![
                ("GIVEAWAY.1".to_string(), "a".to_string()),
                ("GIVEAWAY.2".to_string(), "b".to_string()),
            ]
        );
        legacy_del_prefix(&pool, "g", "GIVEAWAY.").await.unwrap();
        assert!(legacy_scan(&pool, "g", "GIVEAWAY.").await.is_empty());
        assert_eq!(
            crate::db::kv_get(&pool, "g", "OTHER.3").await.as_deref(),
            Some("c")
        );
    }
}
