use super::*;

/// Auto-response toggle (fr-ME only). Mirrors autofeur.ts.
#[poise::command(
    slash_command,
    prefix_command,
    category = "guildconfig",
    rename = "autorespond",
    description_localized(
        "fr",
        "Activer/Désactiver la réponse automatique lorsque l'utilisateur dit quelque chose (uniquement en fr-ME)"
    ),
    description_localized(
        "ja",
        "ユーザーが発言した時の自動応答を有効/無効（fr-ME言語のみ）"
    ),
    description_localized(
        "ru",
        "Включить/выключить автоответ при сообщении пользователя (только для fr-ME)"
    ),
    description_localized(
        "es-ES",
        "Habilitar / Deshabilitar la respuesta automática cuando el usuario dice algo (solo en idioma fr-ME)"
    ),
    aliases("auto-feur", "autofeur", "ftgl"),
    default_member_permissions = "MANAGE_GUILD_EXPRESSIONS"
)]
pub async fn autofeur(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let lang = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    if lang != "fr-ME" {
        return Ok(());
    }
    let state =
        crate::commands::owner::main::routed_get(&ctx.data().pool, &gid, &gid, "UTILS.autoFeur")
            .await;
    let enabled = !matches!(
        state.as_deref().map(str::trim),
        Some("1") | Some("true") | Some("on")
    );
    crate::commands::owner::main::routed_set(
        &ctx.data().pool,
        &gid,
        &gid,
        "UTILS.autoFeur",
        if enabled { "1" } else { "0" },
    )
    .await?;
    ctx.say(if enabled {
        "Bravo mec, maintenant je réponds automatiquement à tout ce que tu dis."
    } else {
        "Je ne réponds plus automatiquement à tout ce que tu dis."
    })
    .await?;
    Ok(())
}
