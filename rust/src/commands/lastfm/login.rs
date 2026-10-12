use super::*;
use poise::serenity_prelude as serenity;

/// Last.fm API root (TS `LastFMScrobblerManager.apiUrl`).
pub const LASTFM_API_URL: &str = "https://ws.audioscrobbler.com/2.0/";
/// Success embed colour (TS `generateUserEmbed` `setColor(2829617)`).
pub const LASTFM_EMBED_COLOUR: u32 = 2_829_617;

/// Login to Last.fm and store your scrobbling session.
// Mirrors `!login.ts` + `LastFMScrobblerManager.login`: real
// `auth.getMobileSession` signed call, encrypted sessionKey store,
// result message + user embed — never the username-only stub.
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
    let lang_code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    let t = |k: &str, f: &str| crate::lang::get(&lang_code, k).unwrap_or_else(|| f.to_string());
    let no = crate::emojis::app_emoji_markup(ctx.http(), "No")
        .await
        .unwrap_or_else(|| "❌".to_string());
    let yes = crate::emojis::app_emoji_markup(ctx.http(), "Yes")
        .await
        .unwrap_or_else(|| "✅".to_string());
    // `isConfigured()` mirror (TS `login` answers
    // `lastfm_module_not_configured` before touching the API).
    let api_key = ctx.data().config.lastfm_api_key.clone();
    let shared_secret = ctx.data().config.lastfm_shared_secret.clone();
    if api_key.is_empty() || shared_secret.is_empty() {
        let msg = t("lastfm_module_not_configured", "Last.fm is not configured.")
            .replace("${client.iHorizon_Emojis.No}", &no);
        ctx.send(poise::CreateReply::default().content(msg).ephemeral(true))
            .await?;
        return Ok(());
    }
    let user_id = ctx.author().id.get();
    let user_label = ctx.author().name.clone();
    match lastfm_mobile_session(&api_key, &shared_secret, &username, &password).await {
        Err((_, api_msg)) => {
            // TS `formatApiError(response, lang, "login")`.
            let err_text = if api_msg.trim().is_empty() {
                t("lastfm_api_error_unknown", "unknown error")
            } else {
                api_msg
            };
            let msg = t(
                "lastfm_api_error_login",
                "${client.iHorizon_Emojis.No} | Unable to connect to Last.fm: ${error}",
            )
            .replace("${client.iHorizon_Emojis.No}", &no)
            .replace("${error}", &err_text);
            ctx.send(poise::CreateReply::default().content(msg).ephemeral(true))
                .await?;
            Ok(())
        }
        Ok((fetched_username, session_key)) => {
            let Some((fetched_username, session_key)) = Option::zip(fetched_username, session_key)
            else {
                let msg = t(
                    "lastfm_login_invalid_session",
                    "${client.iHorizon_Emojis.No} | Last.fm did not return a valid session.",
                )
                .replace("${client.iHorizon_Emojis.No}", &no);
                ctx.send(poise::CreateReply::default().content(msg).ephemeral(true))
                    .await?;
                return Ok(());
            };
            // TS `getEncryptionSecret()`: `apiToken || sharedSecret`.
            let token = crate::config::api_token().unwrap_or_default();
            let secret = if token.trim().is_empty() {
                shared_secret.clone()
            } else {
                token
            };
            let connected_at = chrono::Utc::now().timestamp_millis();
            let settings = serde_json::json!({
                "connectedAt": connected_at,
                "enabled": true,
                "sessionKey": crate::funcs::encrypt_text(&secret, &session_key),
                "username": fetched_username,
            });
            crate::commands::lastfm::save_lastfm_settings(&ctx.data().pool, user_id, &settings)
                .await?;
            let msg = t(
                "lastfm_login_success",
                "${client.iHorizon_Emojis.Yes} | Your Last.fm account `${username}` is now connected and scrobbling has been enabled.",
            )
            .replace("${client.iHorizon_Emojis.Yes}", &yes)
            .replace("${username}", &fetched_username);
            let embed = lastfm_user_embed(
                &lang_code,
                &user_label,
                true,
                Some(&fetched_username),
                Some(connected_at),
            );
            ctx.send(
                poise::CreateReply::default()
                    .content(msg)
                    .embed(embed)
                    .ephemeral(true),
            )
            .await?;
            Ok(())
        }
    }
}

/// `createApiSignature` mirror: MD5 over the byte-sorted `key+value`
/// concatenation plus the shared secret.
pub fn lastfm_api_sig(params: &[(&str, &str)], shared_secret: &str) -> String {
    let mut sorted: Vec<(&str, &str)> = params.to_vec();
    sorted.sort_by(|a, b| a.0.as_bytes().cmp(b.0.as_bytes()));
    let mut payload = String::new();
    for (k, v) in &sorted {
        payload.push_str(k);
        payload.push_str(v);
    }
    payload.push_str(shared_secret);
    format!("{:x}", md5::compute(payload.as_bytes()))
}

/// Signed form fields for a Last.fm call. Mirrors `callLastFM`: the
/// `api_key` + `method` base, non-empty params only, plus `api_sig`
/// and `format=json` (insertion order kept for the wire body; the
/// signature itself always runs over the sorted set).
pub fn lastfm_signed_fields(
    api_key: &str,
    shared_secret: &str,
    method: &str,
    params: &[(&str, &str)],
) -> Vec<(String, String)> {
    let mut kept: Vec<(&str, &str)> = params
        .iter()
        .copied()
        .filter(|(_, v)| !v.is_empty())
        .collect();
    kept.insert(0, ("method", method));
    kept.insert(0, ("api_key", api_key));
    let sig = lastfm_api_sig(&kept, shared_secret);
    let mut out: Vec<(String, String)> = kept
        .into_iter()
        .map(|(k, v)| (k.to_string(), v.to_string()))
        .collect();
    out.push(("api_sig".to_string(), sig));
    out.push(("format".to_string(), "json".to_string()));
    out
}

/// `auth.getMobileSession` mirror. Ok carries
/// `(session.name, session.key)` (either may be absent on a malformed
/// payload — the caller answers `lastfm_login_invalid_session`).
/// Err carries `(error_code, message)` like `LastFMApiResponse`.
pub async fn lastfm_mobile_session(
    api_key: &str,
    shared_secret: &str,
    username: &str,
    password: &str,
) -> Result<(Option<String>, Option<String>), (Option<i64>, String)> {
    let fields = lastfm_signed_fields(
        api_key,
        shared_secret,
        "auth.getMobileSession",
        &[("username", username), ("password", password)],
    );
    let client = reqwest::Client::new();
    let res = client
        .post(LASTFM_API_URL)
        .form(&fields)
        .send()
        .await
        .map_err(|e| (None, e.to_string()))?;
    let status = res.status();
    let body = res.text().await.unwrap_or_default();
    let payload: serde_json::Value = serde_json::from_str(&body).unwrap_or_default();
    if !status.is_success() || payload.get("error").is_some() {
        let code = payload
            .get("error")
            .and_then(|e| e.as_i64())
            .or(if status.is_success() {
                None
            } else {
                Some(status.as_u16() as i64)
            });
        let msg = payload
            .get("message")
            .and_then(|m| m.as_str())
            .unwrap_or_else(|| status.canonical_reason().unwrap_or(""))
            .to_string();
        return Err((code, msg));
    }
    let name = payload
        .pointer("/session/name")
        .and_then(|v| v.as_str())
        .filter(|s| !s.is_empty())
        .map(str::to_string);
    let key = payload
        .pointer("/session/key")
        .and_then(|v| v.as_str())
        .filter(|s| !s.is_empty())
        .map(str::to_string);
    Ok((name, key))
}

/// `generateUserEmbed` mirror (status / account / connected-at fields).
pub fn lastfm_user_embed(
    lang_code: &str,
    user_label: &str,
    enabled: bool,
    username: Option<&str>,
    connected_at_ms: Option<i64>,
) -> serenity::CreateEmbed {
    let t = |k: &str, f: &str| crate::lang::get(lang_code, k).unwrap_or_else(|| f.to_string());
    let mut embed = serenity::CreateEmbed::default()
        .colour(LASTFM_EMBED_COLOUR)
        .title(
            t(
                "lastfm_embed_title",
                "Last.fm configuration for ${userLabel}",
            )
            .replace("${userLabel}", user_label),
        )
        .field(
            t("lastfm_embed_field_status", "Status"),
            if enabled {
                t("var_enabled", "Enabled")
            } else {
                t("var_disabled", "Disabled")
            },
            true,
        )
        .field(
            t("lastfm_embed_field_account", "Connected account"),
            username
                .filter(|s| !s.is_empty())
                .map(str::to_string)
                .unwrap_or_else(|| t("var_none", "None")),
            true,
        );
    if let Some(ms) = connected_at_ms {
        embed = embed.field(
            t("lastfm_embed_field_connected_at", "Connected on"),
            format!("<t:{}:F>", ms / 1000),
            true,
        );
    }
    embed
}

#[cfg(test)]
mod tests {
    use super::{lastfm_api_sig, lastfm_signed_fields, lastfm_user_embed};

    #[test]
    fn api_sig_sorts_params_and_appends_secret() {
        // payload = "api_keykey123methodauth.getMobileSession" + "secretABC".
        assert_eq!(
            lastfm_api_sig(
                &[("method", "auth.getMobileSession"), ("api_key", "key123")],
                "secretABC"
            ),
            "7399b73cbeb5053bd4d68326dbb0b457"
        );
    }

    #[test]
    fn signed_fields_skip_empties_and_add_sig_and_format() {
        let fields = lastfm_signed_fields("k", "s", "m", &[("a", "1"), ("b", ""), ("c", "3")]);
        let names: Vec<&str> = fields.iter().map(|(k, _)| k.as_str()).collect();
        assert_eq!(
            names,
            vec!["api_key", "method", "a", "c", "api_sig", "format"]
        );
        assert_eq!(
            fields.iter().find(|(k, _)| k == "api_sig").unwrap().1,
            lastfm_api_sig(
                &[("api_key", "k"), ("method", "m"), ("a", "1"), ("c", "3")],
                "s"
            )
        );
    }

    #[test]
    fn user_embed_carries_ts_shape() {
        let e = lastfm_user_embed(
            "en-US",
            "Kisa",
            true,
            Some("kisa_fm"),
            Some(1_700_000_000_000),
        );
        let dbg = format!("{e:?}");
        assert!(dbg.contains("Last.fm configuration for Kisa"));
        assert!(dbg.contains("kisa_fm"));
        assert!(dbg.contains("<t:1700000000:F>"));
    }
}
