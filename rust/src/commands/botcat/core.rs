use super::*;

/// Bot info. Mirrors src/Interaction/HybridCommands/bot/botinfo.ts.
#[poise::command(
    slash_command,
    prefix_command,
    category = "bot",
    rename = "bot-info",
    aliases("bi")
)]
pub async fn botinfo_full(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    let guilds = ctx.cache().guild_count();
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    let servers_name = crate::lang::get(&code, "botinfo_embed_fields_myservers")
        .unwrap_or_else(|| "Servers".to_string());
    let created_by_name = crate::lang::get(&code, "botinfo_embed_fields_created_by")
        .unwrap_or_else(|| "Created by".to_string());
    let embed = serenity::CreateEmbed::default()
        .title("iHorizon")
        .field(servers_name, format!("{guilds}"), false)
        .field("Version", env!("CARGO_PKG_VERSION"), false)
        .field(created_by_name, "<@171356978310938624>", false);
    ctx.send(poise::CreateReply::default().embed(embed)).await?;
    Ok(())
}

/// Send a message through the bot. Mirrors say.ts (`"> " + content`).
#[poise::command(
    slash_command,
    prefix_command,
    category = "bot",
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn say(
    ctx: Ctx<'_>,
    #[description = "What you want the bot to say"] content: String,
) -> Result<(), anyhow::Error> {
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    let footer = crate::lang::get(&code, "say_footer_msg")
        .map(|s| {
            s.replace(
                "${interaction.user}",
                &format!("<@{}>", ctx.author().id.get()),
            )
        })
        .unwrap_or_default();
    ctx.say(format!("> {content}{footer}")).await?;
    Ok(())
}

/// Set the server language. Mirrors setserverlang.ts (writes GUILD.LANG).
#[poise::command(
    slash_command,
    prefix_command,
    category = "bot",
    rename = "setlang",
    aliases("setsrvlang", "lang"),
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn setlang(
    ctx: Ctx<'_>,
    #[description = "Server language"] lang: String,
) -> Result<(), anyhow::Error> {
    let Some(code) = parse_lang(lang.trim()) else {
        let glang = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
        ctx.say(
            crate::lang::get(&glang, "msg_invalid_language_supported_ar_eg_de_de_en_us_es_es_fr_fr_fr_me_it_it_jp_jp_pt_pt_ru_ru")
                .unwrap_or_else(|| "Invalid language. Supported: ar-EG, de-DE, en-US, es-ES, fr-FR, fr-ME, it-IT, jp-JP, pt-PT, ru-RU.".to_string()),
        )
        .await?;
        return Ok(());
    };
    let Some(guild_id) = ctx.guild_id() else {
        let glang = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
        ctx.say(
            crate::lang::get(&glang, "msg_this_command_must_be_used_in_a_server")
                .unwrap_or_else(|| "This command must be used in a server.".to_string()),
        )
        .await?;
        return Ok(());
    };
    crate::db::kv_set(&ctx.data().pool, &guild_id.to_string(), "GUILD.LANG", code).await?;
    let lang_code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    ctx.say(
        crate::lang::get(&lang_code, "setserverlang_panel_saved")
            .unwrap_or_else(|| format!("Language set to `{code}`.")),
    )
    .await?;
    Ok(())
}

/// Get the bot invite link. Mirrors invite.ts.
#[poise::command(
    slash_command,
    prefix_command,
    category = "bot",
    aliases("inviteme", "oauth")
)]
pub async fn invite(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    let app_id = ctx.serenity_context().cache.current_user().id;
    let url = format!(
        "https://discord.com/api/oauth2/authorize?client_id={app_id}&permissions=8&scope=bot"
    );
    ctx.say(url).await?;
    Ok(())
}

/// Show all links about iHorizon. Mirrors link.ts.
#[poise::command(slash_command, prefix_command, category = "bot", aliases("link"))]
pub async fn links(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    ctx.say("Website: https://ihorizon.org | GitLab: https://gitlab.com/ihrz/ihrz")
        .await?;
    Ok(())
}
