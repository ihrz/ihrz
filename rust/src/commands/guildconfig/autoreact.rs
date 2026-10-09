use super::*;
use poise::serenity_prelude as serenity;

#[poise::command(
    slash_command,
    prefix_command,
    rename = "autoreact",
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn gc_autoreact(
    ctx: Ctx<'_>,
    #[description = "Channel"]
    #[channel_types("Text")]
    channel: serenity::GuildChannel,
    #[description = "Emoji"] emoji: String,
) -> Result<(), anyhow::Error> {
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    if !crate::funcs::is_single_emoji(&emoji) && !crate::funcs::is_discord_emoji(&emoji) {
        ctx.say(
            crate::lang::get(&code, "autoreact_invalid_emoji")
                .unwrap_or_else(|| "Invalid emoji. Please enter a valid emoji.".to_string()),
        )
        .await?;
        return Ok(());
    }
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let raw = load_autoreact_routed(&ctx.data().pool, &gid).await;
    let mut list: Vec<serde_json::Value> = raw;
    list.push(serde_json::json!({"channelId": channel.id.get().to_string(), "emoji": emoji}));
    crate::commands::owner::main::routed_set(
        &ctx.data().pool,
        &gid,
        &gid,
        "GUILD.AUTOREACT",
        &serde_json::to_string(&list)?,
    )
    .await?;
    ctx.say(
        crate::lang::get(&code, "autoreact_add_command_ok")
            .unwrap_or_else(|| "The autoreact configuration has been set.".to_string()),
    )
    .await?;
    Ok(())
}

#[poise::command(
    slash_command,
    prefix_command,
    rename = "autoreact-list",
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn gc_autoreact_list(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    let list: Vec<serde_json::Value> = load_autoreact_routed(&ctx.data().pool, &gid).await;
    ctx.say(if list.is_empty() {
        crate::lang::get(&code, "autoreact_remove_not_found")
            .unwrap_or_else(|| "No autoreact configurations set.".to_string())
    } else {
        list.iter()
            .map(|e| {
                format!(
                    "<#{}> {}",
                    e.get("channelId")
                        .and_then(|c| c.as_str())
                        .unwrap_or("No autoreact configurations set."),
                    e.get("emoji").and_then(|x| x.as_str()).unwrap_or("?")
                )
            })
            .collect::<Vec<_>>()
            .join("\n")
    })
    .await?;
    Ok(())
}

#[poise::command(
    slash_command,
    prefix_command,
    rename = "autoreact-remove",
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn gc_autoreact_remove(
    ctx: Ctx<'_>,
    #[description = "Index (from autoreact-list, 1-based)"] index: i64,
) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let mut list: Vec<serde_json::Value> = load_autoreact_routed(&ctx.data().pool, &gid).await;
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    let i = index as usize;
    if i == 0 || i > list.len() {
        ctx.say(
            crate::lang::get(&code, "msg_bad_index").unwrap_or_else(|| "Bad index.".to_string()),
        )
        .await?;
        return Ok(());
    }
    list.remove(i - 1);
    crate::commands::owner::main::routed_set(
        &ctx.data().pool,
        &gid,
        &gid,
        "GUILD.AUTOREACT",
        &serde_json::to_string(&list)?,
    )
    .await?;
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    ctx.say(
        crate::lang::get(&code, "autoreact_remove_command_ok").unwrap_or_else(|| {
            "The autoreact configuration for this channel has been removed.".to_string()
        }),
    )
    .await?;
    Ok(())
}

/// Master switch for autoreacts. Mirrors toggle-react.
#[poise::command(
    slash_command,
    prefix_command,
    rename = "autoreact-toggle",
    aliases("toggle-react", "react-toggle", "togglereact", "reacttoggle"),
    default_member_permissions = "MANAGE_GUILD_EXPRESSIONS"
)]
pub async fn gc_autoreact_toggle(
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
        "GUILD.AUTOREACT.enabled",
        if enabled { "1" } else { "0" },
    )
    .await?;
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    let active_msg = if enabled {
        crate::lang::get(&code, "toggle_react_react").unwrap_or_else(|| "react".to_string())
    } else {
        crate::lang::get(&code, "toggle_react_doesnt_react")
            .unwrap_or_else(|| "no longer react".to_string())
    };
    let member_id = ctx.author().id.get().to_string();
    ctx.say(
        crate::lang::get(&code, "toggle_react_command_work")
            .map(|s| {
                s.replace("{activeMsg}", &active_msg)
                    .replace("${interaction.member?.id}", &member_id)
            })
            .unwrap_or_else(|| {
                if enabled {
                    "Autoreacts on.".to_string()
                } else {
                    "Autoreacts off.".to_string()
                }
            }),
    )
    .await?;
    Ok(())
}

/// Table-first autoreact list read with legacy fallback. Same key
/// (`GUILD.AUTOREACT`) and same JSON list shape as the inline reads it
/// replaces; the table handle is primary and a legacy-only row still
/// resolves via `routed_get` (lazy promotion).
pub async fn load_autoreact_routed(pool: &crate::db::Pool, gid: &str) -> Vec<serde_json::Value> {
    crate::commands::owner::main::routed_get(pool, gid, gid, "GUILD.AUTOREACT")
        .await
        .and_then(|s| serde_json::from_str(&s).ok())
        .unwrap_or_default()
}

/// Table-first autoreact master-switch read. Mirrors the message-create
/// gate (`v != "0"`, missing row means on).
pub async fn autoreact_enabled_routed(pool: &crate::db::Pool, gid: &str) -> bool {
    crate::commands::owner::main::routed_get(pool, gid, gid, "GUILD.AUTOREACT.enabled")
        .await
        .map(|v| v != "0")
        .unwrap_or(true)
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
    async fn autoreact_write_routes_to_table_and_legacy() {
        let pool = memory_pool().await;
        let list = serde_json::json!([
            {"channelId": "1", "emoji": "a"},
            {"channelId": "1", "emoji": "c"},
        ]);
        crate::commands::owner::main::routed_set(
            &pool,
            "g1",
            "g1",
            "GUILD.AUTOREACT",
            &list.to_string(),
        )
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
        assert_eq!(doc.pointer("/AUTOREACT").unwrap(), &list);
        let legacy: String = sqlx::query_scalar::<_, String>(
            "SELECT value FROM kv WHERE guild_id = 'g1' AND key_name = 'GUILD.AUTOREACT'",
        )
        .fetch_optional(&pool)
        .await
        .unwrap()
        .unwrap();
        assert_eq!(
            serde_json::from_str::<serde_json::Value>(&legacy).unwrap(),
            list
        );
        assert_eq!(
            autoreact_for_channel(&load_autoreact_routed(&pool, "g1").await, "1"),
            vec!["a".to_string(), "c".to_string()]
        );
        assert!(load_autoreact_routed(&pool, "g2").await.is_empty());
    }

    #[tokio::test]
    async fn autoreact_read_falls_back_to_legacy_only_row() {
        let pool = memory_pool().await;
        crate::db::kv_set(
            &pool,
            "g1",
            "GUILD.AUTOREACT",
            &serde_json::json!([{"channelId": "2", "emoji": "b"}]).to_string(),
        )
        .await
        .unwrap();
        assert_eq!(
            autoreact_for_channel(&load_autoreact_routed(&pool, "g1").await, "2"),
            vec!["b".to_string()]
        );
    }

    #[tokio::test]
    async fn autoreact_switch_defaults_on_and_reads_legacy() {
        let pool = memory_pool().await;
        assert!(autoreact_enabled_routed(&pool, "g1").await);
        crate::db::kv_set(&pool, "g1", "GUILD.AUTOREACT.enabled", "0")
            .await
            .unwrap();
        assert!(!autoreact_enabled_routed(&pool, "g1").await);
    }
}
