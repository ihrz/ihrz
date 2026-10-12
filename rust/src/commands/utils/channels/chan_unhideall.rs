use super::*;

/// Unhide all channels in the server from everyone
#[poise::command(
    slash_command,
    prefix_command,
    category = "utils",
    rename = "unhideall",
    aliases("démasquer-tout"),
    default_member_permissions = "ADMINISTRATOR",
    description_localized("fr", "Démasquer tous les salons du serveur pour everyone"),
    description_localized("ja", "サーバー内の全チャンネルを全員に表示"),
    description_localized("ru", "Показать все каналы всем на сервере"),
    description_localized("es-ES", "Mostrar todos los canales del servidor a todos")
)]
pub async fn chan_unhideall(
    ctx: Ctx<'_>,
    #[description_localized("fr", "Le rôle que tu veux démasquer dans tout les salons du serveur")]
    #[description_localized("ja", "全サーバーチャンネルで表示したいロール")]
    #[description_localized("ru", "роль, которую нужно показать во всех каналах")]
    #[description_localized(
        "es-ES",
        "el rol que quieres mostrar en todos los canales del servidor"
    )]
    #[description = "Role, defaults to @everyone"]
    role: Option<poise::serenity_prelude::Role>,
) -> Result<(), anyhow::Error> {
    let role_id = role
        .as_ref()
        .map(|r| r.id.get())
        .unwrap_or_else(|| ctx.guild_id().map(|g| g.get()).unwrap_or_default());
    hide_all_inner(&ctx, true, role_id).await
}
