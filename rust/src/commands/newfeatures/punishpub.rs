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
    let raw = crate::db::kv_get(&ctx.data().pool, &gid, "GUILD.PUNISH.PUNISH_PUB").await;
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
    crate::db::kv_set(
        &ctx.data().pool,
        &gid,
        "GUILD.PUNISH.PUNISH_PUB",
        &cfg.to_string(),
    )
    .await?;
    ctx.say(
        crate::lang::get(&code, "msg_punishpub_updated")
            .unwrap_or_else(|| "Punishpub updated.".to_string()),
    )
    .await?;
    Ok(())
}
