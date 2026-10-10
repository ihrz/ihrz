use super::*;

/// Anti-pub spam config (amount/type/state).
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
    #[description = "on or off"] action: Option<String>,
) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let raw = crate::db::tbl_get(&ctx.data().pool, &gid, "GUILD.PUNISH.PUNISH_PUB").await;
    let mut cfg: serde_json::Value = raw
        .and_then(|s| serde_json::from_str(&s).ok())
        .unwrap_or(serde_json::json!({}));
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    // TS validates the amount on the enable leg (`amount && action ==
    // "true"): over 50, negative, and zero each get their own reply.
    // (`== 0` is unreachable in TS since 0 is falsy there, but the key
    // exists for it, so the zero reply is kept.)
    let enabling = action
        .as_deref()
        .map(|a| a.trim().eq_ignore_ascii_case("on"))
        .unwrap_or(true);
    if let Some(a) = amount {
        if enabling {
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
        }
    }
    if let Some(a) = amount {
        cfg["amountMax"] = serde_json::Value::from(a.max(1) - 1);
    }
    if let Some(p) = punishment {
        cfg["punishementType"] = serde_json::Value::String(p.trim().to_string());
    }
    if let Some(a) = action {
        cfg["state"] = serde_json::Value::String(
            if a.trim().eq_ignore_ascii_case("on") {
                "true"
            } else {
                "false"
            }
            .to_string(),
        );
    }
    crate::db::tbl_set_json(&ctx.data().pool, &gid, "GUILD.PUNISH.PUNISH_PUB", &cfg).await?;
    ctx.say(
        crate::lang::get(&code, "msg_punishpub_updated")
            .unwrap_or_else(|| "Punishpub updated.".to_string()),
    )
    .await?;
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
