use super::*;

// Button custom ids. Mirror `!message.ts:104,108`.
#[allow(dead_code)]
pub const MSG_SET_ID: &str = "xpMessage-set-message";
#[allow(dead_code)]
pub const MSG_DEFAULT_ID: &str = "xpMessage-default-message";

/// Cap a level-up template at 1010 chars. Mirrors the TS modal
/// `maxLength: 1010` (`!message.ts:144`) and the
/// `xpMessage?.substring(0, 1010)` read guard (`!message.ts:63`).
pub fn truncate_xp_message(template: &str) -> String {
    template.chars().take(1010).collect()
}

/// Set or clear the custom level-up message.
#[poise::command(
    slash_command,
    prefix_command,
    rename = "message",
    aliases("msg"),
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn ranks_msg(
    ctx: Ctx<'_>,
    #[description = "Template (empty to clear)"] template: Option<String>,
) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    let author_id = ctx.author().id.get().to_string();
    let tick = crate::emojis::app_emoji_markup(ctx.http(), "GreenTick")
        .await
        .unwrap_or_else(|| "✅".to_string());
    // TS replies with `ranksSetMessage_command_work_on_enable` on both
    // the set and the reset flows (`!message.ts:181-187,214-221`).
    let reply = crate::lang::get(&code, "ranksSetMessage_command_work_on_enable")
        .map(|s| s.replace("${client.iHorizon_Emojis.GreenTick}", &tick))
        .unwrap_or_else(|| "Level-up message updated.".to_string());
    match template
        .map(|t| truncate_xp_message(t.trim()))
        .filter(|t| !t.is_empty())
    {
        Some(t) => {
            super::migrated_set(
                &ctx.data().pool,
                &gid,
                super::GUILD_MESSAGE_NEW,
                &[super::GUILD_MESSAGE_OLD],
                &t,
            )
            .await?;
            ctx.say(reply).await?;
            let title = crate::lang::get(&code, "ranksSetMessage_logs_embed_title_on_enable")
                .unwrap_or_else(|| "RanksSetMessage Logs.".to_string());
            let desc = crate::lang::get(&code, "ranksSetMessage_logs_embed_description_on_enable")
                .map(|s| s.replace("${interaction.user.id}", &author_id))
                .unwrap_or_else(|| "Ranks message set.".to_string());
            crate::commands::economy::post_ihorizon_log(&ctx, &title, &desc).await;
        }
        None => {
            super::migrated_del(
                &ctx.data().pool,
                &gid,
                super::GUILD_MESSAGE_NEW,
                &[super::GUILD_MESSAGE_OLD],
            )
            .await?;
            ctx.say(reply).await?;
            let title = crate::lang::get(&code, "ranksSetMessage_logs_embed_title_on_disable")
                .unwrap_or_else(|| "RanksSetMessage Logs.".to_string());
            let desc = crate::lang::get(&code, "ranksSetMessage_logs_embed_description_on_disable")
                .map(|s| s.replace("${interaction.user.id}", &author_id))
                .unwrap_or_else(|| "Ranks message deleted.".to_string());
            crate::commands::economy::post_ihorizon_log(&ctx, &title, &desc).await;
        }
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::truncate_xp_message;

    #[test]
    fn truncation_caps_at_1010_chars_like_ts_substring() {
        let long = "a".repeat(2000);
        assert_eq!(truncate_xp_message(&long).len(), 1010);
        assert_eq!(truncate_xp_message("hi"), "hi");
        let wide = "é".repeat(2000);
        assert_eq!(truncate_xp_message(&wide).chars().count(), 1010);
    }

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
    async fn message_key_roundtrips_through_both_stores() {
        use super::{GUILD_MESSAGE_NEW, GUILD_MESSAGE_OLD};
        use crate::commands::ranks::{migrated_del, migrated_get, migrated_set};
        let pool = mem_pool().await;
        assert_eq!(
            migrated_get(&pool, "g", GUILD_MESSAGE_NEW, &[GUILD_MESSAGE_OLD]).await,
            None
        );
        migrated_set(
            &pool,
            "g",
            GUILD_MESSAGE_NEW,
            &[GUILD_MESSAGE_OLD],
            "gg {user}",
        )
        .await
        .unwrap();
        assert_eq!(
            migrated_get(&pool, "g", GUILD_MESSAGE_NEW, &[GUILD_MESSAGE_OLD])
                .await
                .as_deref(),
            Some("gg {user}")
        );
        // Locked legacy readers still see the write.
        assert_eq!(
            crate::db::kv_get(&pool, "g", GUILD_MESSAGE_OLD)
                .await
                .as_deref(),
            Some("gg {user}")
        );
        assert!(
            migrated_del(&pool, "g", GUILD_MESSAGE_NEW, &[GUILD_MESSAGE_OLD])
                .await
                .unwrap()
        );
        assert_eq!(
            migrated_get(&pool, "g", GUILD_MESSAGE_NEW, &[GUILD_MESSAGE_OLD]).await,
            None
        );
        assert!(
            !migrated_del(&pool, "g", GUILD_MESSAGE_NEW, &[GUILD_MESSAGE_OLD])
                .await
                .unwrap()
        );
    }

    #[tokio::test]
    async fn legacy_message_key_reads_and_promotes() {
        use super::{GUILD_MESSAGE_NEW, GUILD_MESSAGE_OLD};
        use crate::commands::ranks::migrated_get;
        let pool = mem_pool().await;
        crate::db::kv_set(&pool, "g", GUILD_MESSAGE_OLD, "hi {user}")
            .await
            .unwrap();
        assert_eq!(
            migrated_get(&pool, "g", GUILD_MESSAGE_NEW, &[GUILD_MESSAGE_OLD])
                .await
                .as_deref(),
            Some("hi {user}")
        );
        assert_eq!(
            crate::db::kv_get(&pool, "g", GUILD_MESSAGE_NEW)
                .await
                .as_deref(),
            Some("hi {user}")
        );
    }
}
