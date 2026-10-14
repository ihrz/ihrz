use super::*;
use poise::serenity_prelude as serenity;

/// Guild-lang distribution embed colour
/// (MessageCommands/utils/langstats.ts `.setColor(2829617)`).
pub const LANGSTATS_COLOUR: u32 = 2829617;

/// `# Stats Lang over all iHorizon guilds (N guilds)`. Pure.
pub fn langstats_description(total_guilds: usize) -> String {
    format!("# Stats Lang over all iHorizon guilds ({total_guilds} guilds)")
}

/// `<flag> (<code>)`, `❔` fallback for unknown codes (TS `?? "❔"`). Pure.
pub fn langstats_field_name(code: &str) -> String {
    let flag = crate::commands::botcat::setserverlang::lang_meta(code)
        .map(|(_, flag)| flag)
        .unwrap_or("❔");
    format!("{flag} ({code})")
}

/// `<n> guilds`. Pure.
pub fn langstats_field_value(count: usize) -> String {
    format!("{count} guilds")
}

/// Language stats. Mirrors MessageCommands/utils/langstats.ts:
/// owner gate replying `blacklist_not_owner`, else an embed counting
/// guilds per stored lang.
///
/// TS reads `${guild.id}.GUILD.LANG.lang` per cached guild (falling
/// back to `en-US`), titles `# Stats Lang over all iHorizon guilds
/// (N guilds)`, adds one inline field per seen lang (`<flag>
/// (<code>)` -> `<n> guilds`, unknown codes get `❔`) and signs with
/// the displayBotName footer for the invoking guild.
#[poise::command(
    prefix_command,
    category = "utils",
    rename = "langstats",
    description_localized(
        "fr",
        "Obtenir des informations sur l'utilisation des langues à travers tout les serveur discord du bot iHorizon"
    ),
    description_localized("ja", "iHorizon Discord Botの言語統計を取得"),
    description_localized("ru", "Получить статистику языков в iHorizon"),
    description_localized(
        "es-ES",
        "Obtener estadísticas sobre el idioma en el Bot de Discord iHorizon"
    )
)]
pub async fn langstats(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    let owners = crate::db::bot_owner_ids(&ctx.data().pool, &ctx.data().config.owners).await;
    if !owners
        .iter()
        .any(|o| o == &ctx.author().id.get().to_string())
    {
        let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
        ctx.say(
            crate::lang::get(&code, "blacklist_not_owner").unwrap_or_else(|| {
                "You are not an owner of the iHorizon Project. You can't use this command."
                    .to_string()
            }),
        )
        .await?;
        return Ok(());
    }
    // TS-exact success path: guild-lang distribution embed.
    let pool = &ctx.data().pool;
    let guild_ids = ctx.serenity_context().cache.guilds();
    let mut counts: Vec<(String, usize)> = Vec::new();
    for gid in &guild_ids {
        let lang = crate::db::guild_lang(pool, Some(gid.get())).await;
        match counts.iter_mut().find(|(code, _)| code == &lang) {
            Some(entry) => entry.1 += 1,
            None => counts.push((lang, 1)),
        }
    }
    let mut embed = serenity::CreateEmbed::default()
        .colour(LANGSTATS_COLOUR)
        .description(langstats_description(guild_ids.len()));
    for (code, n) in &counts {
        embed = embed.field(langstats_field_name(code), langstats_field_value(*n), true);
    }
    let footer_name = match ctx.guild_id() {
        Some(g) => crate::commands::shared::bot_footer_name(
            crate::db::tbl_get(
                pool,
                &g.get().to_string(),
                crate::commands::shared::BOT_NAME_KEY,
            )
            .await
            .as_deref(),
        ),
        None => "iHorizon".to_string(),
    };
    embed = embed.footer(serenity::CreateEmbedFooter::new(footer_name));
    ctx.send(poise::CreateReply::default().embed(embed)).await?;
    Ok(())
}

#[cfg(test)]
mod langstats_shape_tests {
    use super::*;

    #[test]
    fn colour_is_ts_exact_blurple_grey() {
        // MessageCommands/utils/langstats.ts `.setColor(2829617)`;
        // live prod payload carries `"color": 2829617`.
        assert_eq!(LANGSTATS_COLOUR, 2829617);
        assert_eq!(LANGSTATS_COLOUR, 0x2B2D31);
    }

    #[test]
    fn description_counts_total_guilds() {
        assert_eq!(
            langstats_description(531),
            "# Stats Lang over all iHorizon guilds (531 guilds)"
        );
    }

    #[test]
    fn field_names_carry_flag_and_code() {
        // Live prod payload: `"name": "🇺🇸 (en-US)"`, `"value": "410 guilds"`.
        assert_eq!(langstats_field_name("en-US"), "🇺🇸 (en-US)");
        assert_eq!(langstats_field_name("fr-FR"), "🇫🇷 (fr-FR)");
        assert_eq!(langstats_field_name("ru-RU"), "🇷🇺 (ru-RU)");
        assert_eq!(langstats_field_value(410), "410 guilds");
    }

    #[test]
    fn unknown_codes_fall_back_to_grey_question() {
        // TS `AvailableLanguage.find(...)?.flag ?? "❔"`.
        assert_eq!(langstats_field_name("xx-YY"), "❔ (xx-YY)");
    }
}
