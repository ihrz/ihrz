use super::*;
use poise::serenity_prelude as serenity;

/// XP channel load with legacy key fallback (`GUILD.XP_LEVELING.xpchannels`,
/// legacy `GUILD.RANKS.channel` single / `GUILD.RANKS.xpChannels` list).
/// A legacy list contributes its first entry; a legacy hit promotes the
/// single id into the new key so rows migrate lazily.
pub async fn load_xp_channel_routed(pool: &crate::db::Pool, guild_id: &str) -> Option<String> {
    let raw = super::migrated_get(
        pool,
        guild_id,
        super::GUILD_XPCHANNEL_NEW,
        &[
            super::GUILD_XPCHANNEL_OLD_SINGLE,
            super::GUILD_XPCHANNEL_OLD_LIST,
        ],
    )
    .await?;
    if let Ok(list) = serde_json::from_str::<Vec<String>>(&raw) {
        return list.into_iter().next();
    }
    let id = crate::commands::owner::main::decode_stored_string(&raw);
    if id.is_empty() {
        return None;
    }
    Some(id)
}

/// XP channel store: single id on the new key (TS shape) plus the legacy
/// single key and a single-entry legacy list, so old readers stay fresh.
pub async fn save_xp_channel_routed(
    pool: &crate::db::Pool,
    guild_id: &str,
    channel_id: &str,
) -> anyhow::Result<()> {
    super::migrated_set(
        pool,
        guild_id,
        super::GUILD_XPCHANNEL_NEW,
        &[super::GUILD_XPCHANNEL_OLD_SINGLE],
        channel_id,
    )
    .await?;
    crate::commands::owner::main::routed_set(
        pool,
        guild_id,
        guild_id,
        super::GUILD_XPCHANNEL_OLD_LIST,
        &serde_json::to_string(&[channel_id])?,
    )
    .await
}

/// XP channel clear across the new key and every legacy key.
pub async fn clear_xp_channel_routed(
    pool: &crate::db::Pool,
    guild_id: &str,
) -> anyhow::Result<bool> {
    super::migrated_del(
        pool,
        guild_id,
        super::GUILD_XPCHANNEL_NEW,
        &[
            super::GUILD_XPCHANNEL_OLD_SINGLE,
            super::GUILD_XPCHANNEL_OLD_LIST,
        ],
    )
    .await
}
#[poise::command(
    slash_command,
    prefix_command,
    rename = "channel",
    aliases("rchannel"),
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn ranks_channel(
    ctx: Ctx<'_>,
    #[description = "Channel"]
    #[channel_types("Text")]
    channel: Option<serenity::GuildChannel>,
) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    match channel {
        Some(ch) => {
            save_xp_channel_routed(&ctx.data().pool, &gid, &ch.id.get().to_string()).await?;
            let code =
                crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
            ctx.say(
                crate::lang::get(&code, "setxpchannels_command_work_enable")
                    .map(|s| s.replace("${argsid}", &ch.id.get().to_string()))
                    .unwrap_or_else(|| {
                        format!(
                            "You have successfully set the custom XP channel to <#{}>",
                            ch.id.get()
                        )
                    }),
            )
            .await?;
        }
        None => {
            clear_xp_channel_routed(&ctx.data().pool, &gid).await?;
            let code =
                crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
            ctx.say(
                crate::lang::get(&code, "setxpchannels_command_work_disable").unwrap_or_else(
                    || "You have successfully disabled the custom XP channel!".to_string(),
                ),
            )
            .await?;
        }
    }
    Ok(())
}

/// XP channel (TS single-string shape). Setting overwrites; omit to clear.
#[poise::command(slash_command, prefix_command, rename = "xp-channels")]
pub async fn ranks_xp_channels(
    ctx: Ctx<'_>,
    #[description = "Channel (omit to clear all)"]
    #[channel_types("Text")]
    channel: Option<serenity::GuildChannel>,
) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    match channel {
        Some(ch) => {
            save_xp_channel_routed(&ctx.data().pool, &gid, &ch.id.get().to_string()).await?;
            let code =
                crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
            ctx.say(
                crate::lang::get(&code, "setxpchannels_command_work_enable")
                    .map(|s| s.replace("${argsid}", &ch.id.get().to_string()))
                    .unwrap_or_else(|| {
                        format!(
                            "You have successfully set the custom XP channel to <#{}>",
                            ch.id.get()
                        )
                    }),
            )
            .await?;
        }
        None => {
            let _ = clear_xp_channel_routed(&ctx.data().pool, &gid).await;
            let code =
                crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
            ctx.say(
                crate::lang::get(&code, "setxpchannels_command_work_disable").unwrap_or_else(
                    || "You have successfully disabled the custom XP channel!".to_string(),
                ),
            )
            .await?;
        }
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::{clear_xp_channel_routed, load_xp_channel_routed, save_xp_channel_routed};

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
    async fn legacy_single_reads_and_promotes() {
        let pool = mem_pool().await;
        crate::db::kv_set(&pool, "g", "GUILD.RANKS.channel", "42")
            .await
            .unwrap();
        assert_eq!(
            load_xp_channel_routed(&pool, "g").await.as_deref(),
            Some("42")
        );
        assert_eq!(
            crate::db::kv_get(&pool, "g", "GUILD.XP_LEVELING.xpchannels")
                .await
                .as_deref(),
            Some("42")
        );
        assert_eq!(load_xp_channel_routed(&pool, "g9").await, None);
    }

    #[tokio::test]
    async fn legacy_list_contributes_first_entry() {
        let pool = mem_pool().await;
        crate::db::kv_set(&pool, "g", "GUILD.RANKS.xpChannels", r#"["7","8"]"#)
            .await
            .unwrap();
        assert_eq!(
            load_xp_channel_routed(&pool, "g").await.as_deref(),
            Some("7")
        );
    }

    #[tokio::test]
    async fn new_key_wins_over_legacy() {
        let pool = mem_pool().await;
        crate::db::kv_set(&pool, "g", "GUILD.RANKS.channel", "42")
            .await
            .unwrap();
        crate::db::kv_set(&pool, "g", "GUILD.XP_LEVELING.xpchannels", "99")
            .await
            .unwrap();
        assert_eq!(
            load_xp_channel_routed(&pool, "g").await.as_deref(),
            Some("99")
        );
    }

    #[tokio::test]
    async fn save_and_clear_cover_all_keys() {
        let pool = mem_pool().await;
        save_xp_channel_routed(&pool, "g", "42").await.unwrap();
        assert_eq!(
            crate::db::kv_get(&pool, "g", "GUILD.XP_LEVELING.xpchannels")
                .await
                .as_deref(),
            Some("42")
        );
        assert_eq!(
            crate::db::kv_get(&pool, "g", "GUILD.RANKS.channel")
                .await
                .as_deref(),
            Some("42")
        );
        assert!(clear_xp_channel_routed(&pool, "g").await.unwrap());
        assert_eq!(load_xp_channel_routed(&pool, "g").await, None);
        assert!(!clear_xp_channel_routed(&pool, "g").await.unwrap());
    }
}
