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
    if !super::scrobbler::lastfm_configured(&api_key, &shared_secret) {
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
            // TS `formatApiError(response, lang, "login")`:
            // `${error}` fills `response.message || unknown` — a bare
            // JS `||`, so only the empty string (and nullish) falls
            // back; a whitespace-only message is TRUTHY and renders
            // verbatim (battery scratch `slice-w4s87-loginmsg.cjs`,
            // E4/E5 — the old `trim().is_empty()` folded those to
            // unknown, same whitespace class as slice-82).
            let err_text =
                login_error_text(&api_msg, &t("lastfm_api_error_unknown", "unknown error"));
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
            // TS `getEncryptionSecret()`: `apiToken || sharedSecret`
            // (exact JS falsiness — no trim; see `encryption_secret`).
            let token = crate::config::api_token().unwrap_or_default();
            let secret =
                crate::commands::lastfm::scrobbler::encryption_secret(&token, &shared_secret);
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

/// Pure `formatApiError` `${error}` fill mirror (`message || unknown`):
/// exact on the full `&str` domain — no trim, so whitespace-only
/// messages render verbatim like the TS (nullish legs live in the
/// caller, which always passes a `String`).
/// Battery: scratch `slice-w4s87-loginmsg.cjs`, green 13/13.
pub fn login_error_text(api_msg: &str, unknown: &str) -> String {
    if api_msg.is_empty() {
        unknown.to_string()
    } else {
        api_msg.to_string()
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

/// Pure `auth.getMobileSession` ok-payload parser (mirrors the
/// `response.data?.session?.name/key` read + `!fetchedUsername ||
/// !sessionKey` gate in `LastFMScrobblerManager.login`; `data` is the
/// whole payload on the ok leg). `None` on either side answers
/// `lastfm_login_invalid_session` at the caller.
/// Battery: scratch `slice-w4s75-login.cjs`, green 14/14.
/// DELTA (doc-noted, unreachable: the Last.fm contract always returns
/// string name/key): a truthy non-string (`12345`, `true`) passes the
/// TS `!` gate and would be stored, while `as_str` folds it to `None`
/// here — strictly safer, same verdict on every contract payload.
pub fn parse_mobile_session(payload: &serde_json::Value) -> (Option<String>, Option<String>) {
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
    (name, key)
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
    super::scrobbler::classify_lastfm_response(
        status.as_u16(),
        status.canonical_reason().unwrap_or(""),
        &body,
    )
    .map_err(|e| (e.code, e.message))
    .map(|payload| parse_mobile_session(&payload))
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
    // TS `if (settings?.connectedAt)` omits falsy stamps (0/missing)
    // and renders `Math.floor(ms / 1000)` (floor: -500 -> -1), so
    // `Some(0)` is skipped and the division is `div_euclid` (battery
    // scratch `slice-w4s73-embed.cjs`, green 22/22).
    if let Some(ms) = connected_at_ms.filter(|ms| *ms != 0) {
        embed = embed.field(
            t("lastfm_embed_field_connected_at", "Connected on"),
            format!("<t:{}:F>", ms.div_euclid(1000)),
            true,
        );
    }
    embed
}

#[cfg(test)]
mod tests {
    use super::{
        lastfm_api_sig, lastfm_signed_fields, lastfm_user_embed, login_error_text,
        parse_mobile_session,
    };

    #[test]
    fn mobile_session_parse_matches_ts_login_legs() {
        // Battery scratch `slice-w4s75-login.cjs`, green 14/14.
        // `Some` on both sides == TS passes the `!fetchedUsername ||
        // !sessionKey` gate; any `None` == `invalid_session`.
        use serde_json::json;
        let (n, k) = parse_mobile_session(&json!({"session": {"name": "kisa_fm", "key": "SK123"}}));
        assert_eq!(
            (n.as_deref(), k.as_deref()),
            (Some("kisa_fm"), Some("SK123"))
        );
        for payload in [
            json!({}),
            json!({"session": null}),
            json!({"session": {"name": "u"}}),
            json!({"session": {"key": "k"}}),
            json!({"session": {"name": "", "key": "k"}}),
            json!({"session": {"name": "u", "key": ""}}),
            json!({"session": {"name": "u", "key": 0}}),
            json!({"session": "x"}),
            json!({"session": {"name": null, "key": "k"}}),
        ] {
            let (n, k) = parse_mobile_session(&payload);
            assert!(n.is_none() || k.is_none(), "payload={payload}");
        }
        // Whitespace-only names stay verbatim (truthy in TS,
        // non-empty here); extra members ignored.
        let (n, k) =
            parse_mobile_session(&json!({"session": {"name": " ", "key": "k"}, "extra": 1}));
        assert_eq!((n.as_deref(), k.as_deref()), (Some(" "), Some("k")));
        // DELTA (doc-noted on the fn, unreachable: the Last.fm
        // contract always returns strings): truthy non-strings pass
        // the TS `!` gate (`12345`/`true` stored) but fold to `None`
        // here via `as_str`.
        let (n, _) = parse_mobile_session(&json!({"session": {"name": 12345, "key": "k"}}));
        assert!(n.is_none());
    }

    #[test]
    fn login_error_fill_matches_ts_format_api_error_legs() {
        // Battery scratch `slice-w4s87-loginmsg.cjs`, green 13/13
        // (E1-E7 legs mirrored 1:1). TS fills `${error}` with
        // `response.message || unknown`: only the empty string falls
        // back — whitespace-only messages are truthy and render
        // verbatim (the old `trim().is_empty()` folded them).
        assert_eq!(login_error_text("bad auth", "unknown error"), "bad auth");
        assert_eq!(login_error_text("", "unknown error"), "unknown error");
        assert_eq!(login_error_text("   ", "unknown error"), "   ");
        assert_eq!(login_error_text("\t", "unknown error"), "\t");
        assert_eq!(login_error_text("0", "unknown error"), "0");
    }

    #[test]
    fn api_sig_matches_ts_create_api_signature_vectors() {
        // Vectors computed by the real TS `createApiSignature`
        // (localeCompare sort + md5 hex, utf8) — battery script at
        // scratch `slice-w4s68-sig.cjs`, green 15/15. The byte sort
        // here orders every live key set identically (only camelCase
        // key is `chosenByUser`, and it never collides with a
        // case/punctuation-only neighbour), so these vectors lock the
        // wire signature, not just self-consistency.
        assert_eq!(
            lastfm_api_sig(
                &[
                    ("album", "Alb"),
                    ("api_key", "K"),
                    ("artist", "Art"),
                    ("chosenByUser", "1"),
                    ("duration", "200"),
                    ("method", "track.scrobble"),
                    ("sk", "SK"),
                    ("timestamp", "1700000000"),
                    ("track", "Title"),
                ],
                "SECRET"
            ),
            "301d4a37a649b474c12d9ed3dc4a14ba"
        );
        assert_eq!(
            lastfm_api_sig(
                &[
                    ("api_key", "K"),
                    ("method", "auth.getMobileSession"),
                    ("password", "p"),
                    ("username", "u"),
                ],
                "SECRET"
            ),
            "07732235c0d8bb9e7150035cdfadf11b"
        );
        // Non-ASCII values hash as utf8, like the TS update call.
        assert_eq!(
            lastfm_api_sig(
                &[("api_key", "K"), ("method", "m"), ("track", "héllo→")],
                "S"
            ),
            "a08ccb870c2bf63435aaa20d6f7ddcaf"
        );
        // DELTAS (doc-noted, unreachable on live payloads): TS
        // `payload.error ? Number(...) : status` also coerces string
        // codes and folds `error: 0`/falsy to success, while the Rust
        // `post_signed`/`lastfm_mobile_session` mapping only reads
        // numeric codes and treats any present `error` member as
        // failure — Last.fm always sends numeric non-zero codes.
    }

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

    #[test]
    fn user_embed_matches_ts_generate_user_embed_legs() {
        // Battery scratch `slice-w4s73-embed.cjs`, green 22/22.
        // Falsy `connectedAt` (0) omits the field like the TS
        // `if (settings?.connectedAt)` gate (old code rendered
        // `<t:0:F>`); negatives render the `Math.floor` stamp
        // (-500 -> -1, old code omitted them via `as_u64`, and `/`
        // would truncate to 0).
        let dbg_zero = format!(
            "{:?}",
            lastfm_user_embed("en-US", "K", false, None, Some(0))
        );
        assert!(!dbg_zero.contains("<t:0:F>"));
        assert!(!dbg_zero.contains("Connected on"));
        // `username || var_none`: missing AND empty both fall back,
        // whitespace stays verbatim.
        assert!(dbg_zero.contains("None"));
        assert!(dbg_zero.contains("Disabled"));
        let dbg_empty_name = format!(
            "{:?}",
            lastfm_user_embed("en-US", "K", true, Some(""), Some(999))
        );
        assert!(dbg_empty_name.contains("None"));
        assert!(dbg_empty_name.contains("<t:0:F>"));
        let dbg_space_name = format!(
            "{:?}",
            lastfm_user_embed("en-US", "K", true, Some(" "), None)
        );
        // Whitespace-only usernames stay verbatim (no `None`
        // fallback — TS `||` only folds falsy). Serenity renders the
        // account field as `value: " "` in Debug (a bare
        // `contains("None")` check is useless: `Option::None`
        // debug-renders as `None` all over the embed).
        assert!(dbg_space_name.contains("value: \" \""));
        assert!(!dbg_space_name.contains("Connected on"));
        for (ms, want) in [
            (1_699_999_999_999, "<t:1699999999:F>"),
            (-500, "<t:-1:F>"),
            (-1000, "<t:-1:F>"),
            (-1500, "<t:-2:F>"),
        ] {
            let dbg = format!(
                "{:?}",
                lastfm_user_embed("en-US", "K", true, Some("u"), Some(ms))
            );
            assert!(dbg.contains(want), "ms={ms} want={want}");
        }
        // DELTA (doc-noted, unreachable: the writer stores integer
        // ms from `Date.now()`): a fractional `connectedAt` renders
        // `Math.floor` in TS but has no `as_i64` counterpart here.
    }
}
