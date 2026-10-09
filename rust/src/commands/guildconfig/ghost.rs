use super::*;
use poise::serenity_prelude as serenity;

#[poise::command(
    slash_command,
    prefix_command,
    rename = "ghost-add",
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn gc_ghost_add(
    ctx: Ctx<'_>,
    #[description = "Channel"]
    #[channel_types("Text")]
    channel: serenity::GuildChannel,
) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let mut list = load_ghost_routed(&ctx.data().pool, &gid).await;
    let id = channel.id.get().to_string();
    if !list.contains(&id) {
        list.push(id);
        crate::commands::owner::main::routed_set(
            &ctx.data().pool,
            &gid,
            &gid,
            ghost_key(),
            &serde_json::to_string(&list)?,
        )
        .await?;
    }
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    ctx.say(
        crate::lang::get(&code, "joinghostping_add_sent_to_channel").unwrap_or_else(|| {
            "From now on, when a member joins the guild, I'll send a ghost message **here**."
                .to_string()
        }),
    )
    .await?;
    Ok(())
}

#[poise::command(
    slash_command,
    prefix_command,
    rename = "ghost-remove",
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn gc_ghost_remove(
    ctx: Ctx<'_>,
    #[description = "Channel"]
    #[channel_types("Text")]
    channel: serenity::GuildChannel,
) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let mut list = load_ghost_routed(&ctx.data().pool, &gid).await;
    let id = channel.id.get().to_string();
    list.retain(|c| c != &id);
    crate::commands::owner::main::routed_set(
        &ctx.data().pool,
        &gid,
        &gid,
        ghost_key(),
        &serde_json::to_string(&list)?,
    )
    .await?;
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    ctx.say(
        crate::lang::get(&code, "joinghostping_remove_ok_embed_desc").unwrap_or_else(|| {
            "The channels have been deleted from the Join GhostPing Module!".to_string()
        }),
    )
    .await?;
    Ok(())
}

#[poise::command(
    slash_command,
    prefix_command,
    rename = "ghost-list",
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn gc_ghost_list(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let list = load_ghost_routed(&ctx.data().pool, &gid).await;
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    ctx.say(if list.is_empty() {
        crate::lang::get(&code, "msg_ghost_list_empty")
            .unwrap_or_else(|| "No ghost-ping watches.".to_string())
    } else {
        list.join(", ")
    })
    .await?;
    Ok(())
}

/// Table-first ghost-ping read with legacy fallback. Mirrors
/// `load_ghost` (same key, same JSON list shape) over the routed
/// handle: the table is primary, a legacy-only row still resolves and
/// is promoted lazily by `routed_get`.
pub async fn load_ghost_routed(pool: &crate::db::Pool, gid: &str) -> Vec<String> {
    crate::commands::owner::main::routed_get(pool, gid, gid, ghost_key())
        .await
        .and_then(|s| serde_json::from_str(&s).ok())
        .unwrap_or_default()
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

    #[test]
    fn ghost_key_unchanged() {
        assert_eq!(ghost_key(), "GUILD.GUILD_CONFIG.GHOST_PING.channels");
    }

    #[tokio::test]
    async fn ghost_write_routes_to_table_and_legacy() {
        let pool = memory_pool().await;
        let list = vec!["11".to_string(), "22".to_string()];
        crate::commands::owner::main::routed_set(
            &pool,
            "g1",
            "g1",
            ghost_key(),
            &serde_json::to_string(&list).unwrap(),
        )
        .await
        .unwrap();
        // Table handle holds the dotted key under the GUILD root.
        let routed: String = sqlx::query_scalar::<_, String>(
            "SELECT value FROM kv WHERE guild_id = 'tbl:g1' AND key_name = 'GUILD'",
        )
        .fetch_optional(&pool)
        .await
        .unwrap()
        .unwrap();
        let doc: serde_json::Value = serde_json::from_str(&routed).unwrap();
        assert_eq!(
            doc.pointer("/GUILD_CONFIG/GHOST_PING/channels").unwrap(),
            &serde_json::json!(["11", "22"])
        );
        // Legacy flat row stays fresh for unmigrated readers.
        let legacy: String = sqlx::query_scalar::<_, String>(
            "SELECT value FROM kv WHERE guild_id = 'g1' AND key_name = 'GUILD.GUILD_CONFIG.GHOST_PING.channels'",
        )
        .fetch_optional(&pool)
        .await
        .unwrap()
        .unwrap();
        assert_eq!(
            serde_json::from_str::<serde_json::Value>(&legacy).unwrap(),
            serde_json::json!(["11", "22"])
        );
        // Other guilds are isolated.
        assert!(load_ghost_routed(&pool, "g2").await.is_empty());
    }

    #[tokio::test]
    async fn ghost_read_falls_back_to_legacy_only_row() {
        let pool = memory_pool().await;
        crate::db::kv_set(
            &pool,
            "g1",
            ghost_key(),
            &serde_json::to_string(&vec!["7".to_string()]).unwrap(),
        )
        .await
        .unwrap();
        assert_eq!(load_ghost_routed(&pool, "g1").await, vec!["7".to_string()]);
    }
}
