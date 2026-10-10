use super::*;

/// Anti-pub spam config (amount/type/state).
// Mirrors punishpub.ts: `status` is `"true"`/`"false"` on slash
// (`"on"`/`"off"` accepted as prefix aliases). The enable leg runs
// only when status is on AND an amount is given (TS
// `amount && action == "true"`): it validates, writes
// `{amountMax: amount - 1, punishementType, state: "true"}`, logs
// and confirms. Every other combination (off, or on without an
// amount) falls to the disable leg, which deletes the row.
#[poise::command(
    slash_command,
    prefix_command,
    category = "newfeatures",
    rename = "punishpub",
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn punishpub(
    ctx: Ctx<'_>,
    #[description = "Flags before sanction"] amount: Option<i64>,
    #[description = "ban, kick or mute"] punishment: Option<String>,
    #[description = "true or false (on/off accepted on prefix)"] action: Option<String>,
) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    let uid = ctx.author().id.get().to_string();
    // Slash choices send "true"/"false"; prefix users type "on"/"off".
    let on = matches!(
        action
            .as_deref()
            .map(|a| a.trim().to_ascii_lowercase())
            .as_deref(),
        Some("true") | Some("on")
    );
    // Enable leg (TS `amount && action == "true"`): amount present and
    // status on. Amount validation mirrors TS (over 50, negative and
    // zero each get their own reply; `== 0` is unreachable in TS
    // since 0 is falsy there, but the key exists, so it is kept).
    if on {
        if let Some(a) = amount {
            if a > 50 {
                ctx.say(
                    crate::lang::get(&code, "punishpub_too_hight_enable").unwrap_or_else(|| {
                        "The amount is too high! It's not recommended!".to_string()
                    }),
                )
                .await?;
                return Ok(());
            }
            if a < 0 {
                ctx.say(
                    crate::lang::get(&code, "punishpub_negative_number_enable")
                        .unwrap_or_else(|| "You can't enter a negative number!".to_string()),
                )
                .await?;
                return Ok(());
            }
            if a == 0 {
                ctx.say(
                    crate::lang::get(&code, "punishpub_zero_number_enable")
                        .unwrap_or_else(|| "The number 0 is not possible!".to_string()),
                )
                .await?;
                return Ok(());
            }
            let amount_s = a.to_string();
            // TS stores `punishementType: punishment` verbatim (possibly
            // undefined, which JSON drops); None omits the key here so
            // the reader default (`"ban"`) applies the same way.
            let kind_s = punishment.as_deref().map(|s| s.trim().to_string());
            let mut cfg = serde_json::json!({"amountMax": a - 1, "state": "true"});
            if let Some(k) = kind_s.clone() {
                cfg["punishementType"] = serde_json::Value::String(k);
            }
            crate::db::tbl_set_json(&ctx.data().pool, &gid, "GUILD.PUNISH.PUNISH_PUB", &cfg)
                .await?;
            let kind_tpl = kind_s.unwrap_or_else(|| "undefined".to_string());
            let log_title =
                crate::lang::get(&code, "punishpub_logs_embed_title").unwrap_or_default();
            let log_desc = crate::lang::get(&code, "punishpub_logs_embed_description")
                .unwrap_or_default()
                .replace("${interaction.user.id}", &uid)
                .replace("${amount}", &amount_s)
                .replace("${punishement}", &kind_tpl);
            crate::commands::economy::post_ihorizon_log(&ctx, &log_title, &log_desc).await;
            let confirm = crate::lang::get(&code, "punishpub_confirmation_message_enable")
                .unwrap_or_else(|| "Punishpub enabled.".to_string())
                .replace("${interaction.user.id}", &uid)
                .replace("${amount}", &amount_s)
                .replace("${punishement}", &kind_tpl);
            ctx.say(confirm).await?;
            return Ok(());
        }
    }
    // Disable leg (TS else branch: action off, or on without an
    // amount). The pub reader (`punish_pub_routed` in
    // events_handler.rs) loads exactly this `GUILD.PUNISH.PUNISH_PUB`
    // leaf, so deleting the row turns the pipeline off.
    crate::db::tbl_del(&ctx.data().pool, &gid, "GUILD.PUNISH.PUNISH_PUB").await?;
    ctx.say(
        crate::lang::get(&code, "punishpub_confirmation_disable")
            .unwrap_or_else(|| "Punishpub disabled.".to_string()),
    )
    .await?;
    let log_title =
        crate::lang::get(&code, "punishpub_logs_embed_title_disable").unwrap_or_default();
    let log_desc = crate::lang::get(&code, "punishpub_logs_embed_description_disable")
        .unwrap_or_default()
        .replace("${interaction.user.id}", &uid);
    crate::commands::economy::post_ihorizon_log(&ctx, &log_title, &log_desc).await;
    Ok(())
}

#[cfg(test)]
mod tests {
    async fn mem_pool() -> crate::db::Pool {
        crate::db::memory_pool().await
    }

    #[tokio::test]
    async fn punishpub_blob_reads_legacy_only_row() {
        let pool = mem_pool().await;
        crate::db::kv_set(
            &pool,
            "g",
            "GUILD.PUNISH.PUNISH_PUB",
            r#"{"amountMax":4,"punishementType":"mute","state":"true"}"#,
        )
        .await
        .unwrap();
        let raw = crate::db::tbl_get(&pool, "g", "GUILD.PUNISH.PUNISH_PUB")
            .await
            .expect("legacy row");
        let cfg: serde_json::Value = serde_json::from_str(&raw).unwrap();
        assert_eq!(cfg["amountMax"], 4);
        assert_eq!(cfg["state"], "true");
    }

    #[tokio::test]
    async fn punishpub_blob_dual_writes_table_and_legacy() {
        let pool = mem_pool().await;
        let cfg = serde_json::json!({"amountMax": 4, "punishementType": "mute", "state": "true"});
        crate::db::tbl_set_json(&pool, "g", "GUILD.PUNISH.PUNISH_PUB", &cfg)
            .await
            .unwrap();
        // Legacy kv row keeps the JSON text.
        let raw = crate::db::kv_get(&pool, "g", "GUILD.PUNISH.PUNISH_PUB")
            .await
            .expect("legacy row");
        let back: serde_json::Value = serde_json::from_str(&raw).unwrap();
        assert_eq!(back["amountMax"], 4);
        // Table-first read hits.
        let via_table = crate::db::tbl_get(&pool, "g", "GUILD.PUNISH.PUNISH_PUB")
            .await
            .expect("table row");
        let tv: serde_json::Value = serde_json::from_str(&via_table).unwrap();
        assert_eq!(tv["punishementType"], "mute");
    }
}
