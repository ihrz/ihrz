use super::*;

/// Send a 67 gif
#[poise::command(
    slash_command,
    prefix_command,
    category = "fun",
    rename = "67",
    name_localized("fr", "67"),
    name_localized("ja", "67"),
    name_localized("ru", "67"),
    name_localized("es-ES", "67"),
    description_localized("fr", "envoi un meme 67"),
    description_localized("ja", "67のGIFを送信"),
    description_localized("ru", "Отправить гифку 67"),
    description_localized("es-ES", "Enviar un gif de 67")
)]
// Mirrors fun !67.ts (fixed GIF URL).
pub async fn sixseven(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    if fun_guard(&ctx).await {
        return Ok(());
    }
    ctx.say("https://www.ihorizon.org/assets/img/fun/67_command.gif")
        .await?;
    Ok(())
}
