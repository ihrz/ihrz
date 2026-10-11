use super::*;
use poise::serenity_prelude as serenity;

/// Give ability to speak of all users in all channels!
#[poise::command(
    slash_command,
    prefix_command,
    rename = "unlock-all",
    aliases("unlockall"),
    default_member_permissions = "ADMINISTRATOR",
    description_localized(
        "fr",
        "Donner la possibilité de parler de tous les utilisateurs sur tous les channels"
    ),
    description_localized("ja", "全チャンネルで全ユーザーに発言権限を付与！"),
    description_localized("ru", "Дать возможность говорить всем во всех каналах!"),
    description_localized(
        "es-ES",
        "Dar capacidad de hablar a todos los usuarios en todos los canales!"
    )
)]
pub async fn mod_unlock_all(
    ctx: Ctx<'_>,
    #[description_localized("fr", "le rôle")]
    #[description_localized("ja", "ロール")]
    #[description_localized("ru", "Роль")]
    #[description_localized("es-ES", "El rol")]
    #[description = "Role to unlock (default @everyone)"]
    role: Option<serenity::Role>,
) -> Result<(), anyhow::Error> {
    lock_all_inner(&ctx, true, role).await
}
