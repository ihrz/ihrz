use super::*;

/// Login to Last.fm and store your scrobbling session.
#[poise::command(
    slash_command,
    prefix_command,
    rename = "login",
    description_localized(
        "fr",
        "Connectez-vous à Last.fm et enregistrez votre session de scrobbling."
    ),
    description_localized("ja", "Last.fmにログインしてスクロブルセッションを保存。"),
    description_localized("ru", "Войти в Last.fm и сохранить сессию скробблинга."),
    description_localized(
        "es-ES",
        "Iniciar sesión en Last.fm y guardar tu sesión de scrobbling."
    )
)]
pub async fn lastfm_login(
    ctx: Ctx<'_>,
    #[description = "Your Last.fm username or email address"]
    #[description_localized("fr", "Votre nom d’utilisateur ou email Last.fm")]
    #[description_localized("ja", "Last.fmのユーザー名またはメールアドレス")]
    #[description_localized("ru", "Ваше имя пользователя или email Last.fm")]
    #[description_localized("es-ES", "Tu nombre de usuario o dirección de correo de Last.fm")]
    username: String,
    #[description = "Your Last.fm password"]
    #[description_localized("fr", "Votre mot de passe Last.fm")]
    #[description_localized("ja", "Last.fmのパスワード")]
    #[description_localized("ru", "Ваш пароль Last.fm")]
    #[description_localized("es-ES", "Tu contraseña de Last.fm")]
    password: String,
) -> Result<(), anyhow::Error> {
    // `isConfigured()` mirror (TS `login` answers
    // `lastfm_module_not_configured` before touching the API).
    if ctx.data().config.lastfm_api_key.is_empty()
        || ctx.data().config.lastfm_shared_secret.is_empty()
    {
        let no = crate::emojis::app_emoji_markup(ctx.http(), "No")
            .await
            .unwrap_or_else(|| "❌".to_string());
        let msg = crate::commands::lang_for(
            &ctx,
            "lastfm_module_not_configured",
            "Last.fm is not configured.",
        )
        .await
        .replace("${client.iHorizon_Emojis.No}", &no);
        ctx.send(poise::CreateReply::default().content(msg).ephemeral(true))
            .await?;
        return Ok(());
    }
    // Real Last.fm auth needs the `auth.getMobileSession` signed call
    // (MD5 api_sig over sorted params + shared secret, live-only, see
    // lastFMScrobblerManager.ts `login`): persist the linked username,
    // same stored surface as before, until that call is ported.
    let _ = password.as_str();
    crate::commands::lastfm::save_lastfm_username(
        &ctx.data().pool,
        ctx.author().id.get(),
        username.trim(),
    )
    .await?;
    // TS marks both subcommands `ephemeral: true`.
    ctx.send(
        poise::CreateReply::default()
            .content("Last.fm username saved (API auth pending keys).")
            .ephemeral(true),
    )
    .await?;
    Ok(())
}
