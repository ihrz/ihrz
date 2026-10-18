#[allow(unused_imports)]
use super::{entry::*, helpers::*, scope::*, store::*};
use crate::bot::Ctx;

/// Run Javascript program (only for developers)!
// FLATTEN-B2: top-level slash command (TS `eval.ts`, flat /eval
// with a required `code` string option, standalone hybrid). Perm
// gate kept identical: `isBotDev` (config owners list), ephemeral
// `No` for non-devs. Execution leg is a deliberate refusal:
// arbitrary JS execution (`new Function`) has no Rust equivalent
// (documented exclusion in ops/rust-migration/inventory.md).
#[poise::command(
    slash_command,
    prefix_command,
    category = "owner",
    rename = "eval",
    description_localized("fr", "Executer du code JavaScript (Seulement pour les dev du bot)."),
    description_localized("ja", "JavaScriptプログラムを実行（開発者のみ）！"),
    description_localized("ru", "Запустить программу JavaScript (только для разработчиков)!"),
    description_localized("es-ES", "Ejecutar programa Javascript (solo para desarrolladores)!")
)]
pub async fn eval(
    ctx: Ctx<'_>,
    // Rest-of-line like TS `args?.join(" ")` (see blacklist).
    #[description = "javascript code"]
    #[description_localized("fr", "JS Code")]
    #[description_localized("ja", "JavaScriptコード")]
    #[description_localized("ru", "код JavaScript")]
    #[description_localized("es-ES", "código JavaScript")]
    #[rest]
    code: String,
) -> Result<(), anyhow::Error> {
    if !is_bot_dev(&ctx.data().config.owners, ctx.author().id.get()) {
        ctx.send(
            poise::CreateReply::default()
                .content(no_emoji(&ctx).await)
                .ephemeral(true),
        )
        .await?;
        return Ok(());
    }
    let _ = code;
    ctx.send(
        poise::CreateReply::default()
            .content("Eval is not available in this build.")
            .ephemeral(true),
    )
    .await?;
    Ok(())
}
