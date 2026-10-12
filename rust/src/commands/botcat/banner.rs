use super::*;

/// Banner action choice. Mirrors the `action` option `choices` in
/// custom.ts:217-232: slash shows the localized display names, the
/// handler maps each variant back to the TS `value`.
#[derive(Debug, Clone, Copy, PartialEq, Eq, poise::ChoiceParameter)]
pub enum CustomBannerAction {
    #[name = "Default Bot Banner"]
    #[name_localized("fr", "Reprendre la bannière par défaut du bot")]
    #[name_localized("ja", "ボットのデフォルトバナーに戻す")]
    #[name_localized("ru", "Восстановить баннер бота по умолчанию")]
    #[name_localized("es-ES", "Restablecer el banner predeterminado del bot")]
    #[name = "reset"]
    Reset,
    #[name = "Set one"]
    #[name_localized("fr", "Définir une bannière")]
    #[name_localized("ja", "バナーを設定")]
    #[name_localized("ru", "Задать баннер")]
    #[name_localized("es-ES", "Establecer un banner")]
    #[name = "set"]
    Set,
}

impl CustomBannerAction {
    /// TS `value` (`reset` / `set`).
    pub fn as_str(self) -> &'static str {
        match self {
            Self::Reset => "reset",
            Self::Set => "set",
        }
    }
}

/// Change the iHorizon banner into your server
// Mirrors HybridCommands/bot/custom/!banner.ts (no DB key; set/reset
// PATCH a `data:image/jpeg;base64,...` data URI, reset restores the
// global banner, anything else replies the incorrect-file message).
#[poise::command(
    slash_command,
    prefix_command,
    rename = "banner",
    aliases("botbanner", "setbotbanner", "setbanner"),
    default_member_permissions = "ADMINISTRATOR",
    description_localized("fr", "Définir la bannière de profil du bot sur votre serveur discord"),
    description_localized("ja", "サーバーのiHorizonバナーを変更"),
    description_localized("ru", "Изменить баннер iHorizon на сервере"),
    description_localized("es-ES", "Cambiar el banner de iHorizon en tu servidor")
)]
pub async fn custom_banner(
    ctx: Ctx<'_>,
    #[description = "What do you want to do ?"]
    #[description_localized("fr", "Que voulez-vous faire ?")]
    #[description_localized("ja", "何をしたいですか？")]
    #[description_localized("ru", "Что вы хотите сделать?")]
    #[description_localized("es-ES", "¿Qué quieres hacer?")]
    action: CustomBannerAction,
    #[description = "The banner"]
    #[description_localized("fr", "La bannière du bot")]
    #[description_localized("ja", "バナー")]
    #[description_localized("ru", "Баннер")]
    #[description_localized("es-ES", "El banner")]
    banner: Option<serenity::Attachment>,
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
    let token = crate::config::bot_token();
    if action.trim().eq_ignore_ascii_case("reset") {
        let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
        ctx.say(
            crate::lang::get(&code, "custom_banner_reset").unwrap_or_else(|| {
                "You have decided to reset the bot's banner on the server.".to_string()
            }),
        )
        .await?;
        if let Some(token) = token {
            let bot_id = ctx.cache().current_user().id.get();
            if let Some(app) = fetch_application(&token).await {
                if let Some(hash) = app_bot_banner_hash(&app) {
                    if let Some(bytes) = download_bytes(&app_banner_url(bot_id, &hash)).await {
                        patch_guild_me(
                            &token,
                            guild_id.get(),
                            serde_json::json!({
                                "banner": format!(
                                    "data:image/jpeg;base64,{}",
                                    crate::emojis::base64_encode(&bytes)
                                )
                            }),
                        )
                        .await;
                    }
                }
            }
        }
        return Ok(());
    }
    let Some(banner) =
        banner.filter(|b| crate::funcs::is_valid_image_type(b.content_type.as_deref()))
    else {
        let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
        ctx.say(
            crate::lang::get(&code, "guildconfig_setbot_footeravatar_incorect").unwrap_or_else(
                || {
                    "The file does not correspond to an image. Please try again with an image."
                        .to_string()
                },
            ),
        )
        .await?;
        return Ok(());
    };
    let Some(bytes) = download_bytes(&banner.url).await else {
        let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
        ctx.say(
            crate::lang::get(&code, "msg_could_not_download_that_image")
                .unwrap_or_else(|| "Could not download that image.".to_string()),
        )
        .await?;
        return Ok(());
    };
    if let Some(token) = token {
        patch_guild_me(
            &token,
            guild_id.get(),
            serde_json::json!({
                "banner": format!(
                    "data:image/jpeg;base64,{}",
                    crate::emojis::base64_encode(&bytes)
                )
            }),
        )
        .await;
    }
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    let yes = crate::emojis::app_emoji_markup(&ctx.serenity_context().http, "Yes")
        .await
        .unwrap_or_else(|| "✅".to_string());
    let crown = crate::emojis::app_emoji_markup(&ctx.serenity_context().http, "Crown")
        .await
        .unwrap_or_else(|| "👑".to_string());
    // `${x}` is the post-change guild member banner (!banner.ts reads
    // `members.me.bannerURL()` after the change), not the upload URL.
    let bot_id = ctx.cache().current_user().id;
    let member_banner = guild_id
        .member(&ctx.serenity_context().http, bot_id)
        .await
        .ok()
        .and_then(|m| m.banner_url());
    let x = super::post_change_display(member_banner.as_deref(), &banner.url);
    ctx.say(
        crate::lang::get(&code, "custom_banner_set")
            .map(|s| {
                s.replace("${client.iHorizon_Emojis.Yes}", &yes)
                    .replace("${client.iHorizon_Emojis.Crown}", &crown)
                    .replace("${x}", &x)
            })
            .unwrap_or_else(|| {
                format!(
                    "{yes} **You have decided to change the bot's banner on the server.**\n{crown} New value: `{x}`"
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
    fn banner_action_choices_mirror_ts_names_values_and_locales() {
        use poise::ChoiceParameter as _;
        let names: Vec<_> = CustomBannerAction::list()
            .into_iter()
            .map(|c| c.name)
            .collect();
        assert_eq!(
            names,
            vec!["Default Bot Banner".to_string(), "Set one".to_string()]
        );
        assert_eq!(CustomBannerAction::Reset.as_str(), "reset");
        assert_eq!(CustomBannerAction::Set.as_str(), "set");
        assert_eq!(
            CustomBannerAction::from_name("reset"),
            Some(CustomBannerAction::Reset)
        );
        assert_eq!(
            CustomBannerAction::from_name("SET"),
            Some(CustomBannerAction::Set)
        );
        assert_eq!(CustomBannerAction::from_name("other"), None);
        assert_eq!(
            CustomBannerAction::from_index(0),
            Some(CustomBannerAction::Reset)
        );
        assert_eq!(
            CustomBannerAction::from_index(1),
            Some(CustomBannerAction::Set)
        );
        let list = CustomBannerAction::list();
        assert_eq!(
            list[0].localizations.get("fr").map(String::as_str),
            Some("Reprendre la bannière par défaut du bot")
        );
        assert_eq!(
            list[1].localizations.get("fr").map(String::as_str),
            Some("Définir une bannière")
        );
        assert_eq!(
            list[1].localizations.get("es-ES").map(String::as_str),
            Some("Establecer un banner")
        );
    }
}
