use super::*;

/// Language stats. Mirrors langstats.ts (loaded YAML key counts).
#[poise::command(
    slash_command,
    prefix_command,
    category = "utils",
    rename = "langstats"
)]
pub async fn langstats(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
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
