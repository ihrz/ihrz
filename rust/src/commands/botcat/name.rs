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

/// Set or reset the per-guild bot nickname.
#[poise::command(
    slash_command,
    prefix_command,
    rename = "name",
    aliases("botname", "setname", "setbotname"),
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn custom_name(
    ctx: Ctx<'_>,
    #[description = "set or reset"] action: String,
    #[description = "New bot name"] name: Option<String>,
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
    let gid = guild_id.get().to_string();
    let pool = &ctx.data().pool;
    if action.trim().eq_ignore_ascii_case("reset") {
        crate::db::kv_del(pool, &gid, BOT_NAME_KEY).await?;
        let fallback = ctx.cache().current_user().display_name().to_string();
        if let Some(token) = crate::config::bot_token() {
            patch_guild_me(
                &token,
                guild_id.get(),
                serde_json::json!({ "nick": fallback }),
            )
            .await;
        }
        let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
        ctx.say(
            crate::lang::get(&code, "custom_name_reset")
                .unwrap_or_else(|| "You have decided to reset the bot's name on the server. Embed footers will return to their default state, as well as the bot's name on the server.".to_string()),
        )
        .await?;
        return Ok(());
    }
    let Some(name) = name.map(|n| n.trim().to_string()).filter(|n| !n.is_empty()) else {
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
    crate::db::kv_set(pool, &gid, BOT_NAME_KEY, &name).await?;
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
    ctx.say(
        crate::lang::get(&code, "custom_name_set")
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
    fn utf16_length_matches_js_string_length() {
        assert_eq!(footer_name_too_long_utf16("abc"), false);
        // BMP text: 1 unit per char, like JS.
        assert_eq!("é".encode_utf16().count(), 1);
        assert_eq!(footer_name_too_long_utf16(&"é".repeat(31)), false);
        assert_eq!(footer_name_too_long_utf16(&"é".repeat(32)), true);
        // Astral chars (emoji): 2 units per char, like JS — 16 emoji
        // hit the 32-unit gate while chars().count() sees only 16.
        assert_eq!("😀".encode_utf16().count(), 2);
        assert_eq!("😀".repeat(16).chars().count(), 16);
        assert_eq!(footer_name_too_long_utf16(&"😀".repeat(15)), false);
        assert_eq!(footer_name_too_long_utf16(&"😀".repeat(16)), true);
        assert_eq!(footer_name_too_long_utf16(&"a".repeat(31)), false);
        assert_eq!(footer_name_too_long_utf16(&"a".repeat(32)), true);
    }
}
