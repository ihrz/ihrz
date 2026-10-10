use super::*;

/// Routed per-user wipe: table doc first, then the legacy blob row plus
/// any leaf rows under it (TS deletes the whole `USER.<id>.ECONOMY`
/// subtree). Keys unchanged; legacy rows stay readable until cleared.
async fn clear_user_econ(
    pool: &crate::db::Pool,
    guild_id: &str,
    user_id: u64,
) -> anyhow::Result<()> {
    let _ = crate::commands::owner::main::tbl_del(pool, guild_id, &econ_key(user_id)).await;
    crate::db::kv_del_prefix(pool, guild_id, &econ_key(user_id)).await
}

/// Mirrors `!ureset.ts`.
#[poise::command(
    slash_command,
    prefix_command,
    rename = "ureset",
    aliases("economy-ureset"),
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn eco_ureset(
    ctx: Ctx<'_>,
    #[description = "Member"] user: Option<poise::serenity_prelude::User>,
) -> Result<(), anyhow::Error> {
    // NOTE: !ureset.ts has no disabled gate — none here either.
    // TS defaults to the invoker when no member is given.
    let target = user
        .as_ref()
        .map(|u| u.id.get())
        .unwrap_or_else(|| ctx.author().id.get());
    // Cancel replies with setjoinroles_action_canceled via
    // prompt_reset_confirm, like the TS else branch
    // (`economy/!ureset.ts:88-93`: interactionSend cancel text + components:[]).
    if !crate::commands::prompt_reset_confirm(
        &ctx,
        "reset_ueconomy_are_you_sure",
        "Delete all economy data for this user? This is irreversible.",
    )
    .await?
    {
        return Ok(());
    }
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    // Delete the blob row plus any leaf rows under it (TS deletes the
    // whole `USER.<id>.ECONOMY` subtree), in both stores, table-first.
    clear_user_econ(&ctx.data().pool, &gid, target).await?;
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    ctx.say(
        crate::lang::get(&code, "resetallinvites_succes_on_delete")
            .unwrap_or_else(|| "Successfully deleted!".to_string()),
    )
    .await?;
    let title = crate::commands::lang_for(
        &ctx,
        "reset_ueconomy_logs_embed_title",
        "Economy Module Logs (DANGEROUS ACTION)",
    )
    .await;
    let desc = crate::commands::lang_for(
        &ctx,
        "reset_ueconomy_logs_embed_desc",
        "${interaction.member.user.toString()} has deleted all economy module data for ${user.toString()}!",
    )
    .await
    .replace(
        "${interaction.member.user.toString()}",
        &user_mention(ctx.author().id.get()),
    )
    .replace("${user.toString()}", &user_mention(target));
    post_ihorizon_log(&ctx, &title, &desc).await;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::clear_user_econ;

    async fn mem_pool() -> crate::db::Pool {
        crate::db::memory_pool().await
    }

    #[tokio::test]
    async fn ureset_clears_both_stores_but_keeps_other_user_rows() {
        use crate::commands::economy::econ_key;
        use crate::commands::owner::main::{table_backend, tbl_get_value};
        let pool = mem_pool().await;
        crate::db::kv_set(&pool, "g", &econ_key(1), r#"{"money":5}"#)
            .await
            .unwrap();
        crate::db::kv_set(&pool, "g", "USER.1.WARNS", "[]")
            .await
            .unwrap();
        table_backend(&pool)
            .table("g")
            .set(&econ_key(1), serde_json::json!({"money": 7}))
            .await
            .unwrap();
        // Shared table USER root also holds a non-economy row.
        table_backend(&pool)
            .table("g")
            .set("USER.1.WARNS", serde_json::json!([]))
            .await
            .unwrap();
        // Other users are untouched.
        crate::db::kv_set(&pool, "g", &econ_key(2), r#"{"money":9}"#)
            .await
            .unwrap();
        clear_user_econ(&pool, "g", 1).await.unwrap();
        assert_eq!(crate::db::kv_get(&pool, "g", &econ_key(1)).await, None);
        assert!(tbl_get_value(&pool, "g", &econ_key(1)).await.is_none());
        // Unrelated rows survive in both stores.
        assert_eq!(
            crate::db::kv_get(&pool, "g", "USER.1.WARNS")
                .await
                .as_deref(),
            Some("[]")
        );
        assert_eq!(
            crate::db::kv_get(&pool, "g", &econ_key(2)).await.as_deref(),
            Some(r#"{"money":9}"#)
        );
        let root = tbl_get_value(&pool, "g", "USER").await.unwrap();
        assert!(root.get("1").and_then(|n| n.get("ECONOMY")).is_none());
        assert!(root.get("1").and_then(|n| n.get("WARNS")).is_some());
    }
}
