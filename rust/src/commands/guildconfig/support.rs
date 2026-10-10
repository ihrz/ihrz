use super::*;
use poise::serenity_prelude as serenity;

/// Build the TS-shaped support blob (`{rolesId, state, type, input}`).
/// Mirrors `support.ts` on-path: `input` is forced to null for `tag`.
pub fn build_support_config(roles_id: &str, kind: &str, input: Option<&str>) -> serde_json::Value {
    serde_json::json!({
        "rolesId": roles_id,
        "state": "on",
        "type": kind,
        "input": if kind == "tag" { None } else { input },
    })
}

/// Interpret a stored `GUILD.SUPPORT` value. TS stores the full object
/// (on) and deletes the row on disable; pre-recode Rust rows (`"1"` /
/// legacy `{"state": ...}` objects) still count as on.
pub fn support_value_is_on(raw: Option<&str>) -> bool {
    match raw {
        None => false,
        Some("1") => true,
        Some("0") => false,
        Some(v) => match serde_json::from_str::<serde_json::Value>(v) {
            Ok(serde_json::Value::Object(map)) => {
                if let Some(state) = map.get("state").and_then(|s| s.as_str()) {
                    !matches!(
                        state.to_ascii_lowercase().as_str(),
                        "off" | "0" | "disable" | "disabled"
                    )
                } else {
                    // Legacy object row without a state field; the presence
                    // handler only needs `rolesId`, so count it as on.
                    true
                }
            }
            _ => v.trim_start().starts_with('{'),
        },
    }
}

fn guild_has_tags(ctx: &Ctx<'_>) -> bool {
    match ctx.guild() {
        Some(g) => g.features.iter().any(|f| f == "GUILD_TAGS"),
        // Uncached guild: cannot prove the feature is missing, so do not block.
        None => true,
    }
}

#[poise::command(
    slash_command,
    prefix_command,
    rename = "support",
    aliases("soutien"),
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn gc_support(
    ctx: Ctx<'_>,
    #[description = "on or off"] action: String,
    #[description = "bio or tag"] r#type: Option<String>,
    #[description = "The roles to give for our member"] roles: Option<serenity::Role>,
    #[description = "Choose the keywords wanted in the bio"] input: Option<String>,
) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    let guild_name = ctx.guild().map(|g| g.name.clone()).unwrap_or_default();
    let on = matches!(action.to_ascii_lowercase().as_str(), "on" | "power on");

    if on {
        let Some(role) = roles else {
            ctx.say(
                crate::lang::get(&code, "support_command_not_role")
                    .unwrap_or_else(|| ":x: | You have not specified the role!".to_string()),
            )
            .await?;
            return Ok(());
        };
        let kind = r#type.unwrap_or_default().to_ascii_lowercase();
        if !matches!(kind.as_str(), "bio" | "tag") {
            ctx.say(
                crate::lang::get(&code, "support_command_not_type").unwrap_or_else(|| {
                    ":x: | You did not specify the type of support!".to_string()
                }),
            )
            .await?;
            return Ok(());
        }
        if kind == "tag" && !guild_has_tags(&ctx) {
            ctx.say(
                crate::lang::get(&code, "support_command_guild_not_have_tag")
                    .unwrap_or_else(|| ":x: | The server currently has no tags.".to_string()),
            )
            .await?;
            return Ok(());
        }
        let config = build_support_config(&role.id.get().to_string(), &kind, input.as_deref());
        crate::commands::owner::main::routed_set(
            &ctx.data().pool,
            &gid,
            &gid,
            "GUILD.SUPPORT",
            &serde_json::to_string(&config)?,
        )
        .await?;
        if kind == "tag" {
            ctx.say(
                crate::lang::get(&code, "support_command_work_2")
                    .map(|s| {
                        s.replace("${interaction.guild.name}", &guild_name)
                            .replace("${roles.id}", &role.id.get().to_string())
                    })
                    .unwrap_or_else(|| "Support on.".to_string()),
            )
            .await?;
        } else {
            ctx.say(
                crate::lang::get(&code, "support_command_work")
                    .map(|s| {
                        s.replace("${interaction.guild.name}", &guild_name)
                            .replace("${input}", input.as_deref().unwrap_or_default())
                            .replace("${roles.id}", &role.id.get().to_string())
                    })
                    .unwrap_or_else(|| "Support on.".to_string()),
            )
            .await?;
        }
    } else {
        // Mirrors TS `client.db.delete`: disable removes the row, it never
        // writes "0" (a "0" string would stay truthy for TS readers).
        crate::commands::owner::main::routed_del(&ctx.data().pool, &gid, &gid, "GUILD.SUPPORT")
            .await?;
        ctx.say(
            crate::lang::get(&code, "support_command_work_on_disable")
                .map(|s| s.replace("${interaction.guild.name}", &guild_name))
                .unwrap_or_else(|| "You have set up the support module.".to_string()),
        )
        .await?;
    }
    Ok(())
}

/// Table-first support-module read with legacy fallback. Same key
/// (`GUILD.SUPPORT`): a full config object (or legacy `"1"` row) means
/// on, `"0"`/missing means off.
pub async fn support_enabled_routed(pool: &crate::db::Pool, gid: &str) -> bool {
    let raw = crate::commands::owner::main::routed_get(pool, gid, gid, "GUILD.SUPPORT").await;
    support_value_is_on(raw.as_deref())
}

#[cfg(test)]
mod tests {
    use super::*;

    async fn memory_pool() -> crate::db::Pool {
        crate::db::memory_pool().await
    }

    #[test]
    fn config_shape_matches_ts_and_forces_null_input_for_tag() {
        let bio = build_support_config("7", "bio", Some("ihrz"));
        assert_eq!(
            bio,
            serde_json::json!({"rolesId": "7", "state": "on", "type": "bio", "input": "ihrz"})
        );
        let tag = build_support_config("7", "tag", Some("ihrz"));
        assert_eq!(
            tag,
            serde_json::json!({"rolesId": "7", "state": "on", "type": "tag", "input": null})
        );
    }

    #[test]
    fn value_parsing_covers_object_and_legacy_rows() {
        assert!(support_value_is_on(Some(
            &serde_json::json!({"rolesId": "7", "state": "on", "type": "bio", "input": "x"})
                .to_string()
        )));
        assert!(!support_value_is_on(Some(
            &serde_json::json!({"rolesId": "7", "state": "off", "type": "bio"}).to_string()
        )));
        assert!(support_value_is_on(Some("1")));
        assert!(!support_value_is_on(Some("0")));
        assert!(!support_value_is_on(None));
    }

    #[tokio::test]
    async fn support_write_stores_full_object_in_both_stores() {
        let pool = memory_pool().await;
        let config =
            serde_json::to_string(&build_support_config("9", "bio", Some("ihrz"))).unwrap();
        crate::commands::owner::main::routed_set(&pool, "g1", "g1", "GUILD.SUPPORT", &config)
            .await
            .unwrap();
        let routed = crate::commands::owner::main::routed_get(&pool, "g1", "g1", "GUILD.SUPPORT")
            .await
            .unwrap();
        let doc: serde_json::Value = serde_json::from_str(&routed).unwrap();
        assert_eq!(doc.pointer("/rolesId").unwrap(), &serde_json::json!("9"));
        assert_eq!(doc.pointer("/type").unwrap(), &serde_json::json!("bio"));
        let legacy = crate::db::kv_get(&pool, "g1", "GUILD.SUPPORT")
            .await
            .unwrap();
        assert_eq!(
            serde_json::from_str::<serde_json::Value>(&legacy).unwrap(),
            serde_json::from_str::<serde_json::Value>(&config).unwrap()
        );
        assert!(support_enabled_routed(&pool, "g1").await);
        assert!(!support_enabled_routed(&pool, "g2").await);
    }

    #[tokio::test]
    async fn support_disable_deletes_instead_of_writing_zero() {
        let pool = memory_pool().await;
        let config = serde_json::to_string(&build_support_config("9", "tag", None)).unwrap();
        crate::commands::owner::main::routed_set(&pool, "g1", "g1", "GUILD.SUPPORT", &config)
            .await
            .unwrap();
        assert!(support_enabled_routed(&pool, "g1").await);
        crate::commands::owner::main::routed_del(&pool, "g1", "g1", "GUILD.SUPPORT")
            .await
            .unwrap();
        let legacy = crate::db::kv_get(&pool, "g1", "GUILD.SUPPORT").await;
        assert_eq!(legacy, None);
        assert!(!support_enabled_routed(&pool, "g1").await);
    }

    #[tokio::test]
    async fn support_read_falls_back_to_legacy_only_row() {
        let pool = memory_pool().await;
        crate::db::kv_set(&pool, "g1", "GUILD.SUPPORT", "0")
            .await
            .unwrap();
        assert!(!support_enabled_routed(&pool, "g1").await);
        crate::db::kv_set(
            &pool,
            "g2",
            "GUILD.SUPPORT",
            &serde_json::json!({"rolesId": "3", "state": "on", "type": "tag", "input": null})
                .to_string(),
        )
        .await
        .unwrap();
        assert!(support_enabled_routed(&pool, "g2").await);
    }
}
