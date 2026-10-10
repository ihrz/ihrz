use super::*;
use std::collections::BTreeSet;

/// Routed guild wipe: every `USER.<uid>.XP_LEVELING` row (table + legacy
/// kv, mirrors `!greset.ts:54-62` deleting one XP_LEVELING row per user)
/// plus the legacy `RANKS.<uid>` rows and the table `RANKS` root.
/// Unrelated `USER.*` rows (economy, stats) and guild config survive.
pub async fn clear_guild_ranks(pool: &crate::db::Pool, guild_id: &str) -> anyhow::Result<()> {
    use crate::commands::owner::main::{
        legacy_del_prefix, legacy_scan, routed_del, tbl_del, tbl_get_value,
    };
    let mut uids: BTreeSet<String> = BTreeSet::new();
    for (k, _) in legacy_scan(pool, guild_id, "USER.").await {
        if let Some(rest) = k.strip_prefix("USER.") {
            let uid = rest.split('.').next().unwrap_or("");
            if let Some(tail) = rest.strip_prefix(uid) {
                if (tail == ".XP_LEVELING" || tail.starts_with(".XP_LEVELING.")) && !uid.is_empty()
                {
                    uids.insert(uid.to_string());
                }
            }
        }
    }
    if let Some(root) = tbl_get_value(pool, guild_id, "USER").await {
        if let Some(obj) = root.as_object() {
            for (uid, node) in obj {
                if node.get("XP_LEVELING").is_some() {
                    uids.insert(uid.clone());
                }
            }
        }
    }
    for uid in &uids {
        let _ = routed_del(pool, guild_id, guild_id, &format!("USER.{uid}.XP_LEVELING")).await;
        // Stray leaf rows parked under the blob path.
        let _ = legacy_del_prefix(pool, guild_id, &format!("USER.{uid}.XP_LEVELING.")).await;
        let _ = routed_del(pool, guild_id, guild_id, &format!("RANKS.{uid}")).await;
    }
    legacy_del_prefix(pool, guild_id, "RANKS.").await?;
    let _ = tbl_del(pool, guild_id, "RANKS").await;
    Ok(())
}

/// Reset all guild ranks. Mirrors !greset.ts.
#[poise::command(
    slash_command,
    prefix_command,
    rename = "greset",
    aliases("ranks-greset"),
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn ranks_greset(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    if !crate::commands::prompt_reset_confirm(
        &ctx,
        "reset_uranks_are_you_sure",
        "**Are you really sure you want to delete all rank data?\nThis action is permanent and you cannot undo it.**\n**This action is destructive!!**",
    )
    .await?
    {
        return Ok(());
    }
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    clear_guild_ranks(&ctx.data().pool, &gid).await?;
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    ctx.say(
        crate::lang::get(&code, "resetallinvites_succes_on_delete")
            .unwrap_or_else(|| "Successfully deleted!".to_string()),
    )
    .await?;
    // Audit log (mirrors `!greset.ts:68-74`).
    let author_id = ctx.author().id.get().to_string();
    let title = crate::lang::get(&code, "reset_uranks_logs_embed_title")
        .unwrap_or_else(|| "Rank Module Logs (DANGEROUS ACTION)".to_string());
    let desc = crate::lang::get(&code, "resetallinvites_logs_embed_desc")
        .map(|s| {
            s.replace(
                "${interaction.member.user.toString()}",
                &format!("<@{author_id}>"),
            )
        })
        .unwrap_or_else(|| format!("Ranks reset by <@{author_id}>."));
    crate::commands::economy::post_ihorizon_log(&ctx, &title, &desc).await;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::clear_guild_ranks;

    async fn mem_pool() -> crate::db::Pool {
        crate::db::memory_pool().await
    }

    #[tokio::test]
    async fn greset_clears_legacy_and_table_roots() {
        use crate::commands::owner::main::{legacy_scan, table_backend, tbl_get_value};
        let pool = mem_pool().await;
        crate::db::kv_set(&pool, "g", "RANKS.1", r#"{"level":1}"#)
            .await
            .unwrap();
        table_backend(&pool)
            .table("g")
            .set("RANKS.2", serde_json::json!({"level": 3}))
            .await
            .unwrap();
        // Unrelated guild config survives the wipe.
        crate::db::kv_set(&pool, "g", "GUILD.RANKS.disable", "0")
            .await
            .unwrap();
        clear_guild_ranks(&pool, "g").await.unwrap();
        assert!(legacy_scan(&pool, "g", "RANKS.").await.is_empty());
        assert_eq!(tbl_get_value(&pool, "g", "RANKS").await, None);
        assert_eq!(
            crate::db::kv_get(&pool, "g", "GUILD.RANKS.disable")
                .await
                .as_deref(),
            Some("0")
        );
    }

    #[tokio::test]
    async fn greset_deletes_user_xp_rows_and_keeps_other_user_rows() {
        use crate::commands::owner::main::{legacy_scan, table_backend, tbl_get_value};
        let pool = mem_pool().await;
        // New-key + legacy user XP rows (both stores).
        crate::db::kv_set(
            &pool,
            "g",
            "USER.1.XP_LEVELING",
            r#"{"level":2,"xp":10,"xptotal":210}"#,
        )
        .await
        .unwrap();
        crate::db::kv_set(&pool, "g", "RANKS.1", r#"{"level":2}"#)
            .await
            .unwrap();
        table_backend(&pool)
            .table("g")
            .set(
                "USER.2.XP_LEVELING",
                serde_json::json!({"level": 1, "xp": 0, "xptotal": 100}),
            )
            .await
            .unwrap();
        // Unrelated USER rows survive.
        crate::db::kv_set(&pool, "g", "USER.1.ECONOMY.money", "50")
            .await
            .unwrap();
        table_backend(&pool)
            .table("g")
            .set("USER.3.ECONOMY", serde_json::json!({"money": 5}))
            .await
            .unwrap();
        clear_guild_ranks(&pool, "g").await.unwrap();
        assert!(legacy_scan(&pool, "g", "USER.")
            .await
            .iter()
            .all(|(k, _)| !k.contains("XP_LEVELING") && !k.starts_with("RANKS.")));
        assert_eq!(
            crate::db::kv_get(&pool, "g", "USER.1.ECONOMY.money")
                .await
                .as_deref(),
            Some("50")
        );
        // Table USER root keeps uid 3 but lost every XP_LEVELING node.
        let root = tbl_get_value(&pool, "g", "USER").await.unwrap();
        assert!(root.get("1").is_none() || root["1"].get("XP_LEVELING").is_none());
        assert!(root.get("2").is_none() || root["2"].get("XP_LEVELING").is_none());
        assert_eq!(root["3"]["ECONOMY"]["money"], 5);
        assert!(legacy_scan(&pool, "g", "RANKS.").await.is_empty());
    }
}
