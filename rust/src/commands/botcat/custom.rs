use super::*;

/// Custom the bot profile in your discord server.
#[poise::command(
    slash_command,
    prefix_command,
    category = "bot",
    rename = "custom",
    subcommands("custom_name", "custom_avatar", "custom_banner", "custom_bio")
)]
pub async fn custom(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    // Container only (mirrors custom.ts); the paywall lives on the
    // bare parent, subcommands are exempt like checkCustomSdkGate.
    if !custom_sdk_gate(&ctx).await {
        return Ok(());
    }
    Ok(())
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
                .unwrap_or_else(|| "Bot name reset to default.".to_string()),
        )
        .await?;
        return Ok(());
    }
    let Some(name) = name.map(|n| n.trim().to_string()).filter(|n| !n.is_empty()) else {
        let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
        ctx.say(
            crate::lang::get(&code, "guildconfig_setbot_footername_not_found")
                .unwrap_or_else(|| "Provide a name, or use reset.".to_string()),
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
            .unwrap_or_else(|| format!("Bot name set to `{name}`.")),
    )
    .await?;
    Ok(())
}

/// Set or reset the per-guild bot avatar.
#[poise::command(
    slash_command,
    prefix_command,
    rename = "avatar",
    aliases("botavatar", "setpic", "setavatar", "setpp"),
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn custom_avatar(
    ctx: Ctx<'_>,
    #[description = "set or reset"] action: String,
    #[description = "New avatar image"] avatar: Option<serenity::Attachment>,
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
    let token = crate::config::bot_token();
    if action.trim().eq_ignore_ascii_case("reset") {
        crate::db::kv_del(pool, &gid, BOT_PFP_KEY).await?;
        if let Some(token) = token {
            let face = ctx.cache().current_user().face();
            if let Some(bytes) = download_bytes(&face).await {
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
        let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
        ctx.say(
            crate::lang::get(&code, "custom_avatar_reset")
                .unwrap_or_else(|| "Bot avatar reset to default.".to_string()),
        )
        .await?;
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
    crate::db::kv_set(pool, &gid, BOT_PFP_KEY, &b64).await?;
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    let yes = crate::emojis::app_emoji_markup(&ctx.serenity_context().http, "Yes")
        .await
        .unwrap_or_else(|| "✅".to_string());
    let crown = crate::emojis::app_emoji_markup(&ctx.serenity_context().http, "Crown")
        .await
        .unwrap_or_else(|| "👑".to_string());
    ctx.say(
        crate::lang::get(&code, "custom_avatar_set")
            .map(|s| {
                s.replace("${client.iHorizon_Emojis.Yes}", &yes)
                    .replace("${client.iHorizon_Emojis.Crown}", &crown)
                    .replace("${x}", &avatar.url)
            })
            .unwrap_or_else(|| format!("Bot avatar updated from `{}`.", avatar.url)),
    )
    .await?;
    Ok(())
}

/// Set or reset the per-guild bot banner.
// Mirrors HybridCommands/bot/custom/!banner.ts (no DB key; set/reset
// PATCH a `data:image/jpeg;base64,...` data URI, reset restores the
// global banner, anything else replies the incorrect-file message).
#[poise::command(
    slash_command,
    prefix_command,
    rename = "banner",
    aliases("botbanner", "setbotbanner", "setbanner"),
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn custom_banner(
    ctx: Ctx<'_>,
    #[description = "set or reset"] action: String,
    #[description = "New banner image"] banner: Option<serenity::Attachment>,
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
    ctx.say(
        crate::lang::get(&code, "custom_banner_set")
            .map(|s| {
                s.replace("${client.iHorizon_Emojis.Yes}", &yes)
                    .replace("${client.iHorizon_Emojis.Crown}", &crown)
                    .replace("${x}", &banner.url)
            })
            .unwrap_or_else(|| format!("Bot banner updated from `{}`.", banner.url)),
    )
    .await?;
    Ok(())
}

/// Set or reset the per-guild bot bio (190 chars, 2 lines).
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
    let final_bio = if action.trim().eq_ignore_ascii_case("reset") {
        String::new()
    } else {
        sanitize_bio(&bio.unwrap_or_default())
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
            .unwrap_or_else(|| "Bot bio updated.".to_string()),
    )
    .await?;
    Ok(())
}
