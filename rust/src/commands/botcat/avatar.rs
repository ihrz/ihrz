use super::*;

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
                .unwrap_or_else(|| "You have decided to reset the bot's profile picture on the server. Embed footers will return to their default state, as well as the bot's profile picture on the server.".to_string()),
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
    // `${x}` is the post-change guild member avatar (!avatar.ts reads
    // `members.me.avatarURL()` after the change), not the upload URL.
    let bot_id = ctx.cache().current_user().id;
    let member_avatar = guild_id
        .member(&ctx.serenity_context().http, bot_id)
        .await
        .ok()
        .and_then(|m| m.avatar_url());
    let x = super::post_change_display(member_avatar.as_deref(), &avatar.url);
    ctx.say(
        crate::lang::get(&code, "custom_avatar_set")
            .map(|s| {
                s.replace("${client.iHorizon_Emojis.Yes}", &yes)
                    .replace("${client.iHorizon_Emojis.Crown}", &crown)
                    .replace("${x}", &x)
            })
            .unwrap_or_else(|| {
                format!(
                    "{yes} **You have decided to change the bot's profile picture on the server. Embed footers are now modified, as well as the bot's profile picture on the server.**\n{crown} New value: `{x}`"
                )
            }),
    )
    .await?;
    Ok(())
}
