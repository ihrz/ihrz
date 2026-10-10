use super::*;
use poise::serenity_prelude as serenity;

/// Table-first write of one flat ticket row (keys unchanged,
/// dual-write). Plain values (`open`) keep their legacy text shape in
/// both stores so kv-only readers (`load_ticket_entries`,
/// `find_ticket_by_channel`) stay fresh.
pub async fn ticket_put_routed(
    pool: &crate::db::Pool,
    gid: &str,
    user_id: u64,
    channel_id: u64,
    value: &str,
) -> anyhow::Result<()> {
    crate::commands::owner::main::routed_set(
        pool,
        gid,
        gid,
        &format!("TICKET_ALL.{user_id}.{channel_id}"),
        value,
    )
    .await
}

/// Table-first ticket scan (keys unchanged): the table `TICKET_ALL`
/// root expanded to flat `TICKET_ALL.<user>.<channel>` rows first,
/// then legacy-only kv rows (flat rows and nested
/// `TICKET_ALL.<uid>` objects pass through untouched). Table wins on
/// key conflicts, mirroring the ranks/economy board precedent.
pub async fn ticket_entries_routed(pool: &crate::db::Pool, gid: &str) -> Vec<(String, String)> {
    use crate::commands::owner::main::{legacy_scan, tbl_get_value};
    use std::collections::HashMap;
    let mut merged: HashMap<String, String> = HashMap::new();
    for (k, v) in legacy_scan(pool, gid, "TICKET_ALL.").await {
        merged.insert(k, v);
    }
    if let Some(root) = tbl_get_value(pool, gid, "TICKET_ALL").await {
        if let Some(obj) = root.as_object() {
            for (uid, node) in obj {
                if let Some(chans) = node.as_object() {
                    for (ch, doc) in chans {
                        let raw = match doc {
                            serde_json::Value::String(s) => s.clone(),
                            other => other.to_string(),
                        };
                        merged.insert(format!("TICKET_ALL.{uid}.{ch}"), raw);
                    }
                }
            }
        }
    }
    let mut out: Vec<(String, String)> = merged.into_iter().collect();
    out.sort_by(|a, b| a.0.cmp(&b.0));
    out
}

/// Routed per-user ticket wipe (keys unchanged): legacy flat rows plus
/// the nested `TICKET_ALL.<user>` object, and the table subtree.
pub async fn ticket_del_user_routed(pool: &crate::db::Pool, gid: &str, user_key: &str) {
    let _ = crate::commands::owner::main::legacy_del_prefix(
        pool,
        gid,
        &format!("TICKET_ALL.{user_key}."),
    )
    .await;
    let _ = crate::db::kv_del(pool, gid, &format!("TICKET_ALL.{user_key}")).await;
    let _ =
        crate::commands::owner::main::tbl_del(pool, gid, &format!("TICKET_ALL.{user_key}")).await;
}

/// Delete this ticket channel (TicketDelete pipeline).
#[poise::command(slash_command, prefix_command, rename = "delete", aliases("tdelete"))]
pub async fn ticket_delete(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    // Mirrors !delete.ts guards (disable + delete_not_in_ticket).
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let pool = &ctx.data().pool;
    let lang_code = crate::db::guild_lang(pool, ctx.guild_id().map(|g| g.get())).await;
    if ticket_guard_disabled(&ctx, pool, &gid, &lang_code, "ticket_disabled_command").await {
        return Ok(());
    }
    let channel_id = ctx.channel_id();
    if ticket_guard_in_ticket(
        &ctx,
        pool,
        &gid,
        &lang_code,
        channel_id,
        "delete_not_in_ticket",
    )
    .await
    {
        return Ok(());
    }
    let t = |k: &str| crate::lang::get(&lang_code, k).unwrap_or_default();
    let http = ctx.serenity_context().http.clone();
    let entries = ticket_entries_routed(pool, &gid).await;
    let (user_key, author) =
        find_ticket_by_channel(&entries, &channel_id.get().to_string()).unwrap_or_default();
    let owner_id: u64 = author.parse().unwrap_or(0);
    let deleter_id = ctx.author().id.get();
    // TS deletes the whole `TICKET_ALL.<user>` row up front.
    if !user_key.is_empty() {
        ticket_del_user_routed(pool, &gid, &user_key).await;
    }
    let channel_name = channel_id
        .name(&http)
        .await
        .unwrap_or_else(|_| "ticket".to_string());
    let Some(logs) = ticket_logs_channel(pool, &gid).await else {
        let _ = channel_id.delete(&http).await;
        return Ok(());
    };
    let (html, _count) = channel_transcript_html(&http, channel_id, false).await;
    let file_name = format!("{gid}-transcript.html");
    if owner_id != 0 && owner_id != deleter_id {
        let owner_mention = format!("<@{owner_id}>");
        let msg = t("ticket_deleted")
            .replace("${ticketOwnerMention}", &owner_mention)
            .replace("${deletedByUserId}", &deleter_id.to_string());
        let _ = dm_user(
            &http,
            owner_id,
            serenity::CreateMessage::new().content(msg).add_file(
                serenity::CreateAttachment::bytes(html.clone().into_bytes(), file_name.clone()),
            ),
        )
        .await;
    }
    let title = t("event_ticket_logsChannel_onDelete_embed_title");
    let desc = t("event_ticket_logsChannel_onDelete_embed_desc")
        .replace("${interaction.user}", &ctx.author().to_string())
        .replace("${interaction.channel.name}", &channel_name);
    let (footer_name, footer_icon) = ticket_footer(&http, pool, &gid).await;
    let embed = ticket_embed_footer(
        serenity::CreateEmbed::default()
            .colour(0x008000_u32)
            .title(title)
            .description(desc)
            .timestamp(serenity::Timestamp::now()),
        &footer_name,
        footer_icon.is_some(),
    );
    let _ = channel_id.delete(&http).await;
    // TS TicketDelete files order: footer attachment first, transcript
    // second (close flow is the reverse; see close.rs).
    let mut log_msg = serenity::CreateMessage::new().embed(embed);
    if let Some(icon) = footer_icon {
        log_msg = log_msg.add_file(serenity::CreateAttachment::bytes(icon, "footer_icon.png"));
    }
    log_msg = log_msg.add_file(serenity::CreateAttachment::bytes(
        html.into_bytes(),
        file_name,
    ));
    let _ = logs.send_message(&http, log_msg).await;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::{ticket_del_user_routed, ticket_entries_routed, ticket_put_routed};

    async fn mem_pool() -> crate::db::Pool {
        crate::db::memory_pool().await
    }

    #[tokio::test]
    async fn legacy_rows_surface_and_nested_shape_passes_through() {
        let pool = mem_pool().await;
        crate::db::kv_set(&pool, "g", "TICKET_ALL.1.2", "open")
            .await
            .unwrap();
        crate::db::kv_set(
            &pool,
            "g",
            "TICKET_ALL.7",
            r#"{"8":{"channel":"8","author":"7"}}"#,
        )
        .await
        .unwrap();
        let entries = ticket_entries_routed(&pool, "g").await;
        assert!(entries.contains(&("TICKET_ALL.1.2".to_string(), "open".to_string())));
        // Nested TS shape passes through untouched.
        assert!(entries.iter().any(|(k, _)| k == "TICKET_ALL.7"));
        assert!(ticket_entries_routed(&pool, "other").await.is_empty());
    }

    #[tokio::test]
    async fn table_row_merges_and_wins_on_conflict() {
        use crate::commands::owner::main::table_backend;
        let pool = mem_pool().await;
        crate::db::kv_set(&pool, "g", "TICKET_ALL.1.2", "open")
            .await
            .unwrap();
        table_backend(&pool)
            .table("g")
            .set("TICKET_ALL.3.4", serde_json::json!("open"))
            .await
            .unwrap();
        table_backend(&pool)
            .table("g")
            .set("TICKET_ALL.1.2", serde_json::json!("closed"))
            .await
            .unwrap();
        let entries = ticket_entries_routed(&pool, "g").await;
        assert!(entries.contains(&("TICKET_ALL.3.4".to_string(), "open".to_string())));
        // Table value wins on the conflicted key.
        assert!(entries.contains(&("TICKET_ALL.1.2".to_string(), "closed".to_string())));
        assert!(!entries
            .iter()
            .any(|(k, v)| k == "TICKET_ALL.1.2" && v == "open"));
    }

    #[tokio::test]
    async fn put_dual_writes_and_del_clears_both_stores() {
        use crate::commands::owner::main::tbl_get_value;
        let pool = mem_pool().await;
        ticket_put_routed(&pool, "g", 5, 6, "open").await.unwrap();
        // kv-only readers stay fresh.
        assert_eq!(
            crate::db::kv_get(&pool, "g", "TICKET_ALL.5.6")
                .await
                .as_deref(),
            Some("open")
        );
        assert!(tbl_get_value(&pool, "g", "TICKET_ALL.5.6").await.is_some());
        ticket_del_user_routed(&pool, "g", "5").await;
        assert_eq!(crate::db::kv_get(&pool, "g", "TICKET_ALL.5.6").await, None);
        assert!(tbl_get_value(&pool, "g", "TICKET_ALL.5").await.is_none());
    }
}
