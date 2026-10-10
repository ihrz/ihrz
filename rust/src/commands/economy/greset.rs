use super::*;

/// Routed guild wipe: legacy blob + leaf rows plus every table-nested
/// `USER.<uid>.ECONOMY` doc. The table `USER` root is shared with other
/// per-user rows (WARNS), so only the ECONOMY subtree is removed.
async fn clear_guild_econ(pool: &crate::db::Pool, guild_id: &str) -> anyhow::Result<()> {
    use crate::commands::owner::main::{tbl_del, tbl_get_value};
    // LIKE `USER.%.ECONOMY%` has a middle wildcard: scan the `USER.` rows
    // via the driver and delete the ECONOMY-subtree hits.
    for (k, _) in crate::db::kv_scan_prefix(pool, guild_id, "USER.").await {
        if k.contains(".ECONOMY") {
            crate::db::kv_del(pool, guild_id, &k).await?;
        }
    }
    if let Some(root) = tbl_get_value(pool, guild_id, "USER").await {
        if let Some(obj) = root.as_object() {
            let uids: Vec<String> = obj
                .iter()
                .filter(|(_, node)| node.get("ECONOMY").is_some())
                .map(|(uid, _)| uid.clone())
                .collect();
            for uid in uids {
                let _ = tbl_del(pool, guild_id, &format!("USER.{uid}.ECONOMY")).await;
            }
        }
    }
    Ok(())
}

/// Mirrors `!greset.ts`.
#[poise::command(
    slash_command,
    prefix_command,
    rename = "greset",
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn eco_greset(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    // NOTE: !greset.ts has no disabled gate — none here either.
    if !crate::commands::prompt_reset_confirm(
        &ctx,
        "reset_geconomy_are_you_sure",
        "Delete all economy data for ALL members? This is irreversible.",
    )
    .await?
    {
        return Ok(());
    }
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    clear_guild_econ(&ctx.data().pool, &gid).await?;
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    ctx.say(
        crate::lang::get(&code, "resetallinvites_succes_on_delete")
            .unwrap_or_else(|| "All economy reset.".to_string()),
    )
    .await?;
    let title = crate::commands::lang_for(
        &ctx,
        "reset_geconomy_logs_embed_title",
        "Economy Module Logs (VERY DANGEROUS ACTION)",
    )
    .await;
    let desc = crate::commands::lang_for(
        &ctx,
        "reset_geconomy_logs_embed_desc",
        "${interaction.member.user.toString()} has deleted all economy module data for **EVERYONE**!",
    )
    .await
    .replace(
        "${interaction.member.user.toString()}",
        &user_mention(ctx.author().id.get()),
    );
    post_ihorizon_log(&ctx, &title, &desc).await;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::clear_guild_econ;

    async fn mem_pool() -> crate::db::Pool {
        crate::db::memory_pool().await
    }

    #[tokio::test]
    async fn greset_clears_both_stores_but_keeps_other_user_rows() {
        use crate::commands::owner::main::{table_backend, tbl_get_value};
        let pool = mem_pool().await;
        crate::db::kv_set(&pool, "g", "USER.1.ECONOMY", r#"{"money":5}"#)
            .await
            .unwrap();
        crate::db::kv_set(&pool, "g", "USER.1.WARNS", "[]")
            .await
            .unwrap();
        table_backend(&pool)
            .table("g")
            .set("USER.2.ECONOMY", serde_json::json!({"money": 7}))
            .await
            .unwrap();
        // Shared table USER root also holds a non-economy row.
        table_backend(&pool)
            .table("g")
            .set("USER.2.WARNS", serde_json::json!([]))
            .await
            .unwrap();
        clear_guild_econ(&pool, "g").await.unwrap();
        assert_eq!(crate::db::kv_get(&pool, "g", "USER.1.ECONOMY").await, None);
        // Unrelated legacy rows survive.
        assert_eq!(
            crate::db::kv_get(&pool, "g", "USER.1.WARNS")
                .await
                .as_deref(),
            Some("[]")
        );
        let root = tbl_get_value(&pool, "g", "USER").await.unwrap();
        assert!(root.get("1").and_then(|n| n.get("ECONOMY")).is_none());
        assert!(root.get("2").and_then(|n| n.get("ECONOMY")).is_none());
        // Non-economy table rows survive.
        assert!(root.get("2").and_then(|n| n.get("WARNS")).is_some());
    }
}
