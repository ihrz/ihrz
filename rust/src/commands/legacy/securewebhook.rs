use super::*;

/// Secure a Discord webhook through the iHorizon proxy gateway.
///
/// Mirrors MessageCommands/utils/securewebhook.ts (`create` / `delete`
/// / `list` via `HorizonGatewayInternal(SecureWebhook)` plus the
/// `WH_SEC` rows of the shared `api` table — the same table handle
/// `Events/client/ready.ts` exposes as `apiTable`). An action outside
/// the TS `choices` (create/delete/list) never reaches the if/else
/// chain: `checkCommandArgs` rejects it first with the caret usage
/// embed, so the command replays that embed instead of staying silent.
#[poise::command(
    prefix_command,
    category = "utils",
    rename = "securewebhook",
    aliases("securehook"),
    description_localized("fr", "Sécuriser une webhook à travers un PROXY iHorizon"),
    description_localized("ja", "Webhookを保護"),
    description_localized("ru", "Защитить вебхук"),
    description_localized("es-ES", "Asegurar webhook")
)]
pub async fn securewebhook(
    ctx: Ctx<'_>,
    #[description = "create, delete or list"]
    #[description_localized("fr", "Action à faire")]
    #[description_localized("ja", "実行するアクション")]
    #[description_localized("ru", "Выполняемое действие")]
    #[description_localized("es-ES", "Acción a realizar")]
    action: String,
    #[description = "Webhook URL or webhook code"]
    #[description_localized("fr", "URL de la Webhook ou code de la Webhook")]
    #[description_localized("ja", "WebhookのURLまたはWebhookコード")]
    #[description_localized("ru", "URL вебхука или код вебхука")]
    #[description_localized("es-ES", "URL del webhook o código del webhook")]
    input: Option<String>,
) -> Result<(), anyhow::Error> {
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    let t = |k: &str| crate::lang::get(&code, k).unwrap_or_default();
    let author = ctx.author().id.get().to_string();
    let input = input.unwrap_or_default();
    // TS `checkCommandArgs` validates the `action` option against its
    // choices before the handler body runs: anything outside
    // create/delete/list gets the caret usage embed (`+securewebhook
    // [create/delete/list] <string>`, caret on the first arg). Poise
    // parses `action` as a plain String, so replay that embed here.
    if !is_valid_action(&action) {
        usage_reply(&ctx, &code).await?;
        return Ok(());
    }
    if action == "create" {
        if !is_webhook_url(&input) {
            ctx.say(t("util_securewebhook_action_create")).await?;
            return Ok(());
        }
        let Some(url) = crate::commands::authrestore::main::gateway_endpoint(
            crate::funcs::GatewayMethod::SecureWebhook,
        ) else {
            ctx.say(t("rc_command_horizongw_down")).await?;
            return Ok(());
        };
        let token = crate::config::api_token().unwrap_or_default();
        let body = match crate::commands::authrestore::main::gateway_post(
            &url,
            &serde_json::json!({
                "adminKey": token,
                "wanna": "create",
                "url": input,
                "userId": author,
            }),
        )
        .await
        {
            Ok(body) => body,
            Err(_) => {
                ctx.say(t("rc_command_horizongw_down")).await?;
                return Ok(());
            }
        };
        if body.get("status").and_then(|s| s.as_str()) != Some("OK") {
            // TS replaces `${data.status}` with `data.error` (quirk kept).
            ctx.say(t("util_securewebhook_action_create_error").replace(
                "${data.status}",
                body.get("error").and_then(|e| e.as_str()).unwrap_or(""),
            ))
            .await?;
            return Ok(());
        }
        ctx.say(
            t("util_securewebhook_action_create_ok")
                .replace(
                    "${data.url}",
                    body.get("url").and_then(|u| u.as_str()).unwrap_or(""),
                )
                // TS replies `String(0)` for the use count on create.
                .replace("${data.use}", "0"),
        )
        .await?;
        return Ok(());
    }
    if action == "delete" {
        let owned = load_user_webhooks(&ctx.data().pool, &author).await;
        if owned.is_empty() {
            ctx.say(t("util_securewebhook_action_delete_any")).await?;
            return Ok(());
        }
        if !owned.iter().any(|w| w.code == input) {
            ctx.say(t("util_securewebhook_action_delete_not_owner"))
                .await?;
            return Ok(());
        }
        let Some(url) = crate::commands::authrestore::main::gateway_endpoint(
            crate::funcs::GatewayMethod::SecureWebhook,
        ) else {
            ctx.say(t("rc_command_horizongw_down")).await?;
            return Ok(());
        };
        let token = crate::config::api_token().unwrap_or_default();
        // TS checks the HTTP status (`req.status != 200`), not the body.
        let status = gateway_post_status(
            &url,
            &serde_json::json!({
                "adminKey": token,
                "wanna": "delete",
                "code": input,
                "userId": author,
            }),
        )
        .await
        .unwrap_or(0);
        if status != 200 {
            ctx.say(t("util_securewebhook_action_delete_error")).await?;
            return Ok(());
        }
        // TS reacts ✅, falling back to sending ✅ when the react fails.
        ctx.say("✅").await?;
        return Ok(());
    }
    if action == "list" {
        let owned = load_user_webhooks(&ctx.data().pool, &author).await;
        let base = format!(
            "{}/api/webhooks/{{id}}/{{token}}",
            ctx.data().config.gateway_public().unwrap_or_default()
        );
        let lines: Vec<String> = owned
            .iter()
            .map(|w| {
                let url = base.replace("{id}", &w.code).replace("{token}", &w.token);
                format!("> [{}]({url}) - {} use(s)", w.code, w.use_count)
            })
            .collect();
        ctx.say(format!(
            "{}{}",
            t("util_securewebhook_actiom_list_ok"),
            lines.join("\n")
        ))
        .await?;
        return Ok(());
    }
    Ok(())
}

/// One `WH_SEC` row: `{userId, code, token, use}` per securewebhook.ts.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct SecuredWebhook {
    pub user_id: String,
    pub code: String,
    pub token: String,
    pub use_count: String,
}

/// Webhook rows owned by one user. Reads the `WH_SEC` doc of the
/// shared `api` table (the Rust side of `apiTable.get("WH_SEC")`).
pub async fn load_user_webhooks(pool: &crate::db::Pool, user_id: &str) -> Vec<SecuredWebhook> {
    let Some(root) = crate::commands::owner::main::tbl_get_value(pool, "api", "WH_SEC").await
    else {
        return vec![];
    };
    let Some(map) = root.as_object() else {
        return vec![];
    };
    let mut out: Vec<SecuredWebhook> = map
        .values()
        .filter_map(|v| {
            let uid = v.get("userId")?.as_str()?;
            if uid != user_id {
                return None;
            }
            Some(SecuredWebhook {
                user_id: uid.to_string(),
                code: v.get("code")?.as_str()?.to_string(),
                token: v.get("token")?.as_str()?.to_string(),
                use_count: v
                    .get("use")
                    .map(|u| {
                        u.as_str()
                            .map(|s| s.to_string())
                            .unwrap_or_else(|| u.to_string())
                    })
                    .unwrap_or_default(),
            })
        })
        .collect();
    out.sort_by(|a, b| a.code.cmp(&b.code));
    out
}

/// Discord webhook URL check. Mirrors the TS create gate
/// (`/https?:\/\/(?:ptb\.|canary\.)?discord\.com\/api(?:\/v\d{1,2})?\/webhooks\/(\d{17,19})\/([\w-]{68})/i`):
/// scheme, optional ptb/canary subdomain, id of 17-19 digits, token
/// of 68 word/dash chars. Checked against the trimmed whole input
/// (TS `match` is unanchored, but callers pass the bare URL).
pub fn is_webhook_url(input: &str) -> bool {
    let s = input.trim().to_ascii_lowercase();
    let rest = match s
        .strip_prefix("https://")
        .or_else(|| s.strip_prefix("http://"))
    {
        Some(r) => r,
        None => return false,
    };
    let rest = rest
        .strip_prefix("ptb.")
        .or_else(|| rest.strip_prefix("canary."))
        .unwrap_or(rest);
    let rest = match rest.strip_prefix("discord.com/api") {
        Some(r) => r,
        None => return false,
    };
    let rest = if let Some(r) = rest.strip_prefix("/v") {
        let n = r.chars().take_while(|c| c.is_ascii_digit()).count();
        if n == 0 || n > 2 {
            return false;
        }
        &r[n..]
    } else {
        rest
    };
    let rest = match rest.strip_prefix("/webhooks/") {
        Some(r) => r,
        None => return false,
    };
    let (id, rest) = match rest.find('/') {
        Some(i) => (&rest[..i], &rest[i + 1..]),
        None => return false,
    };
    if !(17..=19).contains(&id.len()) || !id.bytes().all(|b| b.is_ascii_digit()) {
        return false;
    }
    rest.len() == 68
        && rest
            .bytes()
            .all(|b| b.is_ascii_alphanumeric() || b == b'_' || b == b'-')
}

/// POST helper returning the HTTP status (the delete leg checks
/// `req.status`, which `gateway_post` discards with the body).
async fn gateway_post_status(
    url: &str,
    payload: &serde_json::Value,
) -> Result<u16, reqwest::Error> {
    Ok(reqwest::Client::new()
        .post(url)
        .header("Accept", "application/json")
        .json(payload)
        .send()
        .await?
        .status()
        .as_u16())
}

/// The TS `action` option choices (`create`/`delete`/`list`).
/// Anything else fails `isValidArgument` in `checkCommandArgs`.
fn is_valid_action(action: &str) -> bool {
    matches!(action, "create" | "delete" | "list")
}

/// Invalid-action usage embed. Replays the exact
/// checkCommandArgs/sendErrorMessage shape TS sends for
/// `+securewebhook test-key-1`: usage line `[create/delete/list]
/// <string>`, caret on the first arg, red embed, shared bot footer
/// with icon, sent as a reply (interactionSend). Both lang keys
/// already exist in YAML, so no new key is needed.
async fn usage_reply(ctx: &Ctx<'_>, code: &str) -> Result<(), anyhow::Error> {
    let pool = &ctx.data().pool;
    let gid = ctx.guild_id().map(|g| g.get());
    let prefix = crate::db::guild_prefix(pool, gid, &ctx.data().config.prefix).await;
    let tokens = ["[create/delete/list]".to_string(), "<string>".to_string()];
    let desc = crate::funcs_send::args_error_description(
        code,
        "securewebhook",
        &prefix,
        "securewebhook",
        &crate::funcs_send::args_error_line(&[
            ("create/delete/list".to_string(), true),
            ("string".to_string(), false),
        ]),
        &crate::funcs_send::error_position(&prefix, "securewebhook", &tokens, 0),
        "create/delete/list",
    );
    let footer = crate::lang::get(code, "hybridcommands_embed_footer_text")
        .unwrap_or_else(|| {
            "Options within [...] are required, while those within <...> are optional.\nUse the command: ${botPrefix}help [command] for more information."
                .to_string()
        })
        .replace("${botPrefix}", &prefix);
    let gid_str = gid.map(|g| g.to_string()).unwrap_or_default();
    let (_, fbytes) = crate::commands::shared::footer_parts(ctx, &gid_str).await;
    let embed = crate::commands::shared::embed_with_footer(
        serenity::CreateEmbed::default()
            .description(desc)
            .colour(0xED_4245_u32),
        &footer,
        fbytes.is_some(),
    );
    let mut reply = poise::CreateReply::default().embed(embed);
    if let Some(bytes) = fbytes {
        reply = reply.attachment(serenity::CreateAttachment::bytes(bytes, "footer_icon.png"));
    }
    ctx.send(reply).await?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn webhook_url_gate_matches_ts_regex() {
        let good_id = "1".repeat(17);
        let good_token = "a".repeat(68);
        let good = format!("https://discord.com/api/webhooks/{good_id}/{good_token}");
        assert!(is_webhook_url(&good));
        assert!(is_webhook_url(&format!(
            "https://ptb.discord.com/api/v1/webhooks/{good_id}/{good_token}"
        )));
        assert!(is_webhook_url(&format!(
            "http://canary.discord.com/api/webhooks/{good_id}/{good_token}"
        )));
        assert!(!is_webhook_url("not a url"));
        assert!(!is_webhook_url(&format!(
            "https://discord.com/api/webhooks/short/{good_token}"
        )));
        assert!(!is_webhook_url(&format!(
            "https://discord.com/api/webhooks/{good_id}/short"
        )));
        assert!(!is_webhook_url(&format!(
            "https://discord.com/api/v123/webhooks/{good_id}/{good_token}"
        )));
        assert!(!is_webhook_url(&format!(
            "https://example.com/api/webhooks/{good_id}/{good_token}"
        )));
    }

    #[test]
    fn list_line_shape_matches_ts() {
        let w = SecuredWebhook {
            user_id: "7".to_string(),
            code: "c".to_string(),
            token: "t".to_string(),
            use_count: "3".to_string(),
        };
        let base = "https://gw/api/webhooks/{id}/{token}";
        let url = base.replace("{id}", &w.code).replace("{token}", &w.token);
        assert_eq!(
            format!("> [{}]({url}) - {} use(s)", w.code, w.use_count),
            "> [c](https://gw/api/webhooks/c/t) - 3 use(s)"
        );
    }

    #[test]
    fn invalid_action_triggers_usage_not_silence() {
        // Live prodpare: `+securewebhook test-key-1` gets the caret
        // usage embed while the port stayed silent. Gate pins that.
        assert!(is_valid_action("create"));
        assert!(is_valid_action("delete"));
        assert!(is_valid_action("list"));
        assert!(!is_valid_action("test-key-1"));
        assert!(!is_valid_action(""));
    }

    #[test]
    fn usage_line_matches_ts_check_command_args() {
        // TS renders `action` (required, choices) as
        // `[create/delete/list]` and `input` (optional String) as
        // `<string>`; caret sits on the first arg.
        assert_eq!(
            crate::funcs_send::args_error_line(&[
                ("create/delete/list".to_string(), true),
                ("string".to_string(), false)
            ]),
            "[create/delete/list] <string>"
        );
        assert_eq!(
            crate::funcs_send::error_position(
                ".",
                "securewebhook",
                &["[create/delete/list]".to_string(), "<string>".to_string()],
                0
            ),
            "               ^         "
        );
    }
}
