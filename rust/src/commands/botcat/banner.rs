use super::*;

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
            .unwrap_or_else(|| {
                format!(
                    "{yes} **You have decided to change the bot's banner on the server.**\n{crown} New value: `{}`",
                    banner.url
                )
            }),
    )
    .await?;
    Ok(())
}
