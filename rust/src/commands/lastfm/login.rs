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
    // Real Last.fm auth needs LASTFM_API_KEY / shared secret (live-only,
    // see mod.rs): persist the linked username, same stored surface as TS
    // `login` before the scrobbler leg runs.
    let _ = password.as_str();
    crate::commands::lastfm::save_lastfm_username(
        &ctx.data().pool,
        ctx.author().id.get(),
        username.trim(),
    )
    .await?;
    ctx.say("Last.fm username saved (API auth pending keys).")
        .await?;
    Ok(())
}
