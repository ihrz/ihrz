use super::*;

/// Routed warns wipe: every table-nested `USER.<uid>.WARNS` doc first,
/// then the legacy `USER.%.WARNS` rows. The table `USER` root is shared
/// with other per-user rows (ECONOMY), so only the WARNS subtree is
/// removed.
/// Deliberate real wipe (kept): !clear-all-warns.ts loops
/// `for (const entries in DbData)` — `entries` is the array INDEX, so it
/// deletes `USER.0.WARNS`, `USER.1.WARNS`, ... (keys that never exist)
/// instead of the users' real WARNS rows (a TS bug); here the actual
/// WARNS rows are deleted in both stores.
async fn clear_all_warn_tables(pool: &crate::db::Pool, guild_id: &str) -> anyhow::Result<()> {
    use crate::commands::owner::main::{tbl_del, tbl_get_value};
    // Table-first: walk the nested USER doc (backend tables store dotted
    // keys nested under the root, so bulk loops walk instead of scanning).
    if let Some(root) = tbl_get_value(pool, guild_id, "USER").await {
        if let Some(obj) = root.as_object() {
            let uids: Vec<String> = obj
                .iter()
                .filter(|(_, node)| node.get("WARNS").is_some())
                .map(|(uid, _)| uid.clone())
                .collect();
            for uid in uids {
                let _ = tbl_del(pool, guild_id, &format!("USER.{uid}.WARNS")).await;
            }
        }
    }
    // Legacy fallback: LIKE `USER.%.WARNS` has a middle wildcard, so
    // scan the `USER.` rows via the driver and delete WARNS-subtree hits.
    for (k, _) in crate::db::kv_scan_prefix(pool, guild_id, "USER.").await {
        if k.contains(".WARNS") {
            crate::db::kv_del(pool, guild_id, &k).await?;
        }
    }
    Ok(())
}

/// Clear all warns. Mirrors !clear-all-warns.ts.
#[poise::command(
    slash_command,
    prefix_command,
    rename = "clear-all-warns",
    aliases(
        "clearallwarns",
        "clearallwarn",
        "clearsanctionsall",
        "clearsanctionall"
    ),
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn mod_clear_all_warns(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    // Decline/timeout reply lives in the shared helper, mirroring the
    // TS `else { setjoinroles_action_canceled }` branch
    // (!clear-all-warns.ts): `prompt_reset_confirm` sends the cancel
    // text and yields false, so this just returns.
    if !crate::commands::prompt_reset_confirm(
        &ctx,
        "clear_allwarns_confirmation_message",
        "Delete ALL warns? This is irreversible.",
    )
    .await?
    {
        return Ok(());
    }
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    clear_all_warn_tables(&ctx.data().pool, &gid).await?;
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    ctx.say(
        crate::lang::get(&code, "clear_allwarns_command_ok").unwrap_or_else(|| {
            "All the warns in this Discord server have been deleted.".to_string()
        }),
    )
    .await?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::clear_all_warn_tables;

    async fn mem_pool() -> crate::db::Pool {
        crate::db::memory_pool().await
    }

    #[tokio::test]
    async fn wipe_clears_both_stores_but_keeps_other_user_rows() {
        use crate::commands::owner::main::{table_backend, tbl_get_value};
        let pool = mem_pool().await;
        crate::db::kv_set(&pool, "g", "USER.1.WARNS", r#"[{"id":"a"}]"#)
            .await
            .unwrap();
        // Second legacy-only user: the fallback sweep must catch every
        // USER.<uid>.WARNS row, not just the first.
        crate::db::kv_set(&pool, "g", "USER.3.WARNS", r#"[{"id":"c"}]"#)
            .await
            .unwrap();
        table_backend(&pool)
            .table("g")
            .set("USER.2.WARNS", serde_json::json!([{"id": "b"}]))
            .await
            .unwrap();
        // Shared table USER root also holds a non-warns row.
        table_backend(&pool)
            .table("g")
            .set("USER.2.ECONOMY", serde_json::json!({"money": 1}))
            .await
            .unwrap();
        clear_all_warn_tables(&pool, "g").await.unwrap();
        assert_eq!(crate::db::kv_get(&pool, "g", "USER.1.WARNS").await, None);
        assert_eq!(crate::db::kv_get(&pool, "g", "USER.3.WARNS").await, None);
        let root = tbl_get_value(&pool, "g", "USER").await.unwrap();
        assert!(root.get("2").and_then(|n| n.get("WARNS")).is_none());
        assert!(root.get("2").and_then(|n| n.get("ECONOMY")).is_some());
    }
}
