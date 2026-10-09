use super::*;

/// Whitelist roles for protected commands. Mirrors !wlroles.ts (flattened).
#[poise::command(
    slash_command,
    prefix_command,
    category = "utils",
    rename = "wlroles-add",
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn wlroles_add(
    ctx: Ctx<'_>,
    #[description = "Role"] role: poise::serenity_prelude::Role,
) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let raw =
        crate::commands::owner::main::routed_get(&ctx.data().pool, &gid, &gid, "UTILS.wlRoles")
            .await;
    let mut list: Vec<String> = raw
        .and_then(|s| serde_json::from_str(&s).ok())
        .unwrap_or_default();
    let id = role.id.get().to_string();
    if !list.contains(&id) {
        list.push(id);
        crate::commands::owner::main::routed_set(
            &ctx.data().pool,
            &gid,
            &gid,
            "UTILS.wlRoles",
            &serde_json::to_string(&list)?,
        )
        .await?;
    }
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    ctx.say(
        crate::lang::get(&code, "msg_whitelist_role_added")
            .unwrap_or_else(|| "Whitelist role added.".to_string()),
    )
    .await?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use crate::commands::owner::main as routed;

    async fn memory_pool() -> crate::db::Pool {
        use sqlx::sqlite::{SqliteConnectOptions, SqlitePoolOptions};
        use std::str::FromStr;
        let opts = SqliteConnectOptions::from_str("sqlite::memory:").unwrap();
        let pool = SqlitePoolOptions::new()
            .max_connections(1)
            .connect_with(opts)
            .await
            .unwrap();
        sqlx::query("CREATE TABLE kv (guild_id TEXT NOT NULL, key_name TEXT NOT NULL, value TEXT NOT NULL, PRIMARY KEY (guild_id, key_name))")
            .execute(&pool)
            .await
            .unwrap();
        pool
    }

    #[tokio::test]
    async fn wlroles_table_routing_with_legacy_fallback() {
        let pool = memory_pool().await;
        routed::routed_set(&pool, "g", "g", "UTILS.wlRoles", r#"["7"]"#)
            .await
            .unwrap();
        assert_eq!(
            routed::routed_get(&pool, "g", "g", "UTILS.wlRoles")
                .await
                .as_deref(),
            Some(r#"["7"]"#)
        );
        // Legacy-only row still reads.
        crate::db::kv_set(&pool, "h", "UTILS.wlRoles", r#"["9"]"#)
            .await
            .unwrap();
        assert_eq!(
            routed::routed_get(&pool, "h", "h", "UTILS.wlRoles")
                .await
                .as_deref(),
            Some(r#"["9"]"#)
        );
        // Delete clears both stores.
        assert!(routed::routed_del(&pool, "g", "g", "UTILS.wlRoles")
            .await
            .unwrap());
        assert_eq!(
            routed::routed_get(&pool, "g", "g", "UTILS.wlRoles").await,
            None
        );
    }
}
