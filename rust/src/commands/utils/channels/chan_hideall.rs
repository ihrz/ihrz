use super::*;

/// Hide all channels in the server from everyone
#[poise::command(
    slash_command,
    prefix_command,
    category = "utils",
    rename = "hideall",
    aliases("masquer-tout"),
    default_member_permissions = "ADMINISTRATOR",
    description_localized("fr", "Masquer tous les salons du serveur pour everyone"),
    description_localized("ja", "サーバー内の全チャンネルを全員から非表示"),
    description_localized("ru", "Скрыть все каналы от всех на сервере"),
    description_localized("es-ES", "Ocultar todos los canales del servidor a todos")
)]
pub async fn chan_hideall(
    ctx: Ctx<'_>,
    #[description_localized("fr", "Le rôle que tu veux masquer dans tout les salons du serveur")]
    #[description_localized("ja", "全サーバーチャンネルで非表示にしたいロール")]
    #[description_localized("ru", "роль, которую нужно скрыть во всех каналах сервера")]
    #[description_localized(
        "es-ES",
        "el rol que quieres ocultar en todos los canales del servidor"
    )]
    #[description = "the role that you want to hide into all guild channels"]
    role: Option<poise::serenity_prelude::Role>,
) -> Result<(), anyhow::Error> {
    let role_id = role
        .as_ref()
        .map(|r| r.id.get())
        .unwrap_or_else(|| ctx.guild_id().map(|g| g.get()).unwrap_or_default());
    hide_all_inner(&ctx, false, role_id).await
}
