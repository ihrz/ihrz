use super::*;

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
