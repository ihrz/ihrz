use super::*;

// Settings constraint (O6): the TS option offers `yes`/`no` choices
// (optional, absent -> `"None"`). Poise slash choices can't express
// the absent leg on one parameter, so free-text input outside the
// `yes`/`no` domain (prefix path, or any client bypassing choices)
// is coerced to `"None"`, keeping stored values in the TS domain
// {`yes`, `no`, `None`}.
/// Constrain a raw `settings` value to the TS choice domain.
/// `yes`/`no` (case-insensitive) pass through; anything else —
/// including absent — becomes `"None"`, mirroring
/// `getString("settings") || "None"` for the unconstrained path.
pub fn norm_rolesaver_settings(raw: Option<&str>) -> String {
    match raw.map(|s| s.trim().to_ascii_lowercase()) {
        Some(s) if s == "yes" => "yes".to_string(),
        Some(s) if s == "no" => "no".to_string(),
        _ => "None".to_string(),
    }
}
/// Rolesaver on/off switch (blob shape + embeds like
/// SlashCommands/newfeatures/rolesaver.ts).
#[poise::command(
    slash_command,
    prefix_command,
    category = "newfeatures",
    rename = "rolesaver",
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn rolesaver(
    ctx: Ctx<'_>,
    #[description = "on or off"] action: String,
    #[description = "Restore admin roles: yes or no"] settings: Option<String>,
) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    let t = |k: &str| crate::lang::get(&code, k).unwrap_or_default();
    let (footer_name, footer_bytes) = crate::commands::utils::footer_parts(&ctx, &gid).await;
    let mut embed = serenity::CreateEmbed::default().colour(serenity::Colour::new(0x3725a4));
    let mut reply = poise::CreateReply::default();
    // TS switches on exact `action === "on"` / `=== "off"` (slash
    // choices); any other value silently does nothing — no embed, no
    // store write.
    if action == "on" {
        let settings = norm_rolesaver_settings(settings.as_deref());
        let embed = serenity::CreateEmbed::default()
            .colour(serenity::Colour::new(0x3725a4))
            .title(t("rolesaver_embed_title"))
            .description(t("rolesaver_embed_desc"))
            .field(
                t("rolesaver_embed_fields_1_name"),
                format!("`{action}`"),
                false,
            )
            .field(
                t("rolesaver_embed_fields_2_name"),
                format!("`{settings}`"),
                false,
            )
            .field(t("rolesaver_embed_fields_3_name"), "`None`", false);
        let embed =
            crate::commands::utils::embed_with_footer(embed, &footer_name, footer_bytes.is_some());
        reply = reply.embed(embed);
        if let Some(bytes) = footer_bytes {
            reply = reply.attachment(serenity::CreateAttachment::bytes(bytes, "footer_icon.png"));
        }
        ctx.send(reply).await?;
        crate::db::tbl_set_json(
            &ctx.data().pool,
            &gid,
            "GUILD.GUILD_CONFIG.rolesaver",
            &serde_json::json!({
                "enable": true,
                "timeout": "None",
                "admin": settings,
            }),
        )
        .await?;
        return Ok(());
    }
    // TS `else if (action === "off")`: unknown actions return silently
    // above instead of running the off leg.
    if action != "off" {
        return Ok(());
    }
    if !load_rolesaver_cfg(&ctx.data().pool, &gid).await.enabled {
        ctx.say(t("rolesaver_on_off_already_set")).await?;
        return Ok(());
    }
    embed = embed
        .title(t("rolesaver_on_off_embed_title"))
        .description(t("rolesaver_on_off_embed_desc"))
        .field(
            t("rolesaver_on_off_embed_fields_1_name"),
            format!("`{action}`"),
            false,
        );
    let embed =
        crate::commands::utils::embed_with_footer(embed, &footer_name, footer_bytes.is_some());
    reply = reply.embed(embed);
    if let Some(bytes) = footer_bytes {
        reply = reply.attachment(serenity::CreateAttachment::bytes(bytes, "footer_icon.png"));
    }
    ctx.send(reply).await?;
    let _ = crate::db::tbl_del(&ctx.data().pool, &gid, "GUILD.GUILD_CONFIG.rolesaver").await;
    Ok(())
}

#[cfg(test)]
mod tests {
    async fn mem_pool() -> crate::db::Pool {
        crate::db::memory_pool().await
    }

    #[tokio::test]
    async fn rolesaver_on_off_roundtrip_through_loader() {
        let pool = mem_pool().await;
        // Off leg starts disabled (no rows).
        assert!(!super::super::load_rolesaver_cfg(&pool, "g").await.enabled);
        // On leg: structured dual write.
        crate::db::tbl_set_json(
            &pool,
            "g",
            "GUILD.GUILD_CONFIG.rolesaver",
            &serde_json::json!({"enable": true, "timeout": "None", "admin": "yes"}),
        )
        .await
        .unwrap();
        let cfg = super::super::load_rolesaver_cfg(&pool, "g").await;
        assert!(cfg.enabled);
        assert!(!cfg.skip_admin);
        // Off leg: routed delete clears both stores.
        crate::db::tbl_del(&pool, "g", "GUILD.GUILD_CONFIG.rolesaver")
            .await
            .unwrap();
        assert!(!super::super::load_rolesaver_cfg(&pool, "g").await.enabled);
        assert_eq!(
            crate::db::kv_get(&pool, "g", "GUILD.GUILD_CONFIG.rolesaver").await,
            None
        );
    }

    #[tokio::test]
    async fn rolesaver_admin_no_skips_admin() {
        let pool = mem_pool().await;
        crate::db::tbl_set_json(
            &pool,
            "g",
            "GUILD.GUILD_CONFIG.rolesaver",
            &serde_json::json!({"enable": true, "timeout": "None", "admin": "no"}),
        )
        .await
        .unwrap();
        let cfg = super::super::load_rolesaver_cfg(&pool, "g").await;
        assert!(cfg.enabled);
        assert!(cfg.skip_admin);
    }
}
