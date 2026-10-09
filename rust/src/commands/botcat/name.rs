use super::*;

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
    if footer_name_too_long(&name) {
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
