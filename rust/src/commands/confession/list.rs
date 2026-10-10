use super::*;

/// All archived-confession key names: guild-table subtree first,
/// legacy kv rows filling gaps. Mirrors the ticket TICKET_ALL prefix
/// scan; keys unchanged.
pub async fn load_archived_keys(pool: &crate::db::Pool, gid: &str) -> Vec<String> {
    use crate::commands::owner::main as routed;
    let mut keys = std::collections::HashSet::new();
    if let Some(root) = routed::tbl_get_value(pool, gid, "GUILD").await {
        if let Some(obj) =
            routed::walk_path(&root, &["CONFESSION", "ALL_CONFESSIONS"]).and_then(|v| v.as_object())
        {
            for k in obj.keys() {
                keys.insert(format!("GUILD.CONFESSION.ALL_CONFESSIONS.{k}"));
            }
        }
    }
    for (k, _) in routed::legacy_scan(pool, gid, "GUILD.CONFESSION.ALL_CONFESSIONS.").await {
        keys.insert(k);
    }
    let mut rows: Vec<String> = keys.into_iter().collect();
    rows.sort();
    rows
}

/// List archived confessions (mods). Reads the ALL_CONFESSIONS store.
///
/// Decision (ADOPT, count-only): no TS list subcommand exists
/// (confession.ts only ships channel/config/thread/cooldown), so this
/// is a Rust-only mod tool. It stays count-only via the existing
/// `msg_archived_confessions` ("{} archived confessions.") key:
/// per-item pagination, code lookup output, and private-content
/// redaction would need the mod.rs archive surface
/// (`find_confession_by_code` compat + reveal flow), and a mod must
/// not page private confession bodies out of this leaf.
#[poise::command(
    slash_command,
    prefix_command,
    rename = "list",
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn confession_list(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let rows = load_archived_keys(&ctx.data().pool, &gid).await;
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    let n = rows.len();
    ctx.say(
        crate::lang::get(&code, "msg_archived_confessions")
            .map(|s| s.replace("{}", &n.to_string()))
            .unwrap_or_else(|| format!("{n} archived confessions.")),
    )
    .await?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::load_archived_keys;
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
    async fn confession_table_routing_with_legacy_fallback() {
        let pool = memory_pool().await;
        routed::routed_set(&pool, "g", "g", "GUILD.CONFESSION.cooldown", "5000")
            .await
            .unwrap();
        assert_eq!(
            routed::routed_get(&pool, "g", "g", "GUILD.CONFESSION.cooldown")
                .await
                .as_deref(),
            Some("5000")
        );
        // Legacy-only archive row still surfaces in the union scan.
        crate::db::kv_set(&pool, "g", "GUILD.CONFESSION.ALL_CONFESSIONS.1", "{}")
            .await
            .unwrap();
        let rows = load_archived_keys(&pool, "g").await;
        assert_eq!(rows, vec!["GUILD.CONFESSION.ALL_CONFESSIONS.1".to_string()]);
        // Table-side archive row merges in.
        routed::routed_set(&pool, "g", "g", "GUILD.CONFESSION.ALL_CONFESSIONS.2", "{}")
            .await
            .unwrap();
        let rows = load_archived_keys(&pool, "g").await;
        assert_eq!(rows.len(), 2);
    }
}
