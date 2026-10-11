use super::*;

/// Language stats. Mirrors langstats.ts (loaded YAML key counts).
///
/// TS gates on `isBotOwner`, replying `blacklist_not_owner` otherwise.
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
    let mut lines = vec![];
    for code in [
        "ar-EG", "de-DE", "en-US", "es-ES", "fr-FR", "fr-ME", "it-IT", "jp-JP", "pt-PT", "ru-RU",
    ] {
        let n = match crate::lang::table_for(code) {
            serde_yaml::Value::Mapping(m) => m.len(),
            _ => 0,
        };
        lines.push(format!("{code}: {n}"));
    }
    ctx.say(lines.join("\n")).await?;
    Ok(())
}
