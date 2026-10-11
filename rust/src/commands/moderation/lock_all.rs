use super::*;
use poise::serenity_prelude as serenity;

/// Lock or unlock all text channels.
#[poise::command(
    slash_command,
    prefix_command,
    rename = "lock-all",
    aliases("lockall"),
    default_member_permissions = "ADMINISTRATOR",
    description_localized(
        "fr",
        "Supprimer la possibilité de parler de tous les utilisateurs sur tous les channel"
    ),
    description_localized("ja", "全チャンネルで全ユーザーの発言権限を削除！"),
    description_localized("ru", "Убрать возможность говорить у всех во всех каналах!"),
    description_localized(
        "es-ES",
        "Quitar la capacidad de hablar a todos los usuarios en todos los canales!"
    )
)]
pub async fn mod_lock_all(
    ctx: Ctx<'_>,
    #[description_localized("fr", "le rôle")]
    #[description_localized("ja", "ロール")]
    #[description_localized("ru", "Роль")]
    #[description_localized("es-ES", "El rol")]
    #[description = "Role to lock (default @everyone)"]
    role: Option<serenity::Role>,
) -> Result<(), anyhow::Error> {
    lock_all_inner(&ctx, false, role).await
}
