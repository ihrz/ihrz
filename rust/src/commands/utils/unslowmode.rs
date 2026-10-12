use crate::bot::Ctx;

/// Remove the slowdown on the current channel. Mirrors
/// MessageCommands/utils/unslowmode.ts (thin prefix-only wrapper calling
/// the cooldown run with `0`): delegates to the shared slowmode edit.
#[poise::command(
    prefix_command,
    category = "utils",
    rename = "unslowmode",
    aliases("uncooldown", "delcooldown"),
    default_member_permissions = "MANAGE_CHANNELS",
    description_localized("fr", "Supprimer le mode lent du cannal actuel"),
    description_localized("ja", "現在のチャンネルのクールダウンを解除"),
    description_localized("ru", "Снять задержку с текущего канала"),
    description_localized("es-ES", "Eliminar el enfriamiento en el canal actual")
)]
pub async fn unslowmode(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    super::channels::slowmode::apply_slowmode(ctx, 0, None).await
}
