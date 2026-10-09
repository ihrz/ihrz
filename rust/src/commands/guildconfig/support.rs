use super::*;

#[poise::command(
    slash_command,
    prefix_command,
    rename = "support",
    aliases("soutien"),
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn gc_support(
    ctx: Ctx<'_>,
    #[description = "on or off"] action: String,
) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let enabled = matches!(action.to_ascii_lowercase().as_str(), "on" | "power on");
    crate::commands::owner::main::routed_set(
        &ctx.data().pool,
        &gid,
        &gid,
        "GUILD.SUPPORT",
        if enabled { "1" } else { "0" },
    )
    .await?;
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    if enabled {
        ctx.say(
            crate::lang::get(&code, "msg_support_enabled")
                .unwrap_or_else(|| "Support on.".to_string()),
        )
        .await?;
    } else {
        let guild_name = ctx.guild().map(|g| g.name.clone()).unwrap_or_default();
        ctx.say(
            crate::lang::get(&code, "support_command_work_on_disable")
                .map(|s| s.replace("${interaction.guild.name}", &guild_name))
                .unwrap_or_else(|| "You have set up the support module for **${interaction.guild.name}**.\nNobody will receive a role now!".to_string()),
        )
        .await?;
    }
    Ok(())
}

/// Table-first support-module read with legacy fallback. Same key
/// (`GUILD.SUPPORT`): `"1"` means on, `"0"`/missing means off. A legacy
/// TS object row (`{"state": ...}`) counts as configured (on) so old
/// guilds keep their module after the routing switch.
pub async fn support_enabled_routed(pool: &crate::db::Pool, gid: &str) -> bool {
    match crate::commands::owner::main::routed_get(pool, gid, gid, "GUILD.SUPPORT").await {
        Some(v) => v == "1" || v.trim_start().starts_with('{'),
        None => false,
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

    #[tokio::test]
    async fn support_write_routes_to_table_and_legacy() {
        let pool = memory_pool().await;
        crate::commands::owner::main::routed_set(&pool, "g1", "g1", "GUILD.SUPPORT", "1")
            .await
            .unwrap();
        let routed: String = sqlx::query_scalar::<_, String>(
            "SELECT value FROM kv WHERE guild_id = 'tbl:g1' AND key_name = 'GUILD'",
        )
        .fetch_optional(&pool)
        .await
        .unwrap()
        .unwrap();
        let doc: serde_json::Value = serde_json::from_str(&routed).unwrap();
        assert_eq!(doc.pointer("/SUPPORT").unwrap(), &serde_json::json!(1));
        let legacy: String = sqlx::query_scalar::<_, String>(
            "SELECT value FROM kv WHERE guild_id = 'g1' AND key_name = 'GUILD.SUPPORT'",
        )
        .fetch_optional(&pool)
        .await
        .unwrap()
        .unwrap();
        assert_eq!(legacy, "1");
        assert!(support_enabled_routed(&pool, "g1").await);
        assert!(!support_enabled_routed(&pool, "g2").await);
    }

    #[tokio::test]
    async fn support_read_falls_back_to_legacy_only_row() {
        let pool = memory_pool().await;
        crate::db::kv_set(&pool, "g1", "GUILD.SUPPORT", "0")
            .await
            .unwrap();
        assert!(!support_enabled_routed(&pool, "g1").await);
        crate::db::kv_set(
            &pool,
            "g2",
            "GUILD.SUPPORT",
            &serde_json::json!({"state": "on"}).to_string(),
        )
        .await
        .unwrap();
        assert!(support_enabled_routed(&pool, "g2").await);
    }

    #[tokio::test]
    async fn support_off_clears_both_stores() {
        let pool = memory_pool().await;
        crate::commands::owner::main::routed_set(&pool, "g1", "g1", "GUILD.SUPPORT", "1")
            .await
            .unwrap();
        crate::commands::owner::main::routed_set(&pool, "g1", "g1", "GUILD.SUPPORT", "0")
            .await
            .unwrap();
        assert!(!support_enabled_routed(&pool, "g1").await);
    }
}
