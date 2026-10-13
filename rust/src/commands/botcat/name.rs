use super::*;

/// JS `String.length` counts UTF-16 code units, so `!name.ts` rejects at
/// `name.length >= 32` units. `encode_utf16().count()` is the matching
/// Rust measure: identical to `chars().count()` for BMP text, but astral
/// characters (e.g. emoji) count 2, like in JS. (The shared
/// `footer_name_too_long` helper in mod.rs counts chars; it agrees for
/// BMP but under-counts astral-plane names, hence the local check.)
pub fn footer_name_too_long_utf16(name: &str) -> bool {
    name.encode_utf16().count() >= 32
}

/// TS `!name.ts` branch decision, kept as a pure pin site: `action ===
/// "reset"` is a strict comparison — no trim, no case fold. The poise
/// `CustomNameAction` feed only ever yields `"reset"` / `"set"`, so this
/// is the Reset-variant check spelled exactly like the TS source.
pub fn name_branch_is_reset(action: &str) -> bool {
    action == "reset"
}

/// TS `else if (name)` truthiness: any non-empty string — including
/// whitespace-only — is stored verbatim; only `""` / missing fall
/// through to the not_found reply. (JS truthy string ⟺ non-empty.)
pub fn stored_bot_name(name: Option<String>) -> Option<String> {
    name.filter(|n| !n.is_empty())
}

/// Name action choice. Mirrors the `action` option `choices` in
/// custom.ts:67-82: slash shows the localized display names, the
/// handler maps each variant back to the TS `value`.
#[derive(Debug, Clone, Copy, PartialEq, Eq, poise::ChoiceParameter)]
pub enum CustomNameAction {
    #[name = "Default Bot Name"]
    #[name_localized("fr", "Reprendre le nom par défaut du bot")]
    #[name_localized("ja", "ボットのデフォルトの名前に戻す")]
    #[name_localized("ru", "Восстановить имя бота по умолчанию")]
    #[name_localized("es-ES", "Restablecer el nombre predeterminado del bot")]
    #[name = "reset"]
    Reset,
    #[name = "Set one"]
    #[name_localized("fr", "Définir un nom")]
    #[name_localized("ja", "名前を設定")]
    #[name_localized("ru", "Задать имя")]
    #[name_localized("es-ES", "Establecer un nombre")]
    #[name = "set"]
    Set,
}

impl CustomNameAction {
    /// TS `value` (`reset` / `set`).
    pub fn as_str(self) -> &'static str {
        match self {
            Self::Reset => "reset",
            Self::Set => "set",
        }
    }
}

/// Change the iHorizon name into the server
#[poise::command(
    slash_command,
    prefix_command,
    rename = "name",
    aliases("botname", "setname", "setbotname"),
    default_member_permissions = "ADMINISTRATOR",
    description_localized("fr", "Définir le nom du bot sur le serveur"),
    description_localized("ja", "サーバーのiHorizonの名前を変更"),
    description_localized("ru", "Изменить имя iHorizon на сервере"),
    description_localized("es-ES", "Cambiar el nombre de iHorizon en el servidor")
)]
pub async fn custom_name(
    ctx: Ctx<'_>,
    #[description = "What do you want to do ?"]
    #[description_localized("fr", "Que voulez-vous faire ?")]
    #[description_localized("ja", "何をしたいですか？")]
    #[description_localized("ru", "Что вы хотите сделать?")]
    #[description_localized("es-ES", "¿Qué quieres hacer?")]
    action: CustomNameAction,
    #[description = "The name"]
    #[description_localized("fr", "Le nom du bot")]
    #[description_localized("ja", "名前")]
    #[description_localized("ru", "Имя")]
    #[description_localized("es-ES", "El nombre")]
    name: Option<String>,
) -> Result<(), anyhow::Error> {
    let action = action.as_str();
    let Some(guild_id) = ctx.guild_id() else {
        let glang = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
        ctx.say(
            crate::lang::get(&glang, "msg_this_command_must_be_used_in_a_server")
                .unwrap_or_else(|| "This command must be used in a server.".to_string()),
        )
        .await?;
        return Ok(());
    };
    let gid = guild_id.get().to_string();
    let pool = &ctx.data().pool;
    if name_branch_is_reset(action) {
        crate::db::tbl_del(pool, &gid, BOT_NAME_KEY).await?;
        // TS replies first, then restores the display name (banner.rs
        // follows the same reply-then-patch order for its reset).
        let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
        ctx.say(crate::lang::get(&code, "custom_name_reset")
                .unwrap_or_else(|| "You have decided to reset the bot's name on the server. Embed footers will return to their default state, as well as the bot's name on the server.".to_string()),
        )
        .await?;
        let fallback = ctx.cache().current_user().display_name().to_string();
        if let Some(token) = crate::config::bot_token() {
            patch_guild_me(
                &token,
                guild_id.get(),
                serde_json::json!({ "nick": fallback }),
            )
            .await;
        }
        return Ok(());
    }
    let Some(name) = stored_bot_name(name) else {
        let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
        ctx.say(
            crate::lang::get(&code, "guildconfig_setbot_footername_not_found")
                .unwrap_or_else(|| "The footer name is not found. Please try again!".to_string()),
        )
        .await?;
        return Ok(());
    };
    if footer_name_too_long_utf16(&name) {
        let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
        ctx.say(
            crate::lang::get(&code, "guildconfig_setbot_footername_footer_too_long_msg")
                .unwrap_or_else(|| {
                    "The bot footer is too long, it will be too ugly to display.".to_string()
                }),
        )
        .await?;
        return Ok(());
    }
    crate::db::tbl_set(pool, &gid, BOT_NAME_KEY, &name).await?;
    if let Some(token) = crate::config::bot_token() {
        patch_guild_me(&token, guild_id.get(), serde_json::json!({ "nick": name })).await;
    }
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    let yes = crate::emojis::app_emoji_markup(&ctx.serenity_context().http, "Yes")
        .await
        .unwrap_or_else(|| "✅".to_string());
    let crown = crate::emojis::app_emoji_markup(&ctx.serenity_context().http, "Crown")
        .await
        .unwrap_or_else(|| "👑".to_string());
    ctx.say(crate::lang::get(&code, "custom_name_set")
            .map(|s| {
                s.replace("${client.iHorizon_Emojis.Yes}", &yes)
                    .replace("${client.iHorizon_Emojis.Crown}", &crown)
                    .replace("${name}", &name)
            })
            .unwrap_or_else(|| {
                format!(
                    "{yes} **You have decided to change the bot's name on the server. Embed footers are now modified, as well as the bot's name on the server.**\n{crown} New value: `{name}`"
                )
            }),
    )
    .await?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn name_action_choices_mirror_ts_names_values_and_locales() {
        use poise::ChoiceParameter as _;
        let names: Vec<_> = CustomNameAction::list()
            .into_iter()
            .map(|c| c.name)
            .collect();
        assert_eq!(
            names,
            vec!["Default Bot Name".to_string(), "Set one".to_string()]
        );
        assert_eq!(CustomNameAction::Reset.as_str(), "reset");
        assert_eq!(CustomNameAction::Set.as_str(), "set");
        assert_eq!(
            CustomNameAction::from_name("reset"),
            Some(CustomNameAction::Reset)
        );
        assert_eq!(
            CustomNameAction::from_name("SET"),
            Some(CustomNameAction::Set)
        );
        assert_eq!(CustomNameAction::from_name("other"), None);
        assert_eq!(
            CustomNameAction::from_index(0),
            Some(CustomNameAction::Reset)
        );
        assert_eq!(CustomNameAction::from_index(1), Some(CustomNameAction::Set));
        let list = CustomNameAction::list();
        assert_eq!(
            list[0].localizations.get("fr").map(String::as_str),
            Some("Reprendre le nom par défaut du bot")
        );
        assert_eq!(
            list[1].localizations.get("fr").map(String::as_str),
            Some("Définir un nom")
        );
        assert_eq!(
            list[0].localizations.get("ja").map(String::as_str),
            Some("ボットのデフォルトの名前に戻す")
        );
        assert_eq!(
            list[1].localizations.get("es-ES").map(String::as_str),
            Some("Establecer un nombre")
        );
    }

    #[test]
    fn name_branch_and_store_match_ts_strictness() {
        // `action === "reset"`: strict, no trim, no case fold.
        assert!(name_branch_is_reset("reset"));
        assert!(!name_branch_is_reset("Reset"));
        assert!(!name_branch_is_reset("RESET"));
        assert!(!name_branch_is_reset(" reset"));
        assert!(!name_branch_is_reset("reset "));
        assert!(!name_branch_is_reset("set"));
        assert!(!name_branch_is_reset(""));
        // `else if (name)` truthiness: only ""/missing fall through;
        // whitespace-only and padded names store verbatim.
        assert_eq!(
            stored_bot_name(Some("  ".to_string())),
            Some("  ".to_string())
        );
        assert_eq!(
            stored_bot_name(Some(" Bob ".to_string())),
            Some(" Bob ".to_string())
        );
        assert_eq!(
            stored_bot_name(Some("Bob".to_string())),
            Some("Bob".to_string())
        );
        assert_eq!(stored_bot_name(Some(String::new())), None);
        assert_eq!(stored_bot_name(None), None);
    }

    #[test]
    fn utf16_length_matches_js_string_length() {
        assert!(!footer_name_too_long_utf16("abc"));
        // BMP text: 1 unit per char, like JS.
        assert_eq!("é".encode_utf16().count(), 1);
        assert!(!footer_name_too_long_utf16(&"é".repeat(31)));
        assert!(footer_name_too_long_utf16(&"é".repeat(32)));
        // Astral chars (emoji): 2 units per char, like JS — 16 emoji
        // hit the 32-unit gate while chars().count() sees only 16.
        assert_eq!("😀".encode_utf16().count(), 2);
        assert_eq!("😀".repeat(16).chars().count(), 16);
        assert!(!footer_name_too_long_utf16(&"😀".repeat(15)));
        assert!(footer_name_too_long_utf16(&"😀".repeat(16)));
        assert!(!footer_name_too_long_utf16(&"a".repeat(31)));
        assert!(footer_name_too_long_utf16(&"a".repeat(32)));
    }

    #[tokio::test]
    async fn bot_name_store_is_dual_write_with_legacy_fallback() {
        let pool = crate::db::memory_pool().await;
        // Table-routed write stays visible to legacy kv readers.
        crate::db::tbl_set(&pool, "g", BOT_NAME_KEY, "Bob")
            .await
            .unwrap();
        assert_eq!(
            crate::db::tbl_get(&pool, "g", BOT_NAME_KEY)
                .await
                .as_deref(),
            Some("Bob")
        );
        assert_eq!(
            crate::db::kv_get(&pool, "g", BOT_NAME_KEY).await.as_deref(),
            Some("Bob")
        );
        // Legacy-only row (pre-migration name) still reads table-first.
        crate::db::kv_set(&pool, "h", BOT_NAME_KEY, "Legacy")
            .await
            .unwrap();
        assert_eq!(
            crate::db::tbl_get(&pool, "h", BOT_NAME_KEY)
                .await
                .as_deref(),
            Some("Legacy")
        );
        // Delete clears both stores.
        crate::db::tbl_del(&pool, "g", BOT_NAME_KEY).await.unwrap();
        assert!(crate::db::tbl_get(&pool, "g", BOT_NAME_KEY).await.is_none());
        assert!(crate::db::kv_get(&pool, "g", BOT_NAME_KEY).await.is_none());
    }
}
