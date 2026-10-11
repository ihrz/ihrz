use crate::bot::Ctx;

/// Remove the slowdown on the current channel. Mirrors
/// MessageCommands/utils/unslowmode.ts (thin prefix-only wrapper calling
/// the cooldown run with `0`): delegates to the shared slowmode edit.
#[poise::command(
    prefix_command,
    category = "utils",
    rename = "unslowmode",
    aliases("uncooldown", "delcooldown"),
    default_member_permissions = "MANAGE_CHANNELS"
)]
pub async fn unslowmode(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    super::channels::slowmode::apply_slowmode(ctx, 0, None).await
}
