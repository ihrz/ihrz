use super::*;
use poise::serenity_prelude as serenity;

/// Support action choice. Mirrors the `action` option `choices` in
/// support.ts:70-89: slash shows the localized display names, the
/// handler maps each variant back to the TS `value`.
#[derive(Debug, Clone, Copy, PartialEq, Eq, poise::ChoiceParameter)]
pub enum SupportAction {
    #[name = "on"]
    #[name_localized("en-US", "Power On")]
    #[name_localized("en-GB", "Power On")]
    #[name_localized("fr", "Activer")]
    #[name_localized("ja", "power_on")]
    #[name_localized("ru", "power_on")]
    #[name_localized("es-ES", "power_on")]
    On,
    #[name = "off"]
    #[name_localized("en-US", "Power Off")]
    #[name_localized("en-GB", "Power Off")]
    #[name_localized("fr", "Désactiver")]
    #[name_localized("ja", "power_off")]
    #[name_localized("ru", "power_off")]
    #[name_localized("es-ES", "power_off")]
    Off,
}

impl SupportAction {
    /// TS `value` compared (`action == "on"`).
    pub fn as_str(self) -> &'static str {
        match self {
            Self::On => "on",
            Self::Off => "off",
        }
    }
}

/// Support type choice. Mirrors the `type` option `choices` in
/// support.ts:107-130: slash shows the localized display names, the
/// handler maps each variant back to the TS `value`.
#[derive(Debug, Clone, Copy, PartialEq, Eq, poise::ChoiceParameter)]
pub enum SupportKind {
    #[name = "bio"]
    #[name_localized("en-US", "Something in the bio")]
    #[name_localized("en-GB", "Something in the bio")]
    #[name_localized("fr", "Quelques choses dans la bio")]
    #[name_localized("ja", "something_in_the_bio")]
    #[name_localized("ru", "something_in_the_bio")]
    #[name_localized("es-ES", "something_in_the_bio")]
    Bio,
    #[name = "tag"]
    #[name_localized("en-US", "The guild tag (Boost perks)")]
    #[name_localized("en-GB", "The guild tag (Boost perks)")]
    #[name_localized("fr", "Le tag du serveur sur sont profil (Activable via des boosts)")]
    #[name_localized("ja", "the_guild_tag_boost_perks")]
    #[name_localized("ru", "the_guild_tag_boost_perks")]
    #[name_localized("es-ES", "the_guild_tag_boost_perks")]
    Tag,
}

impl SupportKind {
    /// TS `value` stored in the support blob (`type`).
    pub fn as_str(self) -> &'static str {
        match self {
            Self::Bio => "bio",
            Self::Tag => "tag",
        }
    }
}

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

/// Give a roles when guild's member have something about your server on them bio!
#[poise::command(
    slash_command,
    prefix_command,
    category = "guildconfig",
    rename = "support",
    aliases("soutien"),
    default_member_permissions = "ADMINISTRATOR",
    name_localized("fr", "soutien"),
    name_localized("ja", "support"),
    name_localized("ru", "support"),
    name_localized("es-ES", "support"),
    description_localized("fr", "Donnez un rôle lorsque les membres de la guilde ont quelque chose sur votre serveur dans leur bio"),
    description_localized("ja", "サーバーメンバーの自己紹介にサーバーに関する情報がある場合にロールを付与！"),
    description_localized("ru", "Выдать роли, если у участника в описании есть информация о сервере!"),
    description_localized("es-ES", "Dar roles cuando el miembro del servidor tiene algo sobre tu servidor en su biografía!"),
)]
pub async fn gc_support(
    ctx: Ctx<'_>,
    #[description = "on or off"] action: SupportAction,
    #[description = "bio or tag"] r#type: Option<SupportKind>,
    #[description = "The roles to give for our member"] roles: Option<serenity::Role>,
    #[description = "Choose the keywords wanted in the bio"] input: Option<String>,
) -> Result<(), anyhow::Error> {
    // Mirrors the TS guard (`!interaction.guild` -> silent return).
    let Some(guild_id) = ctx.guild_id() else {
        return Ok(());
    };
    let gid = guild_id.get().to_string();
    // Ack-first: write + reply run past the 3s slash window.
    ctx.defer().await?;
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    let guild_name = ctx.guild().map(|g| g.name.clone()).unwrap_or_default();
    // Mirrors `support.ts` (`if (action == "on")`): the match is exact.
    // Anything else (including `power on` or case variants) disables
    // via row DELETE below — no case-fold, no extra spellings.
    let action = action.as_str();
    let on = action == "on";

    if on {
        let Some(role) = roles else {
            ctx.say(
                crate::lang::get(&code, "support_command_not_role")
                    .unwrap_or_else(|| ":x: | You have not specified the role!".to_string()),
            )
            .await?;
            return Ok(());
        };
        // Missing/empty type answers `support_command_not_type` like
        // the TS `if (!type)` guard; a present type is stored verbatim
        // (`type: type || "tag"`) — no bio/tag allowlist rejection.
        let kind = r#type.map(|k| k.as_str()).unwrap_or_default();
        if kind.is_empty() {
            ctx.say(crate::lang::get(&code, "support_command_not_type").unwrap_or_else(|| {
                    ":x: | You did not specify the type of support you want in the user profile (bio = the bio, e.g. server link; tag = the server’s Discord tag)!".to_string()
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
            // TS `support.ts:251`: `.replace("${input}", input!)` — a
            // missing bio input is null at runtime, which JS coerces to
            // the literal "null" (never "").
            ctx.say(
                crate::lang::get(&code, "support_command_work")
                    .map(|s| {
                        s.replace("${interaction.guild.name}", &guild_name)
                            .replace("${input}", input.as_deref().unwrap_or("null"))
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

    #[test]
    fn support_choices_mirror_ts_names_values_and_locales() {
        use poise::ChoiceParameter as _;
        let names: Vec<_> = SupportAction::list().into_iter().map(|c| c.name).collect();
        assert_eq!(names, vec!["on".to_string(), "off".to_string()]);
        assert_eq!(SupportAction::On.as_str(), "on");
        assert_eq!(SupportAction::Off.as_str(), "off");
        assert_eq!(SupportAction::from_name("on"), Some(SupportAction::On));
        assert_eq!(SupportAction::from_name("off"), Some(SupportAction::Off));
        assert_eq!(SupportAction::from_name("maybe"), None);
        assert_eq!(SupportAction::from_index(1), Some(SupportAction::Off));
        let kinds: Vec<_> = SupportKind::list().into_iter().map(|c| c.name).collect();
        assert_eq!(kinds, vec!["bio".to_string(), "tag".to_string()]);
        assert_eq!(SupportKind::Bio.as_str(), "bio");
        assert_eq!(SupportKind::Tag.as_str(), "tag");
        assert_eq!(SupportKind::from_name("tag"), Some(SupportKind::Tag));
        assert_eq!(SupportKind::from_name("bio"), Some(SupportKind::Bio));
        assert_eq!(SupportKind::from_name("other"), None);
        assert_eq!(SupportKind::from_index(0), Some(SupportKind::Bio));
        let list = SupportAction::list();
        assert_eq!(
            list[0].localizations.get("fr").map(String::as_str),
            Some("Activer")
        );
        let kinds = SupportKind::list();
        assert_eq!(
            kinds[0].localizations.get("fr").map(String::as_str),
            Some("Quelques choses dans la bio")
        );
        assert_eq!(
            kinds[1].localizations.get("fr").map(String::as_str),
            Some("Le tag du serveur sur sont profil (Activable via des boosts)")
        );
        assert_eq!(
            SupportKind::Tag.localized_name("ja"),
            Some("the_guild_tag_boost_perks")
        );
    }

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
    #[test]
    fn support_registers_name_and_description_localizations() {
        let cmd = super::gc_support();
        assert_eq!(
            cmd.name_localizations.get("fr").map(String::as_str),
            Some("soutien")
        );
        assert_eq!(
            cmd.name_localizations.get("ja").map(String::as_str),
            Some("support")
        );
        assert_eq!(
            cmd.name_localizations.get("ru").map(String::as_str),
            Some("support")
        );
        assert_eq!(
            cmd.name_localizations.get("es-ES").map(String::as_str),
            Some("support")
        );
        assert_eq!(cmd.description_localizations.get("fr").map(String::as_str), Some("Donnez un rôle lorsque les membres de la guilde ont quelque chose sur votre serveur dans leur bio"));
        assert_eq!(
            cmd.description_localizations.get("ja").map(String::as_str),
            Some("サーバーメンバーの自己紹介にサーバーに関する情報がある場合にロールを付与！")
        );
        assert_eq!(
            cmd.description_localizations.get("ru").map(String::as_str),
            Some("Выдать роли, если у участника в описании есть информация о сервере!")
        );
        assert_eq!(cmd.description_localizations.get("es-ES").map(String::as_str), Some("Dar roles cuando el miembro del servidor tiene algo sobre tu servidor en su biografía!"));
    }
}
