use super::*;

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
