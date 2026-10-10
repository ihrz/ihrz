use super::*;

/// Language stats. Mirrors langstats.ts (loaded YAML key counts).
///
/// TS gates on `isBotOwner`, replying `blacklist_not_owner` otherwise.
#[poise::command(
    slash_command,
    prefix_command,
    category = "utils",
    rename = "langstats"
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
