use super::*;

/// List webhooks. Mirrors !allwebhooks.ts.
#[poise::command(
    slash_command,
    prefix_command,
    category = "utils",
    rename = "allwebhooks",
    aliases("webhooks", "webhook"),
    default_member_permissions = "ADMINISTRATOR",
    description_localized("fr", "Afficher toute les webhooks enregistrer sur le serveur"),
    description_localized("ja", "サーバーに登録された全Webhookを一覧表示"),
    description_localized("ru", "Показать все вебхуки на сервере"),
    description_localized("es-ES", "Listar todos los webhooks registrados en el servidor")
)]
pub async fn allwebhooks(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    let Some(guild_id) = ctx.guild_id() else {
        return Ok(());
    };
    let hooks = guild_id.webhooks(ctx.http()).await.unwrap_or_default();
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    ctx.say(if hooks.is_empty() {
        crate::lang::get(&code, "util_no_webhooks")
            .unwrap_or_else(|| "There are no webhooks in this guild.".to_string())
    } else {
        hooks
            .iter()
            .map(|w| {
                format!(
                    "{} ({})",
                    w.name.clone().unwrap_or_else(|| "?".to_string()),
                    w.id.get()
                )
            })
            .collect::<Vec<_>>()
            .join("\n")
    })
    .await?;
    Ok(())
}
