use super::*;
use poise::serenity_prelude as serenity;

/// Table-first rank-role load with legacy kv fallback (keys unchanged).
/// A legacy hit promotes into the table so rows migrate lazily; pair
/// with `save_rank_roles_routed` (dual-write) so kv-only readers stay fresh.
pub async fn load_rank_roles_routed(pool: &crate::db::Pool, guild_id: &str) -> Vec<RankRole> {
    crate::commands::owner::main::routed_get(pool, guild_id, guild_id, "GUILD.RANKS.roles")
        .await
        .and_then(|s| serde_json::from_str(&s).ok())
        .unwrap_or_default()
}

/// Table-first rank-role store with legacy kv dual-write (keys unchanged).
pub async fn save_rank_roles_routed(
    pool: &crate::db::Pool,
    guild_id: &str,
    roles: &[RankRole],
) -> anyhow::Result<()> {
    crate::commands::owner::main::routed_set(
        pool,
        guild_id,
        guild_id,
        "GUILD.RANKS.roles",
        &serde_json::to_string(roles)?,
    )
    .await
}

#[poise::command(
    slash_command,
    prefix_command,
    rename = "role-add",
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn ranks_role_add(
    ctx: Ctx<'_>,
    #[description = "Role"] role: serenity::Role,
    #[description = "Level"] level: i64,
) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let mut roles = load_rank_roles_routed(&ctx.data().pool, &gid).await;
    let id = role.id.get().to_string();
    roles.retain(|r| r.role_id != id);
    roles.push(RankRole {
        role_id: id,
        level: level.max(1) as u64,
    });
    save_rank_roles_routed(&ctx.data().pool, &gid, &roles).await?;
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    let lvl = level.max(1) as u64;
    ctx.say(
        crate::lang::get(&code, "ranks_config_add_command_work")
            .map(|s| {
                s.replace("${selectedRole}", &format!("<@&{}>", role.id.get()))
                    .replace("${level}", &lvl.to_string())
            })
            .unwrap_or_else(|| format!("Role <@&{}> added for level {}!", role.id.get(), lvl)),
    )
    .await?;
    Ok(())
}

#[poise::command(slash_command, prefix_command, rename = "role-list", aliases("rroles"))]
pub async fn ranks_role_list(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let roles = load_rank_roles_routed(&ctx.data().pool, &gid).await;
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    ctx.say(if roles.is_empty() {
        crate::lang::get(&code, "msg_rank_roles_empty")
            .unwrap_or_else(|| "No rank roles.".to_string())
    } else {
        roles
            .iter()
            .map(|r| {
                crate::lang::get(&code, "msg_rank_role_row")
                    .map(|s| {
                        s.replace("{roleId}", &r.role_id)
                            .replace("{level}", &r.level.to_string())
                    })
                    .unwrap_or_else(|| format!("<@&{}> — lvl {}", r.role_id, r.level))
            })
            .collect::<Vec<_>>()
            .join("\n")
    })
    .await?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::{load_rank_roles_routed, save_rank_roles_routed, RankRole};

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
    async fn legacy_row_reads_and_promotes_to_table() {
        use crate::commands::owner::main::tbl_get_value;
        let pool = mem_pool().await;
        crate::db::kv_set(
            &pool,
            "g",
            "GUILD.RANKS.roles",
            r#"[{"role_id":"7","level":5}]"#,
        )
        .await
        .unwrap();
        assert_eq!(
            load_rank_roles_routed(&pool, "g").await,
            vec![RankRole {
                role_id: "7".to_string(),
                level: 5
            }]
        );
        assert!(tbl_get_value(&pool, "g", "GUILD.RANKS.roles")
            .await
            .is_some());
        assert!(load_rank_roles_routed(&pool, "g9").await.is_empty());
    }

    #[tokio::test]
    async fn save_dual_writes_table_and_legacy() {
        use crate::commands::owner::main::tbl_get_value;
        let pool = mem_pool().await;
        save_rank_roles_routed(
            &pool,
            "g",
            &[RankRole {
                role_id: "7".to_string(),
                level: 5,
            }],
        )
        .await
        .unwrap();
        assert_eq!(
            crate::db::kv_get(&pool, "g", "GUILD.RANKS.roles")
                .await
                .as_deref(),
            Some(r#"[{"role_id":"7","level":5}]"#)
        );
        assert!(tbl_get_value(&pool, "g", "GUILD.RANKS.roles")
            .await
            .is_some());
    }
}
