use super::*;

/// TS `!bio.ts` rejects `desc.length >= 400`. JS string length counts
/// UTF-16 code units, so astral chars (emoji) count double — hence
/// `encode_utf16().count()`, not `chars().count()`.
pub fn bio_too_long(bio: &str) -> bool {
    bio.encode_utf16().count() >= 400
}

/// Persisted default bio for `reset`. Mirrors `!bio.ts`:
/// `(await metasTable.get("BOT.user.bio")) || client.user.username`.
/// `metasTable` is the bot-global kv scope (`"0"`, like
/// `META_SCOPE`); `ready.ts` stores the whole `BOT` doc
/// (`{user: {bio, ...}}`), so the bio lives at `/user/bio`.
/// Pure for testability.
pub fn default_bio(meta_bot_json: Option<&str>, username: &str) -> String {
    meta_bot_json
        .and_then(|s| serde_json::from_str::<serde_json::Value>(s).ok())
        .and_then(|v| {
            v.pointer("/user/bio")
                .and_then(|b| b.as_str())
                .map(|s| s.to_string())
        })
        .filter(|s| !s.is_empty())
        .unwrap_or_else(|| username.to_string())
}
/// Set or reset the per-guild bot bio.
// 400-char gate (like `!bio.ts`), then the 190-char/2-line sanitize
// from customProfileHelper.
#[poise::command(
    slash_command,
    prefix_command,
    rename = "bio",
    aliases("botbio", "setbotbio", "setbio"),
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn custom_bio(
    ctx: Ctx<'_>,
    #[description = "set or reset"] action: String,
    #[description = "New bio"] bio: Option<String>,
) -> Result<(), anyhow::Error> {
    let Some(guild_id) = ctx.guild_id() else {
        let glang = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
        ctx.say(
            crate::lang::get(&glang, "msg_this_command_must_be_used_in_a_server")
                .unwrap_or_else(|| "This command must be used in a server.".to_string()),
        )
        .await?;
        return Ok(());
    };
    let raw = bio.unwrap_or_default();
    if !action.trim().eq_ignore_ascii_case("reset") && bio_too_long(&raw) {
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
    let final_bio = if action.trim().eq_ignore_ascii_case("reset") {
        // Reset restores the persisted default (TS `metasTable`
        // `BOT.user.bio`, else the bot username) — not an empty bio.
        let meta = crate::db::kv_get(&ctx.data().pool, crate::monitor::META_SCOPE, "BOT").await;
        let username = ctx.serenity_context().cache.current_user().name.clone();
        let restored = default_bio(meta.as_deref(), &username);
        if let Some(token) = crate::config::bot_token() {
            patch_guild_me(
                &token,
                guild_id.get(),
                serde_json::json!({ "bio": restored }),
            )
            .await;
        }
        let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
        ctx.say(
            crate::lang::get(&code, "custom_desc_reset")
                .unwrap_or_else(|| "You have decided to reset the bot's description on the server. Embed footers will return to their default state, as well as the bot's description on the server.".to_string()),
        )
        .await?;
        return Ok(());
    } else {
        sanitize_bio(&raw)
    };
    if let Some(token) = crate::config::bot_token() {
        patch_guild_me(
            &token,
            guild_id.get(),
            serde_json::json!({ "bio": final_bio }),
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
    ctx.say(
        crate::lang::get(&code, "custom_desc_set")
            .map(|s| {
                s.replace("${client.iHorizon_Emojis.Yes}", &yes)
                    .replace("${client.iHorizon_Emojis.Crown}", &crown)
                    .replace("${desc}", &final_bio)
            })
            .unwrap_or_else(|| {
                format!(
                    "{yes} **You have decided to change the bot's description on the server. Embed footers are now modified, as well as the bot's description on the server.**\n{crown} New value: `{final_bio}`"
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
    fn bio_gate_matches_ts_400_limit() {
        assert!(!bio_too_long(&"a".repeat(399)));
        assert!(bio_too_long(&"a".repeat(400)));
    }

    #[test]
    fn bio_gate_counts_utf16_units_like_js_length() {
        // "😀" is 1 char but 2 UTF-16 units: 200 emoji hit the 400 gate.
        assert!(!bio_too_long(&"😀".repeat(199)));
        assert!(bio_too_long(&"😀".repeat(200)));
    }

    #[test]
    fn bio_reset_restores_persisted_default() {
        // Persisted BOT.user.bio wins.
        assert_eq!(
            default_bio(Some(r#"{"user":{"bio":"hello"}}"#), "Bot"),
            "hello"
        );
        // Missing/empty/invalid meta falls back to the username.
        assert_eq!(default_bio(None, "Bot"), "Bot");
        assert_eq!(default_bio(Some("{}"), "Bot"), "Bot");
        assert_eq!(default_bio(Some(r#"{"user":{"bio":""}}"#), "Bot"), "Bot");
        assert_eq!(default_bio(Some("bogus"), "Bot"), "Bot");
    }
}
