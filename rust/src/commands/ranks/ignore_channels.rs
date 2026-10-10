use super::*;
use poise::serenity_prelude as serenity;

/// Table-first ignore-list load with legacy kv fallback (keys unchanged).
/// A legacy hit promotes into the table so rows migrate lazily; pair
/// with `save_ignore_routed` (dual-write) so kv-only readers stay fresh.
pub async fn load_ignore_routed(pool: &crate::db::Pool, guild_id: &str) -> Vec<String> {
    crate::commands::owner::main::routed_get(pool, guild_id, guild_id, "GUILD.RANKS.ignoreChannels")
        .await
        .and_then(|s| serde_json::from_str(&s).ok())
        .unwrap_or_default()
}

/// Table-first ignore-list store with legacy kv dual-write (keys unchanged).
pub async fn save_ignore_routed(
    pool: &crate::db::Pool,
    guild_id: &str,
    list: &[String],
) -> anyhow::Result<()> {
    crate::commands::owner::main::routed_set(
        pool,
        guild_id,
        guild_id,
        "GUILD.RANKS.ignoreChannels",
        &serde_json::to_string(list)?,
    )
    .await
}

#[poise::command(
    slash_command,
    prefix_command,
    rename = "ignore-add",
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn ranks_ignore_add(
    ctx: Ctx<'_>,
    #[description = "Channel"]
    #[channel_types("Text")]
    channel: serenity::GuildChannel,
) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let (next, added) = toggle_ignore(
        load_ignore_routed(&ctx.data().pool, &gid).await,
        &channel.id.get().to_string(),
    );
    save_ignore_routed(&ctx.data().pool, &gid, &next).await?;
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    ctx.say(if added {
        crate::lang::get(&code, "msg_ignore_channel_added")
            .unwrap_or_else(|| "Ignore channel added.".to_string())
    } else {
        crate::lang::get(&code, "msg_ignore_channel_removed")
            .unwrap_or_else(|| "Ignore channel removed.".to_string())
    })
    .await?;
    Ok(())
}

#[poise::command(
    slash_command,
    prefix_command,
    rename = "ignore-list",
    aliases("ignore")
)]
pub async fn ranks_ignore_list(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let list = load_ignore_routed(&ctx.data().pool, &gid).await;
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    ctx.say(if list.is_empty() {
        crate::lang::get(&code, "msg_ignore_channels_empty")
            .unwrap_or_else(|| "No ignored channels.".to_string())
    } else {
        let channels = list
            .iter()
            .map(|id| format!("<#{id}>"))
            .collect::<Vec<_>>()
            .join(", ");
        crate::lang::get(&code, "msg_ignore_channels_list")
            .map(|s| s.replace("${channels}", &channels))
            .unwrap_or_else(|| format!("Ignored channels: {channels}."))
    })
    .await?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::{load_ignore_routed, save_ignore_routed};

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
        crate::db::kv_set(&pool, "g", "GUILD.RANKS.ignoreChannels", r#"["7"]"#)
            .await
            .unwrap();
        assert_eq!(load_ignore_routed(&pool, "g").await, vec!["7".to_string()]);
        assert!(tbl_get_value(&pool, "g", "GUILD.RANKS.ignoreChannels")
            .await
            .is_some());
        assert!(load_ignore_routed(&pool, "g9").await.is_empty());
    }

    #[tokio::test]
    async fn save_dual_writes_table_and_legacy() {
        use crate::commands::owner::main::tbl_get_value;
        let pool = mem_pool().await;
        save_ignore_routed(&pool, "g", &["7".to_string()])
            .await
            .unwrap();
        assert_eq!(
            crate::db::kv_get(&pool, "g", "GUILD.RANKS.ignoreChannels")
                .await
                .as_deref(),
            Some(r#"["7"]"#)
        );
        assert!(tbl_get_value(&pool, "g", "GUILD.RANKS.ignoreChannels")
            .await
            .is_some());
    }
}
