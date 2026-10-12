use super::*;

/// Avatar action choice. Mirrors the `action` option `choices` in
/// custom.ts:142-157: slash shows the localized display names, the
/// handler maps each variant back to the TS `value`.
#[derive(Debug, Clone, Copy, PartialEq, Eq, poise::ChoiceParameter)]
pub enum CustomAvatarAction {
    #[name = "Default Bot Avatar"]
    #[name_localized("fr", "Reprendre l'avatar par défaut du bot")]
    #[name_localized("ja", "ボットのデフォルトアバターに戻す")]
    #[name_localized("ru", "Восстановить аватар бота по умолчанию")]
    #[name_localized("es-ES", "Restablecer el avatar predeterminado del bot")]
    #[name = "reset"]
    Reset,
    #[name = "Set one"]
    #[name_localized("fr", "Définir un avatar")]
    #[name_localized("ja", "アバターを設定")]
    #[name_localized("ru", "Задать аватар")]
    #[name_localized("es-ES", "Establecer un avatar")]
    #[name = "set"]
    Set,
}

impl CustomAvatarAction {
    /// TS `value` (`reset` / `set`).
    pub fn as_str(self) -> &'static str {
        match self {
            Self::Reset => "reset",
            Self::Set => "set",
        }
    }
}

/// Change the iHorizon avatar into your server
#[poise::command(
    slash_command,
    prefix_command,
    rename = "avatar",
    aliases("botavatar", "setpic", "setavatar", "setpp"),
    default_member_permissions = "ADMINISTRATOR",
    description_localized("fr", "Définir la photo de profil du bot sur votre serveur discord"),
    description_localized("ja", "サーバーのiHorizonアバターを変更"),
    description_localized("ru", "Изменить аватар iHorizon на сервере"),
    description_localized("es-ES", "Cambiar el avatar de iHorizon en tu servidor")
)]
pub async fn custom_avatar(
    ctx: Ctx<'_>,
    #[description = "What do you want to do ?"]
    #[description_localized("fr", "Que voulez-vous faire ?")]
    #[description_localized("ja", "何をしたいですか？")]
    #[description_localized("ru", "Что вы хотите сделать?")]
    #[description_localized("es-ES", "¿Qué quieres hacer?")]
    action: CustomAvatarAction,
    #[description = "The avatar"]
    #[description_localized("fr", "L'avatar du bot")]
    #[description_localized("ja", "アバター")]
    #[description_localized("ru", "Аватар")]
    #[description_localized("es-ES", "El avatar")]
    avatar: Option<serenity::Attachment>,
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
    let token = crate::config::bot_token();
    if action.trim().eq_ignore_ascii_case("reset") {
        crate::db::tbl_del(pool, &gid, BOT_PFP_KEY).await?;
        // TS replies first, then restores the *current global* avatar
        // (`client.user.avatarURL()`), like banner.rs does for the
        // banner. `face()` is only the fallback when the bot has no
        // custom global avatar.
        let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
        ctx.say(
            crate::lang::get(&code, "custom_avatar_reset")
                .unwrap_or_else(|| "You have decided to reset the bot's profile picture on the server. Embed footers will return to their default state, as well as the bot's profile picture on the server.".to_string()),
        )
        .await?;
        if let Some(token) = token {
            let me = ctx.cache().current_user().clone();
            let global = me.avatar_url().unwrap_or_else(|| me.face());
            if let Some(bytes) = download_bytes(&global).await {
                patch_guild_me(
                    &token,
                    guild_id.get(),
                    serde_json::json!({
                        "avatar": format!(
                            "data:image/png;base64,{}",
                            crate::emojis::base64_encode(&bytes)
                        )
                    }),
                )
                .await;
            }
        }
        return Ok(());
    }
    let Some(avatar) = avatar else {
        let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
        ctx.say(
            crate::lang::get(&code, "msg_attach_an_image_or_use_reset")
                .unwrap_or_else(|| "Attach an image, or use reset.".to_string()),
        )
        .await?;
        return Ok(());
    };
    if !crate::funcs::is_valid_image_type(avatar.content_type.as_deref()) {
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
    }
    let Some(bytes) = download_bytes(&avatar.url).await else {
        let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
        ctx.say(
            crate::lang::get(&code, "msg_could_not_download_that_image")
                .unwrap_or_else(|| "Could not download that image.".to_string()),
        )
        .await?;
        return Ok(());
    };
    let b64 = crate::emojis::base64_encode(&bytes);
    if let Some(token) = token {
        patch_guild_me(
            &token,
            guild_id.get(),
            serde_json::json!({ "avatar": format!("data:image/png;base64,{b64}") }),
        )
        .await;
    }
    crate::db::tbl_set(pool, &gid, BOT_PFP_KEY, &b64).await?;
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    let yes = crate::emojis::app_emoji_markup(&ctx.serenity_context().http, "Yes")
        .await
        .unwrap_or_else(|| "✅".to_string());
    let crown = crate::emojis::app_emoji_markup(&ctx.serenity_context().http, "Crown")
        .await
        .unwrap_or_else(|| "👑".to_string());
    // `${x}` is the post-change guild member avatar (!avatar.ts reads
    // `members.me.avatarURL()` after the change), not the upload URL.
    let bot_id = ctx.cache().current_user().id;
    let member_avatar = guild_id
        .member(&ctx.serenity_context().http, bot_id)
        .await
        .ok()
        .and_then(|m| m.avatar_url());
    let x = super::post_change_display(member_avatar.as_deref(), &avatar.url);
    ctx.say(
        crate::lang::get(&code, "custom_avatar_set")
            .map(|s| {
                s.replace("${client.iHorizon_Emojis.Yes}", &yes)
                    .replace("${client.iHorizon_Emojis.Crown}", &crown)
                    .replace("${x}", &x)
            })
            .unwrap_or_else(|| {
                format!(
                    "{yes} **You have decided to change the bot's profile picture on the server. Embed footers are now modified, as well as the bot's profile picture on the server.**\n{crown} New value: `{x}`"
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
    fn avatar_action_choices_mirror_ts_names_values_and_locales() {
        use poise::ChoiceParameter as _;
        let names: Vec<_> = CustomAvatarAction::list()
            .into_iter()
            .map(|c| c.name)
            .collect();
        assert_eq!(
            names,
            vec!["Default Bot Avatar".to_string(), "Set one".to_string()]
        );
        assert_eq!(CustomAvatarAction::Reset.as_str(), "reset");
        assert_eq!(CustomAvatarAction::Set.as_str(), "set");
        assert_eq!(
            CustomAvatarAction::from_name("reset"),
            Some(CustomAvatarAction::Reset)
        );
        assert_eq!(
            CustomAvatarAction::from_name("SET"),
            Some(CustomAvatarAction::Set)
        );
        assert_eq!(CustomAvatarAction::from_name("other"), None);
        assert_eq!(
            CustomAvatarAction::from_index(0),
            Some(CustomAvatarAction::Reset)
        );
        assert_eq!(
            CustomAvatarAction::from_index(1),
            Some(CustomAvatarAction::Set)
        );
        let list = CustomAvatarAction::list();
        assert_eq!(
            list[0].localizations.get("fr").map(String::as_str),
            Some("Reprendre l'avatar par défaut du bot")
        );
        assert_eq!(
            list[1].localizations.get("fr").map(String::as_str),
            Some("Définir un avatar")
        );
        assert_eq!(
            list[0].localizations.get("es-ES").map(String::as_str),
            Some("Restablecer el avatar predeterminado del bot")
        );
    }
}
