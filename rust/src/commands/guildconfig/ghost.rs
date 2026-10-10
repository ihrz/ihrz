use super::*;
use poise::serenity_prelude as serenity;

/// Ghost-ping embed colour. Mirrors `!add.ts` / `!remove.ts`
/// (`.setColor("#475387")`).
pub const GHOST_COLOR: u32 = 0x475387;

/// Prune stored channel ids to live guild channels. Mirrors the TS
/// `allData?.filter((x) => guild?.channels.cache.get(x))` preload in
/// both `!add.ts` and `!remove.ts` (stale ids from deleted channels
/// never persist). Pure for testability.
pub fn prune_ghost_channels(
    stored: &[String],
    live: &std::collections::HashSet<String>,
) -> Vec<String> {
    stored
        .iter()
        .filter(|id| live.contains(*id))
        .cloned()
        .collect()
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum GhostAddOutcome {
    /// Channel was already watched (`joinghostping_add_already_set`).
    Duplicate,
    /// Channel appended; carries the pruned + extended list.
    Added(Vec<String>),
}

/// Add-apply over the pruned list. Pure for testability.
pub fn ghost_add_apply(pruned: &[String], channel_id: &str) -> GhostAddOutcome {
    if pruned.iter().any(|c| c == channel_id) {
        GhostAddOutcome::Duplicate
    } else {
        let mut next = pruned.to_vec();
        next.push(channel_id.to_string());
        GhostAddOutcome::Added(next)
    }
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum GhostRemoveOutcome {
    /// Channel was not watched (`joinghostping_remove_isnt_set`).
    Missing,
    /// Channel removed; carries the pruned + shrunk list.
    Removed(Vec<String>),
}

/// Remove-apply over the pruned list. Pure for testability.
pub fn ghost_remove_apply(pruned: &[String], channel_id: &str) -> GhostRemoveOutcome {
    if !pruned.iter().any(|c| c == channel_id) {
        GhostRemoveOutcome::Missing
    } else {
        GhostRemoveOutcome::Removed(
            pruned
                .iter()
                .filter(|c| c.as_str() != channel_id)
                .cloned()
                .collect(),
        )
    }
}

/// `<#id>` mention lines for the summary embed field.
pub fn ghost_mention_list(list: &[String]) -> String {
    list.iter()
        .map(|id| format!("<#{id}>"))
        .collect::<Vec<_>>()
        .join("\n")
}

/// Post one audit embed to the name-contains `ihorizon-logs` channel.
/// Mirrors `client.func.ihorizon_logs` (best-effort, silent when
/// missing), like the blockbot/tonew audit helpers.
async fn post_ghost_log(ctx: &Ctx<'_>, title: &str, description: &str) {
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
        .colour(GHOST_COLOR)
        .title(title.to_string())
        .description(description.to_string());
    let _ = poise::serenity_prelude::ChannelId::new(log_id)
        .send_message(ctx.http(), CreateMessage::new().embed(embed))
        .await;
}

/// Live text-channel ids of this guild (for pruning).
async fn live_channel_ids(ctx: &Ctx<'_>) -> std::collections::HashSet<String> {
    match ctx.guild_id() {
        Some(gid) => ctx
            .http()
            .get_channels(gid)
            .await
            .unwrap_or_default()
            .iter()
            .map(|c| c.id.get().to_string())
            .collect(),
        None => std::collections::HashSet::new(),
    }
}

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
    let pool = &ctx.data().pool;
    let code = crate::db::guild_lang(pool, ctx.guild_id().map(|g| g.get())).await;
    let t = |key: &str| crate::lang::get(&code, key).unwrap_or_default();
    let live = live_channel_ids(&ctx).await;
    let stored = load_ghost_routed(pool, &gid).await;
    let pruned = prune_ghost_channels(&stored, &live);
    let id = channel.id.get().to_string();
    // Duplicate reply first (TS `joinghostping_add_already_set`).
    if ghost_add_apply(&pruned, &id) == GhostAddOutcome::Duplicate {
        ctx.say(
            crate::lang::get(&code, "joinghostping_add_already_set")
                .map(|s| s.replace("${channel}", &channel.to_string()))
                .unwrap_or_else(|| format!("{} is already watched.", channel.to_string())),
        )
        .await?;
        return Ok(());
    }
    let GhostAddOutcome::Added(next) = ghost_add_apply(&pruned, &id) else {
        return Ok(());
    };
    crate::commands::owner::main::routed_set(
        pool,
        &gid,
        &gid,
        ghost_key(),
        &serde_json::to_string(&next)?,
    )
    .await?;
    // Channel ping (TS `(channel).send(joinghostping_add_sent_to_channel)`).
    let ping = crate::lang::get(&code, "joinghostping_add_sent_to_channel").unwrap_or_else(|| {
        "From now on, when a member joins the guild, I'll send a ghost message **here**."
            .to_string()
    });
    let _ = channel
        .id
        .send_message(ctx.http(), serenity::CreateMessage::new().content(ping))
        .await;
    // Audit entry (TS `ihorizon_logs` add title/desc).
    let author = ctx.author().to_string();
    post_ghost_log(
        &ctx,
        &t("joinghostping_add_logs_embed_title"),
        &t("joinghostping_add_logs_embed_desc")
            .replace("${interaction.user}", &author)
            .replace("${channel}", &channel.to_string()),
    )
    .await;
    // Summary embed (TS title/colour/desc + channel-lines field).
    let embed = serenity::CreateEmbed::default()
        .colour(GHOST_COLOR)
        .title(t("joinghostping_add_ok_embed_title"))
        .description(t("joinghostping_add_ok_embed_desc"))
        .field(
            t("joinghostping_add_ok_embed_fields_name"),
            ghost_mention_list(&next),
            false,
        );
    ctx.send(poise::CreateReply::default().embed(embed)).await?;
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
    let pool = &ctx.data().pool;
    let code = crate::db::guild_lang(pool, ctx.guild_id().map(|g| g.get())).await;
    let t = |key: &str| crate::lang::get(&code, key).unwrap_or_default();
    let live = live_channel_ids(&ctx).await;
    let stored = load_ghost_routed(pool, &gid).await;
    let pruned = prune_ghost_channels(&stored, &live);
    let id = channel.id.get().to_string();
    // Missing reply first (TS `joinghostping_remove_isnt_set`).
    let GhostRemoveOutcome::Removed(next) = ghost_remove_apply(&pruned, &id) else {
        ctx.say(
            crate::lang::get(&code, "joinghostping_remove_isnt_set")
                .map(|s| s.replace("${channel}", &channel.to_string()))
                .unwrap_or_else(|| format!("{} is not watched.", channel.to_string())),
        )
        .await?;
        return Ok(());
    };
    crate::commands::owner::main::routed_set(
        pool,
        &gid,
        &gid,
        ghost_key(),
        &serde_json::to_string(&next)?,
    )
    .await?;
    // Audit entry (TS `ihorizon_logs` add title + remove desc).
    let author = ctx.author().to_string();
    post_ghost_log(
        &ctx,
        &t("joinghostping_add_logs_embed_title"),
        &t("joinghostping_remove_logs_embed_desc")
            .replace("${interaction.user}", &author)
            .replace("${channel}", &channel.to_string()),
    )
    .await;
    // Summary embed (TS title/colour + remove desc; empty list shows
    // `var_no_set`, like the TS `all_channels.size > 0` branch).
    let value = if next.is_empty() {
        t("var_no_set")
    } else {
        ghost_mention_list(&next)
    };
    let embed = serenity::CreateEmbed::default()
        .colour(GHOST_COLOR)
        .title(t("joinghostping_add_ok_embed_title"))
        .description(t("joinghostping_remove_ok_embed_desc"))
        .field(t("joinghostping_add_ok_embed_fields_name"), value, false);
    ctx.send(poise::CreateReply::default().embed(embed)).await?;
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

    #[test]
    fn ghost_prune_dup_missing_and_mentions() {
        use std::collections::HashSet;
        let live: HashSet<String> = ["1".to_string(), "2".to_string()].into_iter().collect();
        // Stale ids drop out, order preserved.
        assert_eq!(
            prune_ghost_channels(&["1".to_string(), "9".to_string(), "2".to_string()], &live),
            vec!["1".to_string(), "2".to_string()]
        );
        // Duplicate add keeps the list untouched.
        assert_eq!(
            ghost_add_apply(&["1".to_string()], "1"),
            GhostAddOutcome::Duplicate
        );
        assert_eq!(
            ghost_add_apply(&["1".to_string()], "2"),
            GhostAddOutcome::Added(vec!["1".to_string(), "2".to_string()])
        );
        // Missing remove keeps the list untouched.
        assert_eq!(
            ghost_remove_apply(&["1".to_string()], "2"),
            GhostRemoveOutcome::Missing
        );
        assert_eq!(
            ghost_remove_apply(&["1".to_string(), "2".to_string()], "1"),
            GhostRemoveOutcome::Removed(vec!["2".to_string()])
        );
        assert_eq!(
            ghost_mention_list(&["1".to_string(), "2".to_string()]),
            "<#1>\n<#2>"
        );
        assert_eq!(GHOST_COLOR, 0x475387);
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
