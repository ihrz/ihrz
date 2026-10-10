use super::*;

/// True when a stored GUILD.BLOCK_BOT value means "enabled". Accepts
/// the Rust `"1"` form and the TS legacy boolean form (`db.set(...,
/// true)` serializes to `"true"`); a deleted key (`None`) and any
/// other value (`"0"`, `"false"`) mean disabled, matching the TS
/// `data === true` gate plus the `db.delete` off path in !bot.ts.
pub fn blockbot_enabled_value(raw: Option<&str>) -> bool {
    matches!(
        raw.map(|s| s.trim().to_ascii_lowercase()).as_deref(),
        Some("1") | Some("true")
    )
}

/// Post one #bf0bb9 embed to the name-contains `ihorizon-logs`
/// channel. Mirrors `client.func.ihorizon_logs` (best-effort, silent
/// when missing).
async fn post_blockbot_log(ctx: &Ctx<'_>, title: &str, description: &str) {
    use poise::serenity_prelude::{CreateEmbed, CreateMessage};
    let Some(guild_id) = ctx.guild_id() else {
        return;
    };
    let Ok(channels) = ctx.http().get_channels(guild_id).await else {
        return;
    };
    let list: Vec<(u64, String)> = channels
        .iter()
        .map(|c| (c.id.get(), c.name.clone()))
        .collect();
    let Some(log_id) = crate::funcs::logs_channel_id(&list) else {
        return;
    };
    let embed = CreateEmbed::default()
        .colour(0xBF0BB9)
        .title(title.to_string())
        .description(description.to_string());
    let _ = poise::serenity_prelude::ChannelId::new(log_id)
        .send_message(ctx.http(), CreateMessage::new().embed(embed))
        .await;
}

/// Block bot joins. Mirrors blockBot config (GUILD.BLOCK_BOT).
///
/// Guild-owner-only, like !bot.ts (`interaction.user.id !==
/// interaction.guild.ownerId` -> `blockbot_not_owner`). Enable writes
/// the flag, disable deletes it (TS `db.delete`); both transitions
/// post an ihorizon-logs audit entry.
#[poise::command(
    slash_command,
    prefix_command,
    rename = "blockbot",
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn gc_blockbot(
    ctx: Ctx<'_>,
    #[description = "on or off"] action: String,
) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let pool = &ctx.data().pool;
    let code = crate::db::guild_lang(pool, ctx.guild_id().map(|g| g.get())).await;
    // Owner gate. Mirrors `interaction.user.id !== ownerId` in !bot.ts.
    let is_owner = ctx
        .guild()
        .map(|g| g.owner_id.get() == ctx.author().id.get())
        .unwrap_or(false);
    if !is_owner {
        ctx.say(
            crate::lang::get(&code, "blockbot_not_owner")
                .unwrap_or_else(|| ":x: **You are not the Owner of the server!**".to_string()),
        )
        .await?;
        return Ok(());
    }
    let author_mention = ctx.author().to_string();
    let enabled = matches!(action.to_ascii_lowercase().as_str(), "on" | "power on");
    if enabled {
        let title = crate::lang::get(&code, "blockbot_logs_enable_title")
            .unwrap_or_else(|| "BlockBot Logs".to_string());
        let desc = crate::lang::get(&code, "blockbot_logs_enable_description")
            .map(|s| s.replace("${interaction.user}", &author_mention))
            .unwrap_or_else(|| {
                format!("{author_mention} (The owner of the server) __enabled__ `BlockBot`. Now bots **can't** be added to this guild!")
            });
        post_blockbot_log(&ctx, &title, &desc).await;
        crate::db::tbl_set(pool, &gid, "GUILD.BLOCK_BOT", "1").await?;
    } else {
        let title = crate::lang::get(&code, "blockbot_logs_disable_commmand_work")
            .unwrap_or_else(|| "BlockBot Log".to_string());
        let desc = crate::lang::get(&code, "blockbot_logs_disable_description")
            .map(|s| s.replace("${interaction.user}", &author_mention))
            .unwrap_or_else(|| {
                format!("{author_mention} (The owner of the server) __disabled__ `BlockBot`. Now bots **can** be added to this guild!")
            });
        post_blockbot_log(&ctx, &title, &desc).await;
        // TS deletes the key on disable; the reader treats a missing
        // key as disabled.
        let _ = crate::db::tbl_del(pool, &gid, "GUILD.BLOCK_BOT").await;
    }
    ctx.say(if enabled {
        crate::lang::get(&code, "blockbot_command_work_on_enable").unwrap_or_else(|| {
            "**You have enabled the `BlockBot`**\nNow bots **can't** be added to this guild!"
                .to_string()
        })
    } else {
        crate::lang::get(&code, "blockbot_command_work_on_disable").unwrap_or_else(|| {
            "**You have disabled the `BlockBot`**\nNow bots **can** be added to this guild!"
                .to_string()
        })
    })
    .await?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn reader_accepts_rust_one_and_ts_boolean_shapes() {
        // Rust enable write.
        assert!(blockbot_enabled_value(Some("1")));
        // TS `db.set(..., true)` boolean write.
        assert!(blockbot_enabled_value(Some("true")));
        assert!(blockbot_enabled_value(Some("TRUE")));
        assert!(blockbot_enabled_value(Some(" 1 ")));
        // TS `db.delete` off path (missing key) and falsy writes.
        assert!(!blockbot_enabled_value(None));
        assert!(!blockbot_enabled_value(Some("0")));
        assert!(!blockbot_enabled_value(Some("false")));
        assert!(!blockbot_enabled_value(Some("bogus")));
        assert!(!blockbot_enabled_value(Some("")));
    }

    async fn memory_pool() -> crate::db::Pool {
        crate::db::memory_pool().await
    }

    #[tokio::test]
    async fn block_bot_flag_dual_writes_table_and_legacy() {
        let pool = memory_pool().await;
        crate::db::tbl_set(&pool, "g1", "GUILD.BLOCK_BOT", "1")
            .await
            .unwrap();
        let raw = crate::db::tbl_get(&pool, "g1", "GUILD.BLOCK_BOT").await;
        assert!(blockbot_enabled_value(raw.as_deref()));
        // Legacy flat row stays fresh for unmigrated kv readers.
        assert_eq!(
            crate::db::kv_get(&pool, "g1", "GUILD.BLOCK_BOT")
                .await
                .as_deref(),
            Some("1")
        );
        crate::db::tbl_del(&pool, "g1", "GUILD.BLOCK_BOT")
            .await
            .unwrap();
        let raw = crate::db::tbl_get(&pool, "g1", "GUILD.BLOCK_BOT").await;
        assert!(!blockbot_enabled_value(raw.as_deref()));
        assert!(crate::db::kv_get(&pool, "g1", "GUILD.BLOCK_BOT")
            .await
            .is_none());
    }

    #[tokio::test]
    async fn block_bot_read_falls_back_to_legacy_only_row() {
        let pool = memory_pool().await;
        crate::db::kv_set(&pool, "g1", "GUILD.BLOCK_BOT", "1")
            .await
            .unwrap();
        let raw = crate::db::tbl_get(&pool, "g1", "GUILD.BLOCK_BOT").await;
        assert!(blockbot_enabled_value(raw.as_deref()));
    }
}
