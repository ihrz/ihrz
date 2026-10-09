use super::*;

/// Routed warns wipe: legacy `USER.%.WARNS` rows plus every table-nested
/// `USER.<uid>.WARNS` doc. The table `USER` root is shared with other
/// per-user rows (ECONOMY), so only the WARNS subtree is removed.
async fn clear_all_warn_tables(pool: &crate::db::Pool, guild_id: &str) -> anyhow::Result<()> {
    use crate::commands::owner::main::{tbl_del, tbl_get_value};
    sqlx::query("DELETE FROM kv WHERE guild_id = ? AND key_name LIKE 'USER.%.WARNS'")
        .bind(guild_id)
        .execute(pool)
        .await?;
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
        crate::lang::get(&code, "clear_allwarns_command_ok")
            .unwrap_or_else(|| "All warns cleared.".to_string()),
    )
    .await?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::clear_all_warn_tables;

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

    #[tokio::test]
    async fn wipe_clears_both_stores_but_keeps_other_user_rows() {
        use crate::commands::owner::main::{table_backend, tbl_get_value};
        let pool = mem_pool().await;
        crate::db::kv_set(&pool, "g", "USER.1.WARNS", r#"[{"id":"a"}]"#)
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
        let root = tbl_get_value(&pool, "g", "USER").await.unwrap();
        assert!(root.get("2").and_then(|n| n.get("WARNS")).is_none());
        assert!(root.get("2").and_then(|n| n.get("ECONOMY")).is_some());
    }
}
